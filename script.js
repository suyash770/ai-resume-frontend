const BASE_URL = "https://ai-resume-backend-w44h.onrender.com";
let candidateData = [];
let chart;

window.onload = () => {
  setupUploads();
  loadCandidates();
  loadSessions();
};

// ---------- Upload Wiring ----------
function setupUploads() {
  const jdDrop = document.getElementById("jdDrop");
  const jdInput = document.getElementById("jd_pdf");
  const resumeDrop = document.getElementById("resumeDrop");
  const resumeInput = document.getElementById("pdf");

  jdDrop.onclick = () => jdInput.click();
  resumeDrop.onclick = () => resumeInput.click();

  jdInput.onchange = () =>
    document.getElementById("jdFileName").innerText =
      jdInput.files[0]?.name || "";

  resumeInput.onchange = () =>
    document.getElementById("resumeFileName").innerText =
      [...resumeInput.files].map(f => f.name).join(", ");
}

// ---------- Analyze ----------
function analyze() {
  const jd = document.getElementById("jd");
  const jdInput = document.getElementById("jd_pdf");
  const resumeInput = document.getElementById("pdf");

  const fd = new FormData();

  if (jdInput.files[0])
    fd.append("jd_pdf", jdInput.files[0]);
  else
    fd.append("jd_text", jd.value);

  [...resumeInput.files].forEach(f =>
    fd.append("resume_pdfs", f)
  );

  fetch(`${BASE_URL}/predict`, {
    method: "POST",
    body: fd,
    credentials: "include"
  }).then(() => {
    loadCandidates();
    loadSessions();
  });
}

// ---------- Load Candidates ----------
function loadCandidates() {
  fetch(`${BASE_URL}/candidates`, {
    credentials: "include"
  })
    .then(r => r.json())
    .then(data => {
      candidateData = data;
      renderTable();
      renderChart();
    });
}

// ---------- Render Table ----------
function renderTable() {
  const result = document.getElementById("result");

  let html = `
    <table class="ats-table">
      <tr>
        <th>Name</th>
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
        <td>${skills(c.matched, true)}</td>
        <td>${skills(c.missing, false)}</td>
        <td>
          <button onclick='openModal(${JSON.stringify(c)})'>
            View
          </button>
        </td>
      </tr>`;
  });

  html += "</table>";
  result.innerHTML = html;
}

function skills(s, good) {
  if (!s) return "";
  const cls = good ? "skill-match" : "skill-miss";
  return s.split(",").map(x =>
    `<span class="${cls}">${x.trim()}</span>`
  ).join(" ");
}

// ---------- Chart ----------
function renderChart() {
  const ctx = document.getElementById("scoreChart");
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
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

// ---------- Sessions ----------
function loadSessions() {
  const list = document.getElementById("sessionList");

  fetch(`${BASE_URL}/sessions`, {
    credentials: "include"
  })
    .then(r => r.json())
    .then(data => {
      list.innerHTML = "";
      data.forEach(s => {
        list.innerHTML += `
          <li>
            <button onclick="loadSession('${s}')">
              ${s.substring(0,8)}
            </button>
          </li>`;
      });
    });
}

function loadSession(id) {
  fetch(`${BASE_URL}/session/${id}`, {
    credentials: "include"
  })
    .then(r => r.json())
    .then(data => {
      candidateData = data;
      renderTable();
      renderChart();
    });
}

// ---------- Modal ----------
function openModal(c) {
  document.getElementById("modalBody").innerHTML = `
    <h2>${c.name}</h2>
    <p>${c.explanation}</p>
  `;
  document.getElementById("modal").style.display = "block";
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

// ---------- Logout ----------
function logoutUser() {
  localStorage.clear();
  window.location.href = "login.html";
}
