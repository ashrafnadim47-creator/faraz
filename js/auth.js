
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

        if (!emailInput.checkValidity()) {
            alert("❌ Please enter a valid email address");
            emailInput.focus();
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

            alert("✅ Login Successful");
            window.location.href = "index.html";

        } catch (error) {
            // Keep detailed Firebase errors out of the UI.
            console.error("Login failed:", error);

            alert("❌ Wrong Email or Password");

        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = "Sign In";
        }
    });
}
