const BASE_URL = "https://ai-resume-backend-w44h.onrender.com";
let candidateData = [];
let chart;

// ---------- FILE HELPERS ----------
function addFiles(input, newFiles) {
  const dt = new DataTransfer();

  for (let f of input.files) dt.items.add(f);
  for (let f of newFiles) dt.items.add(f);

  input.files = dt.files;
}

// ---------- DRAG & DROP FIXED ----------
const jdDrop = document.getElementById("jdDrop");
const resumeDrop = document.getElementById("resumeDrop");

jdDrop.onclick = () => document.getElementById("jd_pdf").click();
resumeDrop.onclick = () => document.getElementById("pdf").click();

jdDrop.ondrop = (e) => {
  e.preventDefault();
  addFiles(document.getElementById("jd_pdf"), e.dataTransfer.files);
  document.getElementById("jdFileName").innerText =
    document.getElementById("jd_pdf").files[0]?.name || "";
};

resumeDrop.ondrop = (e) => {
  e.preventDefault();
  addFiles(document.getElementById("pdf"), e.dataTransfer.files);

  let names = Array.from(document.getElementById("pdf").files)
    .map(f => f.name).join(", ");

  document.getElementById("resumeFileName").innerText = names;
};

jdDrop.ondragover = resumeDrop.ondragover = (e) => e.preventDefault();

// ---------- ANALYZE ----------
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

// ---------- LOAD ----------
function loadCandidates() {
  fetch(`${BASE_URL}/candidates`)
    .then(res => res.json())
    .then(data => {
      candidateData = data;
      renderDashboard();
      renderChart();
    });
}

// ---------- DASHBOARD ----------
function renderDashboard() {
  const resultDiv = document.getElementById("result");

  let total = candidateData.length;
  let avg = Math.round(candidateData.reduce((a, b) => a + b.score, 0) / total);
  let best = candidateData.reduce((a, b) => a.score > b.score ? a : b);
  let worst = candidateData.reduce((a, b) => a.score < b.score ? a : b);

  let summary = `
    <div class="summary">
      <div class="card-box">Total Resumes<br><b>${total}</b></div>
      <div class="card-box">Average Score<br><b>${avg}%</b></div>
      <div class="card-box">Best Candidate<br><b>${best.name}</b></div>
      <div class="card-box">Worst Candidate<br><b>${worst.name}</b></div>
    </div>
  `;

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

  candidateData.forEach(c => {
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

  resultDiv.innerHTML = summary + table;
}

// ---------- SKILL BADGES ----------
function formatSkills(skills, matched) {
  if (!skills) return "";
  let color = matched ? "skill-match" : "skill-miss";
  return skills.split(",").map(s =>
    `<span class="${color}">${s.trim()}</span>`
  ).join(" ");
}

// ---------- CHART ----------
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

// ---------- MODAL ----------
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

// ---------- UI HELPERS ----------
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
