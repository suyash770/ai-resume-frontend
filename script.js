function analyze() {
  let jdText = document.getElementById("jd").value;
  let files = document.getElementById("pdf").files;
  let resultDiv = document.getElementById("result");
  let button = document.querySelector("button");

  if (files.length === 0) {
    resultDiv.innerHTML = "<h3>Please upload Resume PDFs 📄</h3>";
    return;
  }

  button.disabled = true;
  button.innerText = "Analyzing...";
  resultDiv.innerHTML = `<div class="loader"></div><h3>Processing Resumes...</h3>`;

  let formData = new FormData();
  formData.append("jd_text", jdText);

  for (let i = 0; i < files.length; i++) {
    formData.append("resume_pdfs", files[i]);
  }

  fetch("https://ai-resume-backend-y87p.onrender.com/predict", {
    method: "POST",
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      button.disabled = false;
      button.innerText = "Analyze Resume";
      loadCandidates();
    });
}
