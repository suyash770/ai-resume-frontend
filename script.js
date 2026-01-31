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
      renderTable();
    });
}

function renderTable() {
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
        <th>Matched Skills</th>
        <th>Missing Skills</th>
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
        <td>${c.matched}</td>
        <td>${c.missing}</td>
      </tr>
    `;
  });

  table += "</table>";
  resultDiv.innerHTML = table;
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
