import { auth, db } from "./firebase-config.js";
import {
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const form = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");

if (form && emailInput && passwordInput && loginBtn) {
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const rawIdentifier = emailInput.value.trim();
        const password = passwordInput.value;

        // Basic validation
        if (!rawIdentifier || !password) {
            alert("❌ Email/@Username and Password required");
            return;
        }

        // Prevent multiple clicks
        loginBtn.disabled = true;
        loginBtn.textContent = "Signing In...";

        try {
            let emailToUse = rawIdentifier;

            // If input is an @username or doesn't have '@domain.ext', resolve it to email
            const isHandle = rawIdentifier.startsWith('@') || !rawIdentifier.includes('@') || !rawIdentifier.includes('.');
            if (isHandle) {
                const cleanHandle = rawIdentifier.replace(/^@/, '').toLowerCase().trim();
                
                // 1. Try resolving via Firestore /usernames/{handle}
                try {
                    const uSnap = await getDoc(doc(db, "usernames", cleanHandle));
                    if (uSnap.exists() && uSnap.data().email) {
                        emailToUse = uSnap.data().email;
                    }
                } catch (e) {
                    console.info("Firestore username lookup fallback:", e.message);
                }

                // 2. If not found, try resolving via NOVA backend
                if (emailToUse === rawIdentifier) {
                    try {
                        const checkRes = await fetch(`/api/users/check-username?username=${cleanHandle}`);
                        const checkData = await checkRes.json();
                        if (checkData.user && checkData.user.email) {
                            emailToUse = checkData.user.email;
                        }
                    } catch (e) {}
                }
            }

            await signInWithEmailAndPassword(
                auth,
                emailToUse,
                password
            );

            // Sync with NOVA backend session
            try {
                const res = await fetch("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ login: rawIdentifier, password })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.token) localStorage.setItem("nova_auth_token", data.token);
                    if (data.user?.username) localStorage.setItem("fw_user_handle", data.user.username);
                }
            } catch (e) {
                console.warn("NOVA session sync notice:", e.message);
            }

            alert("✅ Login Successful! Welcome back.");
            window.location.href = "index.html";

        } catch (error) {
            console.error("Login failed:", error);
            alert("❌ Invalid Login Credentials. Please check your Email/@Username and Password.");

        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = "Sign In";
        }
    });
}
