import { db, auth } from "./firebase-config.js";
import { 
    doc, 
    onSnapshot, 
    updateDoc,
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// DOM Targets Matrix
const slotsGrid = document.getElementById("wheel-slots-grid");
const spinnerNeedle = document.getElementById("ring-spinner-needle");
const eventTitleDisplay = document.getElementById("event-title-display");
const tokenDisplay = document.getElementById("user-token-balance");
const diamondDisplay = document.getElementById("user-diamonds-display");
const congratsPopup = document.getElementById("congratulations-popup");
const rightColumnPrizes = document.getElementById("right-column-prizes");

// Exchange Store Elements
const exchangeModal = document.getElementById("exchange-modal");
const exchangeWalletText = document.getElementById("exchange-wallet-tokens");
const itemsRendererGrid = document.getElementById("exchange-items-renderer");

// Faded Wheel Elements
const fadedActionBtn = document.getElementById("main-action-trigger");
const fadedStatusMsg = document.getElementById("status-message");

// State Variables
let currentUserUid = "";
let currentDiamonds = 0;
let currentTokens = 0;
let isSpinning = false;
let activeKey = "mystical-ring";
let activeShopTab = "grand";
let spinTimerTimeout = null;

// Faded Wheel States
let fadedSelected = [];
let fadedRemoved = JSON.parse(localStorage.getItem('fw_persist_removed') || "[]");
let fadedWon = JSON.parse(localStorage.getItem('fw_persist_won') || "[]");
let fadedSpinPointer = parseInt(localStorage.getItem('fw_persist_pointer') || "0", 10);
const fadedCosts = [9, 19, 39, 69, 99, 149, 199, 499];

const gameEventsData = {
    "mystical-ring": {
        title: "MYSTICAL RING",
        isLocked: false,
        slots: [
            { name: "iPhone 16 Pro Max", img: "images/iphone16.png", grand: true, isToken: false, type: "🏆 GRAND PRIZE" },
            { name: "1 Token", img: "images/token.png", isToken: true, amount: 1, type: "🪙 MYSTICAL TOKEN" },
            { name: "5 Tokens", img: "images/token.png", isToken: true, amount: 5, type: "🪙 MYSTICAL TOKEN" },
            { name: "2 Tokens", img: "images/token.png", isToken: true, amount: 2, type: "🪙 MYSTICAL TOKEN" },
            { name: "10 Tokens", img: "images/token.png", isToken: true, amount: 10, type: "🪙 MYSTICAL TOKEN" },
            { name: "3 Tokens", img: "images/token.png", isToken: true, amount: 3, type: "🪙 MYSTICAL TOKEN" },
            { name: "Free Fire Crate", img: "images/weapon_crate.png", isToken: false, type: "🔫 EPIC GUN CRATE" },
            { name: "20 Tokens", img: "images/token.png", isToken: true, amount: 20, type: "🪙 MYSTICAL TOKEN" }
        ]
    },
    "wall-royale": {
        title: "WALL STORE",
        isLocked: false,
        slots: [
            { name: "Red Gloo Wall", img: "images/gloowall.png", grand: true, isToken: false, type: "🏆 LEGENDARY SKIN" },
            { name: "1 Token", img: "images/token.png", isToken: true, amount: 1, type: "🪙 ROYALE TOKEN" },
            { name: "Weapon Box", img: "images/weapon_crate.png", isToken: false, type: "🔫 GUN CRATE" },
            { name: "5 Tokens", img: "images/token.png", isToken: true, amount: 5, type: "🪙 ROYALE TOKEN" },
            { name: "Blue Gloo Wall", img: "images/gloowall.png", grand: true, isToken: false, type: "🏆 LEGENDARY SKIN" },
            { name: "10 Tokens", img: "images/token.png", isToken: true, amount: 10, type: "🪙 ROYALE TOKEN" },
            { name: "Sasta Avatar", img: "images/avtar.png", isToken: false, type: "👤 RARE AVATAR CARD" },
            { name: "3 Tokens", img: "images/token.png", isToken: true, amount: 3, type: "🪙 ROYALE TOKEN" }
        ]
    },
    "diwali-ring": {
        title: "DIWALI RING 🪔",
        isLocked: true,
        unlockDate: "2026-11-01T00:00:00",
        slots: [
            { name: "Diwali Bundle", img: "images/diwali_bundle.png", grand: true, isToken: false, type: "🏆 MYTHIC BUNDLE" },
            { name: "1 Token", img: "images/token.png", isToken: true, amount: 1, type: "🪙 DIWALI TOKEN" },
            { name: "5 Tokens", img: "images/token.png", isToken: true, amount: 5, type: "🪙 DIWALI TOKEN" },
            { name: "Crackers Crate", img: "images/loot_box.png", isToken: false, type: "📦 EXCLUSIVE LOOT BOX" },
            { name: "10 Tokens", img: "images/token.png", isToken: true, amount: 10, type: "🪙 DIWALI TOKEN" },
            { name: "2 Tokens", img: "images/token.png", isToken: true, amount: 2, type: "🪙 DIWALI TOKEN" },
            { name: "Sweet Box Item", img: "images/loot_box.png", isToken: false, type: "📦 SPECIAL LOOT BOX" },
            { name: "20 Tokens", img: "images/token.png", isToken: true, amount: 20, type: "🪙 DIWALI TOKEN" }
        ]
    }
};

// Realtime User Data Listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserUid = user.uid;
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                currentDiamonds = data.diamonds ?? data.wallet ?? 0;
                currentTokens = data.tokens ?? 0;

                if (tokenDisplay) tokenDisplay.innerText = currentTokens;
                if (diamondDisplay) diamondDisplay.innerText = `💎 ${currentDiamonds.toLocaleString()}`;
                if (exchangeWalletText) exchangeWalletText.innerText = currentTokens;
            }
        });
    }
});

function setupCircularWheelLayout(key) {
    const data = gameEventsData[key];
    if (!slotsGrid || !data) return;
    slotsGrid.innerHTML = "";

    const total = data.slots.length;
    const radius = 110;
    const center = 140;

    data.slots.forEach((slot, i) => {
        const angle = (i * 2 * Math.PI) / total - (Math.PI / 2);
        const x = Math.round(center + radius * Math.cos(angle));
        const y = Math.round(center + radius * Math.sin(angle));

        const node = document.createElement("div");
        node.className = `ff-card-node ${slot.grand ? 'grand-item' : ''}`;
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        node.innerHTML = `<img src="${slot.img}" alt="Prize"><span>${slot.name}</span>`;
        node.onclick = () => updateRightShowcaseBox(slot);
        slotsGrid.appendChild(node);
    });

    if (data.slots.length > 0) updateRightShowcaseBox(data.slots[0]);
}

function updateRightShowcaseBox(item) {
    if (!rightColumnPrizes) return;
    rightColumnPrizes.innerHTML = `
        <div class="ff-showcase-card ${item.grand ? 'epic-glow' : ''}">
            <div class="ff-item-badge">${item.type || 'REWARD'}</div>
            <div class="ff-item-image-wrap"><img src="${item.img}" alt="${item.name}"></div>
            <h2 class="ff-item-display-title">${item.name}</h2>
        </div>
    `;
}

let needleDegrees = 0;

async function executeRingSpin(spinCount, cost) {
    if (isSpinning) return;

    if (!currentUserUid) {
        alert("🔒 Please log in to spin!");
        window.location.href = "topup.html";
        return;
    }

    if (currentDiamonds < cost) {
        alert(`❌ Insufficient Diamonds! You need 💎 ${cost}.`);
        window.location.href = "topup.html";
        return;
    }

    isSpinning = true;

    // TAP TO SKIP BUTTON
    let skipBtn = document.getElementById("royale-skip-btn");
    if (!skipBtn) {
        skipBtn = document.createElement("button");
        skipBtn.id = "royale-skip-btn";
        skipBtn.style.cssText = `
            position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
            padding: 10px 24px; background: #ffcc00; color: #000; font-family: 'Orbitron', sans-serif;
            font-weight: 900; border: none; border-radius: 20px; cursor: pointer; z-index: 1000;
        `;
        skipBtn.innerText = "⚡ TAP TO SKIP";
        document.body.appendChild(skipBtn);
    }
    skipBtn.style.display = "block";

    const event = gameEventsData[activeKey];
    const totalSlots = event.slots.length;
    const wonPrizesList = [];
    let tokensGained = 0;

    // Generate Array of 1 or 10 rewards
    for (let i = 0; i < spinCount; i++) {
        const randomIndex = Math.floor(Math.random() * totalSlots);
        const prize = event.slots[randomIndex];
        wonPrizesList.push(prize);
        if (prize.isToken) tokensGained += (prize.amount || 1);
    }

    const lastWinnerIdx = event.slots.indexOf(wonPrizesList[wonPrizesList.length - 1]);
    const angleSize = 360 / totalSlots;
    needleDegrees += (5 * 360) + (lastWinnerIdx * angleSize) - (needleDegrees % 360);

    if (spinnerNeedle) {
        spinnerNeedle.style.transition = "transform 3.5s cubic-bezier(0.15, 0.9, 0.15, 1)";
        spinnerNeedle.style.transform = `rotate(${needleDegrees}deg)`;
    }

    const finalizeSpinResult = async () => {
        if (spinTimerTimeout) clearTimeout(spinTimerTimeout);
        isSpinning = false;
        skipBtn.style.display = "none";

        try {
            await updateDoc(doc(db, "users", currentUserUid), {
                diamonds: currentDiamonds - cost,
                tokens: currentTokens + tokensGained
            });
        } catch (e) {
            console.error(e);
        }

        // Show Multi-Item or Single Item Banner
        triggerCongratsBanner(wonPrizesList);
    };

    skipBtn.onclick = () => finalizeSpinResult();
    spinTimerTimeout = setTimeout(() => finalizeSpinResult(), 3500);
}

// Multi-Reward Popup Renderer Fix
function triggerCongratsBanner(wonPrizesList) {
    const container = document.querySelector(".unlocked-reward-display");
    const subTitle = document.querySelector(".congrats-sub");
    if (!congratsPopup || !container) return;

    if (Array.isArray(wonPrizesList) && wonPrizesList.length > 1) {
        if (subTitle) subTitle.innerText = `YOU UNLOCKED ${wonPrizesList.length} REWARDS!`;
        
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; max-height: 280px; overflow-y: auto; padding: 10px; background: rgba(15, 23, 42, 0.6); border-radius: 12px; border: 1px solid rgba(0,229,255,0.2);">
                ${wonPrizesList.map((item) => `
                    <div style="background: rgba(30, 41, 59, 0.9); border: 1px solid ${item.grand ? '#ffcc00' : '#00e5ff'}; border-radius: 10px; padding: 6px; text-align: center;">
                        <img src="${item.img}" style="width: 36px; height: 36px; object-fit: contain;">
                        <div style="font-size: 9px; color: #ffcc00; margin-top: 4px; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.name}</div>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        const item = Array.isArray(wonPrizesList) ? wonPrizesList[0] : wonPrizesList;
        if (subTitle) subTitle.innerText = "YOU UNLOCKED A NEW REWARD";
        container.innerHTML = `
            <img src="${item.img}" style="max-width: 110px; height: 110px; object-fit: contain;">
            <h2 style="color: #ffcc00; margin-top: 10px; font-size: 18px;">${item.name}</h2>
        `;
    }

    congratsPopup.style.display = "flex";
}

// Event Bindings
document.getElementById("btn-spin-1")?.addEventListener("click", () => executeRingSpin(1, 10));
document.getElementById("btn-spin-10")?.addEventListener("click", () => executeRingSpin(10, 100));

document.getElementById("congrats-dismiss-bstn")?.addEventListener("click", () => {
    if (congratsPopup) congratsPopup.style.display = "none";
});

setupCircularWheelLayout("mystical-ring");