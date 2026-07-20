import { db } from "./firebase-config.js";
import {
    collection,
    query,
    orderBy,
    limit,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const box = document.getElementById("leaderboard-box") || document.getElementById("leaderboard-target");

// ==========================================
// 🏆 GLOBAL XP LEADERBOARD ENGINE
// ==========================================
async function loadLeaderboard() {
    if (!box) return;

    box.innerHTML = `
        <div class="loading-state" style="text-align: center; padding: 40px;">
            <div class="spinner"></div>
            <p style="color: #00e5ff; margin-top: 10px; font-weight: 700;">Fetching Top Players...</p>
        </div>
    `;

    try {
        const q = query(
            collection(db, "users"),
            orderBy("xp", "desc"),
            limit(10)
        );

        const snap = await getDocs(q);

        if (snap.empty) {
            box.innerHTML = `<h3 style="text-align: center; color: #94a3b8; padding: 40px;">No Leaderboard Data Yet 🏆</h3>`;
            return;
        }

        let rank = 1;

        // Single-Pass High-Performance HTML Construction
        const leaderboardMarkup = snap.docs.map((userDoc) => {
            const data = userDoc.data();
            const xp = Number(data.xp || 0);
            const level = Math.floor(xp / 1000) + 1;
            const userName = data.name || data.displayName || data.email || "Faraz Gamer";

            let badge = "🏅";
            let rankClass = "";

            if (rank === 1) { badge = "🥇"; rankClass = "rank-1"; }
            else if (rank === 2) { badge = "🥈"; rankClass = "rank-2"; }
            else if (rank === 3) { badge = "🥉"; rankClass = "rank-3"; }

            const currentRank = rank;
            rank++;

            return `
                <div class="leader-card glassmorphism ${rankClass}" style="padding: 16px 20px; border-radius: 16px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(30, 41, 59, 0.5);">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <span style="font-size: 22px; font-weight: 900; font-family: 'Orbitron', sans-serif;">${badge} #${currentRank}</span>
                        <div>
                            <h3 style="font-size: 15px; color: #ffffff; margin: 0; font-weight: 800;">${userName}</h3>
                            <span style="font-size: 12px; color: #00e5ff; font-weight: 700;">🎮 Level ${level}</span>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 15px; color: #ffcc00; font-weight: 900; font-family: 'Orbitron', sans-serif;">⭐ ${xp.toLocaleString()} XP</span>
                    </div>
                </div>
            `;
        }).join('');

        box.innerHTML = leaderboardMarkup;

    } catch (error) {
        console.error("Leaderboard Error:", error);
        box.innerHTML = `<h3 style="text-align: center; color: var(--danger, #ef4444); padding: 40px;">❌ Error Loading Leaderboard Data</h3>`;
    }
}

// Initial Execution Trigger
loadLeaderboard();