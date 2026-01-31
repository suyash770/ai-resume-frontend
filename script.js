function analyze() {
  const jdText = document.getElementById("jd").value;
  const files = document.getElementById("pdf").files;
  const resultDiv = document.getElementById("result");
  const button = document.querySelector("button");

  if (files.length === 0) {
    resultDiv.innerHTML = "<h3>Please upload Resume PDF</h3>";
    return;
  }

  button.disabled = true;
  button.innerText = "Analyzing...";
  resultDiv.innerHTML = "<h3>Processing Resumes...</h3>";

  const formData = new FormData();
  formData.append("jd_text", jdText);

  for (let i = 0; i < files.length; i++) {
    formData.append("resume_pdfs", files[i]);
  }

  fetch("https://ai-resume-backend-y87p.onrender.com/predict", {
    method: "POST",
    body: formData,
  })
    .then(() => {
      // Backend finished — now load ranking
      loadCandidates();
    })
    .catch(() => {
      resultDiv.innerHTML = "<h3>Error processing resumes</h3>";
      button.disabled = false;
      button.innerText = "Analyze Resume";
    });
}


function loadCandidates() {
  const resultDiv = document.getElementById("result");

  fetch("https://ai-resume-backend-y87p.onrender.com/candidates")
    .then((res) => res.json())
    .then((data) => {
      let table = `
        <h2>Candidate Ranking</h2>
        <table border="1" cellpadding="10">
          <tr>
            <th>Name</th>
            <th>Score</th>
            <th>Matched Skills</th>
            <th>Missing Skills</th>
          </tr>
      `;

      data.forEach((c) => {
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

      const button = document.querySelector("button");
      button.disabled = false;
      button.innerText = "Analyze Resume";
    });
}
