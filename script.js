const BASE_URL = "https://ai-resume-backend-w44h.onrender.com";
let candidateData = [];
let scoreChart;

// 1. SESSION & ROLE PROTECTION
// Retrieves session data to ensure the user is logged in and authorized
const sessionData = JSON.parse(localStorage.getItem("userSession"));

if (!sessionData || !sessionData.isLoggedIn) {
    if (!window.location.href.includes("login.html")) {
        window.location.href = "login.html";
    }
}

// Initialize EmailJS for automated candidate notifications
(function() {
    if (typeof emailjs !== 'undefined') {
        emailjs.init("YOUR_PUBLIC_KEY"); 
    }
})();

/**
 * INITIALIZATION & PROFILE MANAGEMENT
 */
function checkLogin() {
    const session = JSON.parse(localStorage.getItem("userSession"));
    if (!session) return;

    // Formatting the username for a professional UI aesthetic
    const formattedName = session.name.charAt(0).toUpperCase() + session.name.slice(1);
    
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
    const session = JSON.parse(localStorage.getItem("userSession"));
    if (!session || session.role !== 'admin') window.location.href = "login.html";
    checkLogin();
    loadCandidates(); // Syncs global metrics
    fetchLogs();      // Pulls historical activity from SQL
}

function checkCandidateSession() {
    const session = JSON.parse(localStorage.getItem("userSession"));
    if (!session || session.role !== 'candidate') window.location.href = "login.html";
    if (document.getElementById("candName")) document.getElementById("candName").innerText = session.name;
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

        // Injects database logs into the Admin UI table
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
    // Passes user email to the backend for activity logging
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
            alert("Analysis successful and logged to database! ✅");
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
        
        // Updates Admin Panel statistics directly from the database
        if (document.getElementById("adminTotalRuns")) {
            const statsRes = await fetch(`${BASE_URL}/admin/stats`);
            const stats = await statsRes.json();
            document.getElementById("adminTotalRuns").innerText = stats.total_runs;
            document.getElementById("adminTotalUsers").innerText = stats.total_users;
        }
    } catch (err) { console.error("Data synchronization error:", err); }
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
    
    // Dynamic content generation based on ATS match score
    if (c.score > 70) {
        document.getElementById("emailSubject").value = "Interview Invitation - " + c.name;
        document.getElementById("emailMessage").value = `Hi ${c.name},\n\nYour profile is a match (${c.score}%). We'd like to interview you.\n\nBest,\n${sessionData.name}`;
    } else {
        document.getElementById("emailSubject").value = "Application Update - " + c.name;
        document.getElementById("emailMessage").value = `Hi ${c.name},\n\nThank you for applying. We will keep your resume on file.\n\nBest,\n${sessionData.name}`;
    }
    document.getElementById("emailModal").style.display = "flex";
}

function sendEmail() {
    const btn = document.getElementById("sendEmailBtn");
    btn.innerText = "Sending...";
    const params = {
        to_email: document.getElementById("emailTo").value,
        subject: document.getElementById("emailSubject").value,
        message: document.getElementById("emailMessage").value,
        from_name: sessionData.name
    };
    emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", params)
        .then(() => { alert("Email sent! 📧"); closeEmailModal(); })
        .catch(() => alert("Email failed to send ❌"))
        .finally(() => btn.innerText = "Send Email Now");
}

/**
 * CANDIDATE SUBMISSION LOGIC
 */
async function submitApplication() {
    const resume = document.getElementById("pdf").files[0];
    if (!resume) return alert("Please upload your resume! 📑");

    document.getElementById("loader").style.display = "flex";
    const formData = new FormData();
    formData.append("resume_pdfs", resume);
    formData.append("jd_text", "Technical evaluation for role matching.");

    try {
        const response = await fetch(`${BASE_URL}/predict`, { method: "POST", body: formData });
        const data = await response.json();
        if (response.ok) {
            const result = data.results[0];
            document.getElementById("candidateResult").style.display = "block";
            document.getElementById("matchScoreDisplay").innerText = result.score + "%";
            document.getElementById("matchFeedback").innerText = result.explanation;
        }
    } catch (err) { alert("Submission failed ❌"); }
    finally { document.getElementById("loader").style.display = "none"; }
}

/**
 * UTILITIES
 */
function toggleProfileView() {
    const profile = document.getElementById("profileSection");
    const dashboard = document.getElementById("dashboardContent");
    if (!profile) return;

    const isHidden = profile.style.display === "none";
    profile.style.display = isHidden ? "block" : "none";
    if (dashboard) dashboard.style.opacity = isHidden ? "0.2" : "1";
}

function saveProfile() {
    const profileData = {
        name: document.getElementById("profileFullName").value,
        role: document.getElementById("profileRole").value,
        dob: document.getElementById("profileDOB").value,
        email: document.getElementById("profileEmail").value
    };
    localStorage.setItem("userProfile", JSON.stringify(profileData));
    document.getElementById("userNameDisplay").innerText = profileData.name || "User";
    alert("Profile saved successfully! ✅");
    toggleProfileView();
}

function viewDetails(c) {
    document.getElementById("modalCandidateName").innerText = c.name;
    document.getElementById("modalScore").innerText = c.score;
    document.getElementById("modalExplanation").innerText = c.explanation;
    document.getElementById("detailsModal").style.display = "flex";
}

function closeModal() { document.getElementById("detailsModal").style.display = "none"; }
function closeEmailModal() { document.getElementById("emailModal").style.display = "none"; }
function closeWelcome() { document.getElementById("welcomePopup").style.display = "none"; }
function getScoreColor(s) { return s > 80 ? "#22c55e" : s >= 50 ? "#f59e0b" : "#ef4444"; }
function formatSkills(s) { return s ? s.split(",").map(skill => `<span class="skill-tag">${skill.trim()}</span>`).join("") : "None"; }

function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}

// Sidebar Interaction Listeners
if (document.getElementById("jdDrop")) {
    document.getElementById("jdDrop").onclick = () => document.getElementById("jd_pdf").click();
    document.getElementById("resumeDrop").onclick = () => document.getElementById("pdf").click();
    document.getElementById("jd_pdf").onchange = (e) => { document.getElementById("jdFileName").innerText = e.target.files[0]?.name || ""; };
    document.getElementById("pdf").onchange = (e) => { document.getElementById("resumeFileNames").innerText = Array.from(e.target.files).map(f => f.name).join(", "); };
}

function updateChart() {
    const chartElem = document.getElementById('scoreChart');
    if (!chartElem) return;
    const ctx = chartElem.getContext('2d');
    if (scoreChart) scoreChart.destroy();
    scoreChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: candidateData.map(c => c.name),
            datasets: [{ label: 'ATS Match Score (%)', data: candidateData.map(c => c.score), backgroundColor: '#7c3aed', borderRadius: 5 }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}