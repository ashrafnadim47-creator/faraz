import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    doc,
    collection,
    getDocs,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let userUnsubscribe = null;

// ==========================================
// 🔑 AUTHENTICATION & REALTIME PROFILE LOAD
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        console.log("No user found, redirecting to login...");
        location.href = "login.html";
        return;
    }

    const userRef = doc(db, "users", user.uid);

    // 1. REALTIME FIRESTORE LISTENER FOR DIAMONDS, POINTS & PROFILE DATA
    if (userUnsubscribe) userUnsubscribe(); // Unsubscribe previous listener if exists

    userUnsubscribe = onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
            const userData = snapshot.data();

            // Name, Email, Points
            const nameEl = document.getElementById("user-name");
            const emailEl = document.getElementById("user-email");
            const pointsEl = document.getElementById("user-points");

            if (nameEl) nameEl.innerText = userData.name || user.displayName || "Faraz Customer";
            if (emailEl) emailEl.innerText = userData.email || user.email || "";
            if (pointsEl) pointsEl.innerText = (userData.points || 0).toLocaleString();

            // Avatar Image
            const imageEl = document.getElementById("profile-image");
            if (imageEl) {
                imageEl.src = userData.photo || user.photoURL || "images/user.png";
            }

            // 💎 DIAMONDS REALTIME SYNC (Handles diamonds / diamond / wallet fields)
            const profileDiamondsEl = document.getElementById("profile-diamonds");
            if (profileDiamondsEl) {
                const liveDiamonds = userData.diamonds ?? userData.diamond ?? userData.wallet ?? 0;
                profileDiamondsEl.innerText = Number(liveDiamonds).toLocaleString();
                // Cache locally as fallback
                localStorage.setItem('fw_persist_wallet', liveDiamonds);
            }
        }
    }, (error) => {
        console.error("Realtime sync error:", error);
        // Local persistence fallback if offline
        const profileDiamondsEl = document.getElementById("profile-diamonds");
        const savedWallet = localStorage.getItem('fw_persist_wallet');
        if (profileDiamondsEl && savedWallet !== null) {
            profileDiamondsEl.innerText = Number(savedWallet).toLocaleString();
        }
    });

    // 2. ORDERS COUNT
    const orderBox = document.getElementById("order-count");
    if (orderBox) {
        try {
            const ordersSnap = await getDocs(collection(db, "users", user.uid, "orders"));
            orderBox.innerText = ordersSnap.size;
        } catch (e) {
            orderBox.innerText = "0";
        }
    }

    // 3. WISHLIST COUNT
    const wishBox = document.getElementById("wishlist-count") || document.getElementById("wish-count");
    if (wishBox) {
        try {
            const wishSnap = await getDocs(collection(db, "users", user.uid, "wishlist"));
            wishBox.innerText = wishSnap.size;
        } catch (e) {
            wishBox.innerText = "0";
        }
    }
});

// ==========================================
// 🚪 LOGOUT ACTION HANDLER
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById("logout-btn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            if (confirm("Kya aap sahi me logout karna chahte hain?")) {
                try {
                    await signOut(auth);
                    localStorage.removeItem('fw_persist_wallet');
                    location.href = "login.html";
                } catch (error) {
                    console.error("Logout error:", error);
                    alert("❌ Failed to log out.");
                }
            }
        });
    }
});