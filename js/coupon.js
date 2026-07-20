// ==========================================
// 🎟️ FARAZ STORE - COUPON MANAGEMENT SYSTEM
// ==========================================

let activeDiscountPercent = 0;
let baseOrderTotal = 0;

window.applyCoupon = function () {
    const codeInput = document.getElementById("coupon-code");
    const msgElement = document.getElementById("coupon-message");

    if (!codeInput || !msgElement) return;

    const code = codeInput.value.trim().toUpperCase();

    if (!code) {
        msgElement.style.color = "#ef4444";
        msgElement.innerText = "❌ Please enter a coupon code!";
        return;
    }

    const availableCoupons = {
        "FARAZ10": 10,
        "WELCOME20": 20,
        "SALE50": 50,
        "TKRUSH20": 20,
        "INSTA30": 30,
        "FARAZ50": 50
    };

    const savedCoupons = JSON.parse(localStorage.getItem("coupons")) || [];

    // Verify valid coupon code from store list or user unlocked inventory
    if (availableCoupons[code] && (savedCoupons.includes(code) || availableCoupons[code])) {
        activeDiscountPercent = availableCoupons[code];
        msgElement.style.color = "#22c55e";
        msgElement.innerText = `🎉 ${activeDiscountPercent}% Discount Applied!`;

        updateDiscountedTotalUI();
    } else {
        activeDiscountPercent = 0;
        msgElement.style.color = "#ef4444";
        msgElement.innerText = "❌ Invalid or Unavailable Coupon Code";
        updateDiscountedTotalUI();
    }
};

function updateDiscountedTotalUI() {
    const totalElement = document.getElementById("checkout-total");
    if (!totalElement) return;

    // Cache original base amount
    if (!baseOrderTotal || baseOrderTotal === 0) {
        const extractedDigits = totalElement.innerText.replace(/\D/g, "");
        baseOrderTotal = Number(extractedDigits) || 0;
    }

    if (baseOrderTotal > 0) {
        const discountAmount = (baseOrderTotal * activeDiscountPercent) / 100;
        const finalPrice = Math.max(0, Math.floor(baseOrderTotal - discountAmount));
        totalElement.innerHTML = `Total : ₹${finalPrice.toLocaleString()}`;
        totalElement.setAttribute("data-final-price", finalPrice);
    }
}

// Global hook for checkout module to set initial cart total
window.setCouponBaseTotal = function (amount) {
    baseOrderTotal = Number(amount) || 0;
    activeDiscountPercent = 0;
};