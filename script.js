const BASE_URL = "https://ai-resume-backend-w44h.onrender.com";
let candidateData = [];
let scoreChart;

// ---------- FILE HELPERS ----------
const jdInput = document.getElementById("jd_pdf");
const resumeInput = document.getElementById("pdf");

document.getElementById("jdDrop").onclick = () => jdInput.click();
document.getElementById("resumeDrop").onclick = () => resumeInput.click();

jdInput.onchange = (e) => {
    document.getElementById("jdFileName").innerText = e.target.files[0]?.name || "";
};

resumeInput.onchange = (e) => {
    const names = Array.from(e.target.files).map(f => f.name).join(", ");
    document.getElementById("resumeFileNames").innerText = names;
};

// ---------- CORE LOGIC ----------
async function analyze() {
    const jdText = document.getElementById("jd").value;
    const jdFile = jdInput.files[0];
    const resumes = resumeInput.files;

    if (resumes.length === 0) return alert("Please upload at least one resume!");
    
    document.getElementById("loader").style.display = "block";

    const formData = new FormData();
    if (jdFile) formData.append("jd_pdf", jdFile);
    else formData.append("jd_text", jdText);

    for (let file of resumes) {
        formData.append("resume_pdfs", file);
    }

    try {
        const response = await fetch(`${BASE_URL}/predict`, { method: "POST", body: formData });
        if (response.ok) {
            await loadCandidates();
            alert("Analysis successful! ✅");
        }
    } catch (err) {
        alert("Error connecting to backend ❌");
    } finally {
        document.getElementById("loader").style.display = "none";
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

    const total = candidateData.length;
    const avg = Math.round(candidateData.reduce((s, c) => s + c.score, 0) / total);
    const best = candidateData.reduce((p, c) => (p.score > c.score) ? p : c);
    const worst = candidateData.reduce((p, c) => (p.score < c.score) ? p : c);

    document.getElementById("totalCount").innerText = total;
    document.getElementById("avgScore").innerText = `${avg}%`;
    document.getElementById("bestCandidate").innerText = best.name;
    document.getElementById("worstCandidate").innerText = worst.name;

    tableBody.innerHTML = candidateData.map(c => `
        <tr>
            <td>${c.name}</td>
            <td>
                <div class="progress-bar">
                    <div class="progress-fill ${getScoreClass(c.score)}" style="width:${c.score}%"></div>
                </div>
                <small>${c.score}%</small>
            </td>
            <td>${formatSkills(c.matched, true)}</td>
            <td>${formatSkills(c.missing, false)}</td>
            <td><button onclick='openModal(${JSON.stringify(c)})'>View</button></td>
        </tr>
    `).join("");
}

// ---------- EXPORT & HELPERS ----------
function downloadReport() {
    if (candidateData.length === 0) return alert("No data to download!");
    const headers = ["Name", "Score", "Matched Skills", "Missing Skills"];
    const rows = candidateData.map(c => [`"${c.name}"`, `"${c.score}%"`, `"${c.matched}"`, `"${c.missing}"`]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "ATS_Candidate_Report.csv";
    link.click();
}

function formatSkills(skills, isMatch) {
    if (!skills) return "";
    return skills.split(",").map(s => `<span class="${isMatch ? 'skill-match' : 'skill-miss'}">${s.trim()}</span>`).join(" ");
}

function getScoreClass(s) { return s > 80 ? "score-high" : s >= 50 ? "score-mid" : "score-low"; }

function openModal(c) {
    document.getElementById("modalBody").innerHTML = `<h2>${c.name}</h2><p>${c.explanation}</p>`;
    document.getElementById("modal").style.display = "block";
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
            datasets: [{ label: 'Score', data: candidateData.map(c => c.score), backgroundColor: '#0a66c2' }]
        }
    });
}