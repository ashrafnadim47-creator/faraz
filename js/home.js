import { db } from "./firebase-config.js";

import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const productBox = document.getElementById("home-products");
let allProducts = [];

// ======================
// LOAD PRODUCTS
// ======================
async function loadHomeProducts(){
    if(!productBox) return;

    try {
        const q = query(
            collection(db, "products"),
            orderBy("createdAt", "desc")
        );

        const snap = await getDocs(q);
        allProducts = [];

        snap.forEach((doc)=>{
            allProducts.push({
                id: doc.id,
                ...doc.data()
            });
        });

        displayProducts(allProducts);
    }
    catch(error){
        console.log(error);
        productBox.innerHTML = `<h3>❌ Products Load Failed</h3>`;
    }
}

// ======================
// DISPLAY PRODUCTS
// ======================
function displayProducts(products){
    if(!productBox) return;
    productBox.innerHTML = "";

    if(products.length === 0){
        productBox.innerHTML = `<h3>No Products Found</h3>`;
        return;
    }

    products.forEach((product)=>{
        // Yahan HTML me se onclick saaf kar ke data attributes set kiye hain taaki safe tracking ho sake
        productBox.innerHTML += `
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
        `;
    });

    // Dynamic Element Listeners Injection Setup
    attachModuleClickListeners();
}

// ===============================================
// MODULE COMPATIBLE INTERACTION LISTENERS ENGINE
// ===============================================
function attachModuleClickListeners() {
    // 1. View button actions tracker
    document.querySelectorAll('.view-prod-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            location.href = "product-details.html?id=" + id;
        });
    });

    // 2. Add To Cart live click actions
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const button = e.target.closest('.add-to-cart-btn');
            const id = button.getAttribute('data-id');
            const name = button.getAttribute('data-name');
            const price = button.getAttribute('data-price');
            const image = button.getAttribute('data-image');

            // Trigger actual internal logic safely
            executeCartAdditionLogic(id, name, price, image);
        });
    });

    // 3. Wishlist tracking system listener
    document.querySelectorAll('.add-wish-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const button = e.target.closest('.add-wish-btn');
            const name = button.getAttribute('data-name');
            const price = button.getAttribute('data-price');
            const image = button.getAttribute('data-image');

            executeWishlistAdditionLogic(name, price, image);
        });
    });
}

// --- CART & WISHLIST BACKEND MATRIC EXECUTION ---
function executeCartAdditionLogic(id, name, price, image) {
    console.log(`🛒 Module Sync Active - Adding: ${name} (ID: ${id})`);
    
    // Local storage ledger check for cart mapping
    let currentCart = JSON.parse(localStorage.getItem('fw_user_cart_memory') || "[]");
    currentCart.push({ id, name, price: parseFloat(price), image });
    localStorage.setItem('fw_user_cart_memory', JSON.stringify(currentCart));

    alert(`🎉 Success! ${name} has been added to your shopping cart.`);
}

function executeWishlistAdditionLogic(name, price, image) {
    console.log(`❤️ Wishlist Sync Active - Adding: ${name}`);
    
    let currentWish = JSON.parse(localStorage.getItem('fw_user_wish_memory') || "[]");
    currentWish.push({ name, price: parseFloat(price), image });
    localStorage.setItem('fw_user_wish_memory', JSON.stringify(currentWish));

    alert(`❤️ Item added to your personal Wishlist!`);
}

// ======================
// CATEGORY FILTER LOGIC
// ======================
window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.category-box').forEach(box => {
        box.addEventListener('click', () => {
            const category = box.getAttribute('data-cat');
            let filtered = allProducts.filter(product => product.category === category);
            displayProducts(filtered);
        });
    });
});

// ======================
// SEARCH ENGINE FIELD
// ======================
const searchBox = document.getElementById("searchBox");
if(searchBox){
    searchBox.addEventListener("input",()=>{
        let value = searchBox.value.toLowerCase();
        let filtered = allProducts.filter(product => 
            product.name.toLowerCase().includes(value)
        );
        displayProducts(filtered);
    });
}

// Initialize on page load
loadHomeProducts();

// ======================
// FLASH SALE REVERSE COUNTDOWN
// ======================
let timer = document.getElementById("sale-timer");
let end = localStorage.getItem("flashEnd");

if(!end){
    let date = new Date();
    date.setHours(date.getHours()+24);
    end = date.getTime();
    localStorage.setItem("flashEnd", end);
}

setInterval(()=>{
    let now = Date.now();
    let diff = end - now;

    if(diff <= 0){
        localStorage.removeItem("flashEnd");
        location.reload();
        return;
    }

    let h = Math.floor(diff / (1000 * 60 * 60));
    let m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    let s = Math.floor((diff % (1000 * 60)) / 1000);

    if(timer) timer.innerHTML = `${h}h : ${m}m : ${s}s`;
}, 1000);