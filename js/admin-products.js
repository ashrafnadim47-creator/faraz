import { db } from "./firebase-config.js";
import {
    collection,
    getDocs,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const box = document.getElementById("product-list");

// ==========================================
// 📦 LOAD STORE PRODUCTS CATALOG
// ==========================================
async function loadProducts() {
    if (!box) return;

    box.innerHTML = `
        <div class="loading-state" style="text-align: center; padding: 40px;">
            <div class="spinner"></div>
            <p style="color: #00e5ff; margin-top: 10px; font-weight: 700;">Loading Product Inventory...</p>
        </div>
    `;

    try {
        const snap = await getDocs(collection(db, "products"));
        box.innerHTML = "";

        if (snap.empty) {
            box.innerHTML = `<h2 style="text-align: center; color: #94a3b8; padding: 40px;">No Products Found 📦</h2>`;
            return;
        }

        // Single-Pass High-Performance Construction
        const productsMarkup = snap.docs.map((item) => {
            const product = item.data();
            const productId = item.id;
            const stock = Number(product.stock ?? 0);

            let stockTag = `<span style="color: #22c55e;">🟢 In Stock (${stock})</span>`;
            if (stock <= 0) stockTag = `<span style="color: #ef4444;">🔴 Out of Stock</span>`;
            else if (stock <= 5) stockTag = `<span style="color: #eab308;">🟡 Low Stock (${stock})</span>`;

            return `
                <div class="product-card glassmorphism" style="padding: 18px; border-radius: 18px; border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(30, 41, 59, 0.5); display: flex; flex-direction: column; justify-content: space-between; text-align: center; margin-bottom: 15px;">
                    <div style="height: 160px; width: 100%; border-radius: 12px; overflow: hidden; background: #020617; margin-bottom: 12px; display: flex; align-items: center; justify-content: center;">
                        <img src="${product.image || 'images/no-image.png'}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>

                    <h2 style="font-size: 16px; color: #ffffff; margin-bottom: 4px; font-weight: 800;">${product.name}</h2>
                    <p class="price" style="color: #00e5ff; font-size: 18px; font-weight: 900; margin-bottom: 4px;">₹${product.price}</p>
                    <p class="category" style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">${product.category || "General Gear"}</p>
                    <p style="font-size: 12px; font-weight: 800; margin: 4px 0 12px 0;">${stockTag}</p>

                    <div style="display: flex; gap: 8px;">
                        <button onclick="editProduct('${productId}')" class="primary-btn" style="flex: 1; padding: 10px; font-size: 12px; font-weight: 800; border-radius: 10px;">
                            ✏️ Edit
                        </button>
                        <button onclick="deleteProduct('${productId}')" class="delete-btn" style="flex: 1; padding: 10px; font-size: 12px; font-weight: 800; border-radius: 10px; background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #ef4444; cursor: pointer;">
                            🗑 Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        box.innerHTML = productsMarkup;

    } catch (error) {
        console.error("Error loading products:", error);
        box.innerHTML = `<h2 style="text-align: center; color: var(--danger, #ef4444); padding: 40px;">❌ Products Load Failed</h2>`;
    }
}

// ==========================================
// 🗑 DELETE PRODUCT ACTION
// ==========================================
window.deleteProduct = async function (id) {
    const check = confirm("⚠️ Are you sure you want to delete this product?");
    if (!check) return;

    try {
        await deleteDoc(doc(db, "products", id));
        alert("✅ Product Deleted Successfully!");
        loadProducts();
    } catch (error) {
        console.error("Delete error:", error);
        alert("❌ Failed to delete product.");
    }
};

// ==========================================
// ✏️ EDIT PRODUCT REDIRECT
// ==========================================
window.editProduct = function (id) {
    location.href = "admin-edit-product.html?id=" + id;
};

loadProducts();