const BACKEND_URL = "https://ai-resume-backend-w44h.onrender.com";

const jdPdfInput = document.getElementById("jdPdf");
const resumeInput = document.getElementById("resumePdfs");

jdPdfInput.addEventListener("change", () => {
  document.getElementById("jdFileName").innerText =
    jdPdfInput.files.length ? jdPdfInput.files[0].name : "";
});

resumeInput.addEventListener("change", () => {
  const names = Array.from(resumeInput.files).map(f => f.name);
  document.getElementById("resumeFileNames").innerText = names.join(", ");
});

async function analyzeResumes() {
  const jdText = document.getElementById("jdText").value.trim();
  const resumes = resumeInput.files;

  if (!jdText && jdPdfInput.files.length === 0) {
    alert("Please provide Job Description text or PDF");
    return;
  }

  if (resumes.length === 0) {
    alert("Please upload at least one resume PDF");
    return;
  }

  document.getElementById("loader").style.display = "block";

  const formData = new FormData();
  formData.append("jd_text", jdText);

  if (jdPdfInput.files.length) {
    formData.append("jd_pdf", jdPdfInput.files[0]);
  }

  for (let file of resumes) {
    formData.append("resume_pdfs", file);
  }

  try {
    const res = await fetch(`${BACKEND_URL}/predict`, {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    loadCandidates();
  } catch (err) {
    alert("Server error. Check backend.");
    console.error(err);
  }

  document.getElementById("loader").style.display = "none";
}

async function loadCandidates() {
  const res = await fetch(`${BACKEND_URL}/candidates`);
  const data = await res.json();

  const table = document.getElementById("resultTable");
  table.innerHTML = "";

  let total = data.length;
  let sum = 0;
  let best = data[0];
  let worst = data[0];

  data.forEach(c => {
    sum += c.score;
    if (c.score > best.score) best = c;
    if (c.score < worst.score) worst = c;

    table.innerHTML += `
      <tr>
        <td>${c.name}</td>
        <td>
          <div class="progress-bar">
            <div class="progress-fill ${getScoreClass(c.score)}"
                 style="width:${c.score}%">${c.score}%</div>
          </div>
        </td>
        <td>${formatSkills(c.matched, "match")}</td>
        <td>${formatSkills(c.missing, "miss")}</td>
      </tr>`;
  });

  document.getElementById("totalCount").innerText = total;
  document.getElementById("avgScore").innerText = total ? Math.round(sum / total) + "%" : "0%";
  document.getElementById("bestCandidate").innerText = best?.name || "-";
  document.getElementById("worstCandidate").innerText = worst?.name || "-";
}

function getScoreClass(score) {
  if (score >= 80) return "score-high";
  if (score >= 50) return "score-mid";
  return "score-low";
}

function formatSkills(skills, type) {
  if (!skills || !skills.length) return "-";
  return skills.map(s =>
    `<span class="skill-${type}">${s}</span>`
  ).join(" ");
}

function clearAll() {
  document.getElementById("jdText").value = "";
  jdPdfInput.value = "";
  resumeInput.value = "";
  document.getElementById("jdFileName").innerText = "";
  document.getElementById("resumeFileNames").innerText = "";
  document.getElementById("resultTable").innerHTML = "";
}
