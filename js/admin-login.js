import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// 🔑 ADMIN & USER LOGIN HANDLER
// ==========================================
window.login = async function () {
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const loginBtn = document.getElementById("login-btn") || document.querySelector("button");

    const email = emailInput ? emailInput.value.trim().toLowerCase() : "";
    const password = passwordInput ? passwordInput.value.trim() : "";

    if (!email || !password) {
        alert("❌ Email and Password required!");
        return;
    }

    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.innerText = "Authenticating...";
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 👑 ADMIN DIRECT REDIRECT MATCH
        const adminEmails = ["ashrafnadim47@gmail.com", "admin@gmail.com"];

        if (adminEmails.includes(email)) {
            alert("👑 Admin Access Granted!");
            location.href = "admin-dashboard.html";
            return;
        }

        // Verify standard user profile
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
            alert("⚠️ User profile not found in database. Please register an account first.");
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.innerText = "Authorize & Login";
            }
            return;
        }

        alert("✅ Login Successful!");
        location.href = "index.html";

    } catch (error) {
        console.error("Authentication Error:", error);
        alert("❌ Authentication Failed: Invalid credentials or account does not exist.");
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerText = "Authorize & Login";
        }
    }
};

// Form submission handler binding
document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form") || document.querySelector("form");
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            window.login();
        });
    }
});