function analyze() {
  let jdText = document.getElementById("jd").value;
  let pdfFile = document.getElementById("pdf").files[0];
  let resultDiv = document.getElementById("result");
  let button = document.querySelector("button");

  // Check PDF upload
  if (!pdfFile) {
    resultDiv.innerHTML = "<h3>Please upload a Resume PDF 📄</h3>";
    return;
  }

  // Instant feedback UI
  button.disabled = true;
  button.innerText = "Analyzing...";
  resultDiv.innerHTML = `
    <div class="loader"></div>
    <h3>Processing Resume... Please wait ⏳</h3>
  `;

  // Prepare form data
  let formData = new FormData();
  formData.append("jd_text", jdText);
  formData.append("resume_pdf", pdfFile);

  // Call backend API
  fetch("https://ai-resume-backend-y87p.onrender.com/predict", {
    method: "POST",
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      displayResult(data);
      button.disabled = false;
      button.innerText = "Analyze Resume";
    })
    .catch(err => {
      resultDiv.innerHTML = "<h3>Server error. Please try again.</h3>";
      button.disabled = false;
      button.innerText = "Analyze Resume";
      console.error(err);
    });
}

// Function to display ATS result nicely
function displayResult(data) {
  let skills = data.resume_skills.map(s => `<span class="skill-box">${s}</span>`).join("");
  let matched = data.matched_skills.map(s => `<span class="skill-box">${s}</span>`).join("");
  let missing = data.missing_skills.map(s => `<span class="skill-box">${s}</span>`).join("");

  document.getElementById("result").innerHTML = `
    <div class="score-card">
      <h2>ATS Score: ${data.score}%</h2>
      <div class="progress-bar">
        <div class="progress" style="width:${data.score}%">${data.score}%</div>
      </div>
    </div>

    <div class="score-card">
      <h3>Resume Skills</h3>
      ${skills}
    </div>

    <div class="score-card">
      <h3>Matched Skills</h3>
      ${matched}
    </div>

    <div class="score-card">
      <h3>Missing Skills</h3>
      ${missing}
    </div>
  `;
}

function loadCandidates() {
  fetch("https://ai-resume-backend-y87p.onrender.com/candidates")
    .then(res => res.json())
    .then(data => {
      let table = `
        <div class="score-card">
        <h2>Candidate Ranking</h2>
        <table border="1" width="100%" cellpadding="8">
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

      table += "</table></div>";
      document.getElementById("table").innerHTML = table;
    });
}
