import { auth } from "./firebase-config.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ==========================================
// 🚪 ADMIN LOGOUT HANDLER
// ==========================================
const logoutBtn = document.getElementById("logout-btn");

if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        try {
            await signOut(auth);
            alert("🚪 Admin Logout Successful");
            location.href = "admin-login.html";
        } catch (error) {
            console.error("Logout error:", error);
            alert("❌ Logout failed. Please try again.");
        }
    });
}