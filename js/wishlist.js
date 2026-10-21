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
// AUTH CHECK & INITIALIZATION
// ==========================================
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (box) {
        loadWishlist();
    }
});

// ==========================================
// ADD ITEM TO WISHLIST
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

    if (window.showToast) {
        window.showToast(`"${name}" saved to Wishlist!`, "info");
    }
    loadWishlist();
};

// ==========================================
// LOAD WISHLIST ITEMS ENGINE
// ==========================================
async function loadWishlist() {
    if (!box) return;

    box.innerHTML = `
        <div class="loading-state" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
            <div class="spinner"></div>
            <p style="color: #00e5ff; margin-top: 10px; font-weight: 700;">Loading Wishlist Collection...</p>
        </div>
    `;

    const wishMap = new Map();

    // 1. Try Firestore if logged in
    if (currentUser) {
        try {
            const snap = await getDocs(collection(db, "users", currentUser.uid, "wishlist"));
            if (!snap.empty) {
                snap.forEach(docSnap => {
                    const data = docSnap.data();
                    const key = String(data.name || docSnap.id).trim();
                    wishMap.set(key, { id: docSnap.id, ...data });
                });
            }
        } catch (error) {
            console.warn("Firestore wishlist load skipped, using local storage:", error.message);
        }
    }

    // 2. Fallback to local storage if empty
    if (wishMap.size === 0) {
        try {
            const localWish = JSON.parse(localStorage.getItem('fw_user_wish_memory') || "[]");
            localWish.forEach((item, idx) => {
                const key = String(item.name || `wish_${idx}`).trim();
                if (!wishMap.has(key)) {
                    wishMap.set(key, { id: key, ...item });
                }
            });
        } catch (e) {}
    }

    const items = Array.from(wishMap.values());

    if (items.length === 0) {
        box.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px;">
                <div style="color: #ff0055; margin-bottom: 12px;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                </div>
                <h2 style="color: #ffffff; font-size: 22px; margin-bottom: 8px;">Your Wishlist Is Empty</h2>
                <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">Explore products and save favorite items here!</p>
                <button onclick="location.href='product.html'" class="primary-btn" style="padding: 12px 30px; border-radius: 20px; font-weight: 800;">
                    Browse Products
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
                    <img src="${item.image || 'images/logo.png?v=3'}" alt="${item.name}" onerror="this.src='images/logo.png?v=3'">
                </div>

                <h3>${item.name}</h3>
                <p class="price" style="color: #ffcc00; font-family: 'Orbitron', monospace; font-size: 18px; font-weight: 900; margin: 6px 0;">₹${item.price}</p>

                <div class="card-actions" style="display: flex; gap: 8px; margin-top: 12px;">
                    <button class="btn-cart primary-btn" onclick="addWishlistCart('${item.name}', ${item.price}, '${item.image || ''}')" style="flex: 1; padding: 10px; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                        Add To Cart
                    </button>
                    <button class="btn-remove" onclick="removeWishlist('${itemId}', ${idx})" style="padding: 10px 14px; background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #ef4444; border-radius: 10px; cursor: pointer; font-weight: 700; display: inline-flex; align-items: center; justify-content: center;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    box.innerHTML = wishlistMarkup;
}

// ==========================================
// MOVE WISHLIST ITEM TO CART
// ==========================================
window.addWishlistCart = function (name, price, image) {
    if (window.addToCart) {
        window.addToCart(name, name, price, image);
    } else {
        let currentCart = JSON.parse(localStorage.getItem('fw_user_cart_memory') || "[]");
        currentCart.push({ id: name, name, price: parseFloat(price), image, quantity: 1 });
        localStorage.setItem('fw_user_cart_memory', JSON.stringify(currentCart));
        if (window.showToast) {
            window.showToast(`"${name}" added to cart!`, "success");
        }
    }
};

// ==========================================
// REMOVE ITEM FROM WISHLIST
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

    if (window.showToast) {
        window.showToast("Item removed from Wishlist", "info");
    }

    loadWishlist();
};
