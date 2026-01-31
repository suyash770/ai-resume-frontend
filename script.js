const BASE_URL = "https://ai-resume-backend-w44h.onrender.com";
let candidateData = [];
let chart;

// ---------------- DRAG & DROP ----------------
const jdDrop = document.getElementById("jdDrop");
const resumeDrop = document.getElementById("resumeDrop");

jdDrop.onclick = () => document.getElementById("jd_pdf").click();
resumeDrop.onclick = () => document.getElementById("pdf").click();

document.getElementById("jd_pdf").onchange = function () {
  document.getElementById("jdFileName").innerText = this.files[0]?.name || "";
};

document.getElementById("pdf").onchange = function () {
  let names = Array.from(this.files).map(f => f.name).join(", ");
  document.getElementById("resumeFileName").innerText = names;
};

jdDrop.ondrop = (e) => {
  e.preventDefault();
  document.getElementById("jd_pdf").files = e.dataTransfer.files;
  document.getElementById("jdFileName").innerText = e.dataTransfer.files[0].name;
};

resumeDrop.ondrop = (e) => {
  e.preventDefault();
  document.getElementById("pdf").files = e.dataTransfer.files;
  let names = Array.from(e.dataTransfer.files).map(f => f.name).join(", ");
  document.getElementById("resumeFileName").innerText = names;
};

jdDrop.ondragover = resumeDrop.ondragover = (e) => e.preventDefault();

// ---------------- ANALYZE ----------------
function analyze() {
  showLoader();

  const jdText = document.getElementById("jd").value;
  const jdFile = document.getElementById("jd_pdf").files[0];
  const files = document.getElementById("pdf").files;

  const formData = new FormData();
  if (jdFile) formData.append("jd_pdf", jdFile);
  else formData.append("jd_text", jdText);

  for (let i = 0; i < files.length; i++) {
    formData.append("resume_pdfs", files[i]);
  }

  fetch(`${BASE_URL}/predict`, {
    method: "POST",
    body: formData,
  })
    .then(() => {
      loadCandidates();
      showToast("Resumes analyzed successfully ✅");
    })
    .catch(() => showToast("Error analyzing resumes ❌"));
}

// ---------------- LOAD ----------------
function loadCandidates() {
  fetch(`${BASE_URL}/candidates`)
    .then(res => res.json())
    .then(data => {
      candidateData = data;
      renderDashboard();
      renderChart();
    });
}

// ---------------- DASHBOARD (ALL FEATURES) ----------------
function renderDashboard() {
  const resultDiv = document.getElementById("result");
  const search = (document.getElementById("search")?.value || "").toLowerCase();
  const minScore = parseInt(document.getElementById("minScore")?.value) || 0;

  let filtered = candidateData.filter(c =>
    c.name.toLowerCase().includes(search) && c.score >= minScore
  );

  if (filtered.length === 0) {
    resultDiv.innerHTML = "<h3>No candidates found</h3>";
    return;
  }

  // -------- SUMMARY CARDS --------
  let total = filtered.length;
  let avg = Math.round(filtered.reduce((a, b) => a + b.score, 0) / total);
  let best = filtered.reduce((a, b) => a.score > b.score ? a : b);
  let worst = filtered.reduce((a, b) => a.score < b.score ? a : b);

  let summary = `
    <div class="summary">
      <div class="card-box">Total Resumes<br><b>${total}</b></div>
      <div class="card-box">Average Score<br><b>${avg}%</b></div>
      <div class="card-box">Best Candidate<br><b>${best.name}</b></div>
      <div class="card-box">Worst Candidate<br><b>${worst.name}</b></div>
    </div>
  `;

  // -------- LEGEND --------
  let legend = `
    <div class="legend">
      <span class="score-high">● High Match (>80%)</span>
      <span class="score-mid">● Moderate Match (50–80%)</span>
      <span class="score-low">● Low Match (<50%)</span>
    </div>
  `;

  // -------- TABLE --------
  let table = `
    <table>
      <tr>
        <th>Name</th>
        <th>Score</th>
        <th>Matched Skills</th>
        <th>Missing Skills</th>
        <th>Details</th>
      </tr>
  `;

  filtered.forEach(c => {
    let scoreClass =
      c.score > 80 ? "score-high" :
      c.score >= 50 ? "score-mid" : "score-low";

    table += `
      <tr>
        <td>${c.name}</td>
        <td>
          <div class="progress-bar">
            <div class="progress-fill ${scoreClass}" style="width:${c.score}%">
              ${c.score}%
            </div>
          </div>
        </td>
        <td>${formatSkills(c.matched, true)}</td>
        <td>${formatSkills(c.missing, false)}</td>
        <td><button onclick='openModal(${JSON.stringify(c)})'>View</button></td>
      </tr>
    `;
  });

  table += "</table>";

  resultDiv.innerHTML = summary + legend + table;
}

// ---------------- SKILL BADGES ----------------
function formatSkills(skills, matched) {
  if (!skills) return "";
  let color = matched ? "skill-match" : "skill-miss";
  return skills.split(",").map(s =>
    `<span class="${color}">${s.trim()}</span>`
  ).join(" ");
}

// ---------------- CHART ----------------
function renderChart() {
  const ctx = document.getElementById("scoreChart");
  if (!ctx) return;

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: candidateData.map(c => c.name),
      datasets: [{
        label: 'ATS Score',
        data: candidateData.map(c => c.score),
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

// ---------------- MODAL ----------------
function openModal(c) {
  const modal = document.getElementById("modal");
  const body = document.getElementById("modalBody");

  body.innerHTML = `
    <h2>${c.name}</h2>
    <h3>Score: ${c.score}%</h3>
    <h4>Matched Skills</h4>
    ${formatSkills(c.matched, true)}
    <h4>Missing Skills</h4>
    ${formatSkills(c.missing, false)}
  `;

  modal.style.display = "block";
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

// ---------------- CSV ----------------
function downloadCSV() {
  let csv = "Name,Score,Matched Skills,Missing Skills\n";
  candidateData.forEach(c => {
    csv += `${c.name},${c.score},"${c.matched}","${c.missing}"\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "candidates.csv";
  a.click();
}

// ---------------- UI HELPERS ----------------
function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.innerText = message;
  toast.style.display = "block";
  setTimeout(() => toast.style.display = "none", 3000);
}

function showLoader() {
  document.getElementById("result").innerHTML =
    '<div class="loader">Analyzing resumes, please wait...</div>';
}

function clearResults() {
  document.getElementById("result").innerHTML = "";
}
