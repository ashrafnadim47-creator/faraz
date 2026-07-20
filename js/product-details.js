import { db, auth } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    addDoc,
    getDocs,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const box = document.getElementById("details-box");
const id = new URLSearchParams(location.search).get("id");

console.log("URL:", location.href);
console.log("ID:", id);

// SAVE RECENTLY VIEWED
async function saveRecentlyViewed(product){
    onAuthStateChanged(auth, async (user) => {
        if(!user) return;
        try {
            await addDoc(
                collection(db, "users", user.uid, "recentlyViewed"),
                {
                    productId: id,
                    name: product.name,
                    price: product.price,
                    image: product.image,
                    viewedAt: serverTimestamp()
                }
            );
        } catch(e) {
            console.error("Error setting review history:", e);
        }
    });
}

async function loadProduct(){
    if(!box) return;
    if(!id){
        box.innerHTML = "<h2>Product ID Missing</h2>";
        return;
    }

    box.innerHTML = "<h2>Loading Product...</h2>";

    try {
        const snap = await getDoc(doc(db, "products", id));

        if(!snap.exists()){
            box.innerHTML = "<h2>❌ Product Not Found</h2>";
            return;
        }

        const product = snap.data();
        saveRecentlyViewed(product);

        box.innerHTML = `
            <div class="detail-card">
                <img src="${product.image || 'images/no-image.png'}" alt="Product image">
                <h1>${product.name}</h1>
                <h2>₹${product.price}</h2>
                <p>${product.description || "Premium Product"}</p>
                
                <button class="details-cart-btn" data-id="${id}" data-name="${product.name}" data-price="${product.price}" data-image="${product.image || ''}">🛒 Add To Cart</button>
                <button class="details-wish-btn" data-name="${product.name}" data-price="${product.price}" data-image="${product.image || ''}">❤️ Wishlist</button>
                
                <hr>
                <h2>⭐ Reviews</h2>
                <div id="reviews">Loading Reviews...</div>
                
                <input id="review-text" placeholder="Write your review">
                <button id="submit-review-btn">Submit Review</button>
            </div>
        `;

        loadReviews(id);
        attachDetailsListeners(product);
    }
    catch(error){
        console.log(error);
        box.innerHTML = "❌ Error Loading Product";
    }
}

// --- REGISTER SECTOR FOR DOM NODES INTERACTIVITY ---
function attachDetailsListeners(product) {
    const cartBtn = document.querySelector('.details-cart-btn');
    const wishBtn = document.querySelector('.details-wish-btn');
    const revBtn = document.getElementById('submit-review-btn');

    if(cartBtn) {
        cartBtn.addEventListener('click', () => {
            let currentCart = JSON.parse(localStorage.getItem('fw_user_cart_memory') || "[]");
            currentCart.push({ id, name: product.name, price: parseFloat(product.price), image: product.image });
            localStorage.setItem('fw_user_cart_memory', JSON.stringify(currentCart));
            alert(`🎉 Success! ${product.name} added to cart.`);
        });
    }

    if(wishBtn) {
        wishBtn.addEventListener('click', () => {
            let currentWish = JSON.parse(localStorage.getItem('fw_user_wish_memory') || "[]");
            currentWish.push({ name: product.name, price: parseFloat(product.price), image: product.image });
            localStorage.setItem('fw_user_wish_memory', JSON.stringify(currentWish));
            alert(`❤️ Item added to Wishlist!`);
        });
    }

    if(revBtn) {
        revBtn.addEventListener('click', () => {
            addReview(id);
        });
    }
}

async function addReview(productID){
    const reviewInput = document.getElementById("review-text");
    if(!reviewInput) return;
    const text = reviewInput.value.trim();

    if(!text){
        alert("Write review");
        return;
    }

    try {
        await addDoc(
            collection(db, "products", productID, "reviews"),
            {
                text: text,
                rating: 5,
                createdAt: serverTimestamp()
            }
        );
        alert("Review Added");
        reviewInput.value = "";
        loadReviews(productID);
    } catch(err) {
        console.error("Error submitting review:", err);
    }
}

async function loadReviews(productID){
    const reviewBox = document.getElementById("reviews");
    if(!reviewBox) return;

    const snap = await getDocs(collection(db, "products", productID, "reviews"));
    reviewBox.innerHTML = "";

    if(snap.empty){
        reviewBox.innerHTML = "No Reviews Yet";
        return;
    }

    snap.forEach((doc)=>{
        reviewBox.innerHTML += `
            <div class="review">
                ⭐⭐⭐⭐⭐
                <p>${doc.data().text}</p>
            </div>
        `;
    });
}

// Core execution load runtime trigger
loadProduct();