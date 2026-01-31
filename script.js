function analyze() {
  const jdText = document.getElementById("jd").value;
  const jdFile = document.getElementById("jd_pdf").files[0];
  const files = document.getElementById("pdf").files;
  const resultDiv = document.getElementById("result");

  resultDiv.innerHTML = "<h3>Processing Resumes...</h3>";

  const formData = new FormData();

  if (jdFile) {
    formData.append("jd_pdf", jdFile);
  } else {
    formData.append("jd_text", jdText);
  }

  for (let i = 0; i < files.length; i++) {
    formData.append("resume_pdfs", files[i]);
  }

  fetch("https://ai-resume-backend-y87p.onrender.com/predict", {
    method: "POST",
    body: formData,
  }).then(() => loadCandidates());
}


function loadCandidates() {
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = "";

  fetch("https://ai-resume-backend-y87p.onrender.com/candidates")
    .then(res => res.json())
    .then(data => {

      // -------- SUMMARY CARDS --------
      let total = data.length;
      let avg = Math.round(data.reduce((a, b) => a + b.score, 0) / total);
      let best = data[0];
      let worst = data[data.length - 1];

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
            <th>Matched Skills</th>
            <th>Missing Skills</th>
          </tr>
      `;

      data.forEach(c => {
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
            <td>${formatSkills(c.matched, true)}</td>
            <td>${formatSkills(c.missing, false)}</td>
          </tr>
        `;
      });

      table += "</table>";

      resultDiv.innerHTML = summary + table;
    });
}


function formatSkills(skills, matched) {
  if (!skills) return "";
  let color = matched ? "skill-match" : "skill-miss";
  return skills.split(",").map(s => 
    `<span class="${color}">${s.trim()}</span>`
  ).join(" ");
}

function clearResults() {
  document.getElementById("result").innerHTML = "";
}
