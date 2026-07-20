// ==========================================
// 🎡 LUCKY SPIN WHEEL CONTROLLER
// ==========================================

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

const rewards = [
    { name: "₹50 OFF", code: "FARAZ50" },
    { name: "20 Points", code: "POINT20" },
    { name: "FREE DELIVERY", code: "FREEDEL" },
    { name: "₹30 OFF", code: "SPIN30" },
    { name: "TRY AGAIN", code: null },
    { name: "₹10 OFF", code: "FARAZ10" }
];

// ==========================================
// ⏳ DAILY SPIN CHECK ENGINE
// ==========================================
function checkSpin() {
    if (!spinBtn) return;

    const last = localStorage.getItem("spinTime");

    if (!last) {
        spinBtn.disabled = false;
        if (timerDisplay) timerDisplay.innerHTML = "🎡 Spin Available";
        return;
    }

    const diff = Number(last) - Date.now();

    if (diff <= 0) {
        localStorage.removeItem("spinTime");
        spinBtn.disabled = false;
        if (timerDisplay) timerDisplay.innerHTML = "🎡 Spin Available";
        return;
    }

    spinBtn.disabled = true;

    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    if (timerDisplay) {
        timerDisplay.innerHTML = `⏳ Next Spin Available In: ${h}h ${m}m ${s}s`;
    }
}

setInterval(checkSpin, 1000);
checkSpin();

// ==========================================
// 🎯 SPIN ACTION TRIGGER
// ==========================================
if (spinBtn) {
    spinBtn.onclick = () => {
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(() => {});
        }

        if (wheel) wheel.classList.add("rotate");
        spinBtn.disabled = true;

        const win = rewards[Math.floor(Math.random() * rewards.length)];

        setTimeout(() => {
            if (wheel) wheel.classList.remove("rotate");

            if (resultDisplay) resultDisplay.innerHTML = "🎉 You Won: " + win.name;
            if (popupReward) popupReward.innerHTML = win.name;

            if (win.code) {
                if (popupCode) popupCode.innerHTML = "🎟️ Coupon: <b>" + win.code + "</b>";
                if (couponDisplay) couponDisplay.innerHTML = "🎟️ Coupon Code: <b>" + win.code + "</b>";

                let oldCoupons = JSON.parse(localStorage.getItem("coupons")) || [];
                if (!oldCoupons.includes(win.code)) {
                    oldCoupons.push(win.code);
                    localStorage.setItem("coupons", JSON.stringify(oldCoupons));
                }
            } else {
                if (popupCode) popupCode.innerHTML = "Try Again Tomorrow 😅";
                if (couponDisplay) couponDisplay.innerHTML = "😅 Try Again Tomorrow";
            }

            if (popup) popup.style.display = "flex";

        }, 4000);

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        localStorage.setItem("spinTime", tomorrow.getTime());
    };
}

if (closePopup) {
    closePopup.onclick = () => {
        if (popup) popup.style.display = "none";
    };
}