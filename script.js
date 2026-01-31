const BASE_URL = "https://ai-resume-backend-w44h.onrender.com";
let candidateData = [];

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

function loadCandidates() {
  fetch(`${BASE_URL}/candidates`)
    .then(res => res.json())
    .then(data => {
      candidateData = data;
      renderDashboard();
    });
}

function renderDashboard() {
  const resultDiv = document.getElementById("result");
  const search = document.getElementById("search").value.toLowerCase();
  const minScore = parseInt(document.getElementById("minScore").value) || 0;

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
  let best = filtered[0];
  let worst = filtered[filtered.length - 1];

  let summary = `
    <div class="summary">
      <div class="card-box">Total Resumes<br><b>${total}</b></div>
      <div class="card-box">Average Score<br><b>${avg}%</b></div>
      <div class="card-box">Best Candidate<br><b>${best.name}</b></div>
      <div class="card-box">Worst Candidate<br><b>${worst.name}</b></div>
    </div>
  `;

  // -------- TABLE --------
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
        <td>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${c.score}%">
              ${c.score}%
            </div>
          </div>
        </td>
        <td>
          <button onclick='openModal(${JSON.stringify(c)})'>View Details</button>
        </td>
      </tr>
    `;
  });

  table += "</table>";

  resultDiv.innerHTML = summary + table;
}

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
