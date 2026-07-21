import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    doc, 
    getDoc, 
    updateDoc, 
    increment, 
    collection, 
    query, 
    where, 
    getDocs, 
    deleteDoc, 
    serverTimestamp, 
    addDoc 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    const walletElem = document.getElementById("topup-wallet");
    const modalWindow = document.getElementById("redeem-popup-window");
    const modalDetails = document.getElementById("modal-product-details");
    const voucherInput = document.getElementById("popup-voucher-input");
    const closeModalBtn = document.getElementById("close-modal-btn");
    const claimRewardBtn = document.getElementById("claim-reward-btn");
    const triggerBtns = document.querySelectorAll(".trigger-redeem-btn");

    let currentUser = null;
    let selectedProduct = { name: "", diamonds: 0, price: 0 };

    // 1. Auth Listener & Load Wallet Balance
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            loadUserWallet(user.uid);
        } else {
            walletElem.innerText = "💎 Login Required";
        }
    });

    async function loadUserWallet(uid) {
        try {
            const userSnap = await getDoc(doc(db, "users", uid));
            if (userSnap.exists()) {
                const data = userSnap.data();
                walletElem.innerText = `💎 ${data.wallet || 0}`;
            }
        } catch (err) {
            console.error("Error loading wallet:", err);
        }
    }

    // 2. Open Redeem Popup
    triggerBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            if (!currentUser) {
                alert("❌ Please Login first to buy or redeem diamonds!");
                window.location.href = "login.html";
                return;
            }

            const pName = btn.getAttribute("data-product") || "Diamond Pack";
            const pDiamonds = parseInt(btn.getAttribute("data-diamonds")) || 0;
            const pPrice = parseInt(btn.getAttribute("data-price")) || 0;

            selectedProduct = { name: pName, diamonds: pDiamonds, price: pPrice };

            modalDetails.innerText = `Product: ${pName} (💎${pDiamonds}) | Price: ₹${pPrice}`;
            voucherInput.value = "";
            modalWindow.classList.add("active");
            modalWindow.style.display = "flex";
        });
    });

    // 3. Close Popup
    closeModalBtn.addEventListener("click", () => {
        modalWindow.classList.remove("active");
        modalWindow.style.display = "none";
    });

    // 4. 🔥 CLAIM VOUCHER & INSTANT AUTO UPDATE PRIME SPENT
    claimRewardBtn.addEventListener("click", async () => {
        const codeEntered = voucherInput.value.trim().toUpperCase();

        if (!codeEntered) {
            alert("❌ Please enter a valid Voucher Code!");
            return;
        }

        claimRewardBtn.disabled = true;
        claimRewardBtn.innerText = "Verifying...";

        try {
            // Check Voucher in Firestore Vouchers Collection
            const vouchersRef = collection(db, "vouchers");
            const q = query(vouchersRef, where("code", "==", codeEntered));
            const querySnap = await getDocs(q);

            if (querySnap.empty) {
                alert("❌ Invalid or Already Used Voucher Code!");
                claimRewardBtn.disabled = false;
                claimRewardBtn.innerText = "⚡ Claim Reward";
                return;
            }

            // Extract voucher details
            let voucherDocId = "";
            let rewardDiamonds = selectedProduct.diamonds || 0;
            let packPrice = selectedProduct.price || 0;

            querySnap.forEach((d) => {
                voucherDocId = d.id;
                const vData = d.data();
                if (vData.diamonds) rewardDiamonds = parseInt(vData.diamonds);
                if (vData.price) packPrice = parseInt(vData.price);
            });

            const userRef = doc(db, "users", currentUser.uid);

            // 🔥 A. Update User Wallet AND Increment totalSpent for Prime Level
            await updateDoc(userRef, {
                wallet: increment(rewardDiamonds),
                totalSpent: increment(packPrice) // <-- Instant Auto Prime Upgrade Trigger!
            });

            // B. Log Transaction Order History
            await addDoc(collection(db, "orders"), {
                userId: currentUser.uid,
                userEmail: currentUser.email,
                product: selectedProduct.name || "Voucher Redeem",
                diamonds: rewardDiamonds,
                amount: packPrice,
                codeUsed: codeEntered,
                status: "Completed",
                timestamp: serverTimestamp()
            });

            // C. Delete Used Voucher Code
            await deleteDoc(doc(db, "vouchers", voucherDocId));

            alert(`🎉 Success! 💎 ${rewardDiamonds} Diamonds added to your account & Prime Level Updated!`);

            modalWindow.classList.remove("active");
            modalWindow.style.display = "none";
            loadUserWallet(currentUser.uid);

            // Redirect to Prime Membership page to see instant level upgrade
            window.location.href = "prime-membership.html";

        } catch (err) {
            console.error("Redeem Error:", err);
            alert("❌ Redemption Failed: " + err.message);
        } finally {
            claimRewardBtn.disabled = false;
            claimRewardBtn.innerText = "⚡ Claim Reward";
        }
    });
});