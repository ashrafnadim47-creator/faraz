// --- CONFIGURATION MANAGEMENT METRIC ---
let localSelected = [];
let localRemoved = [];
let localWon = [];
let executionRunning = false;

const progressiveCosts = [9, 19, 39, 69, 99, 149, 199, 499];
let spinPointer = 0;
let mockWalletDiamonds = 0; // Online Firebase document se dynamically control hoga

// DOM Elements Link setup
const domItems = document.querySelectorAll('.faded-grid .grid-item');
const actionControl = document.getElementById('main-action-trigger');
const alertBar = document.getElementById('status-message');
const walletText = document.getElementById('user-diamonds');

const soundTick = document.getElementById('tick-audio');
const soundWin = document.getElementById('victory-audio');

// --- BOOTSTRAP INITIALIZATION ENGINE ---
window.addEventListener('DOMContentLoaded', () => {
    // Local memory fallback state load karein
    initializeLocalPersistenceEngine();
    
    // Asli Real-time Firebase Firestore triggers connect karein
    try {
        if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
            initializeWithFirebase();
        } else {
            console.log("Running safely in Local Sandbox Mode.");
        }
    } catch(e) {
        console.log("Firebase fallback activated safely.");
    }
});

// SYSTEM A: FIREBASE NODE SCRIPT DATA ENGINE (Real Cloud Sync)
function initializeWithFirebase() {
    try {
        const db = firebase.firestore();
        const auth = firebase.auth();

        if(!auth) return;

        // Firebase Auth listener tracks current state changes
        auth.onAuthStateChanged((user) => {
            if (user) {
                // Realtime data fetch using onSnapshot matrix hook
                db.collection("users").doc(user.uid).onSnapshot((doc) => {
                    if (doc.exists) {
                        const cloudData = doc.data();
                        
                        // Cloud sync override triggers
                        mockWalletDiamonds = cloudData.diamonds ?? 0;
                        localRemoved = cloudData.removed ?? [];
                        localWon = cloudData.won ?? [];
                        spinPointer = cloudData.spinCount ?? 0;
                        
                        // UI Refresh dynamically
                        if(walletText) walletText.innerText = `💎 ${mockWalletDiamonds}`;
                        
                        // States visual refresh matrix
                        domItems.forEach(el => el.classList.remove('removed', 'won', 'to-remove'));
                        localRemoved.forEach(idx => { if(domItems[idx]) domItems[idx].classList.add('removed'); });
                        localWon.forEach(idx => { if(domItems[idx]) domItems[idx].classList.add('won'); });
                        
                        determineActiveStateMode();
                    }
                }, (error) => {
                    console.error("Firestore sync fail stream:", error);
                });
            } else {
                console.log("No authenticated user active. Local state rules apply.");
            }
        });
    } catch(err) {
        console.log("Firebase operational nodes isolated smoothly.");
    }
}

// SYSTEM B: ANTI-REFRESH COOKIE LOCAL STORAGE ENGINE
function initializeLocalPersistenceEngine() {
    const savedRemoved = localStorage.getItem('fw_persist_removed');
    const savedWon = localStorage.getItem('fw_persist_won');
    const savedPointer = localStorage.getItem('fw_persist_pointer');
    const savedWallet = localStorage.getItem('fw_persist_wallet');

    if (savedWallet !== null) mockWalletDiamonds = parseInt(savedWallet);
    if (savedPointer !== null) spinPointer = parseInt(savedPointer);
    if (savedRemoved) localRemoved = JSON.parse(savedRemoved);
    if (savedWon) localWon = JSON.parse(savedWon);

    syncSystemUILayout();
}

// UI RENDER STABILIZER
function syncSystemUILayout() {
    if(walletText) walletText.innerText = `💎 ${mockWalletDiamonds}`;
    
    // UI states layout mapping
    domItems.forEach(el => el.classList.remove('removed', 'won', 'to-remove'));
    localRemoved.forEach(idx => { if(domItems[idx]) domItems[idx].classList.add('removed'); });
    localWon.forEach(idx => { if(domItems[idx]) domItems[idx].classList.add('won'); });

    attachInteractiveListeners();
    determineActiveStateMode();
}

function attachInteractiveListeners() {
    domItems.forEach(item => {
        item.onclick = () => {
            const index = parseInt(item.getAttribute('data-index'));
            evaluateSelectionLayer(index, item);
        };
    });

    if(actionControl) {
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

// --- REMOVE SELECTION CONTROL PANEL ---
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

    if(actionControl) {
        if (localSelected.length < 2) {
            actionControl.innerText = `REMOVE (${localSelected.length}/2)`;
            actionControl.disabled = true;
        } else {
            actionControl.innerText = `CONFIRM REMOVE`;
            actionControl.disabled = false;
        }
    }
}

function commitRemovalProcess() {
    localRemoved = [...localSelected];
    localSelected = [];
    
    localStorage.setItem('fw_persist_removed', JSON.stringify(localRemoved));
    
    try {
        if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0 && firebase.auth().currentUser) {
            const uid = firebase.auth().currentUser.uid;
            firebase.firestore().collection("users").doc(uid).update({ removed: localRemoved });
        }
    } catch(e) {}
    
    syncSystemUILayout();
}

function determineActiveStateMode() {
    if (localRemoved.length < 2) return;

    let pricePoint = progressiveCosts[spinPointer];
    if (spinPointer >= progressiveCosts.length || localWon.length >= 8) {
        if(alertBar) alertBar.innerText = "Congratulations! Pool cleared successfully.";
        if(actionControl) {
            actionControl.innerText = "COMPLETED";
            actionControl.disabled = true;
        }
        return;
    }
    if(alertBar) alertBar.innerText = "Pool ready! Click SPIN to draw your reward.";
    if(actionControl) {
        actionControl.innerText = `SPIN (💎 ${pricePoint})`;
        actionControl.disabled = false;
    }
}

// --- SECURITY PAYMENT MATRIX MODULE (Firebase Connected Logic) ---
function verifyBalanceSheet() {
    let targetedCost = progressiveCosts[spinPointer];

    // Check if user balance is short
    if (mockWalletDiamonds < targetedCost) {
        if(alertBar) alertBar.innerText = `⚠️ Low Diamond Balance! Redirecting to Top-Up Desk...`;
        
        // ⚡ BLOCK FAKE MONEY: Direct user to your secure voucher page!
        setTimeout(() => {
            alert("❌ Insufficient Diamonds!\n\nPlease purchase voucher codes from Faraz Admin and redeem them on the next page.");
            window.location.href = "topup.html"; // Redirect pointer to secure gate
        }, 500);
        return;
    }

    // Process local and cloud wallet balance deductions
    mockWalletDiamonds -= targetedCost;
    localStorage.setItem('fw_persist_wallet', mockWalletDiamonds.toString());
    if(walletText) walletText.innerText = `💎 ${mockWalletDiamonds}`;
    
    try {
        if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0 && firebase.auth().currentUser) {
            const uid = firebase.auth().currentUser.uid;
            firebase.firestore().collection("users").doc(uid).update({ 
                diamonds: mockWalletDiamonds 
            });
        }
    } catch(e) {}

    executeWheelSpin();
}

// --- SAFE RUNTIME WHEEL CHASE LOOP ---
function executeWheelSpin() {
    executionRunning = true;
    if(actionControl) actionControl.disabled = true;

    let accessiblePool = [];
    for (let i = 0; i < 10; i++) {
        if (!localRemoved.includes(i) && !localWon.includes(i)) {
            accessiblePool.push(i);
        }
    }

    // iPhone cap configuration ceiling check
    let globalIphoneWinCounter = parseInt(localStorage.getItem('sys_global_iphone_count') || "0");
    if (globalIphoneWinCounter >= 2) {
        accessiblePool = accessiblePool.filter(id => id !== 0);
    }

    const selectedWinnerIndex = accessiblePool[Math.floor(Math.random() * accessiblePool.length)];

    let activeTickIndex = 0;
    let computedCycles = 0;
    const targetCyclesThreshold = 20 + Math.floor(Math.random() * 8);

    try {
        soundTick.currentTime = 0;
        soundTick.loop = true;
        soundTick.play().catch(e => console.log("Audio block override."));
    } catch(e){}

    const runtimeClock = setInterval(() => {
        domItems.forEach(el => el.classList.remove('active-chase'));

        while (localRemoved.includes(activeTickIndex) || localWon.includes(activeTickIndex)) {
            activeTickIndex = (activeTickIndex + 1) % 10;
        }

        if(domItems[activeTickIndex]) {
            domItems[activeTickIndex].classList.add('active-chase');
        }
        
        let previousTick = activeTickIndex;
        activeTickIndex = (activeTickIndex + 1) % 10;
        computedCycles++;

        if (computedCycles >= targetCyclesThreshold && previousTick === selectedWinnerIndex) {
            clearInterval(runtimeClock);
            
            try {
                soundTick.pause();
                soundTick.currentTime = 0;
            } catch(e){}

            setTimeout(() => {
                domItems[selectedWinnerIndex].classList.remove('active-chase');
                domItems[selectedWinnerIndex].classList.add('won');
                
                localWon.push(selectedWinnerIndex);
                spinPointer++; 

                if (selectedWinnerIndex === 0) {
                    globalIphoneWinCounter++;
                    localStorage.setItem('sys_global_iphone_count', globalIphoneWinCounter.toString());
                }

                localStorage.setItem('fw_persist_won', JSON.stringify(localWon));
                localStorage.setItem('fw_persist_pointer', spinPointer.toString());

                // Update Firebase ledger document snapshots instantly
                try {
                    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0 && firebase.auth().currentUser) {
                        const uid = firebase.auth().currentUser.uid;
                        firebase.firestore().collection("users").doc(uid).update({
                            won: localWon,
                            spinCount: spinPointer
                        });
                    }
                } catch(e) {}

                try {
                    soundWin.currentTime = 0;
                    soundWin.play().catch(()=>{});
                } catch(e){}

                // ⚡ CORE INTEGRATION TIMING FIXED: Order data sent to Firebase BEFORE loading popup box!
                const itemTitleText = domItems[selectedWinnerIndex].querySelector('.item-title')?.innerText || "Special Rare Reward";
                sendPrizeToOrdersDatabase(selectedWinnerIndex, itemTitleText);

                triggerGrandCongratulations(selectedWinnerIndex);
                executionRunning = false;
            }, 250);
        }
    }, 100);
}

// --- CONGRATULATIONS OVERLAY SYSTEM ---
function triggerGrandCongratulations(winnerIndex) {
    const itemReference = domItems[winnerIndex];
    const imageSource = itemReference.querySelector('img').src;
    const itemTitleText = itemReference.querySelector('.item-title')?.innerText || "Special Reward";

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'congrats-modal-overlay';
    modalOverlay.id = 'dynamic-congrats-popup';

    modalOverlay.innerHTML = `
        <div class="congrats-card">
            <div class="congrats-title">CONGRATULATIONS!</div>
            <p style="color: #94a3b8; font-size: 13px; text-transform: uppercase;">Rare reward unlocked</p>
            <img src="${imageSource}" alt="Reward">
            <h2 style="color: #fff; margin-bottom: 25px; font-size: 20px;">${itemTitleText}</h2>
            <button class="congrats-btn" id="close-congrats-modal">EQUIP / OK</button>
        </div>
    `;

    document.body.appendChild(modalOverlay);
    document.getElementById('close-congrats-modal').onclick = () => {
        document.getElementById('dynamic-congrats-popup').remove();
        determineActiveStateMode(); 
    };
}

// --- PENDING ORDER GENERATION ENGINE (FIREBASE CONNECTED) ---
function sendPrizeToOrdersDatabase(winnerIndex, itemTitleText) {
    try {
        if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0 && firebase.auth().currentUser) {
            const user = firebase.auth().currentUser;
            const db = firebase.firestore();

            // 1. Unique Order ID generate karein
            const orderId = "ORD-" + Math.floor(100000 + Math.random() * 900000);
            
            // 2. Order ka data structure matrix taiyar karein
            const orderData = {
                orderId: orderId,
                userId: user.uid,
                userEmail: user.email || "Unknown User",
                productName: itemTitleText,
                productIndex: winnerIndex,
                price: "FREE (Faded Wheel)",
                status: "Pending", // Admin isko baad me "Delivered" ya "Success" kar sakta hai
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            // 3. Firebase Firestore ke "orders" collection me save karein
            db.collection("orders").doc(orderId).set(orderData)
            .then(() => {
                console.log(`🛒 Order auto-generated successfully: ${orderId}`);
            })
            .catch((error) => {
                console.error("Error creating auto-order: ", error);
            });
        } else {
            // Local Sandbox Fallback (Agar database connect na ho)
            let localOrders = JSON.parse(localStorage.getItem('fw_local_orders_db') || "[]");
            localOrders.push({
                orderId: "LOCAL-" + Date.now(),
                productName: itemTitleText,
                status: "Pending",
                price: "FREE"
            });
            localStorage.setItem('fw_local_orders_db', JSON.stringify(localOrders));
        }
    } catch(e) {
        console.log("Order bypass catch block triggered safely.");
    }
}