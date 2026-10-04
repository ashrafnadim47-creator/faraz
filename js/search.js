import { db } from "./firebase-config.js";
import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const searchInput = document.getElementById("searchBox");
const resultsContainer = document.getElementById("search-results") || document.getElementById("product-container");

// ==========================================
// 🔍 DYNAMIC SEARCH & FILTER ENGINE
// ==========================================
if (searchInput) {
    let debounceTimer;

    searchInput.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            executeSearchQuery();
        }, 300);
    });

    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            executeSearchQuery(true);
        }
    });
}

async function executeSearchQuery(forceRedirectFirstMatch = false) {
    if (!searchInput) return;

    const queryValue = searchInput.value.trim().toLowerCase();

    if (!queryValue) {
        if (resultsContainer && resultsContainer.id === "search-results") {
            resultsContainer.innerHTML = "";
            resultsContainer.style.display = "none";
        }
        return;
    }

    try {
        const snap = await getDocs(collection(db, "products"));
        const matchedProducts = [];

        snap.forEach((docSnap) => {
            const product = docSnap.data();
            const productName = (product.name || "").toLowerCase();
            const productCategory = (product.category || "").toLowerCase();

            if (productName.includes(queryValue) || productCategory.includes(queryValue)) {
                matchedProducts.push({
                    id: docSnap.id,
                    ...product
                });
            }
        });

        // Redirect on explicit Enter key if results exist
        if (forceRedirectFirstMatch && matchedProducts.length > 0) {
            location.href = `product-details.html?id=${matchedProducts[0].id}`;
            return;
        }

        renderSearchResults(matchedProducts);

    } catch (error) {
        console.error("Search query error:", error);
    }
}

function renderSearchResults(products) {
    if (!resultsContainer) return;

    if (products.length === 0) {
        if (resultsContainer.id === "search-results") {
            resultsContainer.style.display = "block";
            resultsContainer.innerHTML = `<div style="padding: 12px; color: #94a3b8; font-size: 13px; text-align: center;">No matching products found 🔍</div>`;
        }
        return;
    }

    if (resultsContainer.id === "search-results") {
        resultsContainer.style.display = "block";
        resultsContainer.innerHTML = products.map(product => `
            <div class="search-result-item glassmorphism" 
                 onclick="location.href='product-details.html?id=${product.id}'"
                 style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05);">
                <img src="${product.image || 'images/no-image.png'}" alt="${product.name}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;">
                <div>
                    <h4 style="font-size: 13px; color: #ffffff; margin: 0;">${product.name}</h4>
                    <span style="font-size: 12px; color: #ffcc00; font-weight: 800;">₹${product.price}</span>
                </div>
            </div>
        `).join('');
    }
}