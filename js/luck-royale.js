import { db, auth } from "./firebase-config.js";
import { 
    doc, 
    getDoc,
    onSnapshot, 
    updateDoc,
    increment,
    arrayUnion,
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ==========================================
// 📌 DOM TARGETS MATRIX
// ==========================================
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

// ==========================================
// ⚙️ STATE VARIABLES
// ==========================================
let currentUserUid = "";
let currentDiamonds = 0;
let currentTokens = 0;
let isSpinning = false;
let activeKey = "mystical-ring";
let activeShopTab = "grand";
let lockIntervalTimer = null;
let spinTimerTimeout = null;

// Faded Wheel Persistence States
let fadedSelected = [];
let fadedRemoved = JSON.parse(localStorage.getItem('fw_persist_removed') || "[]");
let fadedWon = JSON.parse(localStorage.getItem('fw_persist_won') || "[]");
let fadedSpinPointer = parseInt(localStorage.getItem('fw_persist_pointer') || "0", 10);
const fadedCosts = [9, 19, 39, 69, 99, 149, 199, 499];

// ==========================================
// 🎵 SOUND SYNTHESIZER
// ==========================================
function playBeepSound(frequency = 520, type = 'sine', duration = 0.08) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch(e) {}
}

// ==========================================
// 💎 GAME DATASETS (RING EVENTS & DIWALI LOCK)
// ==========================================
const gameEventsData = {
    "mystical-ring": {
        title: "MYSTICAL RING",
        isLocked: false,
        slots: [
            { name: "iPhone 16 Pro Max", img: "images/iphone16.png", grand: true, isToken: false, type: "🏆 GRAND PRIZE", category: "crate" },
            { name: "1 Token", img: "images/token.png", isToken: true, amount: 1, type: "🪙 MYSTICAL TOKEN" },
            { name: "5 Tokens", img: "images/token.png", isToken: true, amount: 5, type: "🪙 MYSTICAL TOKEN" },
            { name: "2 Tokens", img: "images/token.png", isToken: true, amount: 2, type: "🪙 MYSTICAL TOKEN" },
            { name: "10 Tokens", img: "images/token.png", isToken: true, amount: 10, type: "🪙 MYSTICAL TOKEN" },
            { name: "3 Tokens", img: "images/token.png", isToken: true, amount: 3, type: "🪙 MYSTICAL TOKEN" },
            { name: "Free Fire Crate", img: "images/weapon_crate.png", isToken: false, type: "🔫 EPIC GUN CRATE", category: "crate" },
            { name: "20 Tokens", img: "images/token.png", isToken: true, amount: 20, type: "🪙 MYSTICAL TOKEN" }
        ]
    },
    "wall-royale": {
        title: "WALL STORE",
        isLocked: false,
        slots: [
            { name: "Red Gloo Wall", img: "images/gloowall.png", grand: true, isToken: false, type: "🏆 LEGENDARY SKIN", category: "skin" },
            { name: "1 Token", img: "images/token.png", isToken: true, amount: 1, type: "🪙 ROYALE TOKEN" },
            { name: "Weapon Box", img: "images/weapon_crate.png", isToken: false, type: "🔫 GUN CRATE", category: "crate" },
            { name: "5 Tokens", img: "images/token.png", isToken: true, amount: 5, type: "🪙 ROYALE TOKEN" },
            { name: "Blue Gloo Wall", img: "images/gloowall.png", grand: true, isToken: false, type: "🏆 LEGENDARY SKIN", category: "skin" },
            { name: "10 Tokens", img: "images/token.png", isToken: true, amount: 10, type: "🪙 ROYALE TOKEN" },
            { name: "Sasta Avatar", img: "images/avtar.png", isToken: false, type: "👤 RARE AVATAR CARD", category: "avatar" },
            { name: "3 Tokens", img: "images/token.png", isToken: true, amount: 3, type: "🪙 ROYALE TOKEN" }
        ]
    },
    "diwali-ring": {
        title: "DIWALI RING 🪔",
        isLocked: true, // 🔒 EVENT LOCKED
        unlockDate: "2026-11-01T00:00:00",
        slots: [
            { name: "Diwali Bundle", img: "images/diwali_bundle.png", grand: true, isToken: false, type: "🏆 MYTHIC BUNDLE", category: "crate" },
            { name: "1 Token", img: "images/token.png", isToken: true, amount: 1, type: "🪙 DIWALI TOKEN" },
            { name: "5 Tokens", img: "images/token.png", isToken: true, amount: 5, type: "🪙 DIWALI TOKEN" },
            { name: "Crackers Crate", img: "images/loot_box.png", isToken: false, type: "📦 EXCLUSIVE LOOT BOX", category: "crate" },
            { name: "10 Tokens", img: "images/token.png", isToken: true, amount: 10, type: "🪙 DIWALI TOKEN" },
            { name: "2 Tokens", img: "images/token.png", isToken: true, amount: 2, type: "🪙 DIWALI TOKEN" },
            { name: "Sweet Box Item", img: "images/loot_box.png", isToken: false, type: "📦 SPECIAL LOOT BOX", category: "crate" },
            { name: "20 Tokens", img: "images/token.png", isToken: true, amount: 20, type: "🪙 DIWALI TOKEN" }
        ]
    }
};

// ==========================================
// 🛍️ TOKEN EXCHANGE CATALOG
// ==========================================
const exchangeStoreCatalog = {
    "grand": [
        { name: "iPhone 16 Pro Max", img: "images/iphone16.png", cost: 5000, tag: "🏆 LEGENDARY" },
        { name: "iPhone 15 Pro", img: "images/iphone16.png", cost: 3500, tag: "✨ MYTHIC" },
        { name: "Red Gloo Wall Skin", img: "images/gloowall.png", cost: 1500, tag: "🛡️ WALL PREMIUM" },
        { name: "Diwali Special Bundle", img: "images/diwali_bundle.png", cost: 2000, tag: "🔥 BUNDLE UNIQ" }
    ],
    "crates": [
        { name: "Epic Weapon Crate", img: "images/weapon_crate.png", cost: 80, tag: "🔫 GUN BOX" },
        { name: "Diwali Firework Crate", img: "images/loot_box.png", cost: 50, tag: "📦 SPECIAL LOOT" },
        { name: "Rare Avatar Badge", img: "images/avtar.png", cost: 30, tag: "👤 CUSTOM CARD" }
    ]
};

// ==========================================
// 🔒 LOCKED EVENT HANDLER (COUNTDOWN TIMER)
// ==========================================
function checkAndRenderEventLockState(key) {
    const event = gameEventsData[key];
    if (lockIntervalTimer) clearInterval(lockIntervalTimer);

    const spin1Btn = document.getElementById("btn-spin-1");
    const spin10Btn = document.getElementById("btn-spin-10");

    const existingOverlay = document.getElementById("event-lock-overlay");
    if (existingOverlay) existingOverlay.remove();

    if (!event || !event.isLocked) {
        if (spin1Btn) spin1Btn.disabled = false;
        if (spin10Btn) spin10Btn.disabled = false;
        return false;
    }

    if (spin1Btn) spin1Btn.disabled = true;
    if (spin10Btn) spin10Btn.disabled = true;

    const lockOverlay = document.createElement("div");
    lockOverlay.id = "event-lock-overlay";
    lockOverlay.style.cssText = `
        position: absolute; inset: 0; background: rgba(2, 6, 23, 0.94);
        backdrop-filter: blur(8px); display: flex; flex-direction: column;
        justify-content: center; align-items: center; z-index: 100;
        border-radius: 50%; text-align: center; padding: 20px; border: 2px dashed #ffcc00;
    `;

    lockOverlay.innerHTML = `
        <div style="font-size: 36px; margin-bottom: 4px;">🔒</div>
        <h3 style="color: #ffcc00; font-family: 'Orbitron', sans-serif; font-size: 14px; margin-bottom: 4px;">EVENT LOCKED</h3>
        <p style="color: #cbd5e1; font-size: 10px; margin-bottom: 8px;">Diwali Special Event unlocks soon!</p>
        <div id="lock-timer-display" style="font-family: 'Orbitron', sans-serif; font-size: 11px; font-weight: 900; color: #00e5ff; background: rgba(0,229,255,0.1); padding: 4px 10px; border-radius: 12px; border: 1px solid #00e5ff;">
            Calculating...
        </div>
    `;

    const arenaParent = document.querySelector(".ff-circle-arena-wrapper") || slotsGrid.parentElement;
    if (arenaParent) arenaParent.appendChild(lockOverlay);

    const targetTime = new Date(event.unlockDate).getTime();

    function updateCountdown() {
        const now = new Date().getTime();
        const diff = targetTime - now;
        const timerDisplay = document.getElementById("lock-timer-display");

        if (diff <= 0) {
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
    return true;
}

// ==========================================
// 🔑 AUTH & REALTIME FIRESTORE SYNC
// ==========================================
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

                if (data.faded_removed && data.faded_removed.length >= 2) {
                    fadedRemoved = data.faded_removed;
                    localStorage.setItem('fw_persist_removed', JSON.stringify(fadedRemoved));
                }
                if (data.faded_won) {
                    fadedWon = data.faded_won;
                    localStorage.setItem('fw_persist_won', JSON.stringify(fadedWon));
                }
                if (data.faded_spinCount !== undefined) {
                    fadedSpinPointer = data.faded_spinCount;
                    localStorage.setItem('fw_persist_pointer', fadedSpinPointer.toString());
                }

                syncFadedUI();
            }
        });
    } else {
        currentUserUid = "";
    }
});

// ==========================================
// 🎡 CIRCULAR RING WHEEL LAYOUT
// ==========================================
function setupCircularWheelLayout(key) {
    const data = gameEventsData[key];
    if (!slotsGrid || !data) return;
    slotsGrid.innerHTML = "";

    const isLocked = checkAndRenderEventLockState(key);

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
        node.innerHTML = `<img src="${slot.img}" alt="Prize" style="${isLocked ? 'filter: grayscale(1); opacity: 0.5;' : ''}"><span>${slot.name}</span>`;
        node.onclick = () => { if (!isLocked) updateRightShowcaseBox(slot); };
        slotsGrid.appendChild(node);
    });

    if (data.slots.length > 0 && !isLocked) updateRightShowcaseBox(data.slots[0]);
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

// ==========================================
// 🎰 RING SPIN EXECUTION ENGINE (1 & 10 SPINS)
// ==========================================
let needleDegrees = 0;

async function executeRingSpin(spinCount, cost) {
    if (isSpinning) return;

    if (!currentUserUid) {
        alert("🔒 Please log in to spin!");
        window.location.href = "topup.html";
        return;
    }

    const event = gameEventsData[activeKey];
    if (event && event.isLocked) {
        alert("🔒 This Event is currently locked!");
        return;
    }

    if (currentDiamonds < cost) {
        alert(`❌ Insufficient Diamonds! You need 💎 ${cost}.`);
        window.location.href = "topup.html";
        return;
    }

    isSpinning = true;
    playBeepSound(600, 'sine', 0.1);

    // TAP TO SKIP BUTTON
    let skipBtn = document.getElementById("royale-skip-btn");
    if (!skipBtn) {
        skipBtn = document.createElement("button");
        skipBtn.id = "royale-skip-btn";
        skipBtn.style.cssText = `
            position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
            padding: 12px 30px; background: linear-gradient(135deg, #ffcc00, #f97316); color: #000; font-family: 'Orbitron', sans-serif;
            font-weight: 900; border: none; border-radius: 25px; cursor: pointer; z-index: 1000;
            box-shadow: 0 0 20px rgba(255, 204, 0, 0.6);
        `;
        skipBtn.innerText = "⚡ TAP TO SKIP";
        document.body.appendChild(skipBtn);
    }
    skipBtn.style.display = "block";

    const totalSlots = event.slots.length;
    const wonPrizesList = [];
    let tokensGained = 0;

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
        playBeepSound(880, 'square', 0.25);

        // Firestore Update (Deduct Diamonds, Add Tokens, Add +20 XP per spin)
        try {
            const userRef = doc(db, "users", currentUserUid);
            await updateDoc(userRef, {
                diamonds: currentDiamonds - cost,
                tokens: currentTokens + tokensGained,
                xp: increment(20 * spinCount)
            });

            // Save non-token rewards into user's Vault array
            for (const prize of wonPrizesList) {
                if (!prize.isToken) {
                    await updateDoc(userRef, {
                        vault: arrayUnion({
                            id: `won_${Date.now()}_${Math.random()}`,
                            name: prize.name,
                            img: prize.img,
                            type: prize.category || (prize.name.toLowerCase().includes("avatar") ? "avatar" : prize.name.toLowerCase().includes("banner") ? "banner" : prize.name.toLowerCase().includes("gloo") ? "skin" : "crate")
                        })
                    });
                }
            }
        } catch (e) {
            console.error("Firestore Spin Update Error:", e);
        }

        triggerCongratsBanner(wonPrizesList);
    };

    skipBtn.onclick = () => finalizeSpinResult();
    spinTimerTimeout = setTimeout(() => finalizeSpinResult(), 3500);
}

// ==========================================
// 🎉 MULTI-REWARD POPUP RENDERER
// ==========================================
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

// ==========================================
// 🎡 FADED WHEEL ENGINE
// ==========================================
function syncFadedUI() {
    const domItems = document.querySelectorAll('.faded-grid .grid-item');
    domItems.forEach((el, idx) => {
        el.classList.remove('removed', 'won', 'to-remove');
        if (fadedRemoved.includes(idx)) el.classList.add('removed');
        if (fadedWon.includes(idx)) el.classList.add('won');
    });

    if (fadedRemoved.length < 2) {
        if (fadedStatusMsg) fadedStatusMsg.innerText = "Select 2 unwanted items to remove";
        if (fadedActionBtn) {
            fadedActionBtn.innerText = `REMOVE (${fadedSelected.length}/2)`;
            fadedActionBtn.disabled = fadedSelected.length < 2;
        }
    } else {
        const cost = fadedCosts[fadedSpinPointer] || 499;
        if (fadedSpinPointer >= fadedCosts.length || fadedWon.length >= 8) {
            if (fadedStatusMsg) fadedStatusMsg.innerText = "🎉 All Rewards Claimed!";
            if (fadedActionBtn) { fadedActionBtn.innerText = "COMPLETED"; fadedActionBtn.disabled = true; }
        } else {
            if (fadedStatusMsg) fadedStatusMsg.innerText = "Pool ready! Click SPIN to draw reward.";
            if (fadedActionBtn) {
                fadedActionBtn.innerText = `SPIN (💎 ${cost})`;
                fadedActionBtn.disabled = false;
            }
        }
    }
}

document.querySelectorAll('.faded-grid .grid-item').forEach((item) => {
    item.addEventListener('click', () => {
        const index = parseInt(item.getAttribute('data-index'), 10);
        
        if (fadedRemoved.length >= 2 || fadedWon.includes(index) || isSpinning) return;

        const selIdx = fadedSelected.indexOf(index);
        if (selIdx > -1) {
            fadedSelected.splice(selIdx, 1);
            item.classList.remove('to-remove');
        } else {
            if (fadedSelected.length < 2) {
                fadedSelected.push(index);
                item.classList.add('to-remove');
            }
        }

        playBeepSound(400, 'triangle', 0.05);
        
        if (fadedActionBtn) {
            fadedActionBtn.innerText = fadedSelected.length < 2 ? `REMOVE (${fadedSelected.length}/2)` : `CONFIRM REMOVE`;
            fadedActionBtn.disabled = fadedSelected.length < 2;
        }
    });
});

if (fadedActionBtn) {
    fadedActionBtn.addEventListener('click', async () => {
        if (isSpinning) return;

        if (!currentUserUid) {
            alert("🔒 Please log in to spin Faded Wheel!");
            window.location.href = "topup.html";
            return;
        }

        if (fadedRemoved.length < 2) {
            if (fadedSelected.length < 2) return;
            fadedRemoved = [...fadedSelected];
            fadedSelected = [];

            localStorage.setItem('fw_persist_removed', JSON.stringify(fadedRemoved));

            if (currentUserUid) {
                try {
                    await updateDoc(doc(db, "users", currentUserUid), { faded_removed: fadedRemoved });
                } catch(e) {}
            }
            syncFadedUI();
            return;
        }

        const cost = fadedCosts[fadedSpinPointer];
        if (currentDiamonds < cost) {
            alert(`❌ Insufficient Diamonds! You need 💎 ${cost}.`);
            window.location.href = "topup.html";
            return;
        }

        executeFadedChaseSpin(cost);
    });
}

function executeFadedChaseSpin(cost) {
    isSpinning = true;
    if (fadedActionBtn) fadedActionBtn.disabled = true;

    const domItems = document.querySelectorAll('.faded-grid .grid-item');
    let accessiblePool = [];
    for (let i = 0; i < 10; i++) {
        if (!fadedRemoved.includes(i) && !fadedWon.includes(i)) accessiblePool.push(i);
    }

    const winnerIndex = accessiblePool[Math.floor(Math.random() * accessiblePool.length)];
    let currentTick = 0;
    let cycles = 0;

    const interval = setInterval(() => {
        playBeepSound(500 + cycles * 8, 'sine', 0.03);
        domItems.forEach(el => el.classList.remove('active-chase'));

        while (fadedRemoved.includes(currentTick) || fadedWon.includes(currentTick)) {
            currentTick = (currentTick + 1) % 10;
        }

        if (domItems[currentTick]) domItems[currentTick].classList.add('active-chase');

        const prev = currentTick;
        currentTick = (currentTick + 1) % 10;
        cycles++;

        if (cycles >= 25 && prev === winnerIndex) {
            clearInterval(interval);

            setTimeout(async () => {
                playBeepSound(880, 'square', 0.3);
                domItems[winnerIndex].classList.remove('active-chase');
                domItems[winnerIndex].classList.add('won');

                fadedWon.push(winnerIndex);
                fadedSpinPointer++;

                localStorage.setItem('fw_persist_won', JSON.stringify(fadedWon));
                localStorage.setItem('fw_persist_pointer', fadedSpinPointer.toString());

                const winName = domItems[winnerIndex].querySelector('.item-title')?.innerText || "Special Item";
                const winImg = domItems[winnerIndex].querySelector('img')?.src || "images/token.png";

                if (currentUserUid) {
                    try {
                        const userRef = doc(db, "users", currentUserUid);
                        await updateDoc(userRef, {
                            diamonds: currentDiamonds - cost,
                            faded_won: fadedWon,
                            faded_spinCount: fadedSpinPointer,
                            xp: increment(30)
                        });

                        // Add to Vault
                        await updateDoc(userRef, {
                            vault: arrayUnion({
                                id: `faded_${Date.now()}`,
                                name: winName,
                                img: winImg,
                                type: winName.toLowerCase().includes("avatar") ? "avatar" : winName.toLowerCase().includes("banner") ? "banner" : winName.toLowerCase().includes("gloo") ? "skin" : "crate"
                            })
                        });
                    } catch(e) {}
                }

                triggerCongratsBanner({ name: winName, img: winImg });
                isSpinning = false;
                syncFadedUI();
            }, 300);
        }
    }, 100);
}

// ==========================================
// 🛍️ TOKEN EXCHANGE STORE ENGINE
// ==========================================
function renderExchangeShopItems(tabKey) {
    if (!itemsRendererGrid) return;
    itemsRendererGrid.innerHTML = "";
    const itemsPool = exchangeStoreCatalog[tabKey] || [];

    itemsPool.forEach(item => {
        const itemBox = document.createElement("div");
        itemBox.className = "ex-shop-node";
        itemBox.innerHTML = `
            <div style="font-size: 9px; color: #00e5ff; font-weight: bold;">${item.tag}</div>
            <img src="${item.img}" class="ex-node-img" alt="${item.name}">
            <div class="ex-node-title">${item.name}</div>
            <div class="ex-node-cost"><img src="images/token.png"><span>${item.cost} Tokens</span></div>
            <button class="ex-node-claim-btn">CLAIM REWARD</button>
        `;

        itemBox.querySelector(".ex-node-claim-btn").onclick = async () => {
            if (!currentUserUid) {
                alert("🔒 Please log in to exchange tokens!");
                window.location.href = "topup.html";
                return;
            }
            if (currentTokens < item.cost) {
                alert(`❌ You need at least ${item.cost} Tokens!`);
                return;
            }

            try {
                const userRef = doc(db, "users", currentUserUid);
                await updateDoc(userRef, { tokens: currentTokens - item.cost });
                await addDoc(collection(db, "orders"), {
                    userId: currentUserUid,
                    productName: item.name,
                    status: "PENDING",
                    timestamp: serverTimestamp()
                });

                // Add redeemed item into Vault
                await updateDoc(userRef, {
                    vault: arrayUnion({
                        id: `ex_${Date.now()}`,
                        name: item.name,
                        img: item.img,
                        type: item.name.toLowerCase().includes("avatar") ? "avatar" : item.name.toLowerCase().includes("banner") ? "banner" : item.name.toLowerCase().includes("gloo") ? "skin" : "crate"
                    })
                });

                if (exchangeModal) exchangeModal.style.display = "none";
                triggerCongratsBanner(item);
            } catch(e) { console.error(e); }
        };

        itemsRendererGrid.appendChild(itemBox);
    });
}

// ==========================================
// 🔗 EVENT BINDINGS
// ==========================================
document.getElementById("btn-spin-1")?.addEventListener("click", () => executeRingSpin(1, 10));
document.getElementById("btn-spin-10")?.addEventListener("click", () => executeRingSpin(10, 100));

document.getElementById("congrats-dismiss-bstn")?.addEventListener("click", () => {
    if (congratsPopup) congratsPopup.style.display = "none";
});

document.getElementById("open-exchange-btn")?.addEventListener("click", () => {
    if (exchangeWalletText) exchangeWalletText.innerText = currentTokens;
    if (exchangeModal) exchangeModal.style.display = "flex";
    renderExchangeShopItems(activeShopTab);
});

document.getElementById("close-exchange-btn")?.addEventListener("click", () => {
    if (exchangeModal) exchangeModal.style.display = "none";
});

document.querySelectorAll(".ex-nav-btn").forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll(".ex-nav-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        activeShopTab = btn.getAttribute("data-shop");
        renderExchangeShopItems(activeShopTab);
    };
});

// SIDEBAR EVENT TAB SWITCHER
document.querySelectorAll(".ff-menu-item").forEach(item => {
    item.addEventListener("click", () => {
        if (item.id === "nav-buy-diamonds" || item.classList.contains("faded-link-tab")) {
            window.location.href = "topup.html";
            return;
        }

        if (isSpinning) return;

        document.querySelectorAll(".ff-menu-item").forEach(m => m.classList.remove("active"));
        item.classList.add("active");

        activeKey = item.getAttribute("data-event");

        const ringSec = document.getElementById("ring-wheel-section");
        const fadedSec = document.getElementById("faded-wheel-section");

        if (activeKey === "faded-wheel-event") {
            if (eventTitleDisplay) eventTitleDisplay.innerText = "🎡 FADED WHEEL ARENA";
            if (ringSec) ringSec.style.display = "none";
            if (fadedSec) fadedSec.style.display = "block";
            syncFadedUI();
        } else {
            if (eventTitleDisplay) eventTitleDisplay.innerText = gameEventsData[activeKey] ? gameEventsData[activeKey].title : "LUCK ROYALE";
            if (fadedSec) fadedSec.style.display = "none";
            if (ringSec) ringSec.style.display = "block";
            setupCircularWheelLayout(activeKey);
        }
    });
});

// INITIALIZE
syncFadedUI();
setupCircularWheelLayout("mystical-ring");