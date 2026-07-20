import { db, auth } from "./firebase-config.js";
import { 
    doc, 
    onSnapshot, 
    updateDoc, 
    collection, 
    addDoc 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// DOM Targets Matrix
const slotsGrid = document.getElementById("wheel-slots-grid");
const eventTitleDisplay = document.getElementById("event-title-display");
const tokenDisplay = document.getElementById("user-token-balance");
const wheelContainer = document.getElementById("wheel-slots-grid");
const congratsPopup = document.getElementById("congratulations-popup");
const rightColumnPrizes = document.getElementById("right-column-prizes");

// MODAL UI TARGETS FOR EXCHANGE STORE
const exchangeModal = document.getElementById("exchange-modal");
const exchangeWalletText = document.getElementById("exchange-wallet-tokens");
const itemsRendererGrid = document.getElementById("exchange-items-renderer");

let currentUserUid = "";
let currentDiamonds = 0;
let currentTokens = 0;
let isSpinning = false;
let activeKey = "mystical-ring";
let activeShopTab = "grand";
let lockIntervalTimer = null;

// ==========================================================================
// 💎 RING EVENTS DATASET (WITH LOCK SYSTEM)
// ==========================================================================
const gameEventsData = {
    "mystical-ring": {
        title: "MYSTICAL RING",
        isLocked: false,
        unlockDate: null,
        slots: [
            { name: "iPhone 16 Pro Max", img: "images/iphone16.png", grand: true, isToken: false, type: "🏆 GRAND PRIZE" },
            { name: "1 Token", img: "images/token.png", isToken: true, amount: 1, type: "🪙 MYSTICAL TOKEN" },
            { name: "5 Tokens", img: "images/token.png", isToken: true, amount: 5, type: "🪙 MYSTICAL TOKEN" },
            { name: "2 Tokens", img: "images/token.png", isToken: true, amount: 2, type: "🪙 MYSTICAL TOKEN" },
            { name: "10 Tokens", img: "images/token.png", isToken: true, amount: 10, type: "🪙 MYSTICAL TOKEN" },
            { name: "3 Tokens", img: "images/token.png", isToken: true, amount: 3, type: "🪙 MYSTICAL TOKEN" },
            { name: "Free Fire Crate", img: "images/weapon_crate.png", isToken: false, type: "🔫 EPIC GUN LOOT CRATE" },
            { name: "20 Tokens", img: "images/token.png", isToken: true, amount: 20, type: "🪙 MYSTICAL TOKEN" }
        ]
    },
    "wall-royale": {
        title: "WALL STORE",
        isLocked: false,
        unlockDate: null,
        slots: [
            { name: "Red Gloo Wall", img: "images/gloowall.png", grand: true, isToken: false, type: "🏆 LEGENDARY SKIN" },
            { name: "1 Token", img: "images/token.png", isToken: true, amount: 1, type: "🪙 ROYALE TOKEN" },
            { name: "Weapon Box", img: "images/weapon_crate.png", isToken: false, type: "🔫 GUN CRATE REWARD" },
            { name: "5 Tokens", img: "images/token.png", isToken: true, amount: 5, type: "🪙 ROYALE TOKEN" },
            { name: "Blue Gloo Wall", img: "images/gloowall.png", grand: true, isToken: false, type: "🏆 LEGENDARY SKIN" },
            { name: "10 Tokens", img: "images/token.png", isToken: true, amount: 10, type: "🪙 ROYALE TOKEN" },
            { name: "Sasta Avatar", img: "images/avtar.png", isToken: false, type: "👤 RARE AVATAR CARD" },
            { name: "3 Tokens", img: "images/token.png", isToken: true, amount: 3, type: "🪙 ROYALE TOKEN" }
        ]
    },
    "diwali-ring": {
        title: "DIWALI RING 🪔",
        isLocked: true, // 🔒 LOCK ACTIVATED
        unlockDate: "2026-11-01T00:00:00", // Yahan aap apni Unlock Date/Time set kar sakte hain
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

// EXCHANGE STORE CATALOG
const exchangeStoreCatalog = {
    "grand": [
        { name: "iPhone 16 Pro Max", img: "images/iphone16.png", cost: 5000, tag: "🏆 LEGENDARY", class: "legendary-border" },
        { name: "iPhone 15 Pro", img: "images/iphone16.png", cost: 3500, tag: "✨ MYTHIC", class: "" },
        { name: "Red Gloo Wall Skin", img: "images/gloowall.png", cost: 1500, tag: "🛡️ WALL PREMIUM", class: "legendary-border" },
        { name: "Diwali Special Bundle", img: "images/diwali_bundle.png", cost: 2000, tag: "🔥 BUNDLE UNIQ", class: "legendary-border" }
    ],
    "crates": [
        { name: "Epic Weapon Crate", img: "images/weapon_crate.png", cost: 80, tag: "🔫 GUN BOX", class: "" },
        { name: "Diwali Firework Crate", img: "images/loot_box.png", cost: 50, tag: "📦 SPECIAL LOOT", class: "" },
        { name: "Rare Avatar Badge", img: "images/avtar.png", cost: 30, tag: "👤 CUSTOM CARD", class: "" }
    ]
};

// Modular Firebase Auth & Snapshot Sync
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserUid = user.uid;
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                currentDiamonds = data.diamonds ?? 0;
                currentTokens = data.tokens ?? 0;
                if (tokenDisplay) tokenDisplay.innerText = currentTokens;
                if (exchangeWalletText) exchangeWalletText.innerText = currentTokens;
            }
        });
    }
});

// ==========================================================================
// 🔒 LOCK & COUNTDOWN ENGINE FOR SPECIAL EVENTS
// ==========================================================================
function checkAndRenderEventLockState(key) {
    const event = gameEventsData[key];
    if (lockIntervalTimer) clearInterval(lockIntervalTimer);

    const spin1Btn = document.getElementById("btn-spin-1");
    const spin10Btn = document.getElementById("btn-spin-10");

    // Remove existing lock overlays if any
    const existingOverlay = document.getElementById("event-lock-overlay");
    if (existingOverlay) existingOverlay.remove();

    if (!event || !event.isLocked) {
        // Unlock Spin Buttons
        if (spin1Btn) spin1Btn.disabled = false;
        if (spin10Btn) spin10Btn.disabled = false;
        return false; // Event is active
    }

    // Disable Spin Buttons
    if (spin1Btn) spin1Btn.disabled = true;
    if (spin10Btn) spin10Btn.disabled = true;

    // Create Lock Overlay over wheel container
    const lockOverlay = document.createElement("div");
    lockOverlay.id = "event-lock-overlay";
    lockOverlay.style.cssText = `
        position: absolute;
        inset: 0;
        background: rgba(2, 6, 23, 0.92);
        backdrop-filter: blur(8px);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 100;
        border-radius: 50%;
        text-align: center;
        padding: 20px;
        border: 2px dashed #ffcc00;
    `;

    lockOverlay.innerHTML = `
        <div style="font-size: 45px; margin-bottom: 8px;">🔒</div>
        <h3 style="color: #ffcc00; font-family: 'Orbitron', sans-serif; font-size: 18px; margin-bottom: 6px;">EVENT LOCKED</h3>
        <p style="color: #cbd5e1; font-size: 12px; margin-bottom: 12px;">Diwali Special Event unlocks soon!</p>
        <div id="lock-timer-display" style="font-family: 'Orbitron', sans-serif; font-size: 14px; font-weight: 900; color: #00e5ff; background: rgba(0,229,255,0.1); padding: 8px 16px; border-radius: 20px; border: 1px solid #00e5ff;">
            Calculating...
        </div>
    `;

    if (wheelContainer) {
        wheelContainer.style.position = "relative";
        wheelContainer.appendChild(lockOverlay);
    }

    // Timer Calculation
    const targetTime = new Date(event.unlockDate).getTime();

    function updateCountdown() {
        const now = new Date().getTime();
        const diff = targetTime - now;

        const timerDisplay = document.getElementById("lock-timer-display");

        if (diff <= 0) {
            // Unlock automatically
            event.isLocked = false;
            clearInterval(lockIntervalTimer);
            setupCircularWheelLayout(key);
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (timerDisplay) {
            timerDisplay.innerText = `⏳ ${days}d ${hours}h ${minutes}m ${seconds}s`;
        }
    }

    updateCountdown();
    lockIntervalTimer = setInterval(updateCountdown, 1000);
    return true; // Event is locked
}

// Circular Wheel Setup
function setupCircularWheelLayout(key) {
    const data = gameEventsData[key];
    if (!slotsGrid || !data) return;
    slotsGrid.innerHTML = "";

    const isLocked = checkAndRenderEventLockState(key);

    const total = data.slots.length;
    const radius = 145;
    const center = 200;

    data.slots.forEach((slot, i) => {
        const angle = (i * 2 * Math.PI) / total - (Math.PI / 2);
        const x = Math.round(center + radius * Math.cos(angle));
        const y = Math.round(center + radius * Math.sin(angle));

        const node = document.createElement("div");
        node.className = `ff-card-node ${slot.grand ? 'grand-item' : ''}`;
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        node.style.cursor = isLocked ? "not-allowed" : "pointer";
        node.innerHTML = `
            <img src="${slot.img}" alt="Prize" style="${isLocked ? 'filter: grayscale(1); opacity: 0.5;' : ''}">
            <span>${slot.name}</span>
        `;

        node.onclick = (e) => {
            e.stopPropagation();
            if (!isLocked) {
                updateRightShowcaseBox(slot);
            }
        };

        slotsGrid.appendChild(node);
    });

    if (data.slots.length > 0 && !isLocked) {
        updateRightShowcaseBox(data.slots[0]);
    }
}

// Right Showcase Box
function updateRightShowcaseBox(item) {
    if (!rightColumnPrizes) return;

    rightColumnPrizes.innerHTML = `
        <div class="ff-showcase-card ${item.grand ? 'epic-glow' : ''}">
            <div class="ff-item-badge">${item.type || 'REWARD'}</div>
            <div class="ff-item-image-wrap">
                <img src="${item.img}" alt="${item.name}">
            </div>
            <h2 class="ff-item-display-title">${item.name}</h2>
            <p class="ff-item-status-text">Available in Luck Royale Draw Pool</p>
        </div>
    `;
}

// Spin Rotation Controller
let currentDegreesRotation = 0;
function executeRingSpin(cost) {
    if (isSpinning) return;

    const event = gameEventsData[activeKey];
    if (event.isLocked) {
        alert("🔒 This Event is currently locked! Please wait until the unlock timer finishes.");
        return;
    }

    if (currentDiamonds < cost) {
        alert("❌ Diamonds insufficient! Top-up your wallet account.");
        return;
    }

    isSpinning = true;
    const totalSlots = event.slots.length;
    let winnerIdx = Math.floor(Math.random() * totalSlots);

    // Block direct iPhone win on normal random spin
    if (event.slots[winnerIdx].name === "iPhone 16 Pro Max") {
        isSpinning = false;
        executeRingSpin(cost);
        return;
    }

    const angleSize = 360 / totalSlots;
    currentDegreesRotation += (5 * 360) + (360 - (winnerIdx * angleSize)) - (currentDegreesRotation % 360);
    if (wheelContainer) wheelContainer.style.transform = `rotate(${currentDegreesRotation}deg)`;

    setTimeout(async () => {
        isSpinning = false;
        const prizeWon = event.slots[winnerIdx];

        let updatedTokens = currentTokens;
        if (prizeWon.isToken) {
            updatedTokens += prizeWon.amount;
        }

        await updateDoc(doc(db, "users", currentUserUid), {
            diamonds: currentDiamonds - cost,
            tokens: updatedTokens
        });

        updateRightShowcaseBox(prizeWon);
        triggerCongratsBanner(prizeWon.name, prizeWon.img);
    }, 4000);
}

// Congratulations Popup
function triggerCongratsBanner(name, img) {
    const nameEl = document.getElementById("congrats-item-name");
    const imgEl = document.getElementById("congrats-item-img");
    if (nameEl) nameEl.innerText = name;
    if (imgEl) imgEl.src = img;
    if (congratsPopup) congratsPopup.style.display = "flex";
}

// Render Items inside Exchange Modal
function renderExchangeShopItems(tabKey) {
    if (!itemsRendererGrid) return;
    itemsRendererGrid.innerHTML = "";
    const itemsPool = exchangeStoreCatalog[tabKey] || [];

    itemsPool.forEach(item => {
        const itemBox = document.createElement("div");
        itemBox.className = `ex-shop-node ${item.class}`;
        itemBox.innerHTML = `
            <div class="ex-node-badge">${item.tag}</div>
            <img src="${item.img}" class="ex-node-img" alt="Item">
            <div class="ex-node-title">${item.name}</div>
            <div class="ex-node-action-panel">
                <div class="ex-node-cost">
                    <img src="images/token.png" alt="coin">
                    <span>${item.cost} Tokens</span>
                </div>
                <button class="ex-node-claim-btn" data-item="${item.name}" data-cost="${item.cost}" data-img="${item.img}">
                    CLAIM REWARD
                </button>
            </div>
        `;

        itemBox.querySelector(".ex-node-claim-btn").onclick = (e) => {
            const target = e.target.closest(".ex-node-claim-btn");
            const name = target.getAttribute("data-item");
            const price = parseInt(target.getAttribute("data-cost"));
            const image = target.getAttribute("data-img");

            processTokenExchangeTransaction(name, price, image);
        };

        itemsRendererGrid.appendChild(itemBox);
    });
}

// Token Exchange Transaction
async function processTokenExchangeTransaction(itemName, cost, itemImg) {
    if (currentTokens < cost) {
        alert(`❌ Token balance low! You need minimum ${cost} tokens to unlock this reward item.`);
        return;
    }

    try {
        await updateDoc(doc(db, "users", currentUserUid), {
            tokens: currentTokens - cost
        });

        await addDoc(collection(db, "orders"), {
            userId: currentUserUid,
            productName: itemName,
            status: "PENDING",
            costType: "EXCHANGE_TOKENS",
            timestamp: new Date().toISOString()
        });

        if (exchangeModal) exchangeModal.style.display = "none";
        triggerCongratsBanner(`🎉 ${itemName}`, itemImg || "images/iphone16.png");

    } catch (e) {
        console.error("Orders compilation crash stream:", e);
    }
}

// Bindings Connection Matrix
const spin1Btn = document.getElementById("btn-spin-1");
const spin10Btn = document.getElementById("btn-spin-10");
const openExchangeBtn = document.getElementById("open-exchange-btn");
const closeExchangeBtn = document.getElementById("close-exchange-btn");
const congratsDismissBtn = document.getElementById("congrats-dismiss-bstn");

if (spin1Btn) spin1Btn.onclick = () => executeRingSpin(10);
if (spin10Btn) spin10Btn.onclick = () => executeRingSpin(100);

if (openExchangeBtn) {
    openExchangeBtn.onclick = () => {
        if (exchangeWalletText) exchangeWalletText.innerText = currentTokens;
        if (exchangeModal) exchangeModal.style.display = "flex";
        renderExchangeShopItems(activeShopTab);
    };
}

if (closeExchangeBtn) {
    closeExchangeBtn.onclick = () => {
        if (exchangeModal) exchangeModal.style.display = "none";
    };
}

if (congratsDismissBtn) {
    congratsDismissBtn.onclick = () => {
        if (congratsPopup) congratsPopup.style.display = "none";
    };
}

// Category Navigation Menu inside Exchange Shop
document.querySelectorAll(".ex-nav-btn").forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll(".ex-nav-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        activeShopTab = btn.getAttribute("data-shop");
        renderExchangeShopItems(activeShopTab);
    };
});

// Event Tabs Switcher
document.querySelectorAll(".ff-menu-item").forEach(item => {
    item.onclick = () => {
        if (isSpinning) return;

        if (item.classList.contains("faded-link-tab")) {
            const targetUrl = item.getAttribute("data-url");
            window.location.href = targetUrl;
            return;
        }

        document.querySelectorAll(".ff-menu-item").forEach(m => m.classList.remove("active"));
        item.classList.add("active");
        activeKey = item.getAttribute("data-event");
        if (eventTitleDisplay) eventTitleDisplay.innerText = gameEventsData[activeKey].title;
        setupCircularWheelLayout(activeKey);
    };
});

// Initialize default event
setupCircularWheelLayout("mystical-ring");