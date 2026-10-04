import { auth, db } from "./firebase-config.js";
import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    collection,
    getDocs,
    deleteDoc,
    doc,
    setDoc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const container = document.getElementById("cart-container");
const totalDisplay = document.getElementById("total-price");

let uid = "";
let finalTotal = 0;

// ==========================
// 🔑 AUTHENTICATION CHECK
// ==========================
onAuthStateChanged(auth, (user) => {
    if (!user) {
        location.href = "login.html";
        return;
    }
    uid = user.uid;
    loadCart();
});

// ==========================
// 🛒 ADD TO CART BACKEND API
// ==========================
window.addToCart = async function (productId, name, price, image) {
    if (!uid) {
        location.href = "login.html";
        return;
    }

    try {
        const cartRef = doc(db, "users", uid, "cart", productId);
        const oldDoc = await getDoc(cartRef);

        if (oldDoc.exists()) {
            await updateDoc(cartRef, {
                quantity: (oldDoc.data().quantity || 1) + 1
            });
        } else {
            await setDoc(cartRef, {
                productId: productId,
                name: name,
                price: Number(price),
                image: image || "",
                quantity: 1
            });
        }

        alert(`🎉 Success! "${name}" added to cart.`);
        loadCart();
    } catch (error) {
        console.error("Add to cart error:", error);
        alert("❌ Failed to add product to cart.");
    }
};

// ==========================
// 📦 LOAD CART ENGINE
// ==========================
async function loadCart() {
    if (!container) return;

    container.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Syncing Shopping Cart...</p>
        </div>
    `;

    try {
        const snapshot = await getDocs(collection(db, "users", uid, "cart"));

        if (snapshot.empty) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px;">
                    <h2 style="color: var(--muted); font-size: 20px; margin-bottom: 10px;">Your Cart Is Empty 🛒</h2>
                    <p style="color: #64748b; font-size: 14px;">Explore our store and add items to your cart!</p>
                </div>
            `;
            if (totalDisplay) totalDisplay.innerHTML = "Total : ₹0";
            return;
        }

        let sum = 0;

        // Fast Single-Pass HTML Construction
        const itemsMarkup = snapshot.docs.map((itemDoc) => {
            const item = itemDoc.data();
            const itemTotal = (item.price || 0) * (item.quantity || 1);
            sum += itemTotal;

            return `
                <div class="cart-item glassmorphism" style="padding: 16px; border-radius: 16px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; gap: 15px;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div class="product-image" style="width: 70px; height: 70px; border-radius: 12px; overflow: hidden; background: #020617; border: 1px solid rgba(255,255,255,0.1);">
                            <img src="${item.image || 'images/no-image.png'}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                        <div>
                            <h3 style="font-size: 16px; color: #ffffff; margin-bottom: 4px;">${item.name}</h3>
                            <p style="color: #00e5ff; font-weight: 800; font-size: 15px; margin: 0;">₹${item.price} <span style="font-size: 12px; color: #94a3b8; font-weight: normal;">(x${item.quantity})</span></p>
                        </div>
                    </div>
                    <button class="remove remove-cart-item-btn" data-id="${itemDoc.id}" style="background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #ef4444; padding: 8px 14px; border-radius: 10px; font-weight: 700; cursor: pointer; transition: all 0.2s;">
                        ❌ Remove
                    </button>
                </div>
            `;
        }).join('');

        container.innerHTML = itemsMarkup;

        finalTotal = sum;
        if (totalDisplay) {
            totalDisplay.innerHTML = `<b>Final Total : ₹${finalTotal}</b>`;
        }

        // Attach safe click listeners for removal
        attachRemoveItemListeners();

    } catch (error) {
        console.error("Load cart error:", error);
        container.innerHTML = `<h3 style="text-align: center; color: var(--danger);">❌ Failed to load cart items.</h3>`;
    }
}

// ==========================
// ❌ REMOVE ITEM LISTENERS
// ==========================
function attachRemoveItemListeners() {
    document.querySelectorAll('.remove-cart-item-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const button = e.target.closest('.remove-cart-item-btn');
            if (button) {
                const itemId = button.getAttribute('data-id');
                if (itemId) {
                    executeItemRemoval(itemId);
                }
            }
        });
    });
}

async function executeItemRemoval(id) {
    try {
        await deleteDoc(doc(db, "users", uid, "cart", id));
        loadCart();
    } catch (error) {
        console.error("Item removal error:", error);
        alert("❌ Failed to remove item from cart.");
    }
}