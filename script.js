const BASE_URL = "https://ai-resume-backend-w44h.onrender.com"; 
let candidateData = [];
let scoreChart;

// 1. HARD SESSION PROTECTION & RBAC
// Prevents unauthorized access and ensures the user is logged in before viewing dashboards.
const sessionData = JSON.parse(localStorage.getItem("userSession"));

if (!sessionData && !window.location.href.includes("login.html")) {
    window.location.href = "login.html";
}

// 2. INITIALIZE EMAILJS
(function() {
    if (typeof emailjs !== 'undefined') {
        emailjs.init("YOUR_PUBLIC_KEY"); // Ensure you replace this with your real key
    }
})();

/**
 * AUTHENTICATION CORE (Login & Register)
 */

async function registerUser(name, email, mobile, pass, role) {
    if (!name || !email || !pass) return alert("Please fill all required fields!");
    const btn = document.getElementById("authBtn");
    btn.classList.add("loading"); 

    try {
        const response = await fetch(`${BASE_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, mobile, pass, role })
        });
        if (response.ok) {
            showSuccessEffect("Registration Successful! Please Login.");
            return true;
        } else {
            const result = await response.json();
            alert(result.error || "Registration failed");
            return false;
        }
    } catch (err) {
        alert("Server connection failed. ❌");
        return false;
    } finally { btn.classList.remove("loading"); }
}

async function loginUser(email, pass, role) {
    const btn = document.getElementById("authBtn");
    btn.classList.add("loading");
    try {
        const response = await fetch(`${BASE_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, pass, role })
        });
        const result = await response.json();
        if (response.ok) {
            showSuccessEffect("Login Successful!");
            localStorage.setItem("userSession", JSON.stringify(result.user));
            setTimeout(() => { window.location.href = result.redirect; }, 1500);
        } else {
            alert(result.error || "Invalid Credentials");
            btn.classList.remove("loading");
        }
    } catch (err) {
        alert("Backend connection failed ❌");
        btn.classList.remove("loading");
    }
}

/**
 * UI NAVIGATION & PROFILE SETTINGS
 */

function toggleProfileView() {
    const profile = document.getElementById("profileSection");
    if (profile) {
        profile.style.display = (profile.style.display === "none" || profile.style.display === "") ? "block" : "none";
    }
}

function updateFileName(input, targetId) {
    const target = document.getElementById(targetId);
    if (target && input.files.length > 0) {
        target.innerText = input.files.length > 1 ? `${input.files.length} files selected` : input.files[0].name;
    }
}

function showSuccessEffect(message) {
    const successIcon = document.getElementById("successAnim");
    document.querySelectorAll(".form-group, .toggle-link, .auth-btn").forEach(el => el.style.display = "none");
    if (document.getElementById("formTitle")) document.getElementById("formTitle").style.display = "none";
    if (successIcon) {
        successIcon.style.display = "block";
        successIcon.innerText = "✅ " + message;
    }
}

/**
 * HR PANEL: ANALYSIS, RENDERING & EMAIL
 */

async function analyze() {
    const resumeInput = document.getElementById("pdf");
    const jdInput = document.getElementById("jd_pdf");
    const jdText = document.getElementById("jd").value;

    if (resumeInput.files.length === 0) return alert("Upload at least one resume!");
    document.getElementById("analysisLoader").style.display = "flex";
    
    const formData = new FormData();
    formData.append("hr_email", sessionData.email);
    formData.append("jd_text", jdText);
    if (jdInput.files[0]) formData.append("jd_pdf", jdInput.files[0]);
    for (let file of resumeInput.files) formData.append("resume_pdfs", file);

    try {
        const response = await fetch(`${BASE_URL}/predict`, { method: "POST", body: formData });
        if (response.ok) {
            alert("Analysis saved to database! ✅");
            await loadCandidates();
        }
    } finally { document.getElementById("analysisLoader").style.display = "none"; }
}

async function loadCandidates() {
    try {
        const res = await fetch(`${BASE_URL}/candidates`);
        candidateData = await res.json();
        renderDashboard();
        updateChart();
    } catch (err) { console.error("Database sync error:", err); }
}

function renderDashboard() {
    const table = document.getElementById("resultTable");
    if (!table || !candidateData.length) return;

    // BEST CANDIDATE & METRICS
    const best = candidateData.reduce((prev, curr) => (prev.score > curr.score) ? prev : curr);
    document.getElementById("totalCount").innerText = candidateData.length;
    document.getElementById("avgScore").innerText = Math.round(candidateData.reduce((s, c) => s + c.score, 0) / candidateData.length) + "%";
    document.getElementById("bestCandidate").innerText = best.name;

    // TABLE RENDERING (Progress Bars & Action Buttons)
    table.innerHTML = candidateData.map(c => `
        <tr>
            <td><strong>${c.name}</strong></td>
            <td>
                <div class="progress-bar"><div class="progress-fill ${getScoreClass(c.score)}" style="width:${c.score}%"></div></div>
                <small>${c.score}% Match</small>
            </td>
            <td>${formatSkills(c.matched)}</td>
            <td style="display: flex; gap: 8px; justify-content: center;">
                <button class="btn-action btn-view" onclick='viewDetails(${JSON.stringify(c)})'>View</button>
                <button class="btn-action btn-email" style="background:#7c3aed; color:white;" onclick='openEmailModal(${JSON.stringify(c)})'>Email</button>
            </td>
        </tr>`).join("");
}

function viewDetails(c) {
    document.getElementById("modalCandidateName").innerText = c.name;
    document.getElementById("modalScore").innerText = c.score;
    document.getElementById("modalExplanation").innerText = c.explanation || "NLP Analysis complete. Match found in database.";
    document.getElementById("detailsModal").style.display = "flex";
}

/**
 * EMAIL & VISUAL ANALYTICS
 */

function openEmailModal(c) {
    document.getElementById("emailTo").value = c.email || "";
    document.getElementById("emailSubject").value = c.score > 70 ? "Interview Invitation" : "Application Status Update";
    document.getElementById("emailMessage").value = `Hi ${c.name},\n\nYour profile matched ${c.score}% for the role. We'd like to discuss the next steps.\n\nBest,\n${sessionData.username}`;
    document.getElementById("emailModal").style.display = "flex";
}

async function sendEmail() {
    const btn = document.getElementById("sendEmailBtn");
    btn.innerText = "Sending...";
    try {
        await emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", {
            to_email: document.getElementById("emailTo").value,
            subject: document.getElementById("emailSubject").value,
            message: document.getElementById("emailMessage").value,
            from_name: sessionData.username
        });
        alert("Email sent successfully! 📧");
        document.getElementById("emailModal").style.display = "none";
    } catch (err) { alert("Email Failed ❌"); }
    finally { btn.innerText = "Send Email Now"; }
}

function updateChart() {
    const ctx = document.getElementById('scoreChart')?.getContext('2d');
    if (!ctx || !candidateData.length) return;
    if (scoreChart) scoreChart.destroy();
    scoreChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: candidateData.map(c => c.name.substring(0, 8)),
            datasets: [{ label: 'Score %', data: candidateData.map(c => c.score), backgroundColor: '#7c3aed', borderRadius: 5 }]
        }
    });
}

/**
 * SESSION & UTILITIES
 */

function getScoreClass(s) { return s > 70 ? 'score-high' : s > 40 ? 'score-mid' : 'score-low'; }
function formatSkills(s) { return s ? s.split(",").map(sk => `<span class="skill-match">${sk.trim()}</span>`).join("") : "None"; }
function logout() { localStorage.clear(); window.location.href = "login.html"; }

function checkLogin() {
    if (!sessionData) return;
    const formattedName = sessionData.username.charAt(0).toUpperCase() + sessionData.username.slice(1);
    if (document.getElementById("userNameDisplay")) document.getElementById("userNameDisplay").innerText = formattedName;
}

// Admin Specific Logic
async function fetchAllUsers() {
    const res = await fetch(`${BASE_URL}/admin/users`);
    const users = await res.json();
    const table = document.getElementById("adminUserTable");
    if (table) {
        table.innerHTML = users.map(u => `
            <tr>
                <td><strong>${u.username}</strong></td>
                <td>${u.email}</td>
                <td><span class="skill-tag">${u.role.toUpperCase()}</span></td>
                <td><button onclick="deleteUser(${u.id})" style="background:#fee2e2; color:#dc2626; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">Delete</button></td>
            </tr>`).join("");
    }
}