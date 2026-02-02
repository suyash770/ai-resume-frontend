const BASE_URL = "https://ai-resume-backend-w44h.onrender.com";
let candidateData = [];
let chart;

// ---------- ON LOAD ----------
window.onload = () => {
  loadCandidates();
  loadSessions();
  setupUploads();
};

// ---------- UPLOAD HANDLERS ----------
function setupUploads() {
  const jdDrop = document.getElementById("jdDrop");
  const jdInput = document.getElementById("jd_pdf");
  const resumeDrop = document.getElementById("resumeDrop");
  const resumeInput = document.getElementById("pdf");

  jdDrop.onclick = () => jdInput.click();
  resumeDrop.onclick = () => resumeInput.click();

  jdInput.onchange = () => {
    document.getElementById("jdFileName").innerText =
      jdInput.files[0]?.name || "";
  };

  resumeInput.onchange = () => {
    let names = [];
    for (let f of resumeInput.files) names.push(f.name);
    document.getElementById("resumeFileName").innerText = names.join(", ");
  };
}

// ---------- ANALYZE ----------
function analyze() {
  const jdText = document.getElementById("jd").value;
  const jdFile = document.getElementById("jd_pdf").files[0];
  const files = document.getElementById("pdf").files;

  const formData = new FormData();
  if (jdFile) formData.append("jd_pdf", jdFile);
  else formData.append("jd_text", jdText);

  for (let f of files) formData.append("resume_pdfs", f);

  fetch(`${BASE_URL}/predict`, { method: "POST", body: formData })
    .then(() => {
      loadCandidates();
      loadSessions();
      showToast("Analysis complete ✅");
    });
}

// ---------- LOAD CANDIDATES ----------
function loadCandidates() {
  fetch(`${BASE_URL}/candidates`)
    .then(res => res.json())
    .then(data => {
      candidateData = data;
      renderTable();
      renderChart();
    });
}

// ---------- RENDER TABLE ----------
function renderTable() {
  let html = "<table><tr><th>Name</th><th>Score</th><th>Details</th></tr>";

  candidateData.forEach(c => {
    html += `
      <tr>
        <td>${c.name}</td>
        <td>${c.score}%</td>
        <td><button onclick='openModal(${JSON.stringify(c)})'>View</button></td>
      </tr>
    `;
  });

  html += "</table>";
  document.getElementById("result").innerHTML = html;
}

// ---------- CHART ----------
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

// ---------- HR HISTORY ----------
function loadSessions() {
  fetch(`${BASE_URL}/sessions`)
    .then(res => res.json())
    .then(data => {
      const list = document.getElementById("sessionList");
      list.innerHTML = "";
      data.forEach(sid => {
        list.innerHTML += `
          <li><button onclick="loadSession('${sid}')">
            Session ${sid.substring(0,8)}
          </button></li>`;
      });
    });
}

function loadSession(sid) {
  fetch(`${BASE_URL}/session/${sid}`)
    .then(res => res.json())
    .then(data => {
      candidateData = data;
      renderTable();
      renderChart();
    });
}

// ---------- MODAL ----------
function openModal(c) {
  document.getElementById("modalBody").innerHTML = `
    <h2>${c.name}</h2>
    <p>Score: ${c.score}%</p>
    <p>${c.explanation}</p>
    <button onclick="downloadPDF('${c.name}')">Download PDF</button>
  `;
  document.getElementById("modal").style.display = "block";
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

// ---------- PDF ----------
function downloadPDF(name) {
  const element = document.getElementById("modalBody");
  html2pdf().from(element).save(`${name}_ATS_Report.pdf`);
}

// ---------- LOGOUT ----------
function logoutUser() {
  localStorage.clear();
  window.location.href = "login.html";
}

// ---------- TOAST ----------
function showToast(msg) {
  const t = document.getElementById("toast");
  t.innerText = msg;
  t.style.display = "block";
  setTimeout(() => t.style.display = "none", 3000);
}
