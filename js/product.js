import { db } from "./firebase-config.js";
import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const container = document.getElementById("product-container");
let allProducts = [];

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

        snap.forEach((doc) => {
            allProducts.push({
                id: doc.id,
                ...doc.data()
            });
        });

        displayProducts(allProducts);
    } catch (error) {
        console.error("Error loading products:", error);
        container.innerHTML = `<h3 style="grid-column: 1 / -1; text-align: center; color: var(--danger, #ef4444);">❌ Failed Loading Products</h3>`;
    }
}

// ==========================================
// 🎨 RENDER PRODUCTS GRID CARDS
// ==========================================
function displayProducts(products) {
    if (!container) return;
    container.innerHTML = "";

    if (products.length === 0) {
        container.innerHTML = `<h3 style="grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 40px;">No Products Found 📦</h3>`;
        return;
    }

    const cardsMarkup = products.map((product) => {
        const stock = Number(product.stock ?? 0);
        let stockText = "";
        let stockClass = "";

        if (stock <= 0) {
            stockText = "🔴 Out of Stock";
            stockClass = "out-stock";
        } else if (stock <= 5) {
            stockText = `🟡 Low Stock (${stock} Left)`;
            stockClass = "low-stock";
        } else {
            stockText = `🟢 In Stock (${stock})`;
            stockClass = "in-stock";
        }

        return `
            <div class="product-card glassmorphism">
                <div class="product-img">
                    <img src="${product.image || 'images/no-image.png'}" alt="${product.name}" loading="lazy">
                </div>
                <h3>${product.name}</h3>
                <p class="price">₹${product.price}</p>
                <p style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">${product.category || "General Gear"}</p>
                <p class="${stockClass}" style="font-size: 12px; font-weight: 800; margin: 4px 0 12px 0;">${stockText}</p>
                
                <div class="product-buttons">
                    <button class="view-details-btn primary-btn" data-id="${product.id}">👁 View Details</button>
                    ${stock > 0 
                        ? `<button class="add-cart-btn primary-btn" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}" data-image="${product.image || ''}">🛒 Add To Cart</button>`
                        : `<button disabled style="background: #334155; color: #94a3b8; cursor: not-allowed;">❌ Out of Stock</button>`
                    }
                    <button class="add-wishlist-btn" data-name="${product.name}" data-price="${product.price}" data-image="${product.image || ''}" style="background: rgba(255, 0, 85, 0.15); border: 1px solid #ff0055; color: #ff0055; border-radius: 10px; font-weight: 800; cursor: pointer; padding: 8px;">❤️ Wishlist</button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = cardsMarkup;
    attachDynamicListeners();
}

// ==========================================
// ⚡ DELEGATED EVENT LISTENERS
// ==========================================
function attachDynamicListeners() {
    // 1. Details Redirect
    document.querySelectorAll('.view-details-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            location.href = "product-details.html?id=" + id;
        });
    });

    // 2. Add to Cart Handler
    document.querySelectorAll('.add-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target.closest('.add-cart-btn');
            const id = target.getAttribute('data-id');
            const name = target.getAttribute('data-name');
            const price = target.getAttribute('data-price');
            const image = target.getAttribute('data-image');

            executeCartAddition(id, name, price, image);
        });
    });

    // 3. Add to Wishlist Handler
    document.querySelectorAll('.add-wishlist-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target.closest('.add-wishlist-btn');
            const name = target.getAttribute('data-name');
            const price = target.getAttribute('data-price');
            const image = target.getAttribute('data-image');

            executeWishlistAddition(name, price, image);
        });
    });
}

function executeCartAddition(id, name, price, image) {
    let currentCart = JSON.parse(localStorage.getItem('fw_user_cart_memory') || "[]");
    currentCart.push({ id, name, price: parseFloat(price), image });
    localStorage.setItem('fw_user_cart_memory', JSON.stringify(currentCart));
    alert(`🎉 Success! "${name}" added to your cart.`);
}

function executeWishlistAddition(name, price, image) {
    let currentWish = JSON.parse(localStorage.getItem('fw_user_wish_memory') || "[]");
    currentWish.push({ name, price: parseFloat(price), image });
    localStorage.setItem('fw_user_wish_memory', JSON.stringify(currentWish));
    alert(`❤️ "${name}" added to Wishlist!`);
}

// ==========================================
// 🔍 SEARCH FILTER MODULE
// ==========================================
const searchBox = document.getElementById("productSearch");
if (searchBox) {
    searchBox.addEventListener("input", () => {
        const value = searchBox.value.toLowerCase().trim();
        const filtered = allProducts.filter(product => {
            return (
                product.name?.toLowerCase().includes(value) ||
                product.category?.toLowerCase().includes(value) ||
                product.description?.toLowerCase().includes(value)
            );
        });
        displayProducts(filtered);
    });
}

loadProducts();