function analyze() {
  let text = document.getElementById("resume").value;

  fetch("https://ai-resume-backend-y87p.onrender.com/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume_text: text })
  })
  .then(res => res.json())
  .then(data => {
    document.getElementById("result").innerText =
      JSON.stringify(data, null, 2);
  })
  .catch(err => {
    document.getElementById("result").innerText =
      "Error: " + err;
  });
}
