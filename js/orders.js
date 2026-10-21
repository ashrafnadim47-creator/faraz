import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    collection,
    getDocs,
    query,
    orderBy,
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const box = document.getElementById("orders-box");
let currentUser = null;

// ==========================================
// 🔑 AUTHENTICATION INITIALIZATION
// ==========================================
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (box) {
        loadOrders();
    }
});

// ==========================================
// 📦 LOAD ORDERS DATA ENGINE
// ==========================================
async function loadOrders() {
    if (!box) return;

    box.innerHTML = `
        <div class="loading-state" style="text-align: center; padding: 40px;">
            <div class="spinner"></div>
            <p style="color: #00e5ff; margin-top: 10px; font-weight: 700;">Fetching Your Orders...</p>
        </div>
    `;

    let ordersList = [];
    window.ordersData = {};

    // 1. Try Firestore if logged in
    if (currentUser) {
        try {
            const q = query(
                collection(db, "users", currentUser.uid, "orders"),
                orderBy("orderedAt", "desc")
            );

            const snap = await getDocs(q);
            if (!snap.empty) {
                snap.forEach((itemDoc) => {
                    const id = itemDoc.id;
                    const order = itemDoc.data();
                    window.ordersData[id] = order;
                    ordersList.push({ id, ...order });
                });
            }
        } catch (error) {
            console.warn("Firestore orders load skipped, using local cache:", error.message);
        }
    }

    // 2. Fallback to local storage if Firestore is empty or unauthorized
    if (ordersList.length === 0) {
        const localOrders = JSON.parse(localStorage.getItem('faraz_local_orders') || "[]");
        localOrders.forEach(ord => {
            const id = ord.id || `ORD_${Date.now()}`;
            window.ordersData[id] = ord;
            ordersList.push({ id, ...ord });
        });
    }

    if (ordersList.length === 0) {
        box.innerHTML = `
            <div style="text-align: center; padding: 50px 20px;">
                <div style="font-size: 50px; margin-bottom: 12px;">📦</div>
                <h2 style="color: #ffffff; font-size: 22px; margin-bottom: 8px;">No Orders Placed Yet</h2>
                <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">Browse our gaming gear & diamond topups and place your first order!</p>
                <button onclick="location.href='product.html'" class="primary-btn" style="padding: 12px 30px; border-radius: 20px; font-weight: 800;">
                    🚀 Explore Store
                </button>
            </div>
        `;
        return;
    }

    const cardsMarkup = ordersList.map((order) => {
        const id = order.id;
        const status = order.status || "Completed";
        
        return `
            <div class="order-card glassmorphism" style="padding: 20px; border-radius: 16px; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.1); background: rgba(17, 24, 39, 0.85);">
                <div style="display:flex; justify-content: space-between; align-items:center; margin-bottom: 12px; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 8px;">
                    <h2 style="font-size: 18px; color: var(--primary, #00e5ff); margin: 0;">📦 Order #${id}</h2>
                    <span style="font-size: 12px; font-weight: 800; padding: 4px 10px; border-radius: 12px; background: rgba(0,229,255,0.1); color: #00e5ff; border: 1px solid #00e5ff;">
                        ${status}
                    </span>
                </div>

                <p style="margin: 6px 0; font-size: 15px; color: #e2e8f0;">💰 Amount: <b style="color: #ffcc00;">₹${order.total || order.price || 0}</b></p>
                <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">📅 Date: ${order.date || new Date().toLocaleDateString()}</p>
                
                <div class="order-buttons" style="display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap;">
                    <button class="track-btn" data-id="${id}" style="padding: 8px 16px; border-radius: 8px; background: #2563eb; color: #fff; border: none; font-weight: bold; cursor: pointer;">
                        📍 Track
                    </button>
                    <button class="review-btn" data-id="${id}" style="padding: 8px 16px; border-radius: 8px; background: #8b5cf6; color: #fff; border: none; font-weight: bold; cursor: pointer;">
                        ⭐ Review
                    </button>
                    <button class="invoice-btn" data-id="${id}" style="padding: 8px 16px; border-radius: 8px; background: #059669; color: #fff; border: none; font-weight: bold; cursor: pointer;">
                        🧾 Invoice
                    </button>
                </div>
            </div>
        `;
    }).join('');

    box.innerHTML = cardsMarkup;
    attachOrderButtonListeners();
}

// ==========================================
// ⚡ EVENT LISTENERS FOR ORDER ACTIONS
// ==========================================
function attachOrderButtonListeners() {
    document.querySelectorAll('.track-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            location.href = `tracking.html?id=${id}`;
        });
    });

    document.querySelectorAll('.review-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            openReview(id);
        });
    });

    document.querySelectorAll('.invoice-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            openInvoice(id);
        });
    });
}

function openReview(id) {
    alert(`⭐ Review dialog for Order #${id} opened! You can rate this order.`);
}

function openInvoice(id) {
    const order = window.ordersData[id] || {};
    const win = window.open('', '_blank');
    win.document.write(`
        <html>
        <head><title>Invoice #${id}</title><style>body{font-family:sans-serif;padding:30px;color:#333;}h1{color:#2563eb;}</style></head>
        <body>
            <h1>🔥 FARAZ STORE OFFICIAL INVOICE</h1>
            <p><b>Order ID:</b> #${id}</p>
            <p><b>Amount:</b> ₹${order.total || order.price || 0}</p>
            <p><b>Status:</b> ${order.status || 'Paid / Verified'}</p>
            <p><b>Date:</b> ${new Date().toLocaleString()}</p>
            <hr>
            <p>Thank you for shopping at Faraz Store!</p>
        </body>
        </html>
    `);
}
