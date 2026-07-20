import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// 🔑 ADMIN LOGIN EVENT LISTENER
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // Exact IDs matching your HTML structure
    const emailInput = document.getElementById("admin-email");
    const passwordInput = document.getElementById("admin-password");
    const loginBtn = document.getElementById("admin-login-btn");

    if (!loginBtn) {
        console.error("❌ Login button (#admin-login-btn) not found in DOM!");
        return;
    }

    loginBtn.addEventListener("click", async (e) => {
        if (e) e.preventDefault();

        const email = emailInput ? emailInput.value.trim().toLowerCase() : "";
        const password = passwordInput ? passwordInput.value.trim() : "";

        // Basic Validation
        if (!email || !password) {
            alert("❌ Please enter both Email Address and Password!");
            return;
        }

        // Loading State
        loginBtn.disabled = true;
        loginBtn.innerText = "Authenticating...";

        try {
            // Firebase Authentication
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 👑 Admin Emails Matching
            const allowedAdminEmails = ["ashrafnadim47@gmail.com", "admin@gmail.com"];

            if (allowedAdminEmails.includes(email)) {
                alert("👑 Admin Access Granted!");
                location.href = "admin-dashboard.html";
                return;
            }

            // Verify Standard User Firestore Document
            const userRef = doc(db, "users", user.uid);
            const snap = await getDoc(userRef);

            if (!snap.exists()) {
                alert("⚠️ User profile does not exist. Please register an account first.");
                loginBtn.disabled = false;
                loginBtn.innerText = "Authorize & Login";
                return;
            }

            alert("✅ Login Successful!");
            location.href = "index.html";

        } catch (error) {
            console.error("Admin Login Error:", error);
            
            // Helpful error alerts for common issues
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
                alert("❌ Authentication Failed: Invalid email or password.");
            } else if (error.code === 'auth/user-not-found') {
                alert("❌ User account not found.");
            } else {
                alert("❌ Login Error: " + error.message);
            }

            loginBtn.disabled = false;
            loginBtn.innerText = "Authorize & Login";
        }
    });
});