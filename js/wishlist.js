import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    doc,
    setDoc,
    collection,
    getDocs,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const box = document.getElementById("wishlist-box");
let currentUser = null;

// ==========================================
// 🔑 AUTH CHECK & INITIALIZATION
// ==========================================
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (box) {
        loadWishlist();
    }
});

// ==========================================
// ❤️ ADD ITEM TO WISHLIST
// ==========================================
window.addWishlist = async function (name, price, image) {
    // 1. Save to local storage
    let localWish = JSON.parse(localStorage.getItem('fw_user_wish_memory') || "[]");
    if (!localWish.some(item => item.name === name)) {
        localWish.push({ name, price: Number(price), image: image || "" });
        localStorage.setItem('fw_user_wish_memory', JSON.stringify(localWish));
    }

    // 2. If logged in, also sync to Firestore
    if (currentUser) {
        try {
            await setDoc(doc(db, "users", currentUser.uid, "wishlist", name), {
                name: name,
                price: Number(price),
                image: image || ""
            });
        } catch (error) {
            console.warn("Firestore wishlist sync skipped:", error.message);
        }
    }

    alert(`❤️ "${name}" Added to Wishlist!`);
    loadWishlist();
};

// ==========================================
// 📦 LOAD WISHLIST ITEMS ENGINE
// ==========================================
async function loadWishlist() {
    if (!box) return;

    box.innerHTML = `
        <div class="loading-state" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
            <div class="spinner"></div>
            <p style="color: #00e5ff; margin-top: 10px; font-weight: 700;">Loading Wishlist Collection...</p>
        </div>
    `;

    let items = [];

    // Try Firestore if logged in
    if (currentUser) {
        try {
            const snap = await getDocs(collection(db, "users", currentUser.uid, "wishlist"));
            if (!snap.empty) {
                snap.forEach(docSnap => {
                    items.push({ id: docSnap.id, ...docSnap.data() });
                });
            }
        } catch (error) {
            console.warn("Firestore wishlist load skipped, using local storage:", error.message);
        }
    }

    // Fallback to local storage
    if (items.length === 0) {
        items = JSON.parse(localStorage.getItem('fw_user_wish_memory') || "[]");
    }

    if (items.length === 0) {
        box.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px;">
                <div style="font-size: 48px; margin-bottom: 12px;">❤️</div>
                <h2 style="color: #ffffff; font-size: 22px; margin-bottom: 8px;">Your Wishlist Is Empty</h2>
                <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">Explore products and tap the heart icon to save favorite items here!</p>
                <button onclick="location.href='product.html'" class="primary-btn" style="padding: 12px 30px; border-radius: 20px; font-weight: 800;">
                    🚀 Browse Products
                </button>
            </div>
        `;
        return;
    }

    const wishlistMarkup = items.map((item, idx) => {
        const itemId = item.id || `wish_${idx}`;
        return `
            <div class="wishlist-card glassmorphism">
                <div class="product-image">
                    <img src="${item.image || 'images/no-image.png'}" alt="${item.name}" onerror="this.src='images/logo.png'">
                </div>

                <h3>${item.name}</h3>
                <p class="price" style="color: #ffcc00; font-family: 'Orbitron', monospace; font-size: 18px; font-weight: 900; margin: 6px 0;">₹${item.price}</p>

                <div class="card-actions" style="display: flex; gap: 8px; margin-top: 12px;">
                    <button class="btn-cart primary-btn" onclick="addWishlistCart('${item.name}', ${item.price}, '${item.image || ''}')" style="flex: 1; padding: 10px; font-size: 12px;">
                        🛒 Add To Cart
                    </button>
                    <button class="btn-remove" onclick="removeWishlist('${itemId}', ${idx})" style="padding: 10px 14px; background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #ef4444; border-radius: 10px; cursor: pointer; font-weight: 700;">
                        ❌
                    </button>
                </div>
            </div>
        `;
    }).join('');

    box.innerHTML = wishlistMarkup;
}

// ==========================================
// 🛒 MOVE WISHLIST ITEM TO CART
// ==========================================
window.addWishlistCart = function (name, price, image) {
    if (window.addToCart) {
        window.addToCart(name, name, price, image);
    } else {
        let currentCart = JSON.parse(localStorage.getItem('fw_user_cart_memory') || "[]");
        currentCart.push({ id: name, name, price: parseFloat(price), image, quantity: 1 });
        localStorage.setItem('fw_user_cart_memory', JSON.stringify(currentCart));
        alert(`🎉 Success! "${name}" added to cart.`);
    }
};

// ==========================================
// ❌ REMOVE ITEM FROM WISHLIST
// ==========================================
window.removeWishlist = async function (id, index) {
    // 1. Remove from local storage
    let localWish = JSON.parse(localStorage.getItem('fw_user_wish_memory') || "[]");
    if (index !== undefined && index >= 0 && index < localWish.length) {
        localWish.splice(index, 1);
    } else {
        localWish = localWish.filter(item => item.name !== id && item.id !== id);
    }
    localStorage.setItem('fw_user_wish_memory', JSON.stringify(localWish));

    // 2. Remove from Firestore if user logged in
    if (currentUser) {
        try {
            await deleteDoc(doc(db, "users", currentUser.uid, "wishlist", id));
        } catch (error) {
            console.warn("Firestore wishlist delete skipped:", error.message);
        }
    }

    loadWishlist();
};
