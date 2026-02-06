const BASE_URL = "https://ai-resume-backend-w44h.onrender.com";
let candidateData = [];
let scoreChart;

// 1. ADVANCED SESSION & ROLE PROTECTION
// Ensures only authorized HR users access this specific dashboard
const sessionData = JSON.parse(localStorage.getItem("userSession"));

if (!sessionData || !sessionData.isLoggedIn) {
    window.location.href = "login.html";
} else if (sessionData.role !== 'hr') {
    alert("Access Denied: Redirecting to your assigned panel.");
    window.location.href = sessionData.role + ".html";
}

// Initialize EmailJS with your Public Key
(function() {
    emailjs.init("YOUR_PUBLIC_KEY"); 
})();

/**
 * INITIALIZATION & PROFILE LOADING
 */
function checkLogin() {
    const session = JSON.parse(localStorage.getItem("userSession"));
    if (!session) return;

    // Formatting the name to be more stylish (Capitalized)
    const formattedName = session.name.charAt(0).toUpperCase() + session.name.slice(1);
    
    // Load persisted profile data or session data
    const savedProfile = JSON.parse(localStorage.getItem("userProfile"));
    const savedAvatar = localStorage.getItem("userAvatar");
    
    if (savedProfile) {
        document.getElementById("profileFullName").value = savedProfile.name || "";
        document.getElementById("profileRole").value = savedProfile.role || "";
        document.getElementById("profileDOB").value = savedProfile.dob || "";
        document.getElementById("profileEmail").value = savedProfile.email || "";
        document.getElementById("userNameDisplay").innerText = savedProfile.name || formattedName;
        document.getElementById("userRoleDisplay").innerText = savedProfile.role || "HR Manager";
    } else {
        document.getElementById("userNameDisplay").innerText = formattedName;
        document.getElementById("userRoleDisplay").innerText = "HR Panel";
        document.getElementById("profileFullName").value = session.name;
        document.getElementById("profileEmail").value = session.email;
    }
    
    if (savedAvatar) {
        document.getElementById('profilePicPreview').src = savedAvatar;
        document.getElementById('navAvatar').src = savedAvatar;
    }

    document.getElementById("welcomeName").innerText = document.getElementById("userNameDisplay").innerText;
    document.getElementById("welcomePopup").style.display = "block";
}

/**
 * PROFILE & INTERFACE INTERACTIVITY
 */
function toggleProfileView() {
    const profile = document.getElementById("profileSection");
    const dashboard = document.getElementById("dashboardContent");
    
    const isHidden = profile.style.display === "none";
    profile.style.display = isHidden ? "block" : "none";
    dashboard.style.opacity = isHidden ? "0.2" : "1"; // Visual focus effect
}

function previewImage(event) {
    const reader = new FileReader();
    reader.onload = function() {
        document.getElementById('profilePicPreview').src = reader.result;
        document.getElementById('navAvatar').src = reader.result;
        localStorage.setItem("userAvatar", reader.result); // Save avatar string
    }
    reader.readAsDataURL(event.target.files[0]);
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
    document.getElementById("userRoleDisplay").innerText = profileData.role || "HR Manager";
    alert("Profile Updated Successfully! ✅");
    toggleProfileView();
}

/**
 * CORE ANALYSIS WITH LOADER
 */
async function analyze() {
    const jdText = document.getElementById("jd").value;
    const resumes = document.getElementById("pdf").files;
    if (resumes.length === 0) return alert("Please upload resumes!");
    
    // Show Analyzing Loader Popup
    document.getElementById("analysisLoader").style.display = "flex";

    const formData = new FormData();
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
            alert("Analysis complete! ✅");
        }
    } catch (err) {
        alert("Backend connection error ❌");
    } finally {
        document.getElementById("analysisLoader").style.display = "none";
    }
}

async function loadCandidates() {
    const res = await fetch(`${BASE_URL}/candidates`);
    candidateData = await res.json();
    renderDashboard();
    updateChart();
}

/**
 * UI RENDERING (CLEAN ACTION BUTTONS)
 */
function renderDashboard() {
    const tableBody = document.getElementById("resultTable");
    if (!candidateData.length) return;

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
                <button class="btn-action btn-email" style="background:#7c3aed; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;" onclick='openEmailModal(${JSON.stringify(c)})'>Email</button>
            </td>
        </tr>`).join("");
}

/**
 * EMAIL AUTOMATION & MODALS
 */
function openEmailModal(c) {
    const emailField = document.getElementById("emailTo");
    emailField.value = c.email || ""; 
    emailField.readOnly = false; // Allow manual editing if AI missed it
    
    if (c.score > 70) {
        document.getElementById("emailSubject").value = "Interview Invitation - " + c.name;
        document.getElementById("emailMessage").value = `Hi ${c.name},\n\nYour profile is a strong match (${c.score}%). We'd like to schedule an interview.\n\nBest,\n${sessionData.name}`;
    } else {
        document.getElementById("emailSubject").value = "Application Update - " + c.name;
        document.getElementById("emailMessage").value = `Hi ${c.name},\n\nThank you for applying. While we were impressed, we will keep your resume on file for future roles.\n\nBest,\n${sessionData.name}`;
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
        .then(() => { alert("Email sent successfully! 📧"); closeEmailModal(); })
        .catch(() => alert("Email failed to send ❌"))
        .finally(() => btn.innerText = "Send Email Now");
}

function viewDetails(c) {
    document.getElementById("modalCandidateName").innerText = c.name;
    document.getElementById("modalScore").innerText = c.score;
    document.getElementById("modalExplanation").innerText = c.explanation;
    document.getElementById("detailsModal").style.display = "flex";
}

/**
 * SYSTEM UTILITIES
 */
function closeEmailModal() { document.getElementById("emailModal").style.display = "none"; }
function closeModal() { document.getElementById("detailsModal").style.display = "none"; }
function closeWelcome() { document.getElementById("welcomePopup").style.display = "none"; }
function getScoreColor(s) { return s > 80 ? "#22c55e" : s >= 50 ? "#f59e0b" : "#ef4444"; }
function formatSkills(s) { return s ? s.split(",").map(skill => `<span class="skill-tag">${skill.trim()}</span>`).join("") : "None"; }

function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}

function clearAll() {
    if(confirm("Confirm reset? This will clear current session results.")) location.reload();
}

// Sidebar Upload triggers
document.getElementById("jdDrop").onclick = () => document.getElementById("jd_pdf").click();
document.getElementById("resumeDrop").onclick = () => document.getElementById("pdf").click();

document.getElementById("jd_pdf").onchange = (e) => { document.getElementById("jdFileName").innerText = e.target.files[0]?.name || ""; };
document.getElementById("pdf").onchange = (e) => { document.getElementById("resumeFileNames").innerText = Array.from(e.target.files).map(f => f.name).join(", "); };

function downloadReport() {
    const headers = ["Name", "Score", "Matched Skills"];
    const rows = candidateData.map(c => [`"${c.name}"`, `"${c.score}%"`, `"${c.matched}"`]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "ATS_Candidate_Report.csv";
    link.click();
}

function updateChart() {
    const ctx = document.getElementById('scoreChart').getContext('2d');
    if (scoreChart) scoreChart.destroy();
    scoreChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: candidateData.map(c => c.name),
            datasets: [{ label: 'ATS Match Score', data: candidateData.map(c => c.score), backgroundColor: '#7c3aed', borderRadius: 5 }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}