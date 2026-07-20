import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    doc,
    getDoc,
    collection,
    getDocs,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let currentUser = null;

// ==========================================
// 🔑 AUTHENTICATION & PROFILE DATA LOAD
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        location.href = "login.html";
        return;
    }

    currentUser = user;

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        let userData = {};

        if (userSnap.exists()) {
            userData = userSnap.data();
        }

        // 1. BASIC USER METADATA
        const nameEl = document.getElementById("user-name");
        const emailEl = document.getElementById("user-email");
        const pointsEl = document.getElementById("user-points");

        if (nameEl) nameEl.innerText = userData.name || user.displayName || "Faraz Customer";
        if (emailEl) emailEl.innerText = userData.email || user.email || "";
        if (pointsEl) pointsEl.innerText = (userData.points || 0).toLocaleString();

        // 2. PROFILE AVATAR
        const imageEl = document.getElementById("profile-image");
        if (imageEl) {
            imageEl.src = userData.photo || user.photoURL || "images/user.png";
        }

        // 3. DIAMONDS WALLET BALANCE (REALTIME FIRESTORE LISTEN + LOCAL FALLBACK)
        const profileDiamondsEl = document.getElementById("profile-diamonds");
        
        onSnapshot(userRef, (snapshot) => {
            if (snapshot.exists()) {
                const liveData = snapshot.data();
                if (profileDiamondsEl) {
                    profileDiamondsEl.innerText = (liveData.diamonds ?? 0).toLocaleString();
                }
            }
        }, () => {
            // Local persistence fallback if offline
            const savedWallet = localStorage.getItem('fw_persist_wallet');
            if (profileDiamondsEl && savedWallet !== null) {
                profileDiamondsEl.innerText = Number(savedWallet).toLocaleString();
            }
        });

        // 4. ORDERS COUNT
        const orderBox = document.getElementById("order-count");
        if (orderBox) {
            try {
                const ordersSnap = await getDocs(collection(db, "users", user.uid, "orders"));
                orderBox.innerText = ordersSnap.size;
            } catch (e) {
                orderBox.innerText = "0";
            }
        }

        // 5. WISHLIST COUNT (HANDLES BOTH '#wishlist-count' AND '#wish-count' IDs)
        const wishBox = document.getElementById("wishlist-count") || document.getElementById("wish-count");
        if (wishBox) {
            try {
                const wishSnap = await getDocs(collection(db, "users", user.uid, "wishlist"));
                wishBox.innerText = wishSnap.size;
            } catch (e) {
                wishBox.innerText = "0";
            }
        }

    } catch (error) {
        console.error("Profile initialization error:", error);
    }
});

// ==========================================
// 🚪 LOGOUT ACTION HANDLER
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById("logout-btn");
    
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            try {
                await signOut(auth);
                alert("🚪 Logout Successful");
                location.href = "login.html";
            } catch (error) {
                console.error("Logout error:", error);
                alert("❌ Failed to log out.");
            }
        });
    }
});