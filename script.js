const BASE_URL = "https://ai-resume-backend-w44h.onrender.com"; 
let candidateData = [];
let scoreChart;

// 1. SESSION PROTECTION & INITIALIZATION
const sessionData = JSON.parse(localStorage.getItem("userSession"));

if (!sessionData && !window.location.href.includes("login.html")) {
    window.location.href = "login.html";
}

// 2. INITIALIZE EMAILJS
(function() {
    if (typeof emailjs !== 'undefined') {
        emailjs.init("YOUR_PUBLIC_KEY"); 
    }
})();

/**
 * AUTHENTICATION LOGIC (Login & Register)
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
            showSuccessEffect("Login Successful! Redirecting...");
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
 * UI & PROFILE NAVIGATION
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
 * HR PANEL: ANALYSIS & EMAIL
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
            alert("Analysis saved! ✅");
            loadCandidates();
        }
    } finally { document.getElementById("analysisLoader").style.display = "none"; }
}

async function loadCandidates() {
    try {
        const res = await fetch(`${BASE_URL}/candidates`);
        candidateData = await res.json();
        renderDashboard();
        updateChart();
        if (document.getElementById("adminTotalRuns")) {
            const stats = await (await fetch(`${BASE_URL}/admin/stats`)).json();
            document.getElementById("adminTotalRuns").innerText = stats.total_runs;
            document.getElementById("adminTotalUsers").innerText = stats.total_users;
        }
    } catch (err) { console.error("Sync error:", err); }
}

function renderDashboard() {
    const table = document.getElementById("resultTable");
    if (!table || !candidateData.length) return;
    document.getElementById("totalCount").innerText = candidateData.length;
    document.getElementById("avgScore").innerText = Math.round(candidateData.reduce((s, c) => s + c.score, 0) / candidateData.length) + "%";
    
    table.innerHTML = candidateData.map(c => `
        <tr>
            <td><strong>${c.name}</strong></td>
            <td>${c.score}% Match</td>
            <td>${c.matched}</td>
            <td class="action-cell">
                <button class="btn-action btn-email" onclick='openEmailModal(${JSON.stringify(c)})'>Email</button>
            </td>
        </tr>`).join("");
}

/**
 * ADMIN FUNCTIONS
 */
async function fetchAllUsers() {
    const res = await fetch(`${BASE_URL}/admin/users`);
    const users = await res.json();
    const table = document.getElementById("adminUserTable");
    if (table) {
        table.innerHTML = users.map(u => `
            <tr><td>${u.username}</td><td>${u.email}</td><td>${u.role}</td>
            <td><button onclick="deleteUser(${u.id})" style="color:red">Delete</button></td></tr>`).join("");
    }
}

function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}