import { db, auth } from "./firebase-config.js";
import { doc, getDoc, updateDoc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let localSelected = [];
let localRemoved = [];
let localWon = [];
let executionRunning = false;

const progressiveCosts = [9, 19, 39, 69, 99, 149, 199, 499];
let spinPointer = 0;
let userDiamonds = 0;
let currentUserId = "";

// DOM Elements Link
const domItems = document.querySelectorAll('.faded-grid .grid-item');
const actionControl = document.getElementById('main-action-trigger');
const alertBar = document.getElementById('status-message');

window.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            onSnapshot(doc(db, "users", user.uid), (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    userDiamonds = data.diamonds ?? data.diamond ?? data.wallet ?? 0;
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

function syncSystemUILayout() {
    domItems.forEach(el => el.classList.remove('removed', 'won', 'to-remove'));
    localRemoved.forEach(idx => { if (domItems[idx]) domItems[idx].classList.add('removed'); });
    localWon.forEach(idx => { if (domItems[idx]) domItems[idx].classList.add('won'); });

    determineActiveStateMode();
}

function attachInteractiveListeners() {
    domItems.forEach(item => {
        item.onclick = () => {
            const index = parseInt(item.getAttribute('data-index'), 10);
            evaluateSelectionLayer(index, item);
        };
    });

    if (actionControl) {
        actionControl.onclick = () => {
            if (executionRunning) return;
            if (localRemoved.length < 2) {
                commitRemovalProcess();
            } else {
                verifyBalanceSheet();
            }
        };
    }
}

function evaluateSelectionLayer(targetIdx, element) {
    if (localRemoved.length === 2 || localWon.includes(targetIdx) || executionRunning) return;

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

async function commitRemovalProcess() {
    localRemoved = [...localSelected];
    localSelected = [];

    if (currentUserId) {
        try {
            await updateDoc(doc(db, "users", currentUserId), {
                faded_removed: localRemoved
            });
        } catch (e) {
            console.error("Removal sync failed:", e);
        }
    }

    syncSystemUILayout();
}

function determineActiveStateMode() {
    if (localRemoved.length < 2) return;

    const pricePoint = progressiveCosts[spinPointer];
    if (spinPointer >= progressiveCosts.length || localWon.length >= 8) {
        if (alertBar) alertBar.innerText = "🎉 Congratulations! All prize items cleared.";
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

async function verifyBalanceSheet() {
    const targetedCost = progressiveCosts[spinPointer];

    if (userDiamonds < targetedCost) {
        if (alertBar) alertBar.innerText = `⚠️ Low Diamond Balance! Redirecting to Top-Up...`;
        setTimeout(() => {
            alert("❌ Insufficient Diamonds!\n\nPlease buy diamonds from the topup desk.");
            window.location.href = "topup.html";
        }, 500);
        return;
    }

    if (currentUserId) {
        await updateDoc(doc(db, "users", currentUserId), {
            diamonds: userDiamonds - targetedCost,
            faded_spinCount: spinPointer + 1
        });
    }

    executeWheelSpin();
}

function executeWheelSpin() {
    executionRunning = true;
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
    const targetCyclesThreshold = 20 + Math.floor(Math.random() * 8);

    const runtimeClock = setInterval(() => {
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

        if (computedCycles >= targetCyclesThreshold && previousTick === selectedWinnerIndex) {
            clearInterval(runtimeClock);

            setTimeout(async () => {
                domItems[selectedWinnerIndex].classList.remove('active-chase');
                domItems[selectedWinnerIndex].classList.add('won');

                localWon.push(selectedWinnerIndex);
                spinPointer++;

                if (currentUserId) {
                    await updateDoc(doc(db, "users", currentUserId), {
                        faded_won: localWon
                    });
                }

                executionRunning = false;
                determineActiveStateMode();
            }, 250);
        }
    }, 100);
}