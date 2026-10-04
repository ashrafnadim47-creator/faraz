import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// 🛡️ ADMIN AUTHENTICATION GUARD
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        location.href = "admin-login.html";
        return;
    }

    try {
        const adminDoc = await getDoc(doc(db, "admins", user.uid));

        if (!adminDoc.exists()) {
            alert("⛔ Access Denied: You do not have admin permissions.");
            location.href = "index.html";
        }
    } catch (error) {
        console.error("Admin guard verification error:", error);
        alert("⛔ Authorization verification failed.");
        location.href = "index.html";
    }
});