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

  fetch("https://ai-resume-backend-y87p.onrender.com/predict", {
    method: "POST",
    body: formData,
  }).then(() => loadCandidates());
}

function loadCandidates() {
  fetch("https://ai-resume-backend-y87p.onrender.com/candidates")
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

  let table = `
    <table>
      <tr>
        <th>Name</th>
        <th>Score</th>
      </tr>
  `;

  filtered.forEach(c => {
    table += `
      <tr onclick='openModal(${JSON.stringify(c)})' style="cursor:pointer">
        <td>${c.name}</td>
        <td>${c.score}%</td>
      </tr>
    `;
  });

  table += "</table>";
  resultDiv.innerHTML = table;
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
