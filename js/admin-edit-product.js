import { db } from "./firebase-config.js";
import {
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Query URL Product ID
const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

// DOM Targets
const form = document.getElementById("edit-product-form");
const nameInput = document.getElementById("name");
const priceInput = document.getElementById("price");
const imageInput = document.getElementById("image");
const categoryInput = document.getElementById("category");
const stockInput = document.getElementById("stock");
const descriptionInput = document.getElementById("description");
const updateBtn = document.getElementById("update-product");
const message = document.getElementById("message");

// ==========================================
// 📦 LOAD EXISTING PRODUCT DATA
// ==========================================
async function loadProductData() {
    if (!productId) {
        if (message) {
            message.innerHTML = "❌ Product ID Missing from URL.";
            message.style.color = "#ef4444";
        }
        return;
    }

    if (message) {
        message.innerHTML = "⏳ Fetching Product Details...";
        message.style.color = "#00e5ff";
    }

    try {
        const snap = await getDoc(doc(db, "products", productId));

        if (!snap.exists()) {
            if (message) {
                message.innerHTML = "❌ Product Not Found in Database.";
                message.style.color = "#ef4444";
            }
            return;
        }

        const data = snap.data();

        if (nameInput) nameInput.value = data.name || "";
        if (priceInput) priceInput.value = data.price || "";
        if (imageInput) imageInput.value = data.image || "";
        if (categoryInput) categoryInput.value = data.category || "";
        if (stockInput) stockInput.value = data.stock ?? 0;
        if (descriptionInput) descriptionInput.value = data.description || "";

        if (message) message.innerHTML = "";

    } catch (error) {
        console.error("Error loading product:", error);
        if (message) {
            message.innerHTML = "❌ Failed Loading Product Info.";
            message.style.color = "#ef4444";
        }
    }
}

// ==========================================
// 💾 UPDATE PRODUCT DATA HANDLER
// ==========================================
async function handleUpdateProduct(e) {
    if (e) e.preventDefault();

    if (!productId) {
        if (message) {
            message.innerHTML = "❌ Cannot update: Missing Product ID!";
            message.style.color = "#ef4444";
        }
        return;
    }

    const updatedName = nameInput ? nameInput.value.trim() : "";
    const updatedPrice = priceInput ? Number(priceInput.value) : 0;
    const updatedImage = imageInput ? imageInput.value.trim() : "";
    const updatedCategory = categoryInput ? categoryInput.value.trim() : "";
    const updatedStock = stockInput ? Number(stockInput.value) : 0;
    const updatedDescription = descriptionInput ? descriptionInput.value.trim() : "";

    if (!updatedName || !updatedImage || !updatedCategory || isNaN(updatedPrice) || updatedPrice <= 0) {
        if (message) {
            message.innerHTML = "❌ Fill all fields with valid pricing!";
            message.style.color = "#ef4444";
        }
        return;
    }

    if (isNaN(updatedStock) || updatedStock < 0) {
        if (message) {
            message.innerHTML = "❌ Stock quantity cannot be negative!";
            message.style.color = "#ef4444";
        }
        return;
    }

    if (updateBtn) {
        updateBtn.disabled = true;
        updateBtn.innerText = "💾 Updating Product...";
    }

    try {
        await updateDoc(doc(db, "products", productId), {
            name: updatedName,
            price: updatedPrice,
            image: updatedImage,
            category: updatedCategory,
            stock: updatedStock,
            description: updatedDescription
        });

        if (message) {
            message.innerHTML = "✅ Product Updated Successfully!";
            message.style.color = "#22c55e";
        }

        setTimeout(() => {
            location.href = "admin-products.html";
        }, 1500);

    } catch (error) {
        console.error("Error updating product:", error);
        if (message) {
            message.innerHTML = "❌ Update Failed. Check network connection.";
            message.style.color = "#ef4444";
        }
    } finally {
        if (updateBtn) {
            updateBtn.disabled = false;
            updateBtn.innerText = "💾 Update Product Specification";
        }
    }
}

// Listeners & Initialization
if (form) {
    form.addEventListener("submit", handleUpdateProduct);
} else if (updateBtn) {
    updateBtn.addEventListener("click", handleUpdateProduct);
}

loadProductData();