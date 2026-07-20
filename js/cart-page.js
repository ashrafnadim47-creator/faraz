import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    collection,
    getDocs,
    deleteDoc,
    doc,
    setDoc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const container = document.getElementById("cart-container");
const total = document.getElementById("total-price");

let uid = "";
let finalTotal = 0;

// ==========================
// LOGIN CHECK
// ==========================
onAuthStateChanged(auth, (user) => {
    if (!user) {
        location.href = "login.html";
        return;
    }
    uid = user.uid;
    loadCart();
});

// ==========================
// ADD TO CART BACKEND
// ==========================
window.addToCart = async function (productId, name, price, image) {
    if (!uid) {
        location.href = "login.html";
        return;
    }

    const cartRef = doc(db, "users", uid, "cart", productId);
    const old = await getDoc(cartRef);
    
    if (old.exists()) {
        await updateDoc(cartRef,{
            quantity: old.data().quantity + 1
        });
    } else {
        await setDoc(cartRef,{
            productId: productId,
            name: name,
            price: Number(price),
            image: image,
            quantity: 1
        });
    }
    
    alert("🛒 Added To Cart");
    loadCart();
};

// ==========================
// LOAD CART ENGINE
// ==========================
async function loadCart() {
    if (!container) return;
    container.innerHTML = "<h2>Loading Cart...</h2>";

    let sum = 0;

    const snapshot = await getDocs(
        collection(db, "users", uid, "cart")
    );

    if (snapshot.empty) {
        container.innerHTML = "<h2>Your Cart Is Empty 🛒</h2>";
        if (total) total.innerHTML = "Total : ₹0";
        return;
    }

    container.innerHTML = "";

    snapshot.forEach((itemDoc) => {
        const item = itemDoc.data();
        const itemTotal = item.price * item.quantity;
        sum += itemTotal;

        container.innerHTML += `
            <div class="cart-item">
                <div class="product-image">
                    <img src="${item.image || "images/no-image.png"}" alt="Product image">
                </div>
                <div>
                    <h3>${item.name}</h3>
                    <p>₹${item.price}</p>
                    <p>Quantity : ${item.quantity}</p>
                </div>
                <button class="remove remove-cart-item-btn" data-id="${itemDoc.id}">
                    ❌ Remove
                </button>
            </div>
        `;
    });

    finalTotal = sum;
    if (total) {
        total.innerHTML = `<b>Final Total : ₹${finalTotal}</b>`;
    }

    // Attach click triggers to newly injected elements
    attachRemoveItemListeners();
}

// ==========================
// REMOVE MODULE ACTION LISTENERS
// ==========================
function attachRemoveItemListeners() {
    document.querySelectorAll('.remove-cart-item-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const itemId = e.target.getAttribute('data-id');
            if (itemId) {
                executeItemRemoval(itemId);
            }
        });
    });
}

async function executeItemRemoval(id) {
    try {
        await deleteDoc(
            doc(db, "users", uid, "cart", id)
        );
        loadCart();
    } catch (error) {
        console.error(error);
        alert("❌ Failed To Remove Item");
    }
}