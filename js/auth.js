import { auth } from "./firebase-config.js";
import {
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const form = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");

if (form && emailInput && passwordInput && loginBtn) {
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Basic validation
        if (!email || !password) {
            alert("❌ Email and Password required");
            return;
        }

        // Prevent multiple clicks
        loginBtn.disabled = true;
        loginBtn.textContent = "Signing In...";

        try {
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

            // Sync with NOVA backend session
            try {
                const res = await fetch("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ login: email, password })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.token) localStorage.setItem("nova_auth_token", data.token);
                }
            } catch (e) {
                console.warn("NOVA session sync notice:", e.message);
            }

            alert("✅ Login Successful! Welcome back.");
            window.location.href = "index.html";

        } catch (error) {
            console.error("Login failed:", error);
            alert("❌ Wrong Email or Password. Please try again.");

        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = "Sign In";
        }
    });
}
