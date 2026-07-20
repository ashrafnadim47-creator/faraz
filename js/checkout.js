import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    updateDoc,
    getDoc,
    increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const itemsBox = document.getElementById("checkout-items");
const totalBox = document.getElementById("checkout-total");
const countBox = document.getElementById("item-count");
const orderBtn = document.getElementById("place-order-btn");

let uid = "";
let cartItems = [];
let totalAmount = 0;

// ==========================================
// 🔑 AUTHENTICATION & CHECKOUT LOADER
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        alert("🔒 Please login to proceed with checkout!");
        location.href = "login.html";
        return;
    }

    uid = user.uid;
    loadCheckoutItems();
});

async function loadCheckoutItems() {
    if (!itemsBox) return;

    itemsBox.innerHTML = `
        <div class="loading-state" style="text-align: center; padding: 20px;">
            <div class="spinner"></div>
            <p style="color: #00e5ff; margin-top: 10px;">Loading Selected Products...</p>
        </div>
    `;

    try {
        const snap = await getDocs(collection(db, "users", uid, "cart"));
        itemsBox.innerHTML = "";
        cartItems = [];
        totalAmount = 0;

        if (snap.empty) {
            itemsBox.innerHTML = `<h3 style="color: #94a3b8; text-align: center; padding: 20px;">Your Shopping Cart is Empty 🛒</h3>`;
            if (countBox) countBox.innerText = "0";
            if (totalBox) totalBox.innerText = "Total : ₹0";
            return;
        }

        snap.forEach(docSnap => {
            const data = docSnap.data();
            const docId = docSnap.id;
            const itemQty = Number(data.quantity || 1);
            const itemPrice = Number(data.price || 0);

            cartItems.push({
                cartDocId: docId,
                ...data,
                quantity: itemQty,
                price: itemPrice
            });

            totalAmount += itemPrice * itemQty;

            itemsBox.innerHTML += `
                <div class="checkout-item glassmorphism" style="padding: 12px 16px; border-radius: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(255, 255, 255, 0.08);">
                    <div>
                        <h3 style="font-size: 14px; color: #ffffff; margin: 0; font-weight: 800;">${data.name}</h3>
                        <span style="font-size: 12px; color: #94a3b8;">₹${itemPrice} × ${itemQty}</span>
                    </div>
                    <span style="font-size: 14px; color: #00e5ff; font-weight: 900;">₹${itemPrice * itemQty}</span>
                </div>
            `;
        });

        if (countBox) countBox.innerText = cartItems.length;
        if (totalBox) totalBox.innerText = `Total : ₹${totalAmount}`;

        // Sync with Coupon Module Base Total
        if (typeof window.setCouponBaseTotal === "function") {
            window.setCouponBaseTotal(totalAmount);
        }

    } catch (error) {
        console.error("Checkout load error:", error);
        itemsBox.innerHTML = `<h3 style="color: #ef4444; text-align: center;">❌ Failed to load checkout items.</h3>`;
    }
}

// ==========================================
// 🔒 PLACE ORDER ACTION HANDLER
// ==========================================
if (orderBtn) {
    orderBtn.addEventListener("click", async () => {
        if (cartItems.length === 0) {
            alert("❌ Your cart is empty!");
            return;
        }

        // Robust address input querying
        const nameInput = document.getElementById("address-name") || document.querySelector(".address-card input:nth-of-type(1)");
        const phoneInput = document.getElementById("address-phone") || document.querySelector(".address-card input:nth-of-type(2)");
        const addressInput = document.getElementById("address-full") || document.querySelector(".address-card textarea");
        const pincodeInput = document.getElementById("address-pincode") || document.querySelector(".address-card input:nth-of-type(3)");

        const customerName = nameInput ? nameInput.value.trim() : "";
        const mobile = phoneInput ? phoneInput.value.trim() : "";
        const address = addressInput ? addressInput.value.trim() : "";
        const pincode = pincodeInput ? pincodeInput.value.trim() : "";

        if (!customerName || !mobile || !address) {
            alert("❌ Please fill out your Full Name, Mobile Number, and Full Delivery Address!");
            return;
        }

        const paymentOption = document.querySelector('input[name="payment"]:checked');
        const paymentMethod = paymentOption ? paymentOption.value : "COD";

        // Calculate final payable amount (with coupon if applied)
        let finalPayable = totalAmount;
        if (totalBox && totalBox.hasAttribute("data-final-price")) {
            finalPayable = Number(totalBox.getAttribute("data-final-price")) || totalAmount;
        }

        orderBtn.disabled = true;
        orderBtn.innerText = "⌛ Placing Order...";

        try {
            const orderPayload = {
                orderId: "ORD-" + Math.floor(100000 + Math.random() * 900000),
                userId: uid,
                customerName: customerName,
                mobile: mobile,
                phone: mobile,
                address: address + (pincode ? `, Pincode: ${pincode}` : ""),
                items: cartItems,
                total: finalPayable,
                payment: paymentMethod,
                paymentMethod: paymentMethod,
                status: "🟡 Processing",
                orderedAt: serverTimestamp(),
                createdAt: serverTimestamp()
            };

            // 1. Write to User Subcollection
            await addDoc(collection(db, "users", uid, "orders"), orderPayload);

            // 2. Write to Top-Level Orders Collection (Syncs with Admin Panel)
            await addDoc(collection(db, "orders"), orderPayload);

            // 3. Update Product Stock and Sold Counters safely
            for (const item of cartItems) {
                const targetId = item.productId || item.cartDocId || item.id;
                if (!targetId) continue;

                const productRef = doc(db, "products", targetId);
                const productSnap = await getDoc(productRef);

                if (productSnap.exists()) {
                    const currentStock = Number(productSnap.data().stock || 0);
                    const newStock = Math.max(0, currentStock - item.quantity);

                    await updateDoc(productRef, {
                        stock: newStock,
                        sold: increment(item.quantity)
                    });
                }
            }

            // 4. Delete Items from User Cart
            const cartSnap = await getDocs(collection(db, "users", uid, "cart"));
            for (const itemDoc of cartSnap.docs) {
                await deleteDoc(doc(db, "users", uid, "cart", itemDoc.id));
            }

            // 5. Send Notification Alert
            await addDoc(collection(db, "users", uid, "notifications"), {
                title: "Order Placed 🎉",
                message: `Your order #${orderPayload.orderId} for ₹${finalPayable} has been placed successfully.`,
                time: "Just now",
                createdAt: serverTimestamp()
            });

            // 6. Display Success Modal & Redirect
            const successPopup = document.getElementById("success-popup");
            if (successPopup) {
                successPopup.style.display = "flex";
            } else {
                alert("🎉 Order Placed Successfully!");
            }

            setTimeout(() => {
                location.href = "orders.html";
            }, 2000);

        } catch (error) {
            console.error("Order placement error:", error);
            alert("❌ Order Placement Failed! Please check your network connection.");
            orderBtn.disabled = false;
            orderBtn.innerText = "🔒 Place Secure Order";
        }
    });
}