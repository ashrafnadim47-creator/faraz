import { db } from "./firebase-config.js";
import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const container = document.getElementById("product-container");
let allProducts = [];

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
        id: "prod_ff_weekly_5",
        name: "Free Fire Weekly Diamond Membership",
        price: 159,
        category: "Gaming Topup",
        stock: 100,
        image: "images/prime_pass.png",
        description: "Get 450 total diamonds + special VIP badge daily for 7 days."
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
        id: "prod_gloowall_legend",
        name: "Legendary Cybernetic Gloo Wall Skin",
        price: 499,
        category: "Gaming Topup",
        stock: 30,
        image: "images/gloowall.png",
        description: "Exclusive futuristic cyber barrier Gloo Wall skin for Free Fire Battle Royale."
    },
    {
        id: "prod_laptop_rtx",
        name: "ASUS ROG Strix RTX 4070 Gaming Laptop",
        price: 89999,
        category: "Gaming Gear",
        stock: 5,
        image: "images/laptop.png",
        description: "High-performance gaming machine with Intel Core i9, 32GB DDR5 RAM, and RTX 4070 GPU."
    }
];

// ==========================================
// 📦 FETCH ALL PRODUCTS FROM FIRESTORE
// ==========================================
async function loadProducts() {
    if (!container) return;

    container.innerHTML = `
        <div class="loading-state" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
            <div class="spinner"></div>
            <p style="color: #00e5ff; margin-top: 10px; font-weight: 700;">Loading Products Catalog...</p>
        </div>
    `;

    try {
        const q = query(
            collection(db, "products"),
            orderBy("createdAt", "desc")
        );

        const snap = await getDocs(q);
        allProducts = [];

        snap.forEach((docSnap) => {
            allProducts.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });

        if (allProducts.length === 0) {
            allProducts = FALLBACK_PRODUCTS;
        }

        displayProducts(allProducts);

    } catch (error) {
        console.warn("Firestore products load fallback active:", error.message);
        allProducts = FALLBACK_PRODUCTS;
        displayProducts(allProducts);
    }
}

// ==========================================
// 🎨 RENDER PRODUCTS GRID CARDS
// ==========================================
function displayProducts(products) {
    if (!container) return;
    container.innerHTML = "";

    if (products.length === 0) {
        container.innerHTML = `<h3 style="grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 40px;">No Products Found</h3>`;
        return;
    }

    const cardsMarkup = products.map((product) => {
        const stock = Number(product.stock ?? 0);
        let stockText = "";
        let stockClass = "";

        if (stock <= 0) {
            stockText = "Out of Stock";
            stockClass = "out-stock";
        } else if (stock <= 5) {
            stockText = `Low Stock (${stock} Left)`;
            stockClass = "low-stock";
        } else {
            stockText = `In Stock (${stock})`;
            stockClass = "in-stock";
        }

        return `
            <div class="product-card glassmorphism">
                <div class="product-img">
                    <img src="${product.image || 'images/logo.png?v=3'}" alt="${product.name}" loading="lazy" onerror="this.src='images/logo.png?v=3'">
                </div>
                <h3>${product.name}</h3>
                <p class="price">₹${product.price}</p>
                <p style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">${product.category || "General Gear"}</p>
                <p class="${stockClass}" style="font-size: 12px; font-weight: 800; margin: 4px 0 12px 0;">${stockText}</p>
                
                <div class="product-buttons">
                    <button class="view-details-btn primary-btn" data-id="${product.id}">View Details</button>
                    ${stock > 0 
                        ? `<button class="add-cart-btn primary-btn" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}" data-image="${product.image || ''}">Add To Cart</button>`
                        : `<button disabled style="background: #334155; color: #94a3b8; cursor: not-allowed;">Out of Stock</button>`
                    }
                    <button class="add-wishlist-btn" data-name="${product.name}" data-price="${product.price}" data-image="${product.image || ''}" style="background: rgba(255, 0, 85, 0.15); border: 1px solid #ff0055; color: #ff0055; border-radius: 10px; font-weight: 800; cursor: pointer; padding: 8px;">Wishlist</button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = cardsMarkup;
    attachDynamicListeners();
}

// ==========================================
// ⚡ ATTACH EVENT LISTENERS
// ==========================================
function attachDynamicListeners() {
    // 1. View Details Button
    document.querySelectorAll('.view-details-btn').forEach((button) => {
        button.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            location.href = `product-details.html?id=${id}`;
        });
    });

    // 2. Add To Cart Button
    document.querySelectorAll('.add-cart-btn').forEach((button) => {
        button.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const name = e.target.getAttribute('data-name');
            const price = e.target.getAttribute('data-price');
            const image = e.target.getAttribute('data-image');

            if (typeof window.addToCart === 'function') {
                window.addToCart(id, name, price, image);
            } else {
                let cart = JSON.parse(localStorage.getItem('fw_user_cart_memory') || "[]");
                const existing = cart.find(i => i.id === id);
                if (existing) {
                    existing.quantity += 1;
                } else {
                    cart.push({ id, name, price: Number(price), image, quantity: 1 });
                }
                localStorage.setItem('fw_user_cart_memory', JSON.stringify(cart));
            }
            if (window.showToast) {
                window.showToast(`"${name}" added to Cart! 🛒`, "success");
            }
        });
    });

    // 3. Wishlist Button
    document.querySelectorAll('.add-wishlist-btn').forEach((button) => {
        button.addEventListener('click', (e) => {
            const name = e.target.getAttribute('data-name');
            const price = e.target.getAttribute('data-price');
            const image = e.target.getAttribute('data-image');

            let wish = JSON.parse(localStorage.getItem('fw_user_wishlist') || "[]");
            if (!wish.some(i => i.name === name)) {
                wish.push({ name, price: Number(price), image });
                localStorage.setItem('fw_user_wishlist', JSON.stringify(wish));
                if (window.showToast) {
                    window.showToast(`"${name}" saved to Wishlist! ❤️`, "info");
                }
            } else {
                if (window.showToast) {
                    window.showToast(`"${name}" is already in your Wishlist!`, "info");
                }
            }
        });
    });
}

// ==========================================
// 🔍 REAL-TIME PRODUCT SEARCH
// ==========================================
const searchInput = document.getElementById("productSearch");
if (searchInput) {
    searchInput.addEventListener("input", (e) => {
        const queryVal = e.target.value.toLowerCase().trim();

        if (!queryVal) {
            displayProducts(allProducts);
            return;
        }

        const filtered = allProducts.filter((product) => {
            const nameMatch = (product.name || "").toLowerCase().includes(queryVal);
            const categoryMatch = (product.category || "").toLowerCase().includes(queryVal);
            const descMatch = (product.description || "").toLowerCase().includes(queryVal);
            return nameMatch || categoryMatch || descMatch;
        });

        displayProducts(filtered);
    });
}

loadProducts();
