import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// PRIME LEVELS CONFIG MATRIX
const primeTiers = [
    { level: 1, name: "PRIME 1 (BRONZE)", req: 500, perk: "+5% Bonus Diamonds", desc: "Basic Member Access" },
    { level: 2, name: "PRIME 2 (SILVER)", req: 2000, perk: "+10% Bonus Diamonds", desc: "Priority Delivery" },
    { level: 3, name: "PRIME 3 (GOLD 🥇)", req: 5000, perk: "+15% Bonus Diamonds", desc: "VIP Chat Badge" },
    { level: 4, name: "PRIME 4 (DIAMOND 💎)", req: 10000, perk: "+20% Bonus Diamonds", desc: "Exclusive Spin Discounts" },
    { level: 5, name: "PRIME 5 (CROWN 👑)", req: 10000, perk: "+25% Bonus Diamonds", desc: "Ultra Crown Status" }
];

let currentUser = null;

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const diamonds = data.diamonds ?? data.wallet ?? 0;
                renderPrimeUI(user.uid, diamonds);
            }
        });
    } else {
        renderPrimeUI(null, 0);
    }
});

function renderPrimeUI(uid, diamonds) {
    let currentTier = primeTiers[0];

    if (diamonds >= 10000) currentTier = primeTiers[4]; // LEVEL 5 CROWN
    else if (diamonds >= 5000) currentTier = primeTiers[3]; // LEVEL 4
    else if (diamonds >= 2000) currentTier = primeTiers[2]; // LEVEL 3
    else if (diamonds >= 500) currentTier = primeTiers[1]; // LEVEL 2

    const emblemEl = document.getElementById("ff-giant-emblem");
    const levelTitleEl = document.getElementById("ff-level-title");
    const neededTextEl = document.getElementById("ff-needed-diamonds");
    const barFillEl = document.getElementById("ff-bar-fill");
    const barTextEl = document.getElementById("ff-bar-text");
    const gridEl = document.getElementById("ff-privilege-grid");
    const trackEl = document.getElementById("ff-timeline-nodes");

    if (emblemEl) emblemEl.innerText = currentTier.level;
    if (levelTitleEl) levelTitleEl.innerText = currentTier.name;

    const percentage = Math.min(100, Math.floor((diamonds / currentTier.req) * 100));

    if (barFillEl) barFillEl.style.width = `${percentage}%`;
    if (barTextEl) barTextEl.innerText = `${diamonds.toLocaleString()} / ${currentTier.req.toLocaleString()}`;
    if (neededTextEl) neededTextEl.innerText = `Gain 💎 ${(currentTier.req - diamonds > 0 ? currentTier.req - diamonds : 0).toLocaleString()} to upgrade!`;

    // Render Privilege Cards
    if (gridEl) {
        gridEl.innerHTML = `
            <div class="privilege-card">
                <h4>🎁 EXTRA BONUS</h4>
                <p>${currentTier.perk}</p>
            </div>
            <div class="privilege-card">
                <h4>⭐ SPECIAL PERK</h4>
                <p>${currentTier.desc}</p>
            </div>
        `;
    }

    // Render Timeline Level Nodes
    if (trackEl) {
        trackEl.innerHTML = primeTiers.map(tier => `
            <div class="timeline-node ${tier.level === currentTier.level ? 'active' : ''}">
                <h3>L${tier.level}</h3>
                <div style="font-size:9px; color:#ffcc00; margin-top:2px;">💎 ${tier.req}</div>
            </div>
        `).join('');
    }

    // Update User Document in Firestore
    if (uid) {
        setDoc(doc(db, "users", uid), {
            primeLevel: currentTier.name,
            primeTierNum: currentTier.level
        }, { merge: true });
    }
}