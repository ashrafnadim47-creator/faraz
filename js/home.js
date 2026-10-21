import { db, auth } from "./firebase-config.js";
import {
    collection,
    getDocs,
    query,
    orderBy,
    doc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const productBox = document.getElementById("productGrid") || document.getElementById("home-products");
let allProducts = [];

// ==========================================
// ðŸ›¡ï¸ DEFAULT CURATED PRODUCTS (FALLBACK)
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
        image: "images/freefire-banner.jpg",
        description: "Instant Free Fire Diamonds Topup directly to Player ID within 60 seconds."
    },
    {
        id: "prod_headset_rgb_2",
        name: "HyperX Pro 7.1 Surround Gaming Headset",
        price: 2499,
        category: "accessories",
        stock: 12,
        image: "images/headset.jpg",
        description: "Pro noise-cancelling microphone with deep bass and RGB earcups."
    },
    {
        id: "prod_keyboard_mech_3",
        name: "CyberPunk Mechanical RGB Keyboard",
        price: 1899,
        category: "gaming",
        stock: 8,
        image: "images/keyboard.jpg",
        description: "Hot-swappable blue switches with custom macro lighting presets."
    },
    {
        id: "prod_mouse_wireless_4",
        name: "Razer DeathAdder Ultra-Light Gaming Mouse",
        price: 1299,
        category: "gaming",
        stock: 15,
        image: "images/mouse.jpg",
        description: "16000 DPI optical sensor with zero-latency 2.4GHz wireless connection."
    },
    {
        id: "prod_ff_weekly_5",
        name: "Free Fire Weekly Diamond Membership",
        price: 159,
        category: "gaming",
        stock: 100,
        image: "images/prime-banner.jpg",
        description: "Get 450 total diamonds + special VIP badge daily for 7 days."
    },
    {
        id: "prod_earbuds_anc_6",
        name: "Pro TWS Wireless Gaming Earbuds (40ms Low Latency)",
        price: 999,
        category: "electronics",
        stock: 20,
        image: "images/earbuds.jpg",
        description: "Ultra-low gaming latency mode with environmental noise reduction."
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
                // Silently handle permission error without crashing
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
                <img src="${product.image || 'images/no-image.png'}" alt="${product.name}" loading="lazy" onerror="this.src='images/logo.png'">
            </div>
            <h3>${product.name}</h3>
            <p class="price">â‚¹${product.price}</p>
            <div style="display: flex; gap: 8px; margin-top: 10px;">
                <button class="view-prod-btn primary-btn" data-id="${product.id}" style="flex: 1; padding: 8px 12px; font-size: 12px;">ðŸ‘ View</button>
                <button class="add-to-cart-btn primary-btn" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}" data-image="${product.image || ''}" style="flex: 1; padding: 8px 12px; font-size: 12px; background: linear-gradient(135deg, #00f2fe, #4facfe); color: #000;">ðŸ›’ Cart</button>
                <button class="add-wish-btn" data-name="${product.name}" data-price="${product.price}" data-image="${product.image || ''}" style="padding: 8px 12px; border-radius: 10px; border: 1px solid #ff0055; background: rgba(255,0,85,0.15); color: #ff0055; cursor: pointer;">â¤ï¸</button>
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
    alert(`ðŸŽ‰ Success! "${name}" added to shopping cart.`);
}

function executeWishlistAdditionLogic(name, price, image) {
    let currentWish = JSON.parse(localStorage.getItem('fw_user_wish_memory') || "[]");
    currentWish.push({ name, price: parseFloat(price), image });
    localStorage.setItem('fw_user_wish_memory', JSON.stringify(currentWish));
    alert(`â¤ï¸ "${name}" added to Wishlist!`);
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
            displayProducts(filtered.length > 0 ? filtered : allProducts);
        });
    });
}

// ======================
// SEARCH ENGINE FIELD
// ======================
const searchBox = document.getElementById("searchBox");
if (searchBox) {
    searchBox.addEventListener("input", () => {
        let value = searchBox.value.toLowerCase().trim();
        let filtered = allProducts.filter(product =>
            (product.name || '').toLowerCase().includes(value)
        );
        displayProducts(filtered);
    });
}

// Initialize on page load
loadHomeProducts();
setupCategoryFilters();

// ======================
// FLASH SALE COUNTDOWN
// ======================
const timer = document.getElementById("sale-timer");
let end = localStorage.getItem("flashEnd");

if (!end) {
    let date = new Date();
    date.setHours(date.getHours() + 24);
    end = date.getTime();
    localStorage.setItem("flashEnd", end);
}

setInterval(() => {
    let now = Date.now();
    let diff = end - now;

    if (diff <= 0) {
        localStorage.removeItem("flashEnd");
        location.reload();
        return;
    }

    let h = Math.floor(diff / (1000 * 60 * 60));
    let m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    let s = Math.floor((diff % (1000 * 60)) / 1000);

    if (timer) timer.innerHTML = `${h}h : ${m}m : ${s}s`;
}, 1000);

