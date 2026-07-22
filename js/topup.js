import { db } from "./firebase-config.js";
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
    addDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    const modalWindow = document.getElementById("redeem-popup-window");
    const modalDetails = document.getElementById("modal-product-details");
    const voucherInput = document.getElementById("popup-voucher-input");
    const closeModalBtn = document.getElementById("close-modal-btn");
    const claimRewardBtn = document.getElementById("claim-reward-btn");
    const triggerBtns = document.querySelectorAll(".trigger-redeem-btn");

    let selectedProduct = { name: "", diamonds: 0, price: 0 };

    // 1. DIRECT OPEN POPUP (LOGIN CHECK REMOVED)
    triggerBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            const pName = btn.getAttribute("data-product") || "Diamond Pack";
            const pDiamonds = parseInt(btn.getAttribute("data-diamonds")) || 0;
            const pPrice = parseInt(btn.getAttribute("data-price")) || 0;

            selectedProduct = { name: pName, diamonds: pDiamonds, price: pPrice };

            if (modalDetails) {
                modalDetails.innerText = `Product: ${pName} (💎${pDiamonds}) | Price: ₹${pPrice}`;
            }
            if (voucherInput) voucherInput.value = "";
            
            if (modalWindow) {
                modalWindow.classList.add("active");
                modalWindow.style.display = "flex";
            }
        });
    });

    // 2. CLOSE POPUP
    if (closeModalBtn) {
        closeModalBtn.addEventListener("click", () => {
            if (modalWindow) {
                modalWindow.classList.remove("active");
                modalWindow.style.display = "none";
            }
        });
    }

    // 3. CLAIM REWARD / VOUCHER REDEEM
    if (claimRewardBtn) {
        claimRewardBtn.addEventListener("click", async () => {
            const codeEntered = voucherInput ? voucherInput.value.trim().toUpperCase() : "";

            if (!codeEntered) {
                alert("❌ Please enter a valid Voucher Code!");
                return;
            }

            claimRewardBtn.disabled = true;
            claimRewardBtn.innerText = "Verifying...";

            try {
                const vouchersRef = collection(db, "vouchers");
                const q = query(vouchersRef, where("code", "==", codeEntered));
                const querySnap = await getDocs(q);

                if (querySnap.empty) {
                    alert("❌ Invalid or Already Used Voucher Code!");
                    claimRewardBtn.disabled = false;
                    claimRewardBtn.innerText = "⚡ Claim Reward";
                    return;
                }

                let voucherDocId = "";
                let rewardDiamonds = selectedProduct.diamonds || 0;
                let packPrice = selectedProduct.price || 0;

                querySnap.forEach((d) => {
                    voucherDocId = d.id;
                    const vData = d.data();
                    if (vData.diamonds) rewardDiamonds = parseInt(vData.diamonds);
                    if (vData.price) packPrice = parseInt(vData.price);
                });

                // Order Log entry
                await addDoc(collection(db, "orders"), {
                    product: selectedProduct.name || "Voucher Redeem",
                    diamonds: rewardDiamonds,
                    amount: packPrice,
                    codeUsed: codeEntered,
                    status: "Completed",
                    timestamp: serverTimestamp()
                });

                await deleteDoc(doc(db, "vouchers", voucherDocId));

                alert(`🎉 Success! 💎 ${rewardDiamonds} Diamonds Voucher Verified!`);

                if (modalWindow) {
                    modalWindow.classList.remove("active");
                    modalWindow.style.display = "none";
                }

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