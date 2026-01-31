function analyze() {
  let text = document.getElementById("resume").value;

  fetch("https://ai-resume-backend-y87p.onrender.com/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume_text: text })
  })
  .then(res => res.json())
  .then(data => {
    document.getElementById("result").innerHTML = `
      <h2>ATS Score: ${data.score}%</h2>
      <p><b>Resume Skills:</b> ${data.resume_skills.join(", ")}</p>
      <p><b>Matched Skills:</b> ${data.matched_skills.join(", ")}</p>
      <p><b>Missing Skills:</b> ${data.missing_skills.join(", ")}</p>
    `;
  })
  .catch(err => {
    document.getElementById("result").innerText =
      "Error connecting to server";
  });
}
