function analyze() {
  let text = document.getElementById("resume").value;

  fetch("https://YOUR_BACKEND_URL.onrender.com/predict", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({resume_text: text})
  })
  .then(res => res.json())
  .then(data => {
    document.getElementById("result").innerText = "Result: " + data.result;
  });
}
