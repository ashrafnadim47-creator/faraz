import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    doc, 
    updateDoc, 
    increment, 
    collection, 
    query, 
    where, 
    getDocs, 
    deleteDoc, 
    serverTimestamp, 
    addDoc,
    onSnapshot
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
    let userUnsubscribe = null;

    // 1. Auth Listener & Realtime Load Wallet Balance
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            if (userUnsubscribe) userUnsubscribe();

            // Realtime Sync for Instant Balance Upgrade
            userUnsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const liveBalance = data.diamonds ?? data.wallet ?? 0;
                    if (walletElem) walletElem.innerText = `💎 ${liveBalance.toLocaleString()}`;
                    localStorage.setItem('fw_persist_wallet', liveBalance.toString());
                }
            });
        } else {
            if (walletElem) walletElem.innerText = "💎 Login Required";
        }
    });

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

            if (modalDetails) modalDetails.innerText = `Product: ${pName} (💎${pDiamonds}) | Price: ₹${pPrice}`;
            if (voucherInput) voucherInput.value = "";
            if (modalWindow) {
                modalWindow.classList.add("active");
                modalWindow.style.display = "flex";
            }
        });
    });

    // 3. Close Popup
    if (closeModalBtn) {
        closeModalBtn.addEventListener("click", () => {
            if (modalWindow) {
                modalWindow.classList.remove("active");
                modalWindow.style.display = "none";
            }
        });
    }

    // 4. 🔥 CLAIM VOUCHER & INSTANT AUTO UPDATE DIAMONDS AND PRIME SPENT
    if (claimRewardBtn) {
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

                // 🔥 Update user diamonds, wallet, and totalSpent for Prime Level
                await updateDoc(userRef, {
                    diamonds: increment(rewardDiamonds),
                    wallet: increment(rewardDiamonds),
                    totalSpent: increment(packPrice)
                });

                // Log Transaction Order History
                await addDoc(collection(db, "orders"), {
                    userId: currentUser.uid,
                    userEmail: currentUser.email || "Customer",
                    product: selectedProduct.name || "Voucher Redeem",
                    diamonds: rewardDiamonds,
                    amount: packPrice,
                    codeUsed: codeEntered,
                    status: "Completed",
                    timestamp: serverTimestamp()
                });

                // Delete Used Voucher Code
                await deleteDoc(doc(db, "vouchers", voucherDocId));

                alert(`🎉 Success! 💎 ${rewardDiamonds} Diamonds added to your account & Prime Level Updated!`);

                if (modalWindow) {
                    modalWindow.classList.remove("active");
                    modalWindow.style.display = "none";
                }

                // Redirect to Prime Membership page
                window.location.href = "prime-membership.html";

            } catch (err) {
                console.error("Redeem Error:", err);
                alert("❌ Redemption Failed: " + err.message);
            } finally {
                claimRewardBtn.disabled = false;
                claimRewardBtn.innerText = "⚡ Claim Reward";
            }
        });
    }
});