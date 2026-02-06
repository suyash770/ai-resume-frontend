const BASE_URL = "https://ai-resume-backend-w44h.onrender.com";
let candidateData = [];
let scoreChart;

// 1. HARD SESSION PROTECTION
// Retrieves verified session data to prevent unauthorized dashboard access
const sessionData = JSON.parse(localStorage.getItem("userSession"));

if (!sessionData && !window.location.href.includes("login.html")) {
    window.location.href = "login.html";
}

// Initialize EmailJS for automated recruitment communication
(function() {
    if (typeof emailjs !== 'undefined') {
        emailjs.init("YOUR_PUBLIC_KEY"); 
    }
})();

/**
 * INITIALIZATION & PROFILE MANAGEMENT
 */
function checkLogin() {
    if (!sessionData) return;

    // Capitalizes the verified database username for the UI
    const formattedName = sessionData.username.charAt(0).toUpperCase() + sessionData.username.slice(1);
    
    // Update dashboard name displays
    if (document.getElementById("userNameDisplay")) document.getElementById("userNameDisplay").innerText = formattedName;
    if (document.getElementById("welcomeName")) document.getElementById("welcomeName").innerText = formattedName;
    if (document.getElementById("userRoleDisplay")) {
        document.getElementById("userRoleDisplay").innerText = sessionData.role.toUpperCase() + " Panel";
    }

    // Load persistent profile avatar if stored locally
    const savedAvatar = localStorage.getItem("userAvatar");
    if (savedAvatar) {
        if (document.getElementById('navAvatar')) document.getElementById('navAvatar').src = savedAvatar;
        if (document.getElementById('profilePicPreview')) document.getElementById('profilePicPreview').src = savedAvatar;
    }

    if (document.getElementById("welcomePopup")) document.getElementById("welcomePopup").style.display = "block";
}

/**
 * ROLE-SPECIFIC SESSION VALIDATION
 */
function checkAdminSession() {
    // Verifies that the logged-in user has 'admin' privileges
    if (!sessionData || sessionData.role !== 'admin') window.location.href = "login.html";
    checkLogin();
    loadCandidates(); 
    fetchLogs();      
    fetchAllUsers();  
}

function checkCandidateSession() {
    // Verifies that the logged-in user has 'candidate' privileges
    if (!sessionData || sessionData.role !== 'candidate') window.location.href = "login.html";
    if (document.getElementById("candName")) document.getElementById("candName").innerText = sessionData.username;
    checkLogin();
}

/**
 * ADMINISTRATIVE MANAGEMENT (Database Sync)
 */
async function fetchAllUsers() {
    try {
        const res = await fetch(`${BASE_URL}/admin/users`);
        const users = await res.json();
        const userTable = document.getElementById("adminUserTable");
        if (!userTable) return;

        // Render user management table from SQLite data
        userTable.innerHTML = users.map(u => `
            <tr>
                <td><strong>${u.username}</strong></td>
                <td>${u.email}</td>
                <td><span class="skill-tag">${u.role.toUpperCase()}</span></td>
                <td>
                    <button class="btn-action" style="background:#fee2e2; color:#dc2626;" 
                    onclick="deleteUser(${u.id}, '${u.username}')">Delete Account</button>
                </td>
            </tr>`).join("");
    } catch (err) { console.error("User management fetch error:", err); }
}

async function deleteUser(id, name) {
    if (!confirm(`Permanently remove ${name} from the database?`)) return;
    try {
        const res = await fetch(`${BASE_URL}/admin/delete_user/${id}?admin_email=${sessionData.email}`, { 
            method: 'DELETE' 
        });
        if (res.ok) { 
            alert("User deleted successfully! ✅"); 
            fetchAllUsers(); 
            loadCandidates(); 
        }
    } catch (err) { alert("Delete failed ❌"); }
}

async function fetchLogs() {
    try {
        const res = await fetch(`${BASE_URL}/admin/logs`);
        const logs = await res.json();
        const logTable = document.getElementById("adminLogsTable");
        if (logTable) {
            logTable.innerHTML = logs.map(l => `
                <tr><td>${l.user_email}</td><td>${l.action}</td><td>${l.timestamp}</td></tr>`).join("");
        }
    } catch (err) { console.error("Logs fetch error:", err); }
}

/**
 * HR PANEL: CORE ANALYSIS & EMAIL
 */
async function analyze() {
    const resumes = document.getElementById("pdf").files;
    if (resumes.length === 0) return alert("Please upload resumes!");
    
    document.getElementById("analysisLoader").style.display = "flex";
    const formData = new FormData();
    // Passes verified HR email to create an activity audit trail
    formData.append("hr_email", sessionData.email); 

    if (document.getElementById("jd_pdf").files[0]) {
        formData.append("jd_pdf", document.getElementById("jd_pdf").files[0]);
    } else {
        formData.append("jd_text", document.getElementById("jd").value);
    }

    for (let file of resumes) formData.append("resume_pdfs", file);

    try {
        const response = await fetch(`${BASE_URL}/predict`, { method: "POST", body: formData });
        if (response.ok) {
            await loadCandidates();
            alert("Analysis saved to database! ✅");
        }
    } catch (err) { alert("Server error ❌"); }
    finally { document.getElementById("analysisLoader").style.display = "none"; }
}

async function loadCandidates() {
    try {
        const res = await fetch(`${BASE_URL}/candidates`);
        candidateData = await res.json();
        renderDashboard();
        updateChart();
        
        // Update Admin stats from SQL metrics
        if (document.getElementById("adminTotalRuns")) {
            const stats = await (await fetch(`${BASE_URL}/admin/stats`)).json();
            document.getElementById("adminTotalRuns").innerText = stats.total_runs;
            document.getElementById("adminTotalUsers").innerText = stats.total_users;
        }
    } catch (err) { console.error("Database sync error:", err); }
}

/**
 * PASSWORD RECOVERY LOGIC
 */
async function handlePasswordReset() {
    const email = prompt("Enter registered Email:");
    const mobile = prompt("Enter registered Mobile:");
    const newPass = prompt("Enter NEW Password:");
    if (!email || !mobile || !newPass) return;

    try {
        const response = await fetch(`${BASE_URL}/reset_password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, mobile, new_pass: newPass })
        });
        const result = await response.json();
        alert(result.message || result.error);
    } catch (err) { alert("Connection error ❌"); }
}

/**
 * DASHBOARD UI RENDERING
 */
function renderDashboard() {
    const table = document.getElementById("resultTable");
    if (!table || !candidateData.length) return;

    document.getElementById("totalCount").innerText = candidateData.length;
    document.getElementById("avgScore").innerText = Math.round(candidateData.reduce((s, c) => s + c.score, 0) / candidateData.length) + "%";
    document.getElementById("bestCandidate").innerText = candidateData.reduce((p, c) => (p.score > c.score) ? p : c).name;

    table.innerHTML = candidateData.map(c => `
        <tr>
            <td><strong>${c.name}</strong></td>
            <td>
                <div class="progress-container" style="width:100px; background:#e2e8f0; border-radius:10px; height:8px;">
                    <div style="width:${c.score}%; height:100%; border-radius:10px; background:${getScoreColor(c.score)};"></div>
                </div>
                <small>${c.score}% Match</small>
            </td>
            <td>${formatSkills(c.matched)}</td>
            <td style="display: flex; gap: 8px; justify-content: center;">
                <button class="btn-action btn-view" onclick='viewDetails(${JSON.stringify(c)})'>View</button>
                <button class="btn-action btn-email" style="background:#7c3aed; color:white;" onclick='openEmailModal(${JSON.stringify(c)})'>Email</button>
            </td>
        </tr>`).join("");
}

function openEmailModal(c) {
    document.getElementById("emailTo").value = c.email || ""; 
    if (c.score > 70) {
        document.getElementById("emailSubject").value = "Interview Invitation - " + c.name;
        document.getElementById("emailMessage").value = `Hi ${c.name},\n\nYour profile matches our needs (${c.score}%). We'd like to interview you.\n\nBest,\n${sessionData.username}`;
    } else {
        document.getElementById("emailSubject").value = "Application Update - " + c.name;
        document.getElementById("emailMessage").value = `Hi ${c.name},\n\nThank you for applying. We will keep your resume on file.\n\nBest,\n${sessionData.username}`;
    }
    document.getElementById("emailModal").style.display = "flex";
}

function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}

function getScoreColor(s) { return s > 80 ? "#22c55e" : s >= 50 ? "#f59e0b" : "#ef4444"; }
function formatSkills(s) { return s ? s.split(",").map(skill => `<span class="skill-tag">${skill.trim()}</span>`).join("") : "None"; }

// Interaction triggers
if (document.getElementById("jdDrop")) {
    document.getElementById("jdDrop").onclick = () => document.getElementById("jd_pdf").click();
    document.getElementById("resumeDrop").onclick = () => document.getElementById("pdf").click();
    document.getElementById("jd_pdf").onchange = (e) => { document.getElementById("jdFileName").innerText = e.target.files[0]?.name || ""; };
    document.getElementById("pdf").onchange = (e) => { document.getElementById("resumeFileNames").innerText = Array.from(e.target.files).map(f => f.name).join(", "); };
}

function updateChart() {
    const ctx = document.getElementById('scoreChart')?.getContext('2d');
    if (!ctx) return;
    if (scoreChart) scoreChart.destroy();
    scoreChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: candidateData.map(c => c.name),
            datasets: [{ label: 'Score %', data: candidateData.map(c => c.score), backgroundColor: '#7c3aed', borderRadius: 5 }]
        }
    });
}