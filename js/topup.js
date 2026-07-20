// Firebase framework setup configs
import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, onSnapshot, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// DOM References
const walletDisplay = document.getElementById("topup-wallet");
const popupWindow = document.getElementById("redeem-popup-window");
const modalDetailsText = document.getElementById("modal-product-details");
const voucherInputField = document.getElementById("popup-voucher-input");

let currentActiveUserUid = "";
let selectedItemDiamonds = 0;
let currentWalletBalance = 0;

// 1. Auth & Realtime Balance Listener (FIXED to Firebase v10 Modular Syntax)
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentActiveUserUid = user.uid;
        
        // Listen live balances from Firestore
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                currentWalletBalance = docSnap.data().diamonds ?? 0;
                if (walletDisplay) walletDisplay.innerText = `💎 ${currentWalletBalance}`;
            }
        }, (error) => {
            console.error("Error reading wallet balance:", error);
        });
    } else {
        console.log("Session restricted. Access requires direct profile authentication.");
    }
});

// 2. FIXED: Universal Mobile Touch & PC Click Listener (Event Delegation)
document.addEventListener("click", (e) => {
    // A. Membership / Pack Buy Button Click
    const redeemBtn = e.target.closest(".trigger-redeem-btn");
    if (redeemBtn) {
        e.preventDefault();
        const productName = redeemBtn.getAttribute("data-product") || "Item";
        const price = redeemBtn.getAttribute("data-price") || "0";
        selectedItemDiamonds = parseInt(redeemBtn.getAttribute("data-diamonds") || "0");

        if (modalDetailsText) {
            modalDetailsText.innerText = `Product: ${productName} | Price: ₹${price}`;
        }
        if (popupWindow) popupWindow.style.display = "flex";
        return;
    }

    // B. Close Modal Button Click
    if (e.target.closest("#close-modal-btn")) {
        e.preventDefault();
        if (popupWindow) popupWindow.style.display = "none";
        if (voucherInputField) voucherInputField.value = "";
        return;
    }

    // C. Claim Reward Button Click
    if (e.target.closest("#claim-reward-btn")) {
        e.preventDefault();
        processVoucherValidationSequence();
        return;
    }
});

// 3. Voucher Validation Logic
async function processVoucherValidationSequence() {
    if (!currentActiveUserUid) {
        alert("❌ Authentication active status expired! Please log in again.");
        return;
    }

    const typedCode = voucherInputField.value.trim().toUpperCase();

    if (!typedCode) {
        alert("⚠️ Input field empty. Please enter a valid code.");
        return;
    }

    try {
        const voucherRef = doc(db, "vouchers", typedCode);
        const voucherSnap = await getDoc(voucherRef);

        if (voucherSnap.exists() && voucherSnap.data().status === "ACTIVE") {
            const finalComputedBalance = currentWalletBalance + selectedItemDiamonds;

            // 1. Credit balance to active user account
            await updateDoc(doc(db, "users", currentActiveUserUid), {
                diamonds: finalComputedBalance
            });

            // 2. Mark voucher code as CONSUMED
            await updateDoc(voucherRef, {
                status: "CONSUMED",
                redeemedBy: currentActiveUserUid,
                timestamp: new Date().toISOString()
            });

            alert(`🎉 Success! Credited 💎 ${selectedItemDiamonds} to your account.`);
            if (popupWindow) popupWindow.style.display = "none";
            if (voucherInputField) voucherInputField.value = "";

        } else {
            alert("❌ Invalid code, used code, or expired code. Contact Admin.");
        }
    } catch (error) {
        console.error("Voucher validation fail:", error);
        alert("⛔ Network sync error. Transaction rolled back.");
    }
}