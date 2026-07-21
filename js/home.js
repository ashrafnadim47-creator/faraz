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

const productBox = document.getElementById("home-products");
let allProducts = [];

// ======================
// AUTH & REALTIME USER SYNC
// ======================
onAuthStateChanged(auth, (user) => {
    if (user) {
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const userData = docSnap.data();
                // Store cached balance
                const liveDiamonds = userData.diamonds ?? userData.diamond ?? userData.wallet ?? 0;
                localStorage.setItem('fw_persist_wallet', liveDiamonds.toString());
            }
        });
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

        displayProducts(allProducts);
    } catch (error) {
        console.error("Products load error:", error);
        productBox.innerHTML = `<h3>❌ Products Load Failed</h3>`;
    }
}

// ======================
// DISPLAY PRODUCTS
// ======================
function displayProducts(products) {
    if (!productBox) return;

    if (products.length === 0) {
        productBox.innerHTML = `<h3>No Products Found</h3>`;
        return;
    }

    const htmlMarkup = products.map((product) => `
        <div class="product-card">
            <div class="product-image">
                <img src="${product.image || 'images/no-image.png'}" alt="${product.name}" loading="lazy">
            </div>
            <h3>${product.name}</h3>
            <p>₹${product.price}</p>
            <button class="view-prod-btn" data-id="${product.id}">👁 View</button>
            <button class="add-to-cart-btn" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}" data-image="${product.image || ''}">🛒 Cart</button>
            <button class="add-wish-btn" data-name="${product.name}" data-price="${product.price}" data-image="${product.image || ''}">❤️</button>
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
    currentCart.push({ id, name, price: parseFloat(price), image });
    localStorage.setItem('fw_user_cart_memory', JSON.stringify(currentCart));
    alert(`🎉 Success! ${name} has been added to your shopping cart.`);
}

function executeWishlistAdditionLogic(name, price, image) {
    let currentWish = JSON.parse(localStorage.getItem('fw_user_wish_memory') || "[]");
    currentWish.push({ name, price: parseFloat(price), image });
    localStorage.setItem('fw_user_wish_memory', JSON.stringify(currentWish));
    alert(`❤️ Item added to your personal Wishlist!`);
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