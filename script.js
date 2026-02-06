const BASE_URL = "https://ai-resume-backend-w44h.onrender.com"; 
let candidateData = [];
let scoreChart;

// 1. HARD SESSION PROTECTION
// Retrieves verified session data to prevent unauthorized dashboard access
const sessionData = JSON.parse(localStorage.getItem("userSession"));

if (!sessionData && !window.location.href.includes("login.html")) {
    window.location.href = "login.html";
}

/**
 * AUTHENTICATION LOGIC (Login & Register)
 */

async function registerUser(name, email, mobile, pass, role) {
    if (!name || !email || !pass) return alert("Please fill all required fields!");
    
    const btn = document.getElementById("authBtn");
    btn.classList.add("loading"); // Show the loading spinner

    try {
        const response = await fetch(`${BASE_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, mobile, pass, role })
        });
        
        const result = await response.json();
        if (response.ok) {
            showSuccessEffect("Registration Successful! Please Login.");
            return true;
        } else {
            alert(result.error || "Registration failed");
            return false;
        }
    } catch (err) {
        alert("Server connection failed. Is your backend (app.py) running? ❌");
        return false;
    } finally {
        btn.classList.remove("loading");
    }
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
            // Small delay so the user can see the success message
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
 * INITIALIZATION & SESSION VALIDATION
 */

function checkLogin() {
    if (!sessionData) return;
    const formattedName = sessionData.username.charAt(0).toUpperCase() + sessionData.username.slice(1);
    if (document.getElementById("userNameDisplay")) document.getElementById("userNameDisplay").innerText = formattedName;
}

function checkAdminSession() {
    if (!sessionData || sessionData.role !== 'admin') window.location.href = "login.html";
    checkLogin();
    loadCandidates(); 
    fetchLogs();      
    fetchAllUsers();  
}

function checkCandidateSession() {
    if (!sessionData || sessionData.role !== 'candidate') window.location.href = "login.html";
    if (document.getElementById("candName")) document.getElementById("candName").innerText = sessionData.username;
    checkLogin();
}

/**
 * ADMINISTRATIVE: DATABASE MANAGEMENT
 */

async function fetchAllUsers() {
    try {
        const res = await fetch(`${BASE_URL}/admin/users`);
        const users = await res.json();
        const userTable = document.getElementById("adminUserTable");
        if (userTable) {
            userTable.innerHTML = users.map(u => `
                <tr>
                    <td><strong>${u.username}</strong></td>
                    <td>${u.email}</td>
                    <td><span class="skill-tag">${u.role.toUpperCase()}</span></td>
                    <td><button class="btn-action" style="background:#fee2e2; color:#dc2626;" 
                        onclick="deleteUser(${u.id}, '${u.username}')">Delete Account</button></td>
                </tr>`).join("");
        }
    } catch (err) { console.error("Admin user fetch error:", err); }
}

async function deleteUser(id, name) {
    if (!confirm(`Permanently remove ${name} from the database?`)) return;
    try {
        const res = await fetch(`${BASE_URL}/admin/delete_user/${id}?admin_email=${sessionData.email}`, { method: 'DELETE' });
        if (res.ok) { alert("User removed ✅"); fetchAllUsers(); }
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
    } catch (err) { console.error("Database sync error:", err); }
}

/**
 * UI RENDERING & UTILITIES
 */

function showSuccessEffect(message) {
    const successIcon = document.getElementById("successAnim");
    const formTitle = document.getElementById("formTitle");
    document.querySelectorAll(".form-group, .toggle-link, .auth-btn").forEach(el => el.style.display = "none");
    if (formTitle) formTitle.style.display = "none";
    if (successIcon) {
        successIcon.style.display = "block";
        successIcon.innerText = "✅ " + message;
    }
}

function renderDashboard() {
    const table = document.getElementById("resultTable");
    if (!table || !candidateData.length) return;
    table.innerHTML = candidateData.map(c => `
        <tr>
            <td><strong>${c.name}</strong></td>
            <td>${c.score}% Match</td>
            <td>${c.matched}</td>
            <td style="display: flex; gap: 8px; justify-content: center;">
                <button class="btn-action" onclick='viewDetails(${JSON.stringify(c)})'>View</button>
                <button class="btn-action" style="background:#7c3aed; color:white;" onclick='openEmailModal(${JSON.stringify(c)})'>Email</button>
            </td>
        </tr>`).join("");
}

function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}

function getScoreColor(s) { return s > 80 ? "#22c55e" : s >= 50 ? "#f59e0b" : "#ef4444"; }