import { auth } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const btn = document.getElementById("login-btn") || document.querySelector("button[onclick='login()']");

if (btn) {
    btn.onclick = async () => {
        const emailInput = document.getElementById("email");
        const passwordInput = document.getElementById("password");

        const email = emailInput ? emailInput.value.trim() : "";
        const password = passwordInput ? passwordInput.value.trim() : "";

        if (!email || !password) {
            alert("❌ Email and Password required!");
            return;
        }

        btn.disabled = true;
        btn.innerText = "Logging in...";

        try {
            await signInWithEmailAndPassword(auth, email, password);

            // Admin email override redirect check
            if (email.toLowerCase() === "admin@gmail.com") {
                alert("👑 Admin Login Successful");
                location.href = "admin-dashboard.html";
                return;
            }

            alert("✅ Login Successful!");
            location.href = "index.html";

        } catch (error) {
            console.error("Login Error:", error);
            alert("❌ Invalid Email or Password!");
            btn.disabled = false;
            btn.innerText = "Login";
        }
    };
}