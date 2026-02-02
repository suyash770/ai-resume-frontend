const BASE_URL = "https://ai-resume-backend-w44h.onrender.com";
let candidateData = [];
let chart;

window.onload = () => {
  setupUploads();
  loadCandidates();
  loadSessions();
};

// ---------- Upload wiring ----------
function setupUploads() {
  jdDrop.onclick = () => jd_pdf.click();
  resumeDrop.onclick = () => pdf.click();

  jd_pdf.onchange = () =>
    jdFileName.innerText = jd_pdf.files[0]?.name || "";

  pdf.onchange = () =>
    resumeFileName.innerText = [...pdf.files].map(f => f.name).join(", ");
}

// ---------- Analyze ----------
function analyze() {
  const fd = new FormData();
  const jdFile = jd_pdf.files[0];

  if (jdFile) fd.append("jd_pdf", jdFile);
  else fd.append("jd_text", jd.value);

  [...pdf.files].forEach(f => fd.append("resume_pdfs", f));

  fetch(`${BASE_URL}/predict`, { method: "POST", body: fd })
    .then(() => {
      loadCandidates();
      loadSessions();
      showToast("Analysis complete ✅");
    });
}

// ---------- Data ----------
function loadCandidates() {
  fetch(`${BASE_URL}/candidates`)
    .then(r => r.json())
    .then(data => {
      candidateData = data;
      renderTable();
      renderChart();
    });
}

// ---------- Premium Table ----------
function renderTable() {
  let html = `
    <table class="ats-table">
      <tr>
        <th>Candidate</th>
        <th>ATS Score</th>
        <th>Matched Skills</th>
        <th>Missing Skills</th>
        <th>Details</th>
      </tr>`;

  candidateData.forEach(c => {
    html += `
      <tr>
        <td>${c.name}</td>
        <td>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${c.score}%">
              ${c.score}%
            </div>
          </div>
        </td>
        <td>${skillBadges(c.matched, true)}</td>
        <td>${skillBadges(c.missing, false)}</td>
        <td><button onclick='openModal(${JSON.stringify(c)})'>View</button></td>
      </tr>`;
  });

  html += "</table>";
  result.innerHTML = html;
}

function skillBadges(skills, good) {
  if (!skills) return "";
  const cls = good ? "skill-match" : "skill-miss";
  return skills.split(",").map(s =>
    `<span class="${cls}">${s.trim()}</span>`
  ).join(" ");
}

// ---------- Chart ----------
function renderChart() {
  if (chart) chart.destroy();
  chart = new Chart(scoreChart, {
    type: "bar",
    data: {
      labels: candidateData.map(c => c.name),
      datasets: [{
        label: "ATS Score",
        data: candidateData.map(c => c.score)
      }]
    },
    options: { responsive: true }
  });
}

// ---------- Sessions ----------
function loadSessions() {
  fetch(`${BASE_URL}/sessions`)
    .then(r => r.json())
    .then(data => {
      sessionList.innerHTML = "";
      data.forEach(s =>
        sessionList.innerHTML +=
          `<li><button onclick="loadSession('${s}')">
            Session ${s.substring(0,8)}
          </button></li>`
      );
    });
}

function loadSession(id) {
  fetch(`${BASE_URL}/session/${id}`)
    .then(r => r.json())
    .then(data => {
      candidateData = data;
      renderTable();
      renderChart();
    });
}

// ---------- Modal ----------
function openModal(c) {
  modalBody.innerHTML = `
    <h2>${c.name}</h2>
    <p>${c.explanation}</p>
    <button onclick="downloadPDF('${c.name}')">Download PDF</button>
  `;
  modal.style.display = "block";
}

function closeModal() {
  modal.style.display = "none";
}

function downloadPDF(name) {
  html2pdf().from(modalBody).save(`${name}.pdf`);
}

// ---------- Logout ----------
function logoutUser() {
  localStorage.clear();
  window.location.href = "login.html";
}

// ---------- Toast ----------
function showToast(msg) {
  toast.innerText = msg;
  toast.style.display = "block";
  setTimeout(() => toast.style.display = "none", 3000);
}
