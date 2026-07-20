import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const box = document.getElementById("notification-list");

// ==========================================
// 🔔 FETCH USER NOTIFICATIONS
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        location.href = "login.html";
        return;
    }

    if (!box) return;

    box.innerHTML = `
        <div class="loading-state" style="text-align: center; padding: 30px;">
            <div class="spinner"></div>
            <p style="color: #00e5ff; margin-top: 10px; font-weight: 700;">Loading Alerts...</p>
        </div>
    `;

    try {
        const q = query(collection(db, "users", user.uid, "notifications"), orderBy("time", "desc"));
        let snap;
        
        try {
            snap = await getDocs(q);
        } catch (e) {
            // Fallback query without sorting
            snap = await getDocs(collection(db, "users", user.uid, "notifications"));
        }

        box.innerHTML = "";

        if (snap.empty) {
            box.innerHTML = `
                <div style="text-align: center; padding: 40px 10px;">
                    <div style="font-size: 40px; margin-bottom: 10px;">🔔</div>
                    <h3 style="color: #94a3b8; font-size: 16px;">No New Notifications</h3>
                    <p style="color: #64748b; font-size: 12px; margin-top: 4px;">You're all caught up! Important order and promo updates will appear here.</p>
                </div>
            `;
            return;
        }

        const notifMarkup = snap.docs.map(item => {
            const data = item.data();
            const timestamp = data.time || "Recently";

            return `
                <div class="notify-box glassmorphism" style="padding: 16px; border-radius: 16px; margin-bottom: 12px; background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(255, 255, 255, 0.08);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <h3 style="font-size: 15px; color: #ffcc00; margin: 0; font-weight: 800;">${data.title || "Notification"}</h3>
                        <span style="font-size: 11px; color: #94a3b8;">${timestamp}</span>
                    </div>
                    <p style="font-size: 13px; color: #cbd5e1; margin: 0; line-height: 1.5;">${data.message || ""}</p>
                </div>
            `;
        }).join('');

        box.innerHTML = notifMarkup;

    } catch (error) {
        console.error("Error loading notifications:", error);
        box.innerHTML = `<h3 style="text-align: center; color: #ef4444; padding: 30px;">❌ Failed to load notifications</h3>`;
    }
});