import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    collection,
    getDocs,
    query,
    orderBy,
    doc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const productBox = document.getElementById("productGrid") || document.getElementById("home-products");
let allProducts = [];

// ==========================================
// 🛡️ DEFAULT CURATED PRODUCTS (FALLBACK)
// ==========================================
const FALLBACK_PRODUCTS = [
    {
        id: "prod_evo_m1014_draco",
        name: "Evo M1014 Green Flame Draco (Max Lv.7)",
        price: 1499,
        category: "gaming",
        stock: 25,
        image: "images/evo_m1014.svg",
        description: "Official Free Fire Legendary Evo M1014 Draco Shotgun with max stats, exclusive kill feed animation and dragon wings effect."
    },
    {
        id: "prod_ff_diamonds_1",
        name: "Free Fire 1060 + 106 Diamonds Top-Up",
        price: 799,
        category: "gaming",
        stock: 50,
        image: "images/freefire_diamonds.png",
        description: "Instant Free Fire Diamonds Topup directly to Player ID within 60 seconds."
    },
    {
        id: "prod_ff_weekly_5",
        name: "Free Fire Weekly Diamond Membership",
        price: 159,
        category: "gaming",
        stock: 100,
        image: "images/prime_pass.png",
        description: "Get 450 total diamonds + special VIP badge daily for 7 days."
    },
    {
        id: "prod_headset_rgb_2",
        name: "HyperX Pro 7.1 Surround Gaming Headset",
        price: 2499,
        category: "accessories",
        stock: 12,
        image: "images/headphones.png",
        description: "Pro noise-cancelling microphone with deep bass and RGB earcups."
    },
    {
        id: "prod_keyboard_mech_3",
        name: "CyberPunk Mechanical RGB Keyboard",
        price: 1899,
        category: "gaming",
        stock: 8,
        image: "images/keyboard.png",
        description: "Hot-swappable blue switches with custom macro lighting presets."
    },
    {
        id: "prod_mouse_wireless_4",
        name: "Razer DeathAdder Ultra-Light Gaming Mouse",
        price: 1299,
        category: "gaming",
        stock: 15,
        image: "images/gaming-mouse.png",
        description: "16000 DPI optical sensor with zero-latency 2.4GHz wireless connection."
    },
    {
        id: "prod_gloowall_legend",
        name: "Legendary Cybernetic Gloo Wall Skin",
        price: 499,
        category: "gaming",
        stock: 30,
        image: "images/gloowall.png",
        description: "Exclusive futuristic cyber barrier Gloo Wall skin for Free Fire Battle Royale."
    },
    {
        id: "prod_laptop_rtx",
        name: "ASUS ROG Strix RTX 4070 Gaming Laptop",
        price: 89999,
        category: "gaming",
        stock: 5,
        image: "images/laptop.png",
        description: "High-performance gaming machine with Intel Core i9, 32GB DDR5 RAM, and RTX 4070 GPU."
    }
];

// ======================
// AUTH & REALTIME USER SYNC (SAFE ERROR HANDLED)
// ======================
onAuthStateChanged(auth, (user) => {
    if (user) {
        try {
            onSnapshot(doc(db, "users", user.uid), (docSnap) => {
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    const liveDiamonds = userData.diamonds ?? userData.diamond ?? userData.wallet ?? 0;
                    localStorage.setItem('fw_persist_wallet', liveDiamonds.toString());
                }
            }, (error) => {
                console.warn("User realtime sync unavailable:", error.message);
            });
        } catch (e) {
            console.warn("Snapshot setup skipped:", e);
        }
    }
});

// ======================
// LOAD PRODUCTS
// ======================
async function loadHomeProducts() {
    if (!productBox) return;

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

// ======================
// DISPLAY PRODUCTS
// ======================
function displayProducts(products) {
    if (!productBox) return;

    if (products.length === 0) {
        productBox.innerHTML = `<h3 style="grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 30px;">No Products Found</h3>`;
        return;
    }

    const htmlMarkup = products.map((product) => `
        <div class="product-card glassmorphism">
            <div class="product-image">
                <img src="${product.image || 'images/logo.png?v=3'}" alt="${product.name}" loading="lazy" onerror="this.src='images/logo.png?v=3'">
            </div>
            <h3>${product.name}</h3>
            <p class="price">₹${product.price}</p>
            <div style="display: flex; gap: 8px; margin-top: 10px;">
                <button class="view-prod-btn primary-btn" data-id="${product.id}" style="flex: 1; padding: 8px 12px; font-size: 12px;">View</button>
                <button class="add-to-cart-btn primary-btn" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}" data-image="${product.image || ''}" style="flex: 1; padding: 8px 12px; font-size: 12px; background: linear-gradient(135deg, #00f2fe, #4facfe); color: #000;">Cart</button>
                <button class="add-wish-btn" data-name="${product.name}" data-price="${product.price}" data-image="${product.image || ''}" style="padding: 8px 12px; border-radius: 10px; border: 1px solid #ff0055; background: rgba(255,0,85,0.15); color: #ff0055; cursor: pointer;">Wish</button>
            </div>
        </div>
    `).join('');

    productBox.innerHTML = htmlMarkup;
    attachModuleClickListeners();
}

// ===============================================
// INTERACTION LISTENERS ENGINE
// ===============================================
function attachModuleClickListeners() {
    // View Product
    document.querySelectorAll('.view-prod-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const button = e.target.closest('.view-prod-btn');
            if (button) {
                const id = button.getAttribute('data-id');
                location.href = "product-details.html?id=" + id;
            }
        });
    });

    // Add To Cart
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const button = e.target.closest('.add-to-cart-btn');
            if (button) {
                const id = button.getAttribute('data-id');
                const name = button.getAttribute('data-name');
                const price = button.getAttribute('data-price');
                const image = button.getAttribute('data-image');

                executeCartAdditionLogic(id, name, price, image);
            }
        });
    });

    // Add To Wishlist
    document.querySelectorAll('.add-wish-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const button = e.target.closest('.add-wish-btn');
            if (button) {
                const name = button.getAttribute('data-name');
                const price = button.getAttribute('data-price');
                const image = button.getAttribute('data-image');

                executeWishlistAdditionLogic(name, price, image);
            }
        });
    });
}

function executeCartAdditionLogic(id, name, price, image) {
    let currentCart = JSON.parse(localStorage.getItem('fw_user_cart_memory') || "[]");
    currentCart.push({ id, name, price: parseFloat(price), image, quantity: 1 });
    localStorage.setItem('fw_user_cart_memory', JSON.stringify(currentCart));
    alert(`Success! "${name}" added to shopping cart.`);
}

function executeWishlistAdditionLogic(name, price, image) {
    let currentWish = JSON.parse(localStorage.getItem('fw_user_wish_memory') || "[]");
    currentWish.push({ name, price: parseFloat(price), image });
    localStorage.setItem('fw_user_wish_memory', JSON.stringify(currentWish));
    alert(`"${name}" added to Wishlist!`);
}

// ======================
// CATEGORY FILTER LOGIC
// ======================
function setupCategoryFilters() {
    document.querySelectorAll('.category-box').forEach(box => {
        box.addEventListener('click', () => {
            const category = box.getAttribute('data-cat');
            if (!category) return;
            
            let filtered = allProducts.filter(product => 
                (product.category || '').toLowerCase() === category.toLowerCase()
            );

            if (filtered.length === 0) {
                filtered = FALLBACK_PRODUCTS.filter(p => (p.category || '').toLowerCase() === category.toLowerCase());
            }

            displayProducts(filtered.length > 0 ? filtered : allProducts);
            const targetSection = document.getElementById('productGrid') || document.getElementById('home-products');
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// ======================
// SEARCH LOGIC
// ======================
function setupSearch() {
    const searchInput = document.getElementById("searchBox");
    if (!searchInput) return;

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

// ======================
// INITIALIZATION
// ======================
document.addEventListener("DOMContentLoaded", () => {
    loadHomeProducts();
    setupCategoryFilters();
    setupSearch();
});
