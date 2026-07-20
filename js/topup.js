import { db } from "./firebase-config.js";
import {
    doc,
    getDoc,
    updateDoc,
    increment,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Redeem Function
export async function redeemVoucherCode(userId, inputCode) {
    if (!inputCode) {
        alert("Please enter a valid code!");
        return;
    }

    const cleanCode = inputCode.trim().toUpperCase();
    const voucherRef = doc(db, "vouchers", cleanCode);

    try {
        const voucherSnap = await getDoc(voucherRef);

        // 1. Check if Code exists
        if (!voucherSnap.exists()) {
            alert("❌ Invalid Code! Please check spelling.");
            return;
        }

        const voucherData = voucherSnap.data();

        // 2. Check if Code is already used
        if (voucherData.used === true) {
            alert("⚠️ Invalid or Already Used / Expired Code!");
            return;
        }

        // 3. Add Diamonds to User Profile
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            diamonds: increment(voucherData.amount)
        });

        // 4. Mark Voucher as Used
        await updateDoc(voucherRef, {
            used: true,
            usedBy: userId,
            usedAt: serverTimestamp()
        });

        alert(`🎉 Success! 💎 ${voucherData.amount} Diamonds added to your account!`);
        location.reload();

    } catch (error) {
        console.error("Redeem Error:", error);
        alert("❌ Failed to redeem code. Please try again.");
    }
}