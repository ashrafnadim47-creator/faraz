// Firebase framework setup configs
import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// DOM References Matrix Setup
const walletDisplay = document.getElementById("topup-wallet");
const popupWindow = document.getElementById("redeem-popup-window");
const modalDetailsText = document.getElementById("modal-product-details");
const voucherInputField = document.getElementById("popup-voucher-input");

let currentActiveUserUid = "";
let selectedItemDiamonds = 0;
let currentWalletBalance = 0;

// Track active transaction memory state
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentActiveUserUid = user.uid;
        // Listen live balances from Firestore documentation stack
        db.collection("users").doc(user.uid).onSnapshot((docSnap) => {
            if (docSnap.exists) {
                currentWalletBalance = docSnap.data().diamonds ?? 0;
                if(walletDisplay) walletDisplay.innerText = `💎 ${currentWalletBalance}`;
            }
        });
    } else {
        console.log("Session restricted. Access requires direct profile authentication.");
    }
});

// --- HYBRID REGISTRATION ENGINE FOR MOBILE TOUCH & PC CLICK ---
window.addEventListener('DOMContentLoaded', () => {
    const attachInteractionEvent = (selector, eventHandler) => {
        document.querySelectorAll(selector).forEach(element => {
            element.addEventListener('click', eventHandler);
            element.addEventListener('touchstart', (e) => {
                e.preventDefault(); // Stop mobile browser long press action delay
                eventHandler(e);
            }, { passive: false });
        });
    };

    // 1. Pack purchase listeners setup
    attachInteractionEvent('.trigger-redeem-btn', (e) => {
        const component = e.target.closest('.trigger-redeem-btn');
        if (!component) return;

        const productName = component.getAttribute('data-product');
        const price = component.getAttribute('data-price');
        selectedItemDiamonds = parseInt(component.getAttribute('data-diamonds') || "0");

        if(modalDetailsText) {
            modalDetailsText.innerText = `Product: ${productName} | Price: ₹${price}`;
        }
        if(popupWindow) popupWindow.style.display = "flex";
    });

    // 2. Cancel trigger closure integration
    attachInteractionEvent('#close-modal-btn', () => {
        if(popupWindow) popupWindow.style.display = "none";
        if(voucherInputField) voucherInputField.value = "";
    });

    // 3. Confirm Claim code button connection
    attachInteractionEvent('#claim-reward-btn', () => {
        processVoucherValidationSequence();
    });
});

// --- VOUCHER CODES AUTHENTICATION MATRIX ---
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
        // Fetch specific collection node from database references
        const voucherRef = doc(db, "vouchers", typedCode);
        const voucherSnap = await getDoc(voucherRef);

        if (voucherSnap.exists() && voucherSnap.data().status === "ACTIVE") {
            const finalComputedBalance = currentWalletBalance + selectedItemDiamonds;

            // 1. Credit balance to active user cloud doc ledger ledger node
            await updateDoc(doc(db, "users", currentActiveUserUid), {
                diamonds: finalComputedBalance
            });

            // 2. Consume voucher code inside system database logs
            await updateDoc(voucherRef, {
                status: "CONSUMED",
                redeemedBy: currentActiveUserUid,
                timestamp: new Date().toISOString()
            });

            alert(`🎉 Success! credited 💎 ${selectedItemDiamonds} to your dynamic store account.`);
            if(popupWindow) popupWindow.style.display = "none";
            if(voucherInputField) voucherInputField.value = "";

        } else {
            alert("❌ Invalid code, used code, or structure expiration failure. Contact Faraz Admin.");
        }
    } catch (error) {
        console.error("Voucher matrix sync fail stream:", error);
        alert("⛔ Network structural sync error. Transaction rolled back.");
    }
}