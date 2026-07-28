import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    doc, 
    onSnapshot,
    increment, 
    collection, 
    query, 
    where, 
    getDocs, 
    deleteDoc, 
    serverTimestamp, 
    addDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let currentUser = null;

// Sync All Wallet UI Displays across Topup Page
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const diamondsVal = data.diamonds ?? data.wallet ?? 0;
                
                document.querySelectorAll("#user-diamonds, .wallet-balance span, #wallet-balance-val, .wallet-card span").forEach(el => {
                    if (el) el.innerText = diamondsVal.toLocaleString();
                });
            }
        });
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const modalWindow = document.getElementById("redeem-popup-window");
    const modalDetails = document.getElementById("modal-product-details");
    const voucherInput = document.getElementById("popup-voucher-input");
    const closeModalBtn = document.getElementById("close-modal-btn");
    const claimRewardBtn = document.getElementById("claim-reward-btn");
    const triggerBtns = document.querySelectorAll(".trigger-redeem-btn");

    let selectedProduct = { name: "", price: 0, diamonds: 0 };

    triggerBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            const pName = btn.getAttribute("data-product") || "Diamond Pack";
            const pPrice = parseInt(btn.getAttribute("data-price")) || 0;
            const pDiamonds = parseInt(btn.getAttribute("data-diamonds")) || 0;

            selectedProduct = { name: pName, price: pPrice, diamonds: pDiamonds };

            if (modalDetails) {
                modalDetails.innerText = `Product: ${pName} | Price: ₹${pPrice}`;
            }
            if (voucherInput) voucherInput.value = "";
            
            if (modalWindow) {
                modalWindow.classList.add("active");
                modalWindow.style.display = "flex";
            }
        });
    });

    if (closeModalBtn) {
        closeModalBtn.addEventListener("click", () => {
            if (modalWindow) {
                modalWindow.classList.remove("active");
                modalWindow.style.display = "none";
            }
        });
    }

    if (claimRewardBtn) {
        claimRewardBtn.addEventListener("click", async () => {
            if (!currentUser) {
                alert("🔒 Please Log In first to redeem voucher code!");
                window.location.href = "login.html";
                return;
            }

            const codeEntered = voucherInput ? voucherInput.value.trim().toUpperCase() : "";

            if (!codeEntered) {
                alert("❌ Please enter a valid Voucher Code!");
                return;
            }

            claimRewardBtn.disabled = true;
            claimRewardBtn.innerText = "Verifying Code...";

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
                let actualWorth = 0;

                querySnap.forEach((d) => {
                    voucherDocId = d.id;
                    const vData = d.data();
                    // Multi-field Extraction Fix
                    actualWorth = Number(vData.worth || vData.diamonds || vData.amount || vData.value || selectedProduct.diamonds || 0);
                });

                if (actualWorth <= 0) actualWorth = selectedProduct.diamonds || 10;

                // Credit Diamonds
                const userRef = doc(db, "users", currentUser.uid);
                await setDoc(userRef, {
                    diamonds: increment(actualWorth),
                    lastRedeem: serverTimestamp()
                }, { merge: true });

                // Order Record
                await addDoc(collection(db, "orders"), {
                    userId: currentUser.uid,
                    userEmail: currentUser.email || "N/A",
                    product: selectedProduct.name || "Voucher Redeem",
                    diamonds: actualWorth,
                    amount: selectedProduct.price || 0,
                    codeUsed: codeEntered,
                    status: "Completed",
                    createdAt: serverTimestamp()
                });

                // Delete Used Voucher
                await deleteDoc(doc(db, "vouchers", voucherDocId));

                alert(`🎉 SUCCESS!\n\n💎 +${actualWorth} Diamonds Added directly to your account!`);

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