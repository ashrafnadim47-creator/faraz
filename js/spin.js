import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const popup = document.getElementById("reward-popup");
const popupReward = document.getElementById("popup-reward");
const popupCode = document.getElementById("popup-code");
const closePopup = document.getElementById("close-popup");
const wheel = document.getElementById("wheel");
const spinBtn = document.getElementById("spin");
const resultDisplay = document.getElementById("result");
const couponDisplay = document.getElementById("coupon-result");
const timerDisplay = document.getElementById("timer");
const sound = document.getElementById("spin-sound");

let currentUser = null;
let currentRotation = 0;

// 6 Wheel Slices (60 deg each)
const rewards = [
    { name: "₹50 OFF", code: "FARAZ50", points: 0 },
    { name: "20 Points", code: "POINT20", points: 20 },
    { name: "FREE DELIVERY", code: "FREEDEL", points: 0 },
    { name: "₹30 OFF", code: "SPIN30", points: 0 },
    { name: "TRY AGAIN", code: null, points: 0 },
    { name: "₹10 OFF", code: "FARAZ10", points: 0 }
];

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    checkSpinCooldown();
});

function checkSpinCooldown() {
    if (!spinBtn) return;
    const lastSpinKey = currentUser ? `spinTime_${currentUser.uid}` : "spinTime_guest";
    const last = localStorage.getItem(lastSpinKey);

    if (!last) {
        spinBtn.disabled = false;
        if (timerDisplay) timerDisplay.innerText = "🎡 Spin Available Now!";
        return;
    }

    const diff = Number(last) - Date.now();

    if (diff <= 0) {
        localStorage.removeItem(lastSpinKey);
        spinBtn.disabled = false;
        if (timerDisplay) timerDisplay.innerText = "🎡 Spin Available Now!";
        return;
    }

    spinBtn.disabled = true;
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    if (timerDisplay) {
        timerDisplay.innerText = `⏳ Next Spin Available In: ${h}h ${m}m ${s}s`;
    }
}

setInterval(checkSpinCooldown, 1000);

if (spinBtn) {
    spinBtn.onclick = async () => {
        if (!currentUser) {
            alert("🔒 Please log in to spin!");
            window.location.href = "login.html";
            return;
        }

        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(() => {});
        }

        spinBtn.disabled = true;

        // Calculate exact wheel rotation to land on slice
        const winIndex = Math.floor(Math.random() * rewards.length);
        const win = rewards[winIndex];

        const sliceDeg = 360 / rewards.length; // 60 deg
        const targetDeg = 360 - (winIndex * sliceDeg) - (sliceDeg / 2);
        const fullRotations = 360 * 5; // 5 full spins

        currentRotation += fullRotations + targetDeg;
        if (wheel) wheel.style.transform = `rotate(${currentRotation}deg)`;

        setTimeout(async () => {
            if (resultDisplay) resultDisplay.innerText = "🎉 You Won: " + win.name;
            if (popupReward) popupReward.innerText = win.name;

            if (win.code) {
                if (popupCode) popupCode.innerHTML = "🎟️ Coupon: <b>" + win.code + "</b>";
                if (couponDisplay) couponDisplay.innerHTML = "🎟️ Coupon Code: <b>" + win.code + "</b>";

                // Save Coupon to Firestore & Local Storage
                await setDoc(doc(db, "users", currentUser.uid, "coupons", win.code), {
                    code: win.code,
                    createdAt: serverTimestamp()
                }, { merge: true });
            } else {
                if (popupCode) popupCode.innerText = "Better luck next time!";
                if (couponDisplay) couponDisplay.innerText = "😅 Try again tomorrow";
            }

            // Update user points if won
            if (win.points > 0) {
                await setDoc(doc(db, "users", currentUser.uid), {
                    points: increment(win.points)
                }, { merge: true });
            }

            if (popup) popup.style.display = "flex";

            // Set 24h Cooldown
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            localStorage.setItem(`spinTime_${currentUser.uid}`, tomorrow.getTime().toString());

        }, 4000);
    };
}

if (closePopup) {
    closePopup.onclick = () => {
        if (popup) popup.style.display = "none";
    };
}