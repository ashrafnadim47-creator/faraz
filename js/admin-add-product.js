import { db } from "./firebase-config.js";
import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// DOM Targets
const form = document.getElementById("add-product-form");
const nameInput = document.getElementById("name");
const priceInput = document.getElementById("price");
const imageInput = document.getElementById("image");
const categoryInput = document.getElementById("category");
const stockInput = document.getElementById("stock");
const descriptionInput = document.getElementById("description");
const addBtn = document.getElementById("add-product");
const message = document.getElementById("message");

// Core Product Creation Handler
async function handleAddProduct(e) {
    if (e) e.preventDefault();

    const productName = nameInput ? nameInput.value.trim() : "";
    const productPrice = priceInput ? Number(priceInput.value) : 0;
    const productImage = imageInput ? imageInput.value.trim() : "";
    const productCategory = categoryInput ? categoryInput.value.trim() : "";
    const productStock = stockInput ? Number(stockInput.value) : 0;
    const productDescription = descriptionInput ? descriptionInput.value.trim() : "";

    // Validation Checks
    if (!productName || !productImage || !productCategory || isNaN(productPrice) || productPrice <= 0) {
        if (message) {
            message.innerHTML = "❌ Please fill all required fields with valid pricing!";
            message.style.color = "#ef4444";
        }
        return;
    }

    if (isNaN(productStock) || productStock < 0) {
        if (message) {
            message.innerHTML = "❌ Invalid Stock Quantity! Must be 0 or higher.";
            message.style.color = "#ef4444";
        }
        return;
    }

    // Disable Action Button & Show Loading State
    if (addBtn) {
        addBtn.disabled = true;
        addBtn.innerText = "⌛ Adding Product...";
    }

    try {
        await addDoc(collection(db, "products"), {
            name: productName,
            price: productPrice,
            image: productImage,
            category: productCategory,
            description: productDescription,
            stock: productStock,
            sold: 0,
            createdAt: serverTimestamp()
        });

        if (message) {
            message.innerHTML = "🎉 Product Added Successfully!";
            message.style.color = "#22c55e";
        }

        // Reset Form Inputs
        if (nameInput) nameInput.value = "";
        if (priceInput) priceInput.value = "";
        if (imageInput) imageInput.value = "";
        if (categoryInput) categoryInput.value = "";
        if (stockInput) stockInput.value = "0";
        if (descriptionInput) descriptionInput.value = "";

    } catch (error) {
        console.error("Error adding product:", error);
        if (message) {
            message.innerHTML = "❌ Failed to Add Product. Check connection.";
            message.style.color = "#ef4444";
        }
    } finally {
        if (addBtn) {
            addBtn.disabled = false;
            addBtn.innerText = "➕ Add Product To Store";
        }
    }
}

// Attach Listeners for both Form Submit and Button Click
if (form) {
    form.addEventListener("submit", handleAddProduct);
} else if (addBtn) {
    addBtn.addEventListener("click", handleAddProduct);
}