const BASE_URL = "https://ai-resume-backend-w44h.onrender.com";
let candidateData = [];
let scoreChart;

// ---------- FILE HELPERS ----------
function addFiles(input, newFiles) {
  const dt = new DataTransfer();
  for (let f of input.files) dt.items.add(f);
  for (let f of newFiles) dt.items.add(f);
  input.files = dt.files;
}

// ---------- DRAG & DROP ----------
const jdDrop = document.getElementById("jdDrop");
const resumeDrop = document.getElementById("resumeDrop");

jdDrop.onclick = () => document.getElementById("jd_pdf").click();
resumeDrop.onclick = () => document.getElementById("pdf").click();

document.getElementById("jd_pdf").onchange = (e) => {
  document.getElementById("jdFileName").innerText = e.target.files[0]?.name || "";
};

document.getElementById("pdf").onchange = (e) => {
  let names = Array.from(e.target.files).map(f => f.name).join(", ");
  document.getElementById("resumeFileNames").innerText = names;
};

// ---------- ANALYZE ----------
async function analyze() {
  const loader = document.getElementById("loader");
  if(loader) loader.style.display = "block";

  const jdText = document.getElementById("jd").value;
  const jdFile = document.getElementById("jd_pdf").files[0];
  const files = document.getElementById("pdf").files;

  if (files.length === 0) {
    alert("Please upload at least one resume ❗");
    if(loader) loader.style.display = "none";
    return;
  }

  const formData = new FormData();
  if (jdFile) formData.append("jd_pdf", jdFile);
  else formData.append("jd_text", jdText);

  for (let i = 0; i < files.length; i++) {
    formData.append("resume_pdfs", files[i]);
  }

  try {
    const response = await fetch(`${BASE_URL}/predict`, { method: "POST", body: formData });
    if (response.ok) {
        await loadCandidates();
        alert("Analysis Complete! ✅");
    }
  } catch (err) {
    alert("Error reaching the backend ❌");
  } finally {
    if(loader) loader.style.display = "none";
  }
}

async function loadCandidates() {
  const res = await fetch(`${BASE_URL}/candidates`);
  candidateData = await res.json();
  renderDashboard();
  updateChart();
}

function renderDashboard() {
  const tableBody = document.getElementById("resultTable");
  if (candidateData.length === 0) return;

  let total = candidateData.length;
  let avg = Math.round(candidateData.reduce((a, b) => a + b.score, 0) / total);
  let best = candidateData.reduce((a, b) => a.score > b.score ? a : b);
  let worst = candidateData.reduce((a, b) => a.score < b.score ? a : b);

  document.getElementById("totalCount").innerText = total;
  document.getElementById("avgScore").innerText = avg + "%";
  document.getElementById("bestCandidate").innerText = best.name;
  document.getElementById("worstCandidate").innerText = worst.name;

  tableBody.innerHTML = candidateData.map(c => `
    <tr>
      <td>${c.name}</td>
      <td>
        <div class="progress-bar">
          <div class="progress-fill ${c.score > 80 ? 'score-high' : c.score >= 50 ? 'score-mid' : 'score-low'}" style="width:${c.score}%">
            ${c.score}%
          </div>
        </div>
      </td>
      <td>${formatSkills(c.matched, true)}</td>
      <td>${formatSkills(c.missing, false)}</td>
      <td><button onclick='openModal(${JSON.stringify(c)})'>View</button></td>
    </tr>`).join("");
}

function formatSkills(skills, matched) {
  if (!skills) return "";
  return skills.split(",").map(s => `<span class="${matched ? 'skill-match' : 'skill-miss'}">${s.trim()}</span>`).join(" ");
}

function openModal(c) {
  const modal = document.getElementById("modal");
  document.getElementById("modalBody").innerHTML = `<h2>${c.name}</h2><h3>Score: ${c.score}%</h3><p>${c.explanation}</p>`;
  modal.style.display = "block";
}

function closeModal() { document.getElementById("modal").style.display = "none"; }
function clearAll() { location.reload(); }

function updateChart() {
    const ctx = document.getElementById('scoreChart').getContext('2d');
    if (scoreChart) scoreChart.destroy();
    scoreChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: candidateData.map(c => c.name),
            datasets: [{ label: 'ATS Score', data: candidateData.map(c => c.score), backgroundColor: '#0a66c2' }]
        }
    });
}