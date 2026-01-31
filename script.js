const BASE_URL = "https://ai-resume-backend-w44h.onrender.com";
let candidateData = [];
let chart;

// ---------- DRAG & DROP ----------
const jdDrop = document.getElementById("jdDrop");
const resumeDrop = document.getElementById("resumeDrop");

jdDrop.onclick = () => document.getElementById("jd_pdf").click();
resumeDrop.onclick = () => document.getElementById("pdf").click();

document.getElementById("jd_pdf").onchange = function () {
  document.getElementById("jdFileName").innerText =
    this.files[0]?.name || "";
};

document.getElementById("pdf").onchange = function () {
  let names = Array.from(this.files).map(f => f.name).join(", ");
  document.getElementById("resumeFileName").innerText = names;
};

jdDrop.ondrop = (e) => {
  e.preventDefault();
  document.getElementById("jd_pdf").files = e.dataTransfer.files;
  document.getElementById("jdFileName").innerText =
    e.dataTransfer.files[0].name;
};

resumeDrop.ondrop = (e) => {
  e.preventDefault();
  document.getElementById("pdf").files = e.dataTransfer.files;
  let names = Array.from(e.dataTransfer.files).map(f => f.name).join(", ");
  document.getElementById("resumeFileName").innerText = names;
};

jdDrop.ondragover = resumeDrop.ondragover = (e) => e.preventDefault();

// ---------- ANALYZE ----------
function analyze() {
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
  }).then(() => loadCandidates());
}

// ---------- LOAD ----------
function loadCandidates() {
  fetch(`${BASE_URL}/candidates`)
    .then(res => res.json())
    .then(data => {
      candidateData = data;
      renderTable();
      renderChart();
    });
}

// ---------- TABLE WITH COLORS + LEGEND ----------
function renderTable() {
  const resultDiv = document.getElementById("result");

  let legend = `
    <div class="legend">
      <span class="score-high">● High Match (>80%)</span>
      <span class="score-mid">● Moderate Match (50–80%)</span>
      <span class="score-low">● Low Match (<50%)</span>
    </div>
  `;

  let table = `
    <table>
      <tr>
        <th>Name</th>
        <th>Score</th>
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
        <td class="${scoreClass}">${c.score}%</td>
        <td><button onclick='openModal(${JSON.stringify(c)})'>View</button></td>
      </tr>
    `;
  });

  table += "</table>";

  resultDiv.innerHTML = legend + table;
}

// ---------- CHART ----------
function renderChart() {
  const ctx = document.getElementById("scoreChart");

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
    options: {
      responsive: true,
      maintainAspectRatio: false,
    }
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
    ${c.matched}
    <h4>Missing Skills</h4>
    ${c.missing}
  `;

  modal.style.display = "block";
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

// ---------- CSV ----------
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

// ---------- CLEAR ----------
function clearResults() {
  document.getElementById("result").innerHTML = "";
}
