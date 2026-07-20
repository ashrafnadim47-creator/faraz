import { db } from "./firebase-config.js";
import {
    collection,
    getDocs,
    updateDoc,
    doc,
    increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const box = document.getElementById("user-list");

// ==========================================
// 👥 LOAD REGISTERED USERS LIST
// ==========================================
async function loadUsers() {
    if (!box) return;

    box.innerHTML = `
        <div class="loading-state" style="text-align: center; padding: 40px;">
            <div class="spinner"></div>
            <p style="color: #00e5ff; margin-top: 10px; font-weight: 700;">Loading Registered Accounts...</p>
        </div>
    `;

    try {
        const snap = await getDocs(collection(db, "users"));
        box.innerHTML = "";

        if (snap.empty) {
            box.innerHTML = `<h2 style="text-align: center; color: #94a3b8; padding: 40px;">No Registered Users Found 👤</h2>`;
            return;
        }

        // Single-Pass High-Performance Construction
        const usersMarkup = snap.docs.map((item) => {
            const user = item.data();
            const userId = item.id;
            const userPoints = user.points || 0;

            return `
                <div class="user-admin-card glassmorphism" style="padding: 18px; border-radius: 16px; margin-bottom: 12px; background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(255, 255, 255, 0.08); display: flex; flex-direction: column; gap: 8px;">
                    <h2 style="font-size: 16px; color: #ffffff; margin: 0;">👤 ${user.name || "Customer Account"}</h2>
                    <p style="font-size: 13px; color: #94a3b8; margin: 0;">📧 ${user.email || "No Email Provided"}</p>
                    <p style="font-size: 14px; color: #e2e8f0; margin: 4px 0;">
                        ⭐ Points: <b id="points-${userId}" style="color: #ffcc00; font-family: 'Orbitron', sans-serif;">${userPoints.toLocaleString()}</b>
                    </p>

                    <div style="display: flex; gap: 10px; margin-top: 6px; align-items: center; flex-wrap: wrap;">
                        <input id="add-${userId}" type="number" placeholder="Enter points to add" style="padding: 10px 14px; border-radius: 10px; border: 1px solid #334155; background: #020617; color: #ffffff; outline: none; font-size: 13px; flex: 1; min-width: 160px;">
                        <button onclick="addPoints('${userId}')" class="primary-btn" style="padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 800; cursor: pointer;">
                            ➕ Add Points
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        box.innerHTML = usersMarkup;

    } catch (error) {
        console.error("Error loading users:", error);
        box.innerHTML = `<h2 style="text-align: center; color: var(--danger, #ef4444); padding: 40px;">❌ Failed To Load Users</h2>`;
    }
}

// ==========================================
// ⭐ ATOMIC REWARD POINTS INCREMENT ENGINE
// ==========================================
window.addPoints = async function (uid) {
    const input = document.getElementById("add-" + uid);
    if (!input) return;

    const value = Number(input.value);

    if (!value || isNaN(value)) {
        alert("❌ Please enter a valid points number!");
        return;
    }

    try {
        const userRef = doc(db, "users", uid);

        // Atomic increment avoids extra reads and race conditions
        await updateDoc(userRef, {
            points: increment(value)
        });

        alert(`⭐ Successfully added +${value} points!`);
        input.value = "";
        loadUsers();

    } catch (error) {
        console.error("Error adding points:", error);
        alert("❌ Failed to update points balance.");
    }
};

loadUsers();