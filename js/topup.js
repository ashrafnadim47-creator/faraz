import { db, auth } from "./firebase-config.js";
import {
    doc,
    getDoc,
    updateDoc,
    increment,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let currentUserId = "";

// Auth & Wallet Balance Listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        const balanceDisplay = document.getElementById("topup-wallet");

        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (balanceDisplay) {
                    balanceDisplay.innerText = `💎 ${data.diamonds ?? 0}`;
                }
            }
        });
    }
});

// DOM Load Bindings
window.addEventListener("DOMContentLoaded", () => {
    const modalOverlay = document.getElementById("redeem-popup-window");
    const modalDetails = document.getElementById("modal-product-details");
    const closeModalBtn = document.getElementById("close-modal-btn");
    const claimBtn = document.getElementById("claim-reward-btn");
    const voucherInput = document.getElementById("popup-voucher-input");

    // Open Modal when clicking any Top-Up Pack or Membership Card
    document.querySelectorAll(".trigger-redeem-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const product = btn.getAttribute("data-product") || "Diamond Pack";
            const price = btn.getAttribute("data-price") || "0";

            if (modalDetails) {
                modalDetails.innerText = `Product: ${product} | Price: ₹${price}`;
            }
            if (modalOverlay) {
                modalOverlay.style.display = "flex";
            }
        });
    });

    // Close Modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener("click", () => {
            if (modalOverlay) modalOverlay.style.display = "none";
            if (voucherInput) voucherInput.value = "";
        });
    }

    // Claim Button Click Action
    if (claimBtn) {
        claimBtn.addEventListener("click", () => {
            if (!currentUserId) {
                alert("Please log in to your account first!");
                return;
            }
            const code = voucherInput ? voucherInput.value : "";
            redeemVoucherCode(currentUserId, code);
        });
    }
});

// Voucher Redeem Function Logic
export async function redeemVoucherCode(userId, inputCode) {
    if (!inputCode) {
        alert("Please enter a valid voucher code!");
        return;
    }

    const cleanCode = inputCode.trim().toUpperCase();
    const voucherRef = doc(db, "vouchers", cleanCode);

    try {
        const voucherSnap = await getDoc(voucherRef);

        if (!voucherSnap.exists()) {
            alert("❌ Invalid Code! Please check your code again.");
            return;
        }

        const voucherData = voucherSnap.data();

        if (voucherData.used === true) {
            alert("⚠️ This voucher code has already been used or expired!");
            return;
        }

        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            diamonds: increment(voucherData.amount)
        });

        await updateDoc(voucherRef, {
            used: true,
            usedBy: userId,
            usedAt: serverTimestamp()
        });

        alert(`🎉 Success! 💎 ${voucherData.amount} Diamonds added to your account!`);
        
        const modalOverlay = document.getElementById("redeem-popup-window");
        if (modalOverlay) modalOverlay.style.display = "none";

    } catch (error) {
        console.error("Redeem Error:", error);
        alert("❌ Failed to redeem code. Please try again.");
    }
}