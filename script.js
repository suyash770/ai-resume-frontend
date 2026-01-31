function analyze() {
  let resumeText = document.getElementById("resume").value;
  let jdText = document.getElementById("jd").value;

  fetch("https://ai-resume-backend-y87p.onrender.com/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resume_text: resumeText,
      jd_text: jdText
    })
  })
  .then(res => res.json())
  .then(data => {
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
        <h3>Resume Skills</h3>${skills}
      </div>

      <div class="score-card">
        <h3>Matched Skills</h3>${matched}
      </div>

      <div class="score-card">
        <h3>Missing Skills</h3>${missing}
      </div>
    `;
  });
}
