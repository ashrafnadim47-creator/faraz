// ==========================================
// 👁️ RECENTLY VIEWED PRODUCTS RENDERER
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    loadRecentlyViewedProducts();
});

function loadRecentlyViewedProducts() {
    const box = document.getElementById("recent-products");
    if (!box) return;

    try {
        const rawMemory = localStorage.getItem("recentProducts") || localStorage.getItem("fw_user_recent_memory");
        const products = JSON.parse(rawMemory || "[]");

        if (!Array.isArray(products) || products.length === 0) {
            box.innerHTML = `
                <div style="text-align: center; padding: 30px; width: 100%;">
                    <h3 style="color: #94a3b8; font-size: 15px; font-weight: 600;">No Recently Viewed Products 👁️</h3>
                    <p style="color: #64748b; font-size: 12px; margin-top: 4px;">Items you explore in the shop will appear here.</p>
                </div>
            `;
            return;
        }

        // Render Recently Viewed Cards (Single-Pass String Map)
        const cardsHTML = products.slice(0, 8).map(product => `
            <div class="product-card glassmorphism" style="padding: 16px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; justify-content: space-between; text-align: center;">
                <div class="product-img" style="width: 100%; height: 160px; border-radius: 12px; overflow: hidden; background: #020617; margin-bottom: 12px;">
                    <img src="${product.image || 'images/no-image.png'}" alt="${product.name || 'Product'}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>

                <h3 style="font-size: 15px; color: #ffffff; margin-bottom: 6px; font-weight: 700;">${product.name || 'Store Item'}</h3>
                <p style="color: #00e5ff; font-size: 16px; font-weight: 900; margin-bottom: 12px;">₹${product.price || 0}</p>

                <button onclick="location.href='product-details.html?id=${product.id || product.productId}'" 
                        class="primary-btn" 
                        style="width: 100%; padding: 10px; border-radius: 10px; font-size: 12px; font-weight: 800; cursor: pointer;">
                    👁 View Product
                </button>
            </div>
        `).join('');

        box.innerHTML = cardsHTML;

    } catch (error) {
        console.error("Error loading recently viewed products:", error);
        box.innerHTML = `<h3 style="text-align: center; color: var(--danger); padding: 20px;">❌ Failed to load recent items</h3>`;
    }
}