import { db, auth } from "./firebase-config.js";
import { 
    doc, 
    getDoc,
    onSnapshot, 
    updateDoc,
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// DOM Targets
const slotsGrid = document.getElementById("wheel-slots-grid");
const spinnerNeedle = document.getElementById("ring-spinner-needle");
const eventTitleDisplay = document.getElementById("event-title-display");
const tokenDisplay = document.getElementById("user-token-balance");
const diamondDisplay = document.getElementById("user-diamonds-display");
const congratsPopup = document.getElementById("congratulations-popup");
const rightColumnPrizes = document.getElementById("right-column-prizes");

const exchangeModal = document.getElementById("exchange-modal");
const exchangeWalletText = document.getElementById("exchange-wallet-tokens");
const itemsRendererGrid = document.getElementById("exchange-items-renderer");

let currentUserUid = "";
let currentDiamonds = 0;
let currentTokens = 0;
let isSpinning = false;
let activeKey = "mystical-ring";
let activeShopTab = "grand";

const gameEventsData = {
    "mystical-ring": {
        title: "MYSTICAL RING",
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
    }
};

const exchangeStoreCatalog = {
    "grand": [
        { name: "iPhone 16 Pro Max", img: "images/iphone16.png", cost: 5000, tag: "🏆 LEGENDARY" },
        { name: "iPhone 15 Pro", img: "images/iphone16.png", cost: 3500, tag: "✨ MYTHIC" },
        { name: "Red Gloo Wall Skin", img: "images/gloowall.png", cost: 1500, tag: "🛡️ WALL PREMIUM" }
    ],
    "crates": [
        { name: "Epic Weapon Crate", img: "images/weapon_crate.png", cost: 80, tag: "🔫 GUN BOX" },
        { name: "Rare Avatar Badge", img: "images/avtar.png", cost: 30, tag: "👤 CUSTOM CARD" }
    ]
};

// AUTH & REALTIME SYNC
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

// Setup Circular Wheel Items
function setupCircularWheelLayout(key) {
    const data = gameEventsData[key];
    if (!slotsGrid || !data) return;
    slotsGrid.innerHTML = "";

    const total = data.slots.length;
    const radius = 130;
    const center = 160;

    data.slots.forEach((slot, i) => {
        const angle = (i * 2 * Math.PI) / total - (Math.PI / 2);
        const x = Math.round(center + radius * Math.cos(angle));
        const y = Math.round(center + radius * Math.sin(angle));

        const node = document.createElement("div");
        node.className = `ff-card-node ${slot.grand ? 'grand-item' : ''}`;
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        node.innerHTML = `
            <img src="${slot.img}" alt="Prize">
            <span>${slot.name}</span>
        `;

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

// Spin Pointer Needle Execution
let needleDegrees = 0;
async function executeRingSpin(cost) {
    if (isSpinning) return;

    if (currentDiamonds < cost) {
        alert(`❌ Insufficient Diamonds! You need ${cost} Diamonds.`);
        window.location.href = "topup.html";
        return;
    }

    isSpinning = true;

    const event = gameEventsData[activeKey] || gameEventsData["mystical-ring"];
    const totalSlots = event.slots.length;
    let winnerIdx = Math.floor(Math.random() * totalSlots);

    const angleSize = 360 / totalSlots;
    needleDegrees += (5 * 360) + (winnerIdx * angleSize) - (needleDegrees % 360);

    if (spinnerNeedle) spinnerNeedle.style.transform = `rotate(${needleDegrees}deg)`;

    setTimeout(async () => {
        isSpinning = false;

        const prizeWon = event.slots[winnerIdx];
        let updatedTokens = currentTokens + (prizeWon.isToken ? prizeWon.amount : 0);
        let updatedDiamonds = currentDiamonds - cost;

        if (currentUserUid) {
            await updateDoc(doc(db, "users", currentUserUid), {
                diamonds: updatedDiamonds,
                tokens: updatedTokens
            });
        }

        updateRightShowcaseBox(prizeWon);
        triggerCongratsBanner(prizeWon.name, prizeWon.img);
    }, 4000);
}

function triggerCongratsBanner(name, img) {
    const nameEl = document.getElementById("congrats-item-name");
    const imgEl = document.getElementById("congrats-item-img");
    if (nameEl) nameEl.innerText = name;
    if (imgEl) imgEl.src = img;
    if (congratsPopup) congratsPopup.style.display = "flex";
}

// Exchange Store
function renderExchangeShopItems(tabKey) {
    if (!itemsRendererGrid) return;
    itemsRendererGrid.innerHTML = "";
    const itemsPool = exchangeStoreCatalog[tabKey] || [];

    itemsPool.forEach(item => {
        const itemBox = document.createElement("div");
        itemBox.className = "ex-shop-node";
        itemBox.innerHTML = `
            <div class="ex-node-badge">${item.tag}</div>
            <img src="${item.img}" class="ex-node-img" alt="Item">
            <div class="ex-node-title">${item.name}</div>
            <button class="ex-node-claim-btn" style="background:#22c55e; color:#fff; border:none; padding:8px; border-radius:6px; font-weight:bold;">CLAIM (${item.cost} 🪙)</button>
        `;
        itemsRendererGrid.appendChild(itemBox);
    });
}

// Bindings
document.getElementById("btn-spin-1")?.addEventListener("click", () => executeRingSpin(10));
document.getElementById("btn-spin-10")?.addEventListener("click", () => executeRingSpin(100));

document.getElementById("open-exchange-btn")?.addEventListener("click", () => {
    if (exchangeModal) exchangeModal.style.display = "flex";
    renderExchangeShopItems(activeShopTab);
});

document.getElementById("close-exchange-btn")?.addEventListener("click", () => {
    if (exchangeModal) exchangeModal.style.display = "none";
});

document.getElementById("congrats-dismiss-bstn")?.addEventListener("click", () => {
    if (congratsPopup) congratsPopup.style.display = "none";
});

// Tab Switcher
document.querySelectorAll(".ff-menu-item").forEach(item => {
    item.onclick = () => {
        if (isSpinning) return;
        document.querySelectorAll(".ff-menu-item").forEach(m => m.classList.remove("active"));
        item.classList.add("active");

        activeKey = item.getAttribute("data-event");

        const ringWheelSection = document.getElementById("ring-wheel-section");
        const fadedWheelSection = document.getElementById("faded-wheel-section");

        if (activeKey === "faded-wheel-event") {
            if (eventTitleDisplay) eventTitleDisplay.innerText = "🎡 FADED WHEEL ARENA";
            if (ringWheelSection) ringWheelSection.style.display = "none";
            if (fadedWheelSection) fadedWheelSection.style.display = "block";
        } else {
            if (eventTitleDisplay) eventTitleDisplay.innerText = gameEventsData[activeKey] ? gameEventsData[activeKey].title : "LUCK ROYALE";
            if (fadedWheelSection) fadedWheelSection.style.display = "none";
            if (ringWheelSection) ringWheelSection.style.display = "block";
            setupCircularWheelLayout(activeKey);
        }
    };
});

setupCircularWheelLayout("mystical-ring");