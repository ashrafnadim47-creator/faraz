import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const PRIME_LEVELS_DATA = [
    {
        level: 1,
        title: "PRIME 1",
        maxSpent: 500,
        rewards: [
            { icon: "🖼️", name: "PRIME 1 AVATAR & BANNER" },
            { icon: "🥉", name: "BRONZE PROFILE BADGE" },
            { icon: "👥", name: "+10 FRIEND SLOTS" },
            { icon: "⚡", name: "STANDARD TOP-UP SPEED" }
        ]
    },
    {
        level: 2,
        title: "PRIME 2",
        maxSpent: 2000,
        rewards: [
            { icon: "🥈", name: "SILVER PROFILE BADGE" },
            { icon: "👥", name: "+30 FRIEND SLOTS" },
            { icon: "🎁", name: "2% BONUS DIAMONDS" },
            { icon: "🎫", name: "1X DIAMOND VOUCHER" }
        ]
    },
    {
        level: 3,
        title: "PRIME 3",
        maxSpent: 5000,
        rewards: [
            { icon: "🥇", name: "GOLD PROFILE BADGE" },
            { icon: "👥", name: "+50 FRIEND SLOTS" },
            { icon: "📜", name: "NAME CHANGE CARD PASS" },
            { icon: "🎁", name: "5% BONUS DIAMONDS" }
        ]
    },
    {
        level: 4,
        title: "PRIME 4",
        maxSpent: 10000,
        rewards: [
            { icon: "🕺", name: "LOUDER PLEASE EMOTE" },
            { icon: "🖼️", name: "ADVANCED PRIME BANNER" },
            { icon: "👥", name: "+100 FRIEND SLOTS" },
            { icon: "👑", name: "PRIME 4 SYMBOL" }
        ]
    },
    {
        level: 5,
        title: "PRIME 5",
        maxSpent: 25000,
        rewards: [
            { icon: "💎", name: "EXCLUSIVE BUNDLE" },
            { icon: "👑", name: "SUPREME DIAMOND BADGE" },
            { icon: "⚡", name: "INSTANT AUTO TOP-UP PASS" },
            { icon: "🎁", name: "12% BONUS DIAMONDS" }
        ]
    }
];

function renderPrivileges(rewardsList) {
    const grid = document.getElementById("ff-privilege-grid");
    if (!grid) return;

    grid.innerHTML = rewardsList.map(item => `
        <div class="ff-card">
            <div class="card-icon">${item.icon}</div>
            <span>${item.name}</span>
        </div>
    `).join("");
}

function renderTimelineNodes(activeLevelNum) {
    const container = document.getElementById("ff-timeline-nodes");
    if (!container) return;

    container.innerHTML = PRIME_LEVELS_DATA.map(data => `
        <div class="ff-node ${data.level === activeLevelNum ? 'active-view' : ''}" data-level="${data.level}">
            PRIME ${data.level}
        </div>
    `).join("");

    document.querySelectorAll(".ff-node").forEach(node => {
        node.addEventListener("click", () => {
            const lvl = parseInt(node.getAttribute("data-level"));
            const selectedData = PRIME_LEVELS_DATA.find(d => d.level === lvl);
            if (selectedData) {
                renderPrivileges(selectedData.rewards);
                document.querySelectorAll(".ff-node").forEach(n => n.classList.remove("active-view"));
                node.classList.add("active-view");
            }
        });
    });
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        const userTotalSpent = userData.totalSpent || 0;

        let currentLevelObj = PRIME_LEVELS_DATA[0];

        for (let i = 0; i < PRIME_LEVELS_DATA.length; i++) {
            const prevLimit = i === 0 ? 0 : PRIME_LEVELS_DATA[i - 1].maxSpent;
            if (userTotalSpent >= prevLimit) {
                currentLevelObj = PRIME_LEVELS_DATA[i];
            }
        }

        const needed = Math.max(0, currentLevelObj.maxSpent - userTotalSpent);
        const percent = Math.min(100, Math.floor((userTotalSpent / currentLevelObj.maxSpent) * 100));

        document.getElementById("ff-giant-emblem").innerText = currentLevelObj.level;
        document.getElementById("ff-level-title").innerText = currentLevelObj.title;
        document.getElementById("ff-needed-diamonds").innerText = needed > 0 
            ? `Gain 💎 ${needed} to reach Next Level` 
            : `MAX LEVEL REACHED!`;

        document.getElementById("ff-bar-fill").style.width = `${percent}%`;
        document.getElementById("ff-bar-text").innerText = `${userTotalSpent} / ${currentLevelObj.maxSpent}`;

        renderPrivileges(currentLevelObj.rewards);
        renderTimelineNodes(currentLevelObj.level);

    } catch (err) {
        console.error("Error loading Prime System:", err);
    }
});