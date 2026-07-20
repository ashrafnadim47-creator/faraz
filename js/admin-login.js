import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// 🔑 ADMIN LOGIN HANDLER
// ==========================================
window.login = async function () {
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const loginBtn = document.getElementById("login-btn") || document.querySelector("button");

    const email = emailInput ? emailInput.value.trim() : "";
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

        // 👑 ADMIN DIRECT REDIRECT
        if (email.toLowerCase() === "admin@gmail.com") {
            alert("👑 Admin Access Granted!");
            location.href = "admin-dashboard.html";
            return;
        }

        // Verify user profile exists
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
            alert("⚠️ User profile not found. Please register an account first.");
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.innerText = "Login";
            }
            return;
        }

        alert("✅ Login Successful!");
        location.href = "index.html";

    } catch (error) {
        console.error("Admin Login Error:", error);
        alert("❌ Authentication Failed: Invalid credentials.");
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerText = "Login";
        }
    }
};