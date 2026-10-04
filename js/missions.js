import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    doc,
    setDoc,
    increment,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const timerDisplay = document.getElementById("mission-timer");
let currentUser = null;

// ==========================================
// 🔑 AUTH CHECK & INITIALIZATION
// ==========================================
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    initTimer();
    setupTaskLinks();
    setupMissionClaimListeners();
    restoreUIState();
});

// ==========================================
// ⏳ 24-HOUR MISSION RESET TIMER
// ==========================================
function initTimer() {
    let reset = localStorage.getItem("missionReset");

    if (!reset) {
        const date = new Date();
        date.setHours(date.getHours() + 24);
        reset = date.getTime();
        localStorage.setItem("missionReset", reset.toString());
    }

    function updateTimer() {
        const now = Date.now();
        const diff = Number(reset) - now;

        if (diff <= 0) {
            // Reset daily task status on timer expiry
            ["yt", "insta", "spin"].forEach(taskId => {
                localStorage.removeItem(`task_opened_${taskId}`);
                if (currentUser) localStorage.removeItem(`claimed_${taskId}_${currentUser.uid}`);
            });
            localStorage.removeItem("missionReset");
            location.reload();
            return;
        }

        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);

        if (timerDisplay) {
            timerDisplay.innerHTML = `⏳ Missions Reset In: <span style="color: #00e5ff;">${h}h ${m}m ${s}s</span>`;
        }
    }

    updateTimer();
    setInterval(updateTimer, 1000);
}

// ==========================================
// 🔗 STEP 1: TASK LINK LISTENERS
// ==========================================
function setupTaskLinks() {
    ["yt", "insta", "spin"].forEach(taskId => {
        const linkElem = document.getElementById(`link-${taskId}`);
        if (linkElem) {
            linkElem.addEventListener("click", () => {
                localStorage.setItem(`task_opened_${taskId}`, "true");
                unlockClaimButton(taskId);
            });
        }
    });
}

function unlockClaimButton(taskId) {
    const claimBtn = document.getElementById(`btn-${taskId}`);
    const claimKey = currentUser ? `claimed_${taskId}_${currentUser.uid}` : null;

    if (claimBtn && (!claimKey || !localStorage.getItem(claimKey))) {
        claimBtn.disabled = false;
        claimBtn.innerText = "2. Claim Reward";
        claimBtn.style.background = "linear-gradient(135deg, #22c55e, #16a34a)";
        claimBtn.style.color = "#ffffff";
        claimBtn.style.cursor = "pointer";
    }
}

// ==========================================
// 🎯 STEP 2: MISSION REWARD CLAIM ENGINE
// ==========================================
function setupMissionClaimListeners() {
    document.querySelectorAll(".claim").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!currentUser) {
                alert("🔒 Please log in to claim daily mission rewards!");
                window.location.href = "login.html";
                return;
            }

            const taskId = btn.dataset.task;
            const code = btn.dataset.reward;
            const pointsToAdd = Number(btn.dataset.points || 10);
            const claimKey = `claimed_${taskId}_${currentUser.uid}`;

            if (localStorage.getItem(claimKey)) {
                alert("⏳ You have already claimed this mission reward today!");
                btn.innerText = "✅ Claimed Today";
                btn.disabled = true;
                return;
            }

            btn.disabled = true;
            btn.innerText = "⏳ Claiming...";

            try {
                const userRef = doc(db, "users", currentUser.uid);

                // 1. Atomic Points Update
                await setDoc(userRef, {
                    points: increment(pointsToAdd),
                    lastMission: serverTimestamp()
                }, { merge: true });

                // 2. Add Coupon Record to Firestore User collection
                const couponRef = doc(db, "users", currentUser.uid, "coupons", code);
                await setDoc(couponRef, {
                    code: code,
                    createdAt: serverTimestamp()
                });

                // 3. Update Local Storage tracking
                localStorage.setItem(claimKey, "true");

                // 4. Reveal Coupon Code in UI
                const codeSpan = document.getElementById(`code-${taskId}`);
                if (codeSpan) {
                    codeSpan.innerText = code;
                    codeSpan.style.color = "#00e5ff";
                }

                alert(`🎉 Mission Complete!\n\nCoupon Unlocked: ${code}\nBonus Earned: +${pointsToAdd} Points ⭐`);
                btn.innerText = "✅ Claimed Today";

            } catch (error) {
                console.error("Mission claim error:", error);
                alert("❌ Failed to claim reward. Please check your network connection.");
                btn.disabled = false;
                btn.innerText = "2. Claim Reward";
            }
        });
    });
}

// ==========================================
// 🔄 RESTORE STATE ON PAGE LOAD
// ==========================================
function restoreUIState() {
    ["yt", "insta", "spin"].forEach(taskId => {
        const claimKey = currentUser ? `claimed_${taskId}_${currentUser.uid}` : null;
        const btn = document.getElementById(`btn-${taskId}`);
        const codeSpan = document.getElementById(`code-${taskId}`);
        const couponCode = btn?.dataset.reward;

        if (claimKey && localStorage.getItem(claimKey)) {
            if (btn) {
                btn.innerText = "✅ Claimed Today";
                btn.disabled = true;
                btn.style.background = "#334155";
            }
            if (codeSpan && couponCode) {
                codeSpan.innerText = couponCode;
                codeSpan.style.color = "#00e5ff";
            }
        } else if (localStorage.getItem(`task_opened_${taskId}`)) {
            unlockClaimButton(taskId);
        }
    });
}