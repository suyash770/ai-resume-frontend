const BASE_URL = "https://ai-resume-backend-w44h.onrender.com";
let candidateData = [];
let scoreChart;

// 1. SESSION PROTECTION
if (!localStorage.getItem("loggedInUser") && !window.location.href.includes("login.html")) {
    window.location.href = "login.html";
}

/**
 * INITIALIZATION & NAVIGATION
 */
function checkLogin() {
    let user = localStorage.getItem("loggedInUser") || "User";
    const formattedName = user.charAt(0).toUpperCase() + user.slice(1);
    
    document.getElementById("welcomeName").innerText = formattedName;
    document.getElementById("userNameDisplay").innerText = formattedName;
    
    const popup = document.getElementById("welcomePopup");
    if (popup) popup.style.display = "block";
}

function closeWelcome() {
    document.getElementById("welcomePopup").style.display = "none";
}

// Sidebar Navigation Handling
document.querySelectorAll('.side-nav li').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.side-nav li').forEach(li => li.classList.remove('active'));
        this.classList.add('active');
        
        const page = this.innerText.toLowerCase();
        if (page.includes("candidates")) {
            alert("Switching to Candidates Management View...");
        } else if (page.includes("settings")) {
            alert("Opening System Settings...");
        } else if (page.includes("dashboard")) {
            window.location.href = "index.html"; 
        }
    });
});

/**
 * FILE INPUT HANDLING
 */
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

/**
 * CORE ANALYSIS LOGIC
 */
async function analyze() {
    const jdText = document.getElementById("jd").value;
    const jdFile = jdInput.files[0];
    const resumes = resumeInput.files;

    if (resumes.length === 0) return alert("Please upload at least one resume!");
    
    document.getElementById("loader").style.display = "flex";

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
    try {
        const res = await fetch(`${BASE_URL}/candidates`);
        candidateData = await res.json();
        renderDashboard();
        updateChart();
    } catch (err) {
        console.error("Load error:", err);
    }
}

/**
 * UI RENDERING
 */
function renderDashboard() {
    const tableBody = document.getElementById("resultTable");
    if (!candidateData || candidateData.length === 0) return;

    const total = candidateData.length;
    const avg = Math.round(candidateData.reduce((s, c) => s + c.score, 0) / total);
    const best = candidateData.reduce((prev, curr) => (prev.score > curr.score) ? prev : curr);

    document.getElementById("totalCount").innerText = total;
    document.getElementById("avgScore").innerText = `${avg}%`;
    document.getElementById("bestCandidate").innerText = best.name;

    tableBody.innerHTML = candidateData.map(c => `
        <tr>
            <td><strong>${c.name}</strong></td>
            <td>
                <div class="progress-container" style="width: 100px; background: #e2e8f0; border-radius: 10px; height: 8px;">
                    <div style="width:${c.score}%; height:100%; border-radius:10px; background:${getScoreColor(c.score)};"></div>
                </div>
                <small>${c.score}% Match</small>
            </td>
            <td>${formatSkills(c.matched)}</td>
            <td><button class="btn-view" onclick='viewDetails(${JSON.stringify(c)})'>View</button></td>
        </tr>
    `).join("");
}

function getScoreColor(score) {
    if (score > 80) return "#22c55e"; 
    if (score >= 50) return "#f59e0b"; 
    return "#ef4444"; 
}

function formatSkills(skills) {
    if (!skills) return "No matches";
    return skills.split(",").map(s => `<span class="skill-tag">${s.trim()}</span>`).join("");
}

/**
 * MODAL LOGIC (REPLACING ALERTS)
 */
function viewDetails(c) {
    document.getElementById("modalCandidateName").innerText = c.name;
    document.getElementById("modalScore").innerText = c.score;
    document.getElementById("modalExplanation").innerText = c.explanation;
    document.getElementById("detailsModal").style.display = "flex";
}

function closeModal() {
    document.getElementById("detailsModal").style.display = "none";
}

window.onclick = function(event) {
    const modal = document.getElementById("detailsModal");
    if (event.target == modal) closeModal();
}

/**
 * UTILITIES
 */
function downloadReport() {
    if (candidateData.length === 0) return alert("No data to export!");
    const headers = ["Name", "Score", "Matched Skills", "Missing Skills"];
    const rows = candidateData.map(c => [`"${c.name}"`, `"${c.score}%"`, `"${c.matched}"`, `"${c.missing}"`]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ATS_Report_${new Date().toLocaleDateString()}.csv`;
    link.click();
}

function updateChart() {
    const ctx = document.getElementById('scoreChart').getContext('2d');
    if (scoreChart) scoreChart.destroy();
    scoreChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: candidateData.map(c => c.name),
            datasets: [{
                label: 'ATS Match Score',
                data: candidateData.map(c => c.score),
                backgroundColor: '#7c3aed',
                borderRadius: 5
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function logout() {
    localStorage.removeItem("loggedInUser");
    window.location.href = "login.html";
}

function clearAll() {
    if(confirm("Confirm reset?")) location.reload();
}