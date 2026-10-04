import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    doc,
    getDoc,
    collection,
    addDoc,
    setDoc,
    getDocs,
    serverTimestamp,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const box = document.getElementById("details-box");
const id = new URLSearchParams(location.search).get("id");

let currentUser = null;

onAuthStateChanged(auth, (user) => {
    currentUser = user;
});

// ==========================================
// 👁️ SAVE RECENTLY VIEWED PRODUCT
// ==========================================
async function saveRecentlyViewed(product) {
    if (!currentUser || !id) return;
    try {
        await addDoc(collection(db, "users", currentUser.uid, "recentlyViewed"), {
            productId: id,
            name: product.name,
            price: Number(product.price),
            image: product.image || "",
            viewedAt: serverTimestamp()
        });
    } catch (e) {
        console.error("Error saving recently viewed item:", e);
    }
}

// ==========================================
// 🛍️ LOAD PRODUCT DETAILS ENGINE
// ==========================================
async function loadProduct() {
    if (!box) return;

    if (!id) {
        box.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <h2 style="color: #ef4444;">❌ Product ID Missing</h2>
                <p style="color: #94a3b8; margin-top: 10px;">Please select a valid product from the store catalog.</p>
            </div>
        `;
        return;
    }

    box.innerHTML = `
        <div class="loading-state" style="text-align: center; padding: 40px;">
            <div class="spinner"></div>
            <p style="color: #00e5ff; margin-top: 10px; font-weight: 700;">Loading Product Specs...</p>
        </div>
    `;

    try {
        const snap = await getDoc(doc(db, "products", id));

        if (!snap.exists()) {
            box.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <h2 style="color: #ef4444;">❌ Product Not Found</h2>
                    <p style="color: #94a3b8; margin-top: 10px;">The requested product is no longer available.</p>
                </div>
            `;
            return;
        }

        const product = snap.data();
        saveRecentlyViewed(product);

        const stock = Number(product.stock ?? 0);
        const inStock = stock > 0;

        box.innerHTML = `
            <div class="detail-card" style="display: flex; flex-direction: column; gap: 20px;">
                <div style="display: flex; gap: 25px; flex-wrap: wrap; align-items: flex-start;">
                    <div style="flex: 1; min-width: 280px; max-width: 400px; height: 320px; border-radius: 20px; overflow: hidden; background: #020617; border: 1px solid rgba(255, 255, 255, 0.1); display: flex; align-items: center; justify-content: center;">
                        <img src="${product.image || 'images/no-image.png'}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>

                    <div style="flex: 1; min-width: 280px; display: flex; flex-direction: column; gap: 12px;">
                        <span style="font-size: 12px; color: #00e5ff; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
                            ${product.category || "General Gear"}
                        </span>
                        <h1 style="font-size: 26px; color: #ffffff; margin: 0; font-weight: 900;">${product.name}</h1>
                        <h2 style="font-size: 28px; color: #ffcc00; margin: 0; font-weight: 900;">₹${product.price}</h2>
                        
                        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                            ${product.description || "Premium quality gaming hardware and shopping accessory from Faraz Store."}
                        </p>

                        <div style="display: flex; gap: 12px; margin-top: 10px; flex-wrap: wrap;">
                            ${inStock 
                                ? `<button class="details-cart-btn primary-btn" style="flex: 1; min-width: 160px; padding: 14px; font-size: 14px;">🛒 Add To Cart</button>`
                                : `<button disabled style="flex: 1; min-width: 160px; padding: 14px; background: #334155; color: #94a3b8; border: none; border-radius: 12px; font-weight: 800;">❌ Out of Stock</button>`
                            }
                            <button class="details-wish-btn" style="flex: 1; min-width: 140px; padding: 14px; background: rgba(255, 0, 85, 0.15); border: 1px solid #ff0055; color: #ff0055; border-radius: 12px; font-weight: 800; cursor: pointer;">❤️ Wishlist</button>
                        </div>
                    </div>
                </div>

                <hr style="border-color: rgba(255, 255, 255, 0.1); margin: 20px 0;">

                <div>
                    <h2 style="font-size: 20px; color: #ffcc00; margin-bottom: 15px;">⭐ Customer Reviews</h2>
                    <div id="reviews" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
                        <p style="color: #94a3b8; font-size: 13px;">Loading Reviews...</p>
                    </div>

                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <input id="review-text" type="text" placeholder="Write your product review here..." style="flex: 1; min-width: 240px; padding: 12px 16px; border-radius: 12px; border: 1px solid #334155; background: #020617; color: #fff; outline: none;">
                        <button id="submit-review-btn" class="primary-btn" style="padding: 12px 24px; border-radius: 12px;">Submit Review</button>
                    </div>
                </div>
            </div>
        `;

        loadReviews(id);
        attachDetailsListeners(product);

    } catch (error) {
        console.error("Error loading product details:", error);
        box.innerHTML = `<h2 style="color: #ef4444; text-align: center;">❌ Error Loading Product</h2>`;
    }
}

// ==========================================
// ⚡ DOM INTERACTION EVENT LISTENERS
// ==========================================
function attachDetailsListeners(product) {
    const cartBtn = document.querySelector('.details-cart-btn');
    const wishBtn = document.querySelector('.details-wish-btn');
    const revBtn = document.getElementById('submit-review-btn');

    if (cartBtn) {
        cartBtn.addEventListener('click', async () => {
            if (currentUser) {
                try {
                    await setDoc(doc(db, "users", currentUser.uid, "cart", id), {
                        productId: id,
                        name: product.name,
                        price: Number(product.price),
                        image: product.image || "",
                        quantity: 1
                    });
                } catch (e) {
                    console.error("Cart firestore write fallback:", e);
                }
            }

            let currentCart = JSON.parse(localStorage.getItem('fw_user_cart_memory') || "[]");
            currentCart.push({ id, name: product.name, price: parseFloat(product.price), image: product.image });
            localStorage.setItem('fw_user_cart_memory', JSON.stringify(currentCart));

            alert(`🎉 Success! "${product.name}" added to cart.`);
        });
    }

    if (wishBtn) {
        wishBtn.addEventListener('click', async () => {
            if (currentUser) {
                try {
                    await setDoc(doc(db, "users", currentUser.uid, "wishlist", product.name), {
                        name: product.name,
                        price: Number(product.price),
                        image: product.image || ""
                    });
                } catch (e) {
                    console.error("Wishlist firestore write fallback:", e);
                }
            }

            let currentWish = JSON.parse(localStorage.getItem('fw_user_wish_memory') || "[]");
            currentWish.push({ name: product.name, price: parseFloat(product.price), image: product.image });
            localStorage.setItem('fw_user_wish_memory', JSON.stringify(currentWish));

            alert(`❤️ "${product.name}" added to Wishlist!`);
        });
    }

    if (revBtn) {
        revBtn.addEventListener('click', () => {
            addReview(id);
        });
    }
}

// ==========================================
// ⭐ REVIEWS SYSTEM MODULE
// ==========================================
async function addReview(productID) {
    const reviewInput = document.getElementById("review-text");
    if (!reviewInput) return;
    const text = reviewInput.value.trim();

    if (!text) {
        alert("Please enter a review message first!");
        return;
    }

    try {
        await addDoc(collection(db, "products", productID, "reviews"), {
            text: text,
            rating: 5,
            createdAt: serverTimestamp()
        });
        alert("⭐ Review Submitted Successfully!");
        reviewInput.value = "";
        loadReviews(productID);
    } catch (err) {
        console.error("Error submitting review:", err);
        alert("❌ Failed to post review.");
    }
}

async function loadReviews(productID) {
    const reviewBox = document.getElementById("reviews");
    if (!reviewBox) return;

    try {
        const q = query(collection(db, "products", productID, "reviews"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        reviewBox.innerHTML = "";

        if (snap.empty) {
            reviewBox.innerHTML = `<p style="color: #94a3b8; font-size: 13px;">No reviews yet. Be the first to review this product!</p>`;
            return;
        }

        reviewBox.innerHTML = snap.docs.map(docSnap => {
            const data = docSnap.data();
            return `
                <div class="review glassmorphism" style="padding: 12px 16px; border-radius: 12px; background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255, 255, 255, 0.05);">
                    <div style="color: #ffcc00; font-size: 13px; margin-bottom: 4px;">⭐⭐⭐⭐⭐</div>
                    <p style="color: #e2e8f0; font-size: 13px; margin: 0;">${data.text}</p>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error("Error loading reviews:", err);
        reviewBox.innerHTML = `<p style="color: #ef4444; font-size: 13px;">Failed to load reviews.</p>`;
    }
}

loadProduct();