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
        image: "images/freefire-banner.jpg",
        description: "Instant Free Fire Diamonds Topup directly to Player ID within 60 seconds."
    },
    {
        id: "prod_headset_rgb_2",
        name: "HyperX Pro 7.1 Surround Gaming Headset",
        price: 2499,
        category: "Audio Accessories",
        stock: 12,
        image: "images/headset.jpg",
        description: "Pro noise-cancelling microphone with deep bass and RGB earcups."
    },
    {
        id: "prod_keyboard_mech_3",
        name: "CyberPunk Mechanical RGB Keyboard",
        price: 1899,
        category: "Gaming Gear",
        stock: 8,
        image: "images/keyboard.jpg",
        description: "Hot-swappable blue switches with custom macro lighting presets."
    },
    {
        id: "prod_mouse_wireless_4",
        name: "Razer DeathAdder Ultra-Light Gaming Mouse",
        price: 1299,
        category: "Gaming Gear",
        stock: 15,
        image: "images/mouse.jpg",
        description: "16000 DPI optical sensor with zero-latency 2.4GHz wireless connection."
    },
    {
        id: "prod_ff_weekly_5",
        name: "Free Fire Weekly Diamond Membership",
        price: 159,
        category: "Gaming Topup",
        stock: 100,
        image: "images/prime-banner.jpg",
        description: "Get 450 total diamonds + special VIP badge daily for 7 days."
    },
    {
        id: "prod_earbuds_anc_6",
        name: "Pro TWS Wireless Gaming Earbuds (40ms Low Latency)",
        price: 999,
        category: "Electronics",
        stock: 20,
        image: "images/earbuds.jpg",
        description: "Ultra-low gaming latency mode with environmental noise reduction."
    }
];

// ==========================================
// ðŸ“¦ FETCH ALL PRODUCTS FROM FIRESTORE
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

        snap.forEach((doc) => {
            allProducts.push({
                id: doc.id,
                ...doc.data()
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
// ðŸŽ¨ RENDER PRODUCTS GRID CARDS
// ==========================================
function displayProducts(products) {
    if (!container) return;
    container.innerHTML = "";

    if (products.length === 0) {
        container.innerHTML = `<h3 style="grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 40px;">No Products Found ðŸ“¦</h3>`;
        return;
    }

    const cardsMarkup = products.map((product) => {
        const stock = Number(product.stock ?? 0);
        let stockText = "";
        let stockClass = "";

        if (stock <= 0) {
            stockText = "ðŸ”´ Out of Stock";
            stockClass = "out-stock";
        } else if (stock <= 5) {
            stockText = `ðŸŸ¡ Low Stock (${stock} Left)`;
            stockClass = "low-stock";
        } else {
            stockText = `ðŸŸ¢ In Stock (${stock})`;
            stockClass = "in-stock";
        }

        return `
            <div class="product-card glassmorphism">
                <div class="product-img">
                    <img src="${product.image || 'images/no-image.png'}" alt="${product.name}" loading="lazy" onerror="this.src='images/logo.png'">
                </div>
                <h3>${product.name}</h3>
                <p class="price">â‚¹${product.price}</p>
                <p style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">${product.category || "General Gear"}</p>
                <p class="${stockClass}" style="font-size: 12px; font-weight: 800; margin: 4px 0 12px 0;">${stockText}</p>
                
                <div class="product-buttons">
                    <button class="view-details-btn primary-btn" data-id="${product.id}">ðŸ‘ View Details</button>
                    ${stock > 0 
                        ? `<button class="add-cart-btn primary-btn" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}" data-image="${product.image || ''}">ðŸ›’ Add To Cart</button>`
                        : `<button disabled style="background: #334155; color: #94a3b8; cursor: not-allowed;">âŒ Out of Stock</button>`
                    }
                    <button class="add-wishlist-btn" data-name="${product.name}" data-price="${product.price}" data-image="${product.image || ''}" style="background: rgba(255, 0, 85, 0.15); border: 1px solid #ff0055; color: #ff0055; border-radius: 10px; font-weight: 800; cursor: pointer; padding: 8px;">â¤ï¸ Wishlist</button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = cardsMarkup;
    attachDynamicListeners();
}

// ==========================================
// âš¡ ATTACH EVENT LISTENERS
// ==========================================
function attachDynamicListeners() {
    // 1. View Details Button
    document.querySelectorAll('.view-details-btn').forEach((button) => {
        button.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            if (id) {
                location.href = `product-details.html?id=${id}`;
            }
        });
    });

    // 2. Add To Cart Button
    document.querySelectorAll('.add-cart-btn').forEach((button) => {
        button.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const name = e.target.getAttribute('data-name');
            const price = e.target.getAttribute('data-price');
            const image = e.target.getAttribute('data-image');

            if (window.addToCart) {
                window.addToCart(id, name, price, image);
            } else {
                let currentCart = JSON.parse(localStorage.getItem('fw_user_cart_memory') || "[]");
                currentCart.push({ id, name, price: parseFloat(price), image, quantity: 1 });
                localStorage.setItem('fw_user_cart_memory', JSON.stringify(currentCart));
                alert(`ðŸŽ‰ Added "${name}" to Cart!`);
            }
        });
    });

    // 3. Add To Wishlist Button
    document.querySelectorAll('.add-wishlist-btn').forEach((button) => {
        button.addEventListener('click', (e) => {
            const name = e.target.getAttribute('data-name');
            const price = e.target.getAttribute('data-price');
            const image = e.target.getAttribute('data-image');

            if (window.addWishlist) {
                window.addWishlist(name, price, image);
            } else {
                let currentWish = JSON.parse(localStorage.getItem('fw_user_wish_memory') || "[]");
                currentWish.push({ name, price: parseFloat(price), image });
                localStorage.setItem('fw_user_wish_memory', JSON.stringify(currentWish));
                alert(`â¤ï¸ Added "${name}" to Wishlist!`);
            }
        });
    });
}

// ==========================================
// ðŸ” SEARCH FILTER LOGIC
// ==========================================
const searchInput = document.getElementById("productSearch");
if (searchInput) {
    searchInput.addEventListener("input", () => {
        const queryVal = searchInput.value.toLowerCase().trim();
        const filtered = allProducts.filter((p) => {
            const name = (p.name || "").toLowerCase();
            const category = (p.category || "").toLowerCase();
            return name.includes(queryVal) || category.includes(queryVal);
        });
        displayProducts(filtered);
    });
}

// Load on Startup
loadProducts();

