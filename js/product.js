import { db } from "./firebase-config.js";

import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const container = document.getElementById("product-container");
let allProducts = [];

async function loadProducts(){
    if(!container) return;

    container.innerHTML = `<h2>Loading Products...</h2>`;

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
        container.innerHTML = `<h2>❌ Failed Loading Products</h2>`;
    }
}

function displayProducts(products){
    if(!container) return;
    container.innerHTML = "";

    if(products.length === 0){
        container.innerHTML = `<h2>No Products Available</h2>`;
        return;
    }

    products.forEach((product)=>{
        const stock = Number(product.stock ?? 0);
        let stockText = "";
        let stockClass = "";

        if(stock <= 0){
            stockText = "🔴 Out of Stock";
            stockClass = "out-stock";
        }
        else if(stock <= 5){
            stockText = `🟡 Low Stock (${stock} Left)`;
            stockClass = "low-stock";
        }
        else{
            stockText = `🟢 In Stock (${stock})`;
            stockClass = "in-stock";
        }

        container.innerHTML += `
            <div class="product-card">
                <div class="product-img">
                    <img src="${product.image || 'images/no-image.png'}" alt="${product.name}" loading="lazy">
                </div>
                <h2>${product.name}</h2>
                <p class="price">₹${product.price}</p>
                <p>${product.category || "General"}</p>
                <p class="${stockClass}">${stockText}</p>
                <div class="product-buttons">
                    <button class="view-details-btn" data-id="${product.id}">👁 View Details</button>
                    ${stock > 0 
                        ? `<button class="add-cart-btn" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}" data-image="${product.image || ''}">🛒 Add To Cart</button>`
                        : `<button disabled>❌ Out of Stock</button>`
                    }
                    <button class="add-wishlist-btn" data-name="${product.name}" data-price="${product.price}" data-image="${product.image || ''}">❤️ Wishlist</button>
                </div>
            </div>
        `;
    });

    attachDynamicListeners();
}

// --- MODULE EVENT DELEGATION LISTENER CONNECTORS ---
function attachDynamicListeners() {
    // 1. Details view redirect
    document.querySelectorAll('.view-details-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            location.href = "product-details.html?id=" + id;
        });
    });

    // 2. Add to Cart secure intercept
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

    // 3. Wishlist handler
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
    alert(`🎉 Success! ${name} added to your cart.`);
}

function executeWishlistAddition(name, price, image) {
    let currentWish = JSON.parse(localStorage.getItem('fw_user_wish_memory') || "[]");
    currentWish.push({ name, price: parseFloat(price), image });
    localStorage.setItem('fw_user_wish_memory', JSON.stringify(currentWish));
    alert(`❤️ Item added to Wishlist!`);
}

// SEARCH ENGINE FILTER
const searchBox = document.getElementById("productSearch");
if(searchBox){
    searchBox.addEventListener("input",()=>{
        const value = searchBox.value.toLowerCase();
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

// Initial Load execution
loadProducts();