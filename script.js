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
            <td>${c.score}%</td>
            <td>${c.matched}</td>
            <td>${c.missing}</td>
          </tr>
        `;
      });

      table += "</table>";
      resultDiv.innerHTML = table;
    });
}

function clearResults() {
  document.getElementById("result").innerHTML = "";
}
