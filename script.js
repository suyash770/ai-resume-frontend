const BASE_URL = "https://ai-resume-backend-w44h.onrender.com";
let candidateData = [];
let scoreChart;

// 1. HARD SESSION PROTECTION
// Only allows access if a valid verified session exists in localStorage
const sessionData = JSON.parse(localStorage.getItem("userSession"));

if (!sessionData && !window.location.href.includes("login.html")) {
    window.location.href = "login.html";
}

/**
 * AUTHENTICATION LOGIC (Used in login.html)
 * Verifies credentials against the SQL database
 */
async function handleLogin(email, pass, role) {
    try {
        const response = await fetch(`${BASE_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, pass, role })
        });
        const result = await response.json();

        if (response.ok) {
            // Save the verified user data from the database
            localStorage.setItem("userSession", JSON.stringify(result.user));
            window.location.href = result.redirect;
        } else {
            alert(result.error);
        }
    } catch (err) {
        alert("Connection to authentication server failed ❌");
    }
}

async function handleRegister(name, email, mobile, pass, role) {
    try {
        const response = await fetch(`${BASE_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, mobile, pass, role })
        });
        const result = await response.json();

        if (response.ok) {
            alert("Registration successful! You can now login. ✅");
            return true;
        } else {
            alert(result.error);
            return false;
        }
    } catch (err) {
        alert("Registration failed. Please try again later.");
    }
}

/**
 * INITIALIZATION & PROFILE MANAGEMENT
 */
function checkLogin() {
    if (!sessionData) return;

    // Sets the display name using the verified database username
    const formattedName = sessionData.username.charAt(0).toUpperCase() + sessionData.username.slice(1);
    
    // Load persisted profile data from local storage
    const savedProfile = JSON.parse(localStorage.getItem("userProfile"));
    const savedAvatar = localStorage.getItem("userAvatar");
    
    if (savedProfile) {
        if (document.getElementById("profileFullName")) document.getElementById("profileFullName").value = savedProfile.name || "";
        if (document.getElementById("profileRole")) document.getElementById("profileRole").value = savedProfile.role || "";
        if (document.getElementById("profileDOB")) document.getElementById("profileDOB").value = savedProfile.dob || "";
        if (document.getElementById("profileEmail")) document.getElementById("profileEmail").value = savedProfile.email || "";
        
        document.getElementById("userNameDisplay").innerText = savedProfile.name || formattedName;
    } else {
        document.getElementById("userNameDisplay").innerText = formattedName;
    }
    
    if (savedAvatar) {
        if (document.getElementById('navAvatar')) document.getElementById('navAvatar').src = savedAvatar;
        if (document.getElementById('profilePicPreview')) document.getElementById('profilePicPreview').src = savedAvatar;
    }

    if (document.getElementById("welcomeName")) document.getElementById("welcomeName").innerText = document.getElementById("userNameDisplay").innerText;
    if (document.getElementById("welcomePopup")) document.getElementById("welcomePopup").style.display = "block";
}

/**
 * ROLE-SPECIFIC SESSION VALIDATION
 */
function checkAdminSession() {
    if (!sessionData || sessionData.role !== 'admin') {
        window.location.href = "login.html";
    }
    checkLogin();
    loadCandidates(); 
    fetchLogs();      
}

function checkCandidateSession() {
    if (!sessionData || sessionData.role !== 'candidate') {
        window.location.href = "login.html";
    }
    if (document.getElementById("candName")) document.getElementById("candName").innerText = sessionData.username;
    checkLogin();
}

/**
 * ADMIN PANEL: FETCH ACTIVITY LOGS
 */
async function fetchLogs() {
    try {
        const res = await fetch(`${BASE_URL}/admin/logs`);
        const logs = await res.json();
        const logTable = document.getElementById("adminLogsTable");
        if (!logTable) return;

        logTable.innerHTML = logs.map(log => `
            <tr>
                <td>${log.user_email}</td>
                <td>${log.action}</td>
                <td style="color:#64748b; font-size:0.8rem;">${log.timestamp}</td>
            </tr>
        `).join("");
    } catch (err) { console.error("Log fetch error:", err); }
}

/**
 * HR PANEL: CORE ANALYSIS
 */
async function analyze() {
    const jdText = document.getElementById("jd").value;
    const resumes = document.getElementById("pdf").files;
    if (resumes.length === 0) return alert("Please upload resumes!");
    
    document.getElementById("analysisLoader").style.display = "flex";

    const formData = new FormData();
    // Use the verified session email for the database activity log
    formData.append("hr_email", sessionData.email); 

    if (document.getElementById("jd_pdf").files[0]) {
        formData.append("jd_pdf", document.getElementById("jd_pdf").files[0]);
    } else {
        formData.append("jd_text", jdText);
    }

    for (let file of resumes) formData.append("resume_pdfs", file);

    try {
        const response = await fetch(`${BASE_URL}/predict`, { method: "POST", body: formData });
        if (response.ok) {
            await loadCandidates();
            alert("Analysis saved to database! ✅");
        }
    } catch (err) { alert("Server error during analysis ❌"); }
    finally { document.getElementById("analysisLoader").style.display = "none"; }
}

async function loadCandidates() {
    try {
        const res = await fetch(`${BASE_URL}/candidates`);
        candidateData = await res.json();
        renderDashboard();
        updateChart();
        
        // Update Admin stats directly from database records
        if (document.getElementById("adminTotalRuns")) {
            const statsRes = await fetch(`${BASE_URL}/admin/stats`);
            const stats = await statsRes.json();
            document.getElementById("adminTotalRuns").innerText = stats.total_runs;
            document.getElementById("adminTotalUsers").innerText = stats.total_users;
        }
    } catch (err) { console.error("Sync error:", err); }
}

/**
 * DASHBOARD UI RENDERING
 */
function renderDashboard() {
    const tableBody = document.getElementById("resultTable");
    if (!tableBody || !candidateData.length) return;

    document.getElementById("totalCount").innerText = candidateData.length;
    document.getElementById("avgScore").innerText = Math.round(candidateData.reduce((s, c) => s + c.score, 0) / candidateData.length) + "%";
    document.getElementById("bestCandidate").innerText = candidateData.reduce((p, c) => (p.score > c.score) ? p : c).name;

    tableBody.innerHTML = candidateData.map(c => `
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
                <button class="btn-action btn-email" style="background:#7c3aed; color:white; border:none; padding:6px 12px; border-radius:6px;" onclick='openEmailModal(${JSON.stringify(c)})'>Email</button>
            </td>
        </tr>`).join("");
}

/**
 * EMAIL & MODAL AUTOMATION
 */
function openEmailModal(c) {
    const emailField = document.getElementById("emailTo");
    emailField.value = c.email || ""; 
    
    if (c.score > 70) {
        document.getElementById("emailSubject").value = "Interview Invitation - " + c.name;
        document.getElementById("emailMessage").value = `Hi ${c.name},\n\nYour profile is a match (${c.score}%). We'd like to interview you.\n\nBest,\n${sessionData.username}`;
    } else {
        document.getElementById("emailSubject").value = "Application Update - " + c.name;
        document.getElementById("emailMessage").value = `Hi ${c.name},\n\nThank you for applying. We will keep your resume on file.\n\nBest,\n${sessionData.username}`;
    }
    document.getElementById("emailModal").style.display = "flex";
}

// ... Rest of your utilities (getScoreColor, formatSkills, logout, etc.) remain as they were
function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}