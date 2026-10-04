import { db, auth } from "./firebase-config.js";
import { doc, updateDoc, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let localSelected = [];
let localRemoved = [];
let localWon = [];
let executionRunning = false;

const progressiveCosts = [9, 19, 39, 69, 99, 149, 199, 499];
let spinPointer = 0;
let userDiamonds = 0;
let currentUserId = "";

// Safe Web Audio Synthesizer (No external 403 audio link issue)
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

window.addEventListener('DOMContentLoaded', () => {
    // 🔑 AUTH LISTENER & SYNC
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            onSnapshot(doc(db, "users", user.uid), (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    userDiamonds = data.diamonds ?? data.wallet ?? 0;
                    localRemoved = data.faded_removed ?? [];
                    localWon = data.faded_won ?? [];
                    spinPointer = data.faded_spinCount ?? 0;

                    syncSystemUILayout();
                }
            });
        }
    });

    attachInteractiveListeners();
});

// UI SYNC
function syncSystemUILayout() {
    const domItems = document.querySelectorAll('.faded-grid .grid-item');
    domItems.forEach(el => el.classList.remove('removed', 'won', 'to-remove'));
    
    localRemoved.forEach(idx => { if (domItems[idx]) domItems[idx].classList.add('removed'); });
    localWon.forEach(idx => { if (domItems[idx]) domItems[idx].classList.add('won'); });

    determineActiveStateMode();
}

// CLICK LISTENERS
function attachInteractiveListeners() {
    document.addEventListener('click', (e) => {
        const item = e.target.closest('.faded-grid .grid-item');
        if (item) {
            const index = parseInt(item.getAttribute('data-index'), 10);
            evaluateSelectionLayer(index, item);
        }

        const actionTrigger = e.target.closest('#main-action-trigger');
        if (actionTrigger) {
            if (executionRunning) return;
            if (localRemoved.length < 2) {
                commitRemovalProcess();
            } else {
                verifyBalanceAndSpin();
            }
        }
    });
}

// 2 ITEMS REMOVE SELECTION
function evaluateSelectionLayer(targetIdx, element) {
    if (localRemoved.length === 2 || localWon.includes(targetIdx) || executionRunning) return;

    playBeepSound(400, 'triangle', 0.05);

    const cacheIndex = localSelected.indexOf(targetIdx);
    if (cacheIndex > -1) {
        localSelected.splice(cacheIndex, 1);
        element.classList.remove('to-remove');
    } else {
        if (localSelected.length < 2) {
            localSelected.push(targetIdx);
            element.classList.add('to-remove');
        }
    }

    const actionControl = document.getElementById('main-action-trigger');
    if (actionControl) {
        if (localSelected.length < 2) {
            actionControl.innerText = `REMOVE (${localSelected.length}/2)`;
            actionControl.disabled = true;
        } else {
            actionControl.innerText = `CONFIRM REMOVE`;
            actionControl.disabled = false;
        }
    }
}

// CONFIRM REMOVE 2 ITEMS
async function commitRemovalProcess() {
    if (localSelected.length < 2) return;
    
    localRemoved = [...localSelected];
    localSelected = [];

    if (currentUserId) {
        try {
            await updateDoc(doc(db, "users", currentUserId), { faded_removed: localRemoved });
        } catch (e) {
            console.error("Removal sync error:", e);
        }
    }

    syncSystemUILayout();
}

// STATE CONTROLLER
function determineActiveStateMode() {
    const actionControl = document.getElementById('main-action-trigger');
    const alertBar = document.getElementById('status-message');

    if (localRemoved.length < 2) {
        if (alertBar) alertBar.innerText = "Select 2 unwanted items to remove";
        if (actionControl) {
            actionControl.innerText = `REMOVE (${localSelected.length}/2)`;
            actionControl.disabled = localSelected.length < 2;
        }
        return;
    }

    const pricePoint = progressiveCosts[spinPointer];
    if (spinPointer >= progressiveCosts.length || localWon.length >= 8) {
        if (alertBar) alertBar.innerText = "🎉 All rewards claimed!";
        if (actionControl) { 
            actionControl.innerText = "COMPLETED"; 
            actionControl.disabled = true; 
        }
        return;
    }

    if (alertBar) alertBar.innerText = "Pool ready! Click SPIN to draw your reward.";
    if (actionControl) {
        actionControl.innerText = `SPIN (💎 ${pricePoint})`;
        actionControl.disabled = false;
    }
}

// BALANCE & SPIN EXECUTION
async function verifyBalanceAndSpin() {
    const targetedCost = progressiveCosts[spinPointer];

    if (currentUserId) {
        try {
            const userSnap = await getDoc(doc(db, "users", currentUserId));
            if (userSnap.exists()) {
                userDiamonds = userSnap.data().diamonds ?? userSnap.data().wallet ?? 0;
            }
        } catch (e) {}
    }

    if (userDiamonds < targetedCost) {
        alert(`❌ Insufficient Diamonds! You need 💎 ${targetedCost} Diamonds.`);
        window.location.href = "topup.html";
        return;
    }

    executeFadedChaseSpin(targetedCost);
}

// FREE FIRE CHASE LIGHT ANIMATION
function executeFadedChaseSpin(cost) {
    executionRunning = true;
    const actionControl = document.getElementById('main-action-trigger');
    const domItems = document.querySelectorAll('.faded-grid .grid-item');
    if (actionControl) actionControl.disabled = true;

    let accessiblePool = [];
    for (let i = 0; i < 10; i++) {
        if (!localRemoved.includes(i) && !localWon.includes(i)) {
            accessiblePool.push(i);
        }
    }

    const selectedWinnerIndex = accessiblePool[Math.floor(Math.random() * accessiblePool.length)];

    let activeTickIndex = 0;
    let computedCycles = 0;

    const runtimeClock = setInterval(() => {
        playBeepSound(600 + (computedCycles * 10), 'sine', 0.04);
        domItems.forEach(el => el.classList.remove('active-chase'));

        while (localRemoved.includes(activeTickIndex) || localWon.includes(activeTickIndex)) {
            activeTickIndex = (activeTickIndex + 1) % 10;
        }

        if (domItems[activeTickIndex]) {
            domItems[activeTickIndex].classList.add('active-chase');
        }

        const previousTick = activeTickIndex;
        activeTickIndex = (activeTickIndex + 1) % 10;
        computedCycles++;

        if (computedCycles >= 28 && previousTick === selectedWinnerIndex) {
            clearInterval(runtimeClock);

            setTimeout(async () => {
                playBeepSound(880, 'square', 0.3); // Win sound

                domItems[selectedWinnerIndex].classList.remove('active-chase');
                domItems[selectedWinnerIndex].classList.add('won');

                localWon.push(selectedWinnerIndex);
                spinPointer++;

                const updatedDiamonds = userDiamonds - cost;

                if (currentUserId) {
                    await updateDoc(doc(db, "users", currentUserId), { 
                        diamonds: updatedDiamonds,
                        faded_won: localWon,
                        faded_spinCount: spinPointer
                    });
                }

                const winnerName = domItems[selectedWinnerIndex].querySelector('.item-title')?.innerText || "Special Reward";
                const winnerImg = domItems[selectedWinnerIndex].querySelector('img')?.src || "images/token.png";

                const congratsName = document.getElementById("congrats-item-name");
                const congratsImg = document.getElementById("congrats-item-img");
                const congratsPopup = document.getElementById("congratulations-popup");

                if (congratsName) congratsName.innerText = winnerName;
                if (congratsImg) congratsImg.src = winnerImg;
                if (congratsPopup) congratsPopup.style.display = "flex";

                executionRunning = false;
                determineActiveStateMode();
            }, 300);
        }
    }, 100);
}