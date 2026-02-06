const BASE_URL = "https://ai-resume-backend-w44h.onrender.com";
let candidateData = [];
let scoreChart;

// Initialize EmailJS
(function() {
    emailjs.init("YOUR_PUBLIC_KEY"); 
})();

// SESSION PROTECTION
if (!localStorage.getItem("loggedInUser") && !window.location.href.includes("login.html")) {
    window.location.href = "login.html";
}

/**
 * DASHBOARD & PROFILE INITIALIZATION
 */
function checkLogin() {
    let user = localStorage.getItem("loggedInUser") || "User";
    const formattedName = user.charAt(0).toUpperCase() + user.slice(1);
    
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
    }
    
    if (savedAvatar) {
        document.getElementById('profilePicPreview').src = savedAvatar;
        document.getElementById('navAvatar').src = savedAvatar;
    }
}

/**
 * ANALYSIS WITH LOADER POPUP
 */
async function analyze() {
    const jdText = document.getElementById("jd").value;
    const jdFile = document.getElementById("jd_pdf").files[0];
    const resumes = document.getElementById("pdf").files;

    if (resumes.length === 0) return alert("Please upload resumes!");
    
    // Show Analyzing Popup
    document.getElementById("analysisLoader").style.display = "flex";

    const formData = new FormData();
    if (jdFile) formData.append("jd_pdf", jdFile);
    else formData.append("jd_text", jdText);

    for (let file of resumes) formData.append("resume_pdfs", file);

    try {
        const response = await fetch(`${BASE_URL}/predict`, { method: "POST", body: formData });
        if (response.ok) {
            await loadCandidates();
            alert("Analysis complete! ✅");
        }
    } catch (err) {
        alert("Backend error ❌");
    } finally {
        // Hide Analyzing Popup
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
 * CLEANED ACTION BUTTONS UI
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
            <td class="action-cell">
                <button class="btn-action btn-view" onclick='viewDetails(${JSON.stringify(c)})'>View</button>
                <button class="btn-action btn-email" onclick='openEmailModal(${JSON.stringify(c)})'>Email</button>
            </td>
        </tr>`).join("");
}

/**
 * EMAIL LOGIC (AUTO-POPULATE & EDITABLE)
 */
function openEmailModal(c) {
    const emailField = document.getElementById("emailTo");
    emailField.value = c.email || ""; 
    emailField.readOnly = false; // Allowing manual edit
    
    if (c.score > 70) {
        document.getElementById("emailSubject").value = "Interview Invite - " + c.name;
        document.getElementById("emailMessage").value = `Hi ${c.name},\n\nYour profile is a strong match (${c.score}%). We'd like to interview you.\n\nBest,\n${localStorage.getItem("loggedInUser")}`;
    } else {
        document.getElementById("emailSubject").value = "Application Update - " + c.name;
        document.getElementById("emailMessage").value = `Hi ${c.name},\n\nThank you for applying. We will keep your resume on file.\n\nBest,\n${localStorage.getItem("loggedInUser")}`;
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
        from_name: localStorage.getItem("loggedInUser")
    };
    emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", params)
        .then(() => { alert("Email sent! 📧"); closeEmailModal(); })
        .catch(() => alert("Email failed ❌"))
        .finally(() => btn.innerText = "Send Email Now");
}

function closeEmailModal() { document.getElementById("emailModal").style.display = "none"; }

/**
 * UTILITIES & PROFILE
 */
function toggleProfileView() {
    const profile = document.getElementById("profileSection");
    const dashboard = document.getElementById("dashboardContent");
    profile.style.display = (profile.style.display === "none") ? "block" : "none";
    dashboard.style.opacity = (profile.style.display === "block") ? "0.2" : "1";
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
    alert("Profile Updated! ✅");
    toggleProfileView();
}

function previewImage(event) {
    const reader = new FileReader();
    reader.onload = function() {
        document.getElementById('profilePicPreview').src = reader.result;
        document.getElementById('navAvatar').src = reader.result;
        localStorage.setItem("userAvatar", reader.result);
    }
    reader.readAsDataURL(event.target.files[0]);
}

function viewDetails(c) {
    document.getElementById("modalCandidateName").innerText = c.name;
    document.getElementById("modalScore").innerText = c.score;
    document.getElementById("modalExplanation").innerText = c.explanation;
    document.getElementById("detailsModal").style.display = "flex";
}

function closeModal() { document.getElementById("detailsModal").style.display = "none"; }
function getScoreColor(s) { return s > 80 ? "#22c55e" : s >= 50 ? "#f59e0b" : "#ef4444"; }
function formatSkills(s) { return s ? s.split(",").map(skill => `<span class="skill-tag">${skill.trim()}</span>`).join("") : "None"; }
function logout() { localStorage.clear(); window.location.href = "login.html"; }

// Upload triggers
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
    link.download = `ATS_Report.csv`;
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