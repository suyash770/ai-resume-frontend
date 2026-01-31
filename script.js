function analyze() {
  let jdText = document.getElementById("jd").value;
  let pdfFile = document.getElementById("pdf").files[0];
  let button = document.querySelector("button");
  let resultDiv = document.getElementById("result");

  if (!pdfFile) {
    resultDiv.innerHTML = "<h3>Please upload a Resume PDF first 📄</h3>";
    return;
  }

  button.disabled = true;
  button.innerText = "Analyzing...";
  resultDiv.innerHTML = "<h3>Analyzing Resume... Please wait ⏳</h3>";

  let formData = new FormData();
  formData.append("jd_text", jdText);
  formData.append("resume_pdf", pdfFile);

  fetch("https://ai-resume-backend-y87p.onrender.com/predict", {
    method: "POST",
    body: formData
  })
  .then(res => res.json())
  .then(data => {
    let skills = data.resume_skills.map(s => `<span class="skill-box">${s}</span>`).join("");
    let matched = data.matched_skills.map(s => `<span class="skill-box">${s}</span>`).join("");
    let missing = data.missing_skills.map(s => `<span class="skill-box">${s}</span>`).join("");

    resultDiv.innerHTML = `
      <div class="score-card">
        <h2>ATS Score: ${data.score}%</h2>
        <div class="progress-bar">
          <div class="progress" style="width:${data.score}%">${data.score}%</div>
        </div>
      </div>

      <div class="score-card">
        <h3>Resume Skills</h3>${skills}
      </div>

      <div class="score-card">
        <h3>Matched Skills</h3>${matched}
      </div>

      <div class="score-card">
        <h3>Missing Skills</h3>${missing}
      </div>
    `;

    button.disabled = false;
    button.innerText = "Analyze Resume";
  })
  .catch(err => {
    resultDiv.innerHTML = "<h3>Server error. Please try again.</h3>";
    button.disabled = false;
    button.innerText = "Analyze Resume";
  });
}
