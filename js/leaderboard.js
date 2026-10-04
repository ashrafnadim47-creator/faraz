import { db } from "./firebase-config.js";
import { 
    collection, 
    query, 
    orderBy, 
    limit, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const container = document.getElementById("leaderboard-list");

function loadLeaderboardData() {
    if (!container) return;

    const usersRef = collection(db, "users");
    const q = query(usersRef, orderBy("diamonds", "desc"), limit(20));

    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            container.innerHTML = `<p style="text-align:center; color:#94a3b8;">No ranked players found.</p>`;
            return;
        }

        container.innerHTML = "";
        let rank = 1;

        snapshot.forEach((docSnap) => {
            const user = docSnap.data();
            const diamonds = user.diamonds ?? 0;
            const xp = user.xp ?? user.points ?? 0;
            const name = user.nickname || (user.email ? user.email.split('@')[0] : "Player");
            const primeLevel = user.primeLevel || (diamonds >= 10000 ? "CROWN 👑" : "BRONZE");

            const rankNode = document.createElement("div");
            rankNode.className = `rank-node ${rank === 1 ? 'top-1' : ''}`;
            rankNode.innerHTML = `
                <div class="rank-number">#${rank}</div>
                <div class="player-info">
                    <div class="player-name">${name} ${rank === 1 ? '👑' : ''}</div>
                    <div class="player-tier">${primeLevel}</div>
                </div>
                <div class="score-box">
                    <div class="score-diamonds">💎 ${diamonds.toLocaleString()}</div>
                    <div class="score-xp">⭐ ${xp.toLocaleString()} XP</div>
                </div>
            `;

            container.appendChild(rankNode);
            rank++;
        });
    });
}

loadLeaderboardData();