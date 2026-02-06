const BASE_URL = "https://ai-resume-backend-w44h.onrender.com";
let candidateData = [];
let scoreChart;

/**
 * INITIALIZATION & LOGIN LOGIC
 */
function checkLogin() {
  // Simulating a login check using localStorage
  let user = localStorage.getItem("loggedInUser") || "Guest";
  
  document.getElementById("welcomeName").innerText = user;
  document.getElementById("userNameDisplay").innerText = user;
  
  // Show the personalized welcome popup
  const popup = document.getElementById("welcomePopup");
  if (popup) popup.style.display = "block";
}

function closeWelcome() {
  document.getElementById("welcomePopup").style.display = "none";
}

/**
 * FILE INPUT HELPERS
 */
const jdInput = document.getElementById("jd_pdf");
const resumeInput = document.getElementById("pdf");

// Trigger hidden inputs from custom upload boxes
document.getElementById("jdDrop").onclick = () => jdInput.click();
document.getElementById("resumeDrop").onclick = () => resumeInput.click();

jdInput.onchange = (e) => {
    document.getElementById("jdFileName").innerText = e.target.files[0]?.name || "";
};

resumeInput.onchange = (e) => {
    const names = Array.from(e.target.files).map(f => f.name).join(", ");
    const display = document.getElementById("resumeFileNames");
    if (display) display.innerText = names;
};

/**
 * CORE ANALYSIS LOGIC
 */
async function analyze() {
    const jdText = document.getElementById("jd").value;
    const jdFile = jdInput.files[0];
    const resumes = resumeInput.files;

    if (resumes.length === 0) return alert("Please upload at least one resume! ❗");
    
    document.getElementById("loader").style.display = "block";

    const formData = new FormData();
    [cite_start]// Synchronized keys with app.py [cite: 1]
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
 * UI RENDERING
 */
function renderDashboard() {
    const tableBody = document.getElementById("resultTable");
    if (!candidateData || candidateData.length === 0) return;

    // Update Summary Statistics
    const total = candidateData.length;
    const avg = Math.round(candidateData.reduce((s, c) => s + c.score, 0) / total);
    const best = candidateData.reduce((prev, curr) => (prev.score > curr.score) ? prev : curr);
    const worst = candidateData.reduce((prev, curr) => (prev.score < curr.score) ? prev : curr);

    document.getElementById("totalCount").innerText = total;
    document.getElementById("avgScore").innerText = `${avg}%`;
    document.getElementById("bestCandidate").innerText = best.name;

    // Populate Results Table
    tableBody.innerHTML = candidateData.map(c => `
        <tr>
            <td>${c.name}</td>
            <td>
                <div class="progress-bar" style="background: #e2e8f0; border-radius: 10px; height: 8px; width: 100px;">
                    <div style="width:${c.score}%; height:100%; border-radius:10px; background:${getScoreColor(c.score)};"></div>
                </div>
                <small>${c.score}%</small>
            </td>
            <td>${formatSkills(c.matched)}</td>
        </tr>
    `).join("");
}

function getScoreColor(score) {
    if (score > 80) return "#22c55e"; // Success
    if (score >= 50) return "#f59e0b"; // Warning
    return "#ef4444"; // Danger
}

function formatSkills(skills) {
    if (!skills) return "";
    return skills.split(",").map(s => 
        `<span style="background:#f5f3ff; color:#7c3aed; padding:2px 8px; border-radius:12px; font-size:11px; margin:2px; display:inline-block;">${s.trim()}</span>`
    ).join("");
}

/**
 * EXPORT & CHARTS
 */
function downloadReport() {
    if (candidateData.length === 0) return alert("No data available to export!");
    
    const headers = ["Candidate Name", "ATS Score", "Matched Skills", "Missing Skills"];
    const rows = candidateData.map(c => [
        `"${c.name}"`, 
        `"${c.score}%"`, 
        `"${c.matched}"`, 
        `"${c.missing}"`
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.href = url;
    link.download = `ATS_Report_${new Date().toISOString().split('T')[0]}.csv`;
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
                backgroundColor: '#7c3aed', // Purple to match the new UI
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

function logout() {
    localStorage.removeItem("loggedInUser");
    location.reload();
}

function clearAll() {
    if(confirm("Clear all analysis data?")) location.reload();
}