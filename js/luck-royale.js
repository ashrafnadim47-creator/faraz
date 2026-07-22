import { db, auth } from "./firebase-config.js";
import { 
    doc, 
    getDoc,
    onSnapshot, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Free Fire Sound Effects Synthesis Engine
const spinSound = new Audio("https://assets.mixkit.co/active_storage/sfx/2004/2004-preview.mp3");
const winSound = new Audio("https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3");

// DOM Targets Matrix
const slotsGrid = document.getElementById("wheel-slots-grid");
const eventTitleDisplay = document.getElementById("event-title-display");
const tokenDisplay = document.getElementById("user-token-balance");
const diamondDisplay = document.getElementById("user-diamonds-display");
const congratsPopup = document.getElementById("congratulations-popup");
const rightColumnPrizes = document.getElementById("right-column-prizes");

// MODAL UI TARGETS FOR EXCHANGE STORE
const exchangeModal = document.getElementById("exchange-modal");
const exchangeWalletText = document.getElementById("exchange-wallet-tokens");

let currentUserUid = "";
let currentDiamonds = 0;
let currentTokens = 0;
let isSpinning = false;
let activeKey = "mystical-ring";

// AUTH & REALTIME PERSISTENT SYNC
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserUid = user.uid;
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                currentDiamonds = data.diamonds ?? data.diamond ?? data.wallet ?? 0;
                currentTokens = data.tokens ?? 0;

                if (tokenDisplay) tokenDisplay.innerText = currentTokens;
                if (diamondDisplay) diamondDisplay.innerText = `💎 ${currentDiamonds.toLocaleString()}`;
                if (exchangeWalletText) exchangeWalletText.innerText = currentTokens;

                localStorage.setItem('fw_persist_wallet', currentDiamonds.toString());
            }
        });
    } else {
        const savedWallet = localStorage.getItem('fw_persist_wallet');
        if (savedWallet) currentDiamonds = parseInt(savedWallet, 10);
    }
});

// Circular Ring Outer Rotation Engine
let currentDegreesRotation = 0;
async function executeRingSpin(cost) {
    if (isSpinning) return;

    const user = auth.currentUser || (currentUserUid ? { uid: currentUserUid } : null);
    if (!user) {
        alert("Please log in first!");
        window.location.href = "login.html";
        return;
    }

    try {
        const userSnap = await getDoc(doc(db, "users", currentUserUid || user.uid));
        if (userSnap.exists()) {
            const freshData = userSnap.data();
            currentDiamonds = freshData.diamonds ?? freshData.diamond ?? freshData.wallet ?? 0;
            currentTokens = freshData.tokens ?? 0;
        }
    } catch (e) {
        console.log("Using cached balance");
    }

    if (currentDiamonds < cost) {
        alert(`❌ Insufficient Diamonds! You need ${cost} Diamonds to spin.`);
        window.location.href = "topup.html";
        return;
    }

    isSpinning = true;

    // Trigger Sound
    try {
        spinSound.currentTime = 0;
        spinSound.play().catch(() => {});
    } catch (e) {}

    const totalSlots = 8;
    let winnerIdx = Math.floor(Math.random() * totalSlots);

    const angleSize = 360 / totalSlots;
    currentDegreesRotation += (5 * 360) + (360 - (winnerIdx * angleSize)) - (currentDegreesRotation % 360);
    
    // Rotate Wheel Slots
    if (slotsGrid) slotsGrid.style.transform = `rotate(${currentDegreesRotation}deg)`;

    setTimeout(async () => {
        isSpinning = false;

        try {
            winSound.currentTime = 0;
            winSound.play().catch(() => {});
        } catch (e) {}

        const updatedTokens = currentTokens + 2;
        const updatedDiamonds = currentDiamonds - cost;

        try {
            await updateDoc(doc(db, "users", currentUserUid || user.uid), {
                diamonds: updatedDiamonds,
                tokens: updatedTokens
            });
        } catch (e) {
            console.error("Spin update error:", e);
        }

        triggerCongratsBanner("Ring Event Prize", "images/token.png");
    }, 4000);
}

// Congratulations Banner
function triggerCongratsBanner(name, img) {
    const nameEl = document.getElementById("congrats-item-name");
    const imgEl = document.getElementById("congrats-item-img");
    if (nameEl) nameEl.innerText = name;
    if (imgEl) imgEl.src = img;
    if (congratsPopup) congratsPopup.style.display = "flex";
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

        const ringWheelSection = document.getElementById("ring-wheel-section");
        const fadedWheelSection = document.getElementById("faded-wheel-section");

        if (activeKey === "faded-wheel-event") {
            if (eventTitleDisplay) eventTitleDisplay.innerText = "🎡 FADED WHEEL ARENA";
            if (ringWheelSection) ringWheelSection.style.display = "none";
            if (fadedWheelSection) fadedWheelSection.style.display = "block";
        } else {
            if (eventTitleDisplay) eventTitleDisplay.innerText = "MYSTICAL RING";
            if (fadedWheelSection) fadedWheelSection.style.display = "none";
            if (ringWheelSection) ringWheelSection.style.display = "block";
        }
    };
});