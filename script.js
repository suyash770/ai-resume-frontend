const BASE_URL = "https://ai-resume-backend-w44h.onrender.com";
let candidateData = [];
let scoreChart;

// 1. SESSION PROTECTION & REDIRECT
// Ensures users cannot bypass the login page
if (!localStorage.getItem("loggedInUser") && !window.location.href.includes("login.html")) {
    window.location.href = "login.html";
}

/**
 * INITIALIZATION & STYLISH GREETING
 */
function checkLogin() {
    let user = localStorage.getItem("loggedInUser") || "User";
    
    // Formatting the name to be more stylish (Capitalized)
    const formattedName = user.charAt(0).toUpperCase() + user.slice(1);
    
    document.getElementById("welcomeName").innerText = formattedName;
    document.getElementById("userNameDisplay").innerText = formattedName;
    
    const popup = document.getElementById("welcomePopup");
    if (popup) popup.style.display = "block";
}

function closeWelcome() {
    document.getElementById("welcomePopup").style.display = "none";
}

/**
 * NAVIGATION & SIDEBAR INTERACTIVITY
 */
// Making "Candidates" and "Settings" buttons interactive
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
            // Reload to main dashboard view
            window.location.href = "index.html"; 
        }
    });
});

/**
 * FILE INPUT HANDLING
 */
const jdInput = document.getElementById("jd_pdf");
const resumeInput = document.getElementById("pdf");

// Linking custom sidebar boxes to hidden file inputs
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

    if (resumes.length === 0) return alert("Please upload at least one resume! ❗");
    
    document.getElementById("loader").style.display = "flex";

    const formData = new FormData();
    // Synchronizing keys with the backend
    if (jdFile) formData.append("jd_pdf", jdFile);
    else formData.append("jd_text", jdText);

    for (let file of resumes) {
        formData.append("resume_pdfs", file);
    }

    try {
        const response = await fetch(`${BASE_URL}/predict`, { 
            method: "POST", 
            body: formData 
        });
        
        if (response.ok) {
            await loadCandidates();
            alert("Analysis successful! ✅");
        }
    } catch (err) {
        console.error("Fetch error:", err);
        alert("Server error. Check if your backend is running.");
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
 * UI RENDERING & DASHBOARD DATA
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
    if (score > 80) return "#22c55e"; // Green
    if (score >= 50) return "#f59e0b"; // Amber
    return "#ef4444"; // Red
}

function formatSkills(skills) {
    if (!skills) return "No matches";
    return skills.split(",").map(s => 
        `<span class="skill-tag" style="background:#f5f3ff; color:#7c3aed; padding:2px 8px; border-radius:12px; font-size:11px; margin:2px; display:inline-block;">${s.trim()}</span>`
    ).join("");
}

/**
 * DATA EXPORT & VISUALS
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
                label: 'ATS Match Score (%)',
                data: candidateData.map(c => c.score),
                backgroundColor: '#7c3aed',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, max: 100 } }
        }
    });
}

/**
 * AUTHENTICATION & UTILITIES
 */
function logout() {
    localStorage.removeItem("loggedInUser");
    window.location.href = "login.html";
}

function clearAll() {
    if(confirm("Confirm reset? This will clear the current analysis.")) {
        location.reload();
    }
}

function viewDetails(c) {
    alert(`Candidate: ${c.name}\nScore: ${c.score}%\n\nExplanation: ${c.explanation}`);
}