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
    if (user) {
        uid = user.uid;
    }
    loadCart();
});

// ==========================
// 🛒 ADD TO CART API (HYBRID FIRESTORE + LOCAL STORAGE)
// ==========================
window.addToCart = async function (productId, name, price, image) {
    // 1. Always update local storage first
    let localCart = JSON.parse(localStorage.getItem('fw_user_cart_memory') || "[]");
    const existingIdx = localCart.findIndex(i => i.id === productId || i.name === name);
    if (existingIdx >= 0) {
        localCart[existingIdx].quantity = (localCart[existingIdx].quantity || 1) + 1;
    } else {
        localCart.push({ id: productId, name, price: Number(price), image: image || "", quantity: 1 });
    }
    localStorage.setItem('fw_user_cart_memory', JSON.stringify(localCart));

    // 2. If logged in, also try syncing to Firestore
    if (uid) {
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
        } catch (error) {
            console.warn("Firestore sync skipped:", error.message);
        }
    }

    alert(`🎉 Success! "${name}" added to cart.`);
    loadCart();
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

    let items = [];

    // Try Firestore first if user is logged in
    if (uid) {
        try {
            const snapshot = await getDocs(collection(db, "users", uid, "cart"));
            if (!snapshot.empty) {
                snapshot.forEach(docSnap => {
                    items.push({ id: docSnap.id, ...docSnap.data() });
                });
            }
        } catch (error) {
            console.warn("Firestore cart load skipped, loading local cart:", error.message);
        }
    }

    // If Firestore empty or not logged in, load from local storage
    if (items.length === 0) {
        items = JSON.parse(localStorage.getItem('fw_user_cart_memory') || "[]");
    }

    if (items.length === 0) {
        container.innerHTML = `
            <div class="cart-empty-box">
                <span class="cart-empty-icon">🛒</span>
                <h2 style="color: #ffffff; font-size: 22px; margin-bottom: 8px;">Your Cart Is Empty</h2>
                <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">Explore our store and add gaming accessories or topups to your cart!</p>
                <button onclick="location.href='product.html'" class="checkout-btn" style="padding: 12px 30px; font-size: 14px;">
                    🚀 Browse Store Products
                </button>
            </div>
        `;
        if (totalDisplay) totalDisplay.innerHTML = "Total : ₹0";
        return;
    }

    let sum = 0;

    const itemsMarkup = items.map((item, idx) => {
        const itemTotal = (item.price || 0) * (item.quantity || 1);
        sum += itemTotal;
        const itemId = item.id || `item_${idx}`;

        return `
            <div class="cart-item glassmorphism">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div class="product-image">
                        <img src="${item.image || 'images/no-image.png'}" alt="${item.name}" onerror="this.src='images/logo.png'">
                    </div>
                    <div>
                        <h3>${item.name}</h3>
                        <p>₹${item.price} <span>(x${item.quantity || 1})</span></p>
                    </div>
                </div>
                <button class="remove remove-cart-item-btn" data-id="${itemId}" data-index="${idx}">
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

    attachRemoveItemListeners();
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
                const index = parseInt(button.getAttribute('data-index'), 10);
                executeItemRemoval(itemId, index);
            }
        });
    });
}

async function executeItemRemoval(id, index) {
    // 1. Remove from local storage
    let localCart = JSON.parse(localStorage.getItem('fw_user_cart_memory') || "[]");
    if (!isNaN(index) && index >= 0 && index < localCart.length) {
        localCart.splice(index, 1);
    } else {
        localCart = localCart.filter(i => i.id !== id);
    }
    localStorage.setItem('fw_user_cart_memory', JSON.stringify(localCart));

    // 2. Remove from Firestore if user logged in
    if (uid && id) {
        try {
            await deleteDoc(doc(db, "users", uid, "cart", id));
        } catch (error) {
            console.warn("Firestore delete skipped:", error.message);
        }
    }

    loadCart();
}
