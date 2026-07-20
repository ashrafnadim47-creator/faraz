import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    doc,
    getDoc,
    updateDoc,
    setDoc,
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
    setupMissionClaimListeners();
});

// ==========================================
// ⏳ 24-HOUR MISSION RESET TIMER
// ==========================================
function initTimer() {
    let reset = localStorage.getItem("missionReset");

    if (!reset) {
        let date = new Date();
        date.setHours(date.getHours() + 24);
        reset = date.getTime();
        localStorage.setItem("missionReset", reset);
    }

    function updateTimer() {
        const now = Date.now();
        const diff = Number(reset) - now;

        if (diff <= 0) {
            localStorage.removeItem("missionReset");
            localStorage.removeItem("missionClaimTime");
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
// 🎯 MISSION REWARD CLAIM ENGINE
// ==========================================
function setupMissionClaimListeners() {
    document.querySelectorAll(".claim").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!currentUser) {
                alert("🔒 Please log in to claim daily mission rewards!");
                location.href = "login.html";
                return;
            }

            const code = btn.dataset.reward;
            const pointsToAdd = Number(btn.dataset.points || 10);
            const claimKey = `claimed_${code}_${currentUser.uid}`;
            const isAlreadyClaimed = localStorage.getItem(claimKey);

            if (isAlreadyClaimed) {
                alert("⏳ You have already claimed this mission reward today!");
                btn.innerHTML = "✅ Claimed";
                btn.disabled = true;
                return;
            }

            btn.disabled = true;
            btn.innerHTML = "⏳ Claiming...";

            try {
                // 1. Update User Points in Firestore
                const userRef = doc(db, "users", currentUser.uid);
                const userSnap = await getDoc(userRef);
                let currentPoints = 0;

                if (userSnap.exists()) {
                    currentPoints = userSnap.data().points || 0;
                }

                await updateDoc(userRef, {
                    points: currentPoints + pointsToAdd,
                    lastMission: serverTimestamp()
                });

                // 2. Add Coupon Code to User Collection
                await setDoc(doc(db, "users", currentUser.uid, "coupons", code), {
                    code: code,
                    createdAt: serverTimestamp()
                });

                // 3. Update Local Storage tracking
                localStorage.setItem(claimKey, "true");

                // 4. Save to local coupon array
                let localCoupons = JSON.parse(localStorage.getItem("coupons")) || [];
                if (!localCoupons.includes(code)) {
                    localCoupons.push(code);
                    localStorage.setItem("coupons", JSON.stringify(localCoupons));
                }

                alert(`🎉 Mission Complete!\n\nCoupon Unlocked: ${code}\nBonus Earned: +${pointsToAdd} Points ⭐`);
                btn.innerHTML = "✅ Claimed";

            } catch (error) {
                console.error("Mission claim error:", error);
                alert("❌ Failed to claim reward. Please check your network connection.");
                btn.disabled = false;
                btn.innerHTML = "Claim";
            }
        });
    });
}