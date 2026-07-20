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
    if (box && user) {
        loadWishlist();
    } else if (box && !user) {
        box.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <h3 style="color: #94a3b8; margin-bottom: 15px;">Please login to view your wishlist ❤️</h3>
                <button onclick="location.href='login.html'" class="primary-btn" style="padding: 10px 25px; border-radius: 20px;">Sign In Now</button>
            </div>
        `;
    }
});

// ==========================================
// ❤️ ADD ITEM TO WISHLIST
// ==========================================
window.addWishlist = async function (name, price, image) {
    if (!currentUser) {
        location.href = "login.html";
        return;
    }

    try {
        await setDoc(doc(db, "users", currentUser.uid, "wishlist", name), {
            name: name,
            price: Number(price),
            image: image || ""
        });

        alert("❤️ Item Added to Wishlist!");
    } catch (error) {
        console.error("Add wishlist error:", error);
        alert("❌ Failed to add item to wishlist.");
    }
};

// ==========================================
// 📦 LOAD WISHLIST ITEMS ENGINE
// ==========================================
async function loadWishlist() {
    if (!box || !currentUser) return;

    box.innerHTML = `
        <div class="loading-state" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
            <div class="spinner"></div>
            <p style="color: #00e5ff; margin-top: 10px; font-weight: 700;">Loading Wishlist Collection...</p>
        </div>
    `;

    try {
        const snap = await getDocs(collection(db, "users", currentUser.uid, "wishlist"));

        if (snap.empty) {
            box.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px;">
                    <h2 style="color: #94a3b8; font-size: 20px; margin-bottom: 10px;">Your Wishlist Is Empty ❤️</h2>
                    <p style="color: #64748b; font-size: 14px; margin-bottom: 20px;">Explore products and tap the heart icon to save items here!</p>
                    <button onclick="location.href='products.html'" class="primary-btn" style="padding: 12px 28px; border-radius: 25px;">Browse Products</button>
                </div>
            `;
            return;
        }

        // Single-Pass High-Performance HTML Construction
        const wishlistMarkup = snap.docs.map((item) => {
            const product = item.data();
            const itemId = item.id;

            return `
                <div class="wishlist-card">
                    <div class="product-image">
                        <img src="${product.image || 'images/no-image.png'}" alt="${product.name}">
                    </div>

                    <h3>${product.name}</h3>
                    <p>₹${product.price}</p>

                    <div class="card-actions">
                        <button class="btn-cart" onclick="addWishlistCart('${product.name}', ${product.price}, '${product.image}')">
                            🛒 Add To Cart
                        </button>
                        <button class="btn-remove" onclick="removeWishlist('${itemId}')">
                            ❌ Remove
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        box.innerHTML = wishlistMarkup;

    } catch (error) {
        console.error("Load wishlist error:", error);
        box.innerHTML = `<h3 style="grid-column: 1 / -1; text-align: center; color: var(--danger);">❌ Failed to load wishlist items.</h3>`;
    }
}

// ==========================================
// 🛒 MOVE WISHLIST ITEM TO CART
// ==========================================
window.addWishlistCart = async function (name, price, image) {
    if (!currentUser) {
        location.href = "login.html";
        return;
    }

    try {
        await setDoc(doc(db, "users", currentUser.uid, "cart", name), {
            name: name,
            price: Number(price),
            image: image || "",
            quantity: 1
        });

        alert("🛒 Item Added to Cart!");
    } catch (error) {
        console.error("Move to cart error:", error);
        alert("❌ Failed to add item to cart.");
    }
};

// ==========================================
// ❌ REMOVE ITEM FROM WISHLIST
// ==========================================
window.removeWishlist = async function (id) {
    if (!currentUser) return;

    try {
        await deleteDoc(doc(db, "users", currentUser.uid, "wishlist", id));
        loadWishlist();
    } catch (error) {
        console.error("Remove wishlist error:", error);
        alert("❌ Failed to remove item.");
    }
};