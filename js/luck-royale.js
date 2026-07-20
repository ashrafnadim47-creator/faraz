import { db, auth } from "./firebase-config.js";
import { doc, getDoc, updateDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// DOM Targets Matrix
const slotsGrid = document.getElementById("wheel-slots-grid");
const eventTitleDisplay = document.getElementById("event-title-display");
const tokenDisplay = document.getElementById("user-token-balance");
const wheelContainer = document.getElementById("wheel-slots-grid");
const congratsPopup = document.getElementById("congratulations-popup");
const rightColumnPrizes = document.getElementById("right-column-prizes");

// ⚡ NEW MODAL UI TARGETS FOR PREMIUM EXCHANGE STORE
const exchangeModal = document.getElementById("exchange-modal");
const exchangeWalletText = document.getElementById("exchange-wallet-tokens");
const itemsRendererGrid = document.getElementById("exchange-items-renderer");

let currentUserUid = "";
let currentDiamonds = 0;
let currentTokens = 0;
let isSpinning = false;
let activeKey = "mystical-ring";
let activeShopTab = "grand";

// ==========================================================================
// 💎 PURE ACTIVE RING EVENTS DATASET (LOCAL IMAGES ROUTING MAP)
// ==========================================================================
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
            { name: "Free Fire Crate", img: "images/weapon_crate.png", isToken: false, type: "🔫 EPIC GUN LOOT CRATE" },
            { name: "20 Tokens", img: "images/token.png", isToken: true, amount: 20, type: "🪙 MYSTICAL TOKEN" }
        ]
    },
    "wall-royale": {
        title: "WALL STORE",
        slots: [
            { name: "Red Gloo Wall", img: "images/gloowall.png", grand: true, isToken: false, type: "🏆 LEGENDARY SKIN" },
            { name: "1 Token", img: "images/token.png", isToken: true, amount: 1, type: "🪙 ROYALE TOKEN" },
            { name: "Weapon Box", img: "images/weapon_crate.png", isToken: false, type: "🔫 GUN CRATE REWARD" },
            { name: "5 Tokens", img: "images/token.png", isToken: true, amount: 5, type: "🪙 ROYALE TOKEN" },
            { name: "Blue Gloo Wall", img: "images/gloowall.png", grand: true, isToken: false, type: "🏆 LEGENDARY SKIN" },
            { name: "10 Tokens", img: "images/token.png", isToken: true, amount: 10, type: "🪙 ROYALE TOKEN" },
            { name: "Sasta Avatar", img: "images/avatar.png", isToken: false, type: "👤 RARE AVATAR CARD" },
            { name: "3 Tokens", img: "images/token.png", isToken: true, amount: 3, type: "🪙 ROYALE TOKEN" }
        ]
    },
    "diwali-ring": {
        title: "DIWALI RING",
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

// ==========================================================================
// 🛍️ DYNAMIC PRODUCT INVENTORY CATALOG FOR PREMIUM EXCHANGE STORE
// ==========================================================================
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
        { name: "Rare Avatar Badge", img: "images/avatar.png", cost: 30, tag: "👤 CUSTOM CARD", class: "" }
    ]
};

// Firestore Snapshot Listener Setup
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserUid = user.uid;
        db.collection("users").doc(user.uid).onSnapshot((docSnap) => {
            if (docSnap.exists) {
                const data = docSnap.data();
                currentDiamonds = data.diamonds ?? 0;
                currentTokens = data.tokens ?? 0;
                if(tokenDisplay) tokenDisplay.innerText = currentTokens;
                if(exchangeWalletText) exchangeWalletText.innerText = currentTokens;
            }
        });
    }
});

// Render Circular Arena Slots WITH CLICK PREVIEW TRACKERS
function setupCircularWheelLayout(key) {
    const data = gameEventsData[key];
    slotsGrid.innerHTML = "";
    
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
        node.style.cursor = "pointer";
        node.innerHTML = `
            <img src="${slot.img}" alt="Prize">
            <span>${slot.name}</span>
        `;

        // ⚡ Click karte hi right side ka bada showcase chalega
        node.onclick = (e) => {
            e.stopPropagation();
            updateRightShowcaseBox(slot);
        };

        slotsGrid.appendChild(node);
    });

    if(data.slots.length > 0) {
        updateRightShowcaseBox(data.slots[0]);
    }
}

// ⚡ Right Side me bada sa item details card render karna
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

// Spin Rotation Logic Controller
let currentDegreesRotation = 0;
function executeRingSpin(cost) {
    if (isSpinning) return;
    if (currentDiamonds < cost) {
        alert("❌ Diamonds insufficient! Top-up your wall wallet account.");
        return;
    }

    isSpinning = true;
    const event = gameEventsData[activeKey];
    const totalSlots = event.slots.length;
    let winnerIdx = Math.floor(Math.random() * totalSlots);

    // 2 Lakh safe math block check: Block direct iPhone win on normal random spin
    if (event.slots[winnerIdx].name === "iPhone 16 Pro Max") {
        isSpinning = false;
        executeRingSpin(cost);
        return;
    }

    const angleSize = 360 / totalSlots;
    currentDegreesRotation += (5 * 360) + (360 - (winnerIdx * angleSize)) - (currentDegreesRotation % 360);
    wheelContainer.style.transform = `rotate(${currentDegreesRotation}deg)`;

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

// Trigger Congratulations Popup
function triggerCongratsBanner(name, img) {
    document.getElementById("congrats-item-name").innerText = name;
    document.getElementById("congrats-item-img").src = img;
    congratsPopup.style.display = "flex";
}

// ==========================================================================
// ⚡ NEW FUNCTION: Render Items Grid inside Exchange Modal
// ==========================================================================
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
                    <img src="https://img.icons8.com/flat-round/64/token.png" alt="coin">
                    <span>${item.cost} Tokens</span>
                </div>
                <button class="ex-node-claim-btn" data-item="${item.name}" data-cost="${item.cost}" data-img="${item.img}">
                    CLAIM REWARD
                </button>
            </div>
        `;

        // Direct item transactional bindings
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

// Real Exchange Claim Operation Database Synchronizer
async function processTokenExchangeTransaction(itemName, cost, itemImg) {
    if (currentTokens < cost) {
        alert(`❌ Token balance low! You need minimum ${cost} tokens to unlock this reward item.`);
        return;
    }

    try {
        // 1. Deduct currencies ledgers
        await updateDoc(doc(db, "users", currentUserUid), {
            tokens: currentTokens - cost
        });

        // 2. Add entry into delivery orders table list
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

// Standard Click Bindings Connection Matrix
document.getElementById("btn-spin-1").onclick = () => executeRingSpin(10);
document.getElementById("btn-spin-10").onclick = () => executeRingSpin(100);

document.getElementById("open-exchange-btn").onclick = () => {
    if (exchangeWalletText) exchangeWalletText.innerText = currentTokens;
    if (exchangeModal) exchangeModal.style.display = "flex";
    renderExchangeShopItems(activeShopTab);
};

document.getElementById("close-exchange-btn").onclick = () => {
    if (exchangeModal) exchangeModal.style.display = "none";
};

document.getElementById("congrats-dismiss-bstn").onclick = () => congratsPopup.style.display = "none";

// Bind store internal category navigation menu tabs buttons switches
document.querySelectorAll(".ex-nav-btn").forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll(".ex-nav-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        activeShopTab = btn.getAttribute("data-shop");
        renderExchangeShopItems(activeShopTab);
    };
});

// Navigation item toggle triggers
document.querySelectorAll(".ff-menu-item").forEach(item => {
    item.onclick = () => {
        if(isSpinning) return;

        if (item.classList.contains("faded-link-tab")) {
            const targetUrl = item.getAttribute("data-url");
            window.location.href = targetUrl; 
            return;
        }

        document.querySelectorAll(".ff-menu-item").forEach(m => m.classList.remove("active"));
        item.classList.add("active");
        activeKey = item.getAttribute("data-event");
        eventTitleDisplay.innerText = gameEventsData[activeKey].title;
        setupCircularWheelLayout(activeKey);
    };
});

// Boot initial state configuration loop
setupCircularWheelLayout("mystical-ring");