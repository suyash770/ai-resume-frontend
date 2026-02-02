const BASE_URL = "https://ai-resume-backend-w44h.onrender.com";
let candidateData = [];
let chart;

// ---------------- LOAD ON START ----------------
window.onload = () => {
  loadCandidates();
  loadSessions();
};

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
      loadSessions();
      showToast("Resumes analyzed successfully ✅");
    });
}

// ---------------- LOAD CURRENT CANDIDATES ----------------
function loadCandidates() {
  fetch(`${BASE_URL}/candidates`)
    .then(res => res.json())
    .then(data => {
      candidateData = data;
      renderDashboard();
      renderChart();
    });
}

// ---------------- HR HISTORY ----------------
function loadSessions() {
  fetch(`${BASE_URL}/sessions`)
    .then(res => res.json())
    .then(data => {
      const list = document.getElementById("sessionList");
      if (!list) return;

      list.innerHTML = "";

      data.forEach(sid => {
        list.innerHTML += `
          <li style="margin:8px 0;">
            <button onclick="loadSession('${sid}')">
              Open Session ${sid.substring(0, 8)}
            </button>
          </li>
        `;
      });
    });
}

function loadSession(sid) {
  fetch(`${BASE_URL}/session/${sid}`)
    .then(res => res.json())
    .then(data => {
      candidateData = data;
      renderDashboard();
      renderChart();
      showToast("Old session loaded");
    });
}

// ---------------- DASHBOARD ----------------
function renderDashboard() {
  const resultDiv = document.getElementById("result");

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
    table += `
      <tr>
        <td>${c.name}</td>
        <td>
          <div class="progress-bar">
            <div class="progress-fill score-mid" style="width:${c.score}%">
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
  resultDiv.innerHTML = table;
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

// ---------------- MODAL + PDF ----------------
function openModal(c) {
  const modal = document.getElementById("modal");
  const body = document.getElementById("modalBody");

  body.innerHTML = `
    <div id="pdfContent">
      <h2>${c.name}</h2>
      <h3>ATS Score: ${c.score}%</h3>
      <p>${c.explanation}</p>
      <h4>Matched Skills</h4>
      ${formatSkills(c.matched, true)}
      <h4>Missing Skills</h4>
      ${formatSkills(c.missing, false)}
    </div>
    <br>
    <button onclick='downloadPDF("${c.name}")'>Download Report (PDF)</button>
  `;

  modal.style.display = "block";
}

function downloadPDF(name) {
  const element = document.getElementById("pdfContent");
  html2pdf().from(element).save(`${name}_ATS_Report.pdf`);
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
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
