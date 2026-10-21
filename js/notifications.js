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
// 🔔 RENDER COMBINED NOTIFICATIONS
// ==========================================
function renderNotifications(items, currentUser) {
    if (!box) return;

    if (!items || items.length === 0) {
        box.innerHTML = `
            <div style="text-align: center; padding: 40px 10px;">
                <div style="font-size: 40px; margin-bottom: 10px;">🔔</div>
                <h3 style="color: #94a3b8; font-size: 16px;">No New Notifications</h3>
                <p style="color: #64748b; font-size: 12px; margin-top: 4px;">Important order alerts, support replies, and promo updates will appear here.</p>
                <div style="margin-top: 20px;">
                    <a href="contact.html" style="color: #00e5ff; font-size: 13px; text-decoration: underline;">Contact Support Team</a>
                </div>
            </div>
        `;
        return;
    }

    const notifMarkup = items.map(data => {
        const timestamp = data.time || "Recently";
        const isSupportReply = data.type === "support_reply" || (data.title && data.title.includes("Reply"));
        const isSupportAck = data.type === "support_ack" || (data.title && data.title.includes("Ticket"));
        
        let borderStyle = "border: 1px solid rgba(255, 255, 255, 0.08);";
        let titleColor = "#ffcc00";
        let iconPrefix = "🔔";

        if (isSupportReply) {
            borderStyle = "border: 1px solid rgba(16, 185, 129, 0.4); background: rgba(6, 78, 59, 0.25);";
            titleColor = "#10b981";
            iconPrefix = "💬";
        } else if (isSupportAck) {
            borderStyle = "border: 1px solid rgba(0, 229, 255, 0.3); background: rgba(8, 51, 68, 0.25);";
            titleColor = "#00e5ff";
            iconPrefix = "🎫";
        }

        return `
            <div class="notify-box glassmorphism" style="padding: 16px; border-radius: 16px; margin-bottom: 14px; ${borderStyle}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <h3 style="font-size: 15px; color: ${titleColor}; margin: 0; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                        <span>${iconPrefix}</span> ${data.title || "Notification"}
                    </h3>
                    <span style="font-size: 11px; color: #94a3b8; background: rgba(0,0,0,0.3); padding: 3px 8px; border-radius: 8px;">${timestamp}</span>
                </div>
                <p style="font-size: 13px; color: #cbd5e1; margin: 0; line-height: 1.6;">${data.message || ""}</p>
                ${isSupportReply ? `<div style="margin-top: 10px; font-size: 11px; color: #34d399; font-weight: 600;">Status: Official Support Verified • Action Completed</div>` : ''}
            </div>
        `;
    }).join('');

    box.innerHTML = notifMarkup;
}

// Read local notifications
function getLocalNotifications() {
    try {
        return JSON.parse(localStorage.getItem("faraz_notifications") || "[]");
    } catch (e) {
        return [];
    }
}

// Initial render with local notifications immediately (no blank screen)
let localItems = getLocalNotifications();
renderNotifications(localItems, null);

// ==========================================
// 🔔 LISTEN TO AUTH & SYNC FIRESTORE
// ==========================================
onAuthStateChanged(auth, async (user) => {
    let combined = [...getLocalNotifications()];

    if (user) {
        try {
            const q = query(collection(db, "users", user.uid, "notifications"), orderBy("time", "desc"));
            let snap;
            try {
                snap = await getDocs(q);
            } catch (e) {
                snap = await getDocs(collection(db, "users", user.uid, "notifications"));
            }

            if (!snap.empty) {
                const cloudItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Merge cloud items avoiding duplicates
                cloudItems.forEach(ci => {
                    if (!combined.some(item => item.id === ci.id || (item.title === ci.title && item.message === ci.message))) {
                        combined.push(ci);
                    }
                });
            }
        } catch (error) {
            console.warn("Firestore notifications sync skipped:", error.message);
        }
    }

    // Default welcome notification if empty
    if (combined.length === 0) {
        combined = [
            {
                id: "welcome-1",
                title: "🎉 Welcome to Faraz Store 2.0",
                message: "Aapke account me luxury updates, order tracking, aur 24/7 priority support active hai. FORGE Video Editor aur tools use karne ke liye shukriya!",
                time: "Today",
                type: "welcome"
            }
        ];
    }

    renderNotifications(combined, user);
});
