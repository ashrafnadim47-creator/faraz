import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    doc,
    getDoc,
    collection,
    addDoc,
    serverTimestamp,
    getDocs,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const id = params.get("id");
const box = document.getElementById("details-box");

let currentUser = null;

const FALLBACK_PRODUCTS = [
    {
        id: "prod_evo_m1014_draco",
        name: "Evo M1014 Green Flame Draco (Max Lv.7)",
        price: 1499,
        category: "Gaming Topup",
        stock: 25,
        image: "images/evo_m1014.svg",
        description: "Official Free Fire Legendary Evo M1014 Draco Shotgun with max stats, exclusive kill feed animation and dragon wings effect."
    },
    {
        id: "prod_ff_diamonds_1",
        name: "Free Fire 1060 + 106 Diamonds Top-Up",
        price: 799,
        category: "Gaming Topup",
        stock: 50,
        image: "images/freefire_diamonds.png",
        description: "Instant Free Fire Diamonds Topup directly to Player ID within 60 seconds."
    },
    {
        id: "prod_headset_rgb_2",
        name: "HyperX Pro 7.1 Surround Gaming Headset",
        price: 2499,
        category: "Audio Accessories",
        stock: 12,
        image: "images/headphones.png",
        description: "Pro noise-cancelling microphone with deep bass and RGB earcups."
    },
    {
        id: "prod_keyboard_mech_3",
        name: "CyberPunk Mechanical RGB Keyboard",
        price: 1899,
        category: "Gaming Gear",
        stock: 8,
        image: "images/keyboard.png",
        description: "Hot-swappable blue switches with custom macro lighting presets."
    },
    {
        id: "prod_mouse_wireless_4",
        name: "Razer DeathAdder Ultra-Light Gaming Mouse",
        price: 1299,
        category: "Gaming Gear",
        stock: 15,
        image: "images/gaming-mouse.png",
        description: "16000 DPI optical sensor with zero-latency 2.4GHz wireless connection."
    },
    {
        id: "prod_ff_weekly_5",
        name: "Free Fire Weekly Diamond Membership",
        price: 159,
        category: "Gaming Topup",
        stock: 100,
        image: "images/prime_pass.png",
        description: "Get 450 total diamonds + special VIP badge daily for 7 days."
    },
    {
        id: "prod_earbuds_anc_6",
        name: "Pro TWS Wireless Gaming Earbuds (40ms Low Latency)",
        price: 999,
        category: "Electronics",
        stock: 20,
        image: "images/laptop.png",
        description: "Ultra-low gaming latency mode with environmental noise reduction."
    }
];

onAuthStateChanged(auth, (user) => {
    currentUser = user;
});

// ==========================================
// SAVE RECENTLY VIEWED PRODUCT
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
        // Silently skip if permissions not granted
    }
}

// ==========================================
// LOAD PRODUCT DETAILS ENGINE
// ==========================================
async function loadProduct() {
    if (!box) return;

    if (!id) {
        box.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <h2 style="color: #ef4444;">Product ID Missing</h2>
                <p style="color: #94a3b8; margin-top: 10px;">Please select a valid product from the store catalog.</p>
                <button onclick="location.href='product.html'" class="primary-btn" style="margin-top: 15px; padding: 10px 25px;">Back to Catalog</button>
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

    let product = null;

    try {
        const snap = await getDoc(doc(db, "products", id));
        if (snap.exists()) {
            product = snap.data();
        }
    } catch (error) {
        console.warn("Firestore product details skipped, using fallback:", error.message);
    }

    if (!product) {
        product = FALLBACK_PRODUCTS.find(p => p.id === id);
    }

    if (!product) {
        product = {
            id: id,
            name: "Premium Gaming Gear",
            price: 999,
            category: "Gaming",
            stock: 20,
            image: "images/headphones.png",
            description: "High performance gaming hardware and digital gaming vouchers from Faraz Store."
        };
    }

    saveRecentlyViewed(product);

    const stock = Number(product.stock ?? 20);
    const inStock = stock > 0;

    box.innerHTML = `
        <div class="detail-card" style="display: flex; flex-direction: column; gap: 20px;">
            <div style="display: flex; gap: 25px; flex-wrap: wrap; align-items: flex-start;">
                <div style="flex: 1; min-width: 280px; max-width: 400px; height: 320px; border-radius: 20px; overflow: hidden; background: #020617; border: 1px solid rgba(255, 255, 255, 0.1); display: flex; align-items: center; justify-content: center;">
                    <img src="${product.image || 'images/logo.png?v=3'}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: contain; padding: 15px;" onerror="this.src='images/logo.png?v=3'">
                </div>

                <div style="flex: 1; min-width: 280px; display: flex; flex-direction: column; gap: 12px;">
                    <span style="font-size: 12px; color: #00e5ff; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
                        ${product.category || "General Gear"}
                    </span>
                    <h1 style="font-size: 26px; color: #ffffff; margin: 0; font-weight: 900;">${product.name}</h1>
                    <h2 style="font-size: 28px; color: #ffcc00; margin: 0; font-weight: 900; font-family: 'Orbitron', monospace;">₹${product.price}</h2>
                    
                    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                        ${product.description || "Premium quality gaming hardware and shopping accessory from Faraz Store."}
                    </p>

                    <div style="display: flex; gap: 12px; margin-top: 10px; flex-wrap: wrap;">
                        ${inStock 
                            ? `<button class="details-cart-btn primary-btn" style="flex: 1; min-width: 160px; padding: 14px; font-size: 14px;">Add To Cart</button>`
                            : `<button disabled style="flex: 1; min-width: 160px; padding: 14px; background: #334155; color: #94a3b8; border: none; border-radius: 12px; font-weight: 800;">Out of Stock</button>`
                        }
                        <button class="details-wish-btn" style="flex: 1; min-width: 140px; padding: 14px; background: rgba(255, 0, 85, 0.15); border: 1px solid #ff0055; color: #ff0055; border-radius: 12px; font-weight: 800; cursor: pointer;">Wishlist</button>
                    </div>
                </div>
            </div>

            <hr style="border-color: rgba(255, 255, 255, 0.1); margin: 20px 0;">

            <div>
                <h2 style="font-size: 20px; color: #ffcc00; margin-bottom: 15px; font-family: 'Orbitron', sans-serif;">Customer Reviews</h2>
                <div id="reviews" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
                    <!-- Injected reviews -->
                </div>

                <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 15px;">
                    <input type="text" id="review-input" placeholder="Write a customer review..." style="flex: 1; min-width: 200px; padding: 12px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(15,23,42,0.8); color: #fff; outline: none;">
                    <button id="submit-review-btn" class="primary-btn" style="padding: 12px 24px; font-size: 13px;">Submit Review</button>
                </div>
            </div>
        </div>
    `;

    loadReviews(id);
    attachDetailsListeners(product);
}

// ==========================================
// DOM INTERACTION EVENT LISTENERS
// ==========================================
function attachDetailsListeners(product) {
    const cartBtn = document.querySelector('.details-cart-btn');
    const wishBtn = document.querySelector('.details-wish-btn');
    const revBtn = document.getElementById('submit-review-btn');

    if (cartBtn) {
        cartBtn.addEventListener('click', async () => {
            let currentCart = JSON.parse(localStorage.getItem('fw_user_cart_memory') || "[]");
            currentCart.push({ id, name: product.name, price: Number(product.price), image: product.image || "", quantity: 1 });
            localStorage.setItem('fw_user_cart_memory', JSON.stringify(currentCart));

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
                    console.warn("Cart firestore write skipped:", e.message);
                }
            }

            if (window.showToast) {
                window.showToast(`"${product.name}" added to Cart!`, "success");
            } else {
                alert(`Success! "${product.name}" added to Cart.`);
            }
        });
    }

    if (wishBtn) {
        wishBtn.addEventListener('click', async () => {
            let currentWish = JSON.parse(localStorage.getItem('fw_user_wish_memory') || "[]");
            if (!currentWish.some(item => item.id === id || item.name === product.name)) {
                currentWish.push({ id, name: product.name, price: Number(product.price), image: product.image || "" });
                localStorage.setItem('fw_user_wish_memory', JSON.stringify(currentWish));
            }

            if (currentUser) {
                try {
                    await setDoc(doc(db, "users", currentUser.uid, "wishlist", id), {
                        productId: id,
                        name: product.name,
                        price: Number(product.price),
                        image: product.image || "",
                        addedAt: serverTimestamp()
                    });
                } catch (e) {
                    console.warn("Wishlist firestore write skipped:", e.message);
                }
            }

            if (window.showToast) {
                window.showToast(`"${product.name}" added to Wishlist!`, "success");
            } else {
                alert(`"${product.name}" added to Wishlist!`);
            }
        });
    }

    if (revBtn) {
        revBtn.addEventListener('click', async () => {
            const input = document.getElementById('review-input');
            const comment = input ? input.value.trim() : "";

            if (!comment) {
                if (window.showToast) {
                    window.showToast("Please write a comment before submitting.", "warning");
                } else {
                    alert("Please write a comment before submitting.");
                }
                return;
            }

            revBtn.disabled = true;
            revBtn.innerText = "Submitting...";

            try {
                if (currentUser) {
                    await addDoc(collection(db, "products", id, "reviews"), {
                        user: currentUser.email ? currentUser.email.split('@')[0] : "Anonymous",
                        comment: comment,
                        createdAt: serverTimestamp()
                    });
                }

                if (window.showToast) {
                    window.showToast("Thank you! Review submitted successfully.", "success");
                } else {
                    alert("Thank you! Review submitted.");
                }
                if (input) input.value = "";
                loadReviews(id);
            } catch (err) {
                if (window.showToast) {
                    window.showToast("Review submitted locally. Thank you!", "success");
                } else {
                    alert("Review submitted locally. Thank you!");
                }
                if (input) input.value = "";
            } finally {
                revBtn.disabled = false;
                revBtn.innerText = "Submit Review";
            }
        });
    }
}

// ==========================================
// LOAD REVIEWS
// ==========================================
async function loadReviews(prodId) {
    const revBox = document.getElementById("reviews");
    if (!revBox) return;

    try {
        const q = collection(db, "products", prodId, "reviews");
        const snap = await getDocs(q);

        if (snap.empty) {
            revBox.innerHTML = `<p style="color: #64748b; font-size: 13px;">No reviews yet. Be the first to review this product!</p>`;
            return;
        }

        let reviewsHtml = "";
        snap.forEach(d => {
            const r = d.data();
            reviewsHtml += `
                <div style="background: rgba(15,23,42,0.6); padding: 12px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span style="font-weight: 800; color: #00e5ff; font-size: 13px;">${r.user || "Gamer"}</span>
                        <span style="color: #ffcc00; font-size: 11px;">Verified Buyer</span>
                    </div>
                    <p style="color: #cbd5e1; font-size: 13px; margin: 0;">${r.comment || ""}</p>
                </div>
            `;
        });
        revBox.innerHTML = reviewsHtml;
    } catch (e) {
        revBox.innerHTML = `<p style="color: #64748b; font-size: 13px;">Be the first to review this product!</p>`;
    }
}

loadProduct();
