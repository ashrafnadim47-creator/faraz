import { auth } from "./firebase-config.js";
import { 
    signInWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const btn = document.getElementById("login-btn");

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

        // Disable button during process to prevent double clicks
        btn.disabled = true;
        const originalText = btn.innerText;
        btn.innerText = "Logging in...";

        try {
            // Set persistent login session across browser tabs
            await setPersistence(auth, browserLocalPersistence);

            // Firebase Authentication
            await signInWithEmailAndPassword(auth, email, password);

            alert("✅ Login Successful!");
            window.location.href = "index.html";

        } catch (error) {
            console.error("Login Error:", error);
            
            let errorMessage = "❌ Wrong Email or Password!";
            if (error.code === "auth/invalid-email") {
                errorMessage = "❌ Invalid email format!";
            } else if (error.code === "auth/user-not-found") {
                errorMessage = "❌ User account not found!";
            } else if (error.code === "auth/wrong-password") {
                errorMessage = "❌ Incorrect password!";
            }
            
            alert(errorMessage);
        } finally {
            // Re-enable button
            btn.disabled = false;
            btn.innerText = originalText;
        }
    };
}