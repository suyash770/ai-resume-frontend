const BASE_URL = "https://ai-resume-backend-w44h.onrender.com";
let candidateData = [];
let chart;

window.onload = () => {
  setupUploads();
  loadCandidates();
  loadSessions();
};

// ---------- Upload Handlers ----------
function setupUploads() {
  jdDrop.onclick = () => jd_pdf.click();
  resumeDrop.onclick = () => pdf.click();

  jd_pdf.onchange = () =>
    jdFileName.innerText = jd_pdf.files[0]?.name || "";

  pdf.onchange = () => {
    resumeFileName.innerText =
      [...pdf.files].map(f => f.name).join(", ");
  };
}

// ---------- Analyze ----------
function analyze() {
  const formData = new FormData();
  const jdText = jd.value;
  const jdFile = jd_pdf.files[0];

  if (jdFile) formData.append("jd_pdf", jdFile);
  else formData.append("jd_text", jdText);

  [...pdf.files].forEach(f =>
    formData.append("resume_pdfs", f)
  );

  fetch(`${BASE_URL}/predict`, {
    method: "POST",
    body: formData
  }).then(() => {
    loadCandidates();
    loadSessions();
    showToast("Analysis Complete ✅");
  });
}

// ---------- Load Candidates ----------
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
      <th>Score</th>
      <th>Matched</th>
      <th>Missing</th>
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
        <td>${formatSkills(c.matched, true)}</td>
        <td>${formatSkills(c.missing, false)}</td>
        <td><button onclick='openModal(${JSON.stringify(c)})'>View</button></td>
      </tr>`;
  });

  html += "</table>";
  result.innerHTML = html;
}

function formatSkills(skills, good) {
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
    }
  });
}

// ---------- HR History ----------
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

// ---------- Modal + PDF ----------
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
