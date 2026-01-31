const BASE_URL = "https://ai-resume-backend-w44h.onrender.com";
let candidateData = [];
let chart;

// ---------- DRAG DROP ----------
const jdDrop = document.getElementById("jdDrop");
const resumeDrop = document.getElementById("resumeDrop");

jdDrop.onclick = () => document.getElementById("jd_pdf").click();
resumeDrop.onclick = () => document.getElementById("pdf").click();

jdDrop.ondrop = (e) => {
  e.preventDefault();
  document.getElementById("jd_pdf").files = e.dataTransfer.files;
};

resumeDrop.ondrop = (e) => {
  e.preventDefault();
  document.getElementById("pdf").files = e.dataTransfer.files;
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
      renderDashboard();
      renderChart();
    });
}

// ---------- DASHBOARD ----------
function renderDashboard() {
  const resultDiv = document.getElementById("result");
  const search = document.getElementById("search").value.toLowerCase();
  const minScore = parseInt(document.getElementById("minScore").value) || 0;

  let filtered = candidateData.filter(c =>
    c.name.toLowerCase().includes(search) && c.score >= minScore
  );

  let table = `
    <table>
      <tr>
        <th>Name</th>
        <th>Score</th>
        <th>Details</th>
      </tr>
  `;

  filtered.forEach(c => {
    table += `
      <tr>
        <td>${c.name}</td>
        <td>${c.score}%</td>
        <td><button onclick='openModal(${JSON.stringify(c)})'>View</button></td>
      </tr>
    `;
  });

  table += "</table>";
  resultDiv.innerHTML = table;
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
    ${formatSkills(c.matched, true)}
    <h4>Missing Skills</h4>
    ${formatSkills(c.missing, false)}
  `;

  modal.style.display = "block";
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

function formatSkills(skills, matched) {
  if (!skills) return "";
  let color = matched ? "skill-match" : "skill-miss";
  return skills.split(",").map(s =>
    `<span class="${color}">${s.trim()}</span>`
  ).join(" ");
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

function clearResults() {
  document.getElementById("result").innerHTML = "";
}
