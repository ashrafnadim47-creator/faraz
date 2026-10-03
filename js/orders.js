import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    collection,
    getDocs,
    addDoc,
    serverTimestamp,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const box = document.getElementById("orders-container");
window.ordersData = {};
let currentUser = null;

// ==========================================
// 🔑 AUTHENTICATION & INITIALIZATION
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        location.href = "login.html";
        return;
    }
    currentUser = user;
    loadOrders();
});

// ==========================================
// 📦 LOAD USER ORDERS
// ==========================================
async function loadOrders() {
    if (!box) return;

    box.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Fetching Your Orders...</p>
        </div>
    `;

    try {
        const q = query(
            collection(db, "users", currentUser.uid, "orders"),
            orderBy("orderedAt", "desc")
        );

        const snap = await getDocs(q);
        box.innerHTML = "";

        if (snap.empty) {
            box.innerHTML = `<h2 style="text-align:center; color: var(--muted); margin-top: 30px;">No Orders Found 📦</h2>`;
            return;
        }

        window.ordersData = {};

        const cardsMarkup = snap.docs.map((itemDoc) => {
            const id = itemDoc.id;
            const order = itemDoc.data();
            window.ordersData[id] = order;

            const status = order.status || "Pending";
            
            return `
                <div class="order-card glassmorphism" style="padding: 20px; border-radius: 16px; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.1); background: rgba(17, 24, 39, 0.85);">
                    <div style="display:flex; justify-between; align-items:center; margin-bottom: 12px; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 8px;">
                        <h2 style="font-size: 18px; color: var(--primary); margin: 0;">📦 Order #${id}</h2>
                        <span style="font-size: 12px; font-weight: 800; padding: 4px 10px; border-radius: 12px; background: rgba(0,229,255,0.1); color: #00e5ff; border: 1px solid #00e5ff;">
                            ${status}
                        </span>
                    </div>

                    <p style="margin: 6px 0; font-size: 15px; color: #e2e8f0;">💰 Amount: <b style="color: #ffcc00;">₹${order.total || 0}</b></p>
                    
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

    } catch (error) {
        console.error("Error loading orders:", error);
        box.innerHTML = `<h3 style="text-align:center; color: var(--danger);">❌ Failed to load orders</h3>`;
    }
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

// ==========================================
// ⭐ REVIEW POPUP LOGIC
// ==========================================
window.openReview = function (id) {
    window.currentReviewOrder = id;
    const popup = document.getElementById("review-popup");
    if (popup) popup.style.display = "flex";
};

window.closeReview = function () {
    const popup = document.getElementById("review-popup");
    if (popup) popup.style.display = "none";
};

window.submitReview = async function () {
    const textInput = document.getElementById("review-text");
    const text = textInput?.value.trim();

    if (!text) {
        alert("Please write a review before submitting!");
        return;
    }

    try {
        await addDoc(collection(db, "users", currentUser.uid, "reviews"), {
            orderId: window.currentReviewOrder,
            text: text,
            createdAt: serverTimestamp()
        });

        alert("⭐ Review Submitted Successfully!");
        if (textInput) textInput.value = "";
        closeReview();
    } catch (err) {
        console.error("Error submitting review:", err);
        alert("❌ Failed to submit review.");
    }
};

// ==========================================
// 🧾 INVOICE GENERATOR POPUP
// ==========================================
window.openInvoice = function (orderId) {
    const order = window.ordersData[orderId];
    if (!order) return;

    let itemsHTML = "";
    (order.items || []).forEach((item, index) => {
        itemsHTML += `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #334155;">${index + 1}</td>
                <td style="padding: 8px; border-bottom: 1px solid #334155;">${item.name}</td>
                <td style="padding: 8px; border-bottom: 1px solid #334155;">₹${item.price}</td>
            </tr>
        `;
    });

    const contentBox = document.getElementById("invoice-content");
    if (contentBox) {
        contentBox.innerHTML = `
            <div style="text-align: center; margin-bottom: 15px;">
                <h1 style="color: var(--primary); margin: 0;">🛍️ FARAZ STORE</h1>
                <p style="color: var(--muted); font-size: 12px; margin: 0;">Official Sales Invoice</p>
            </div>
            <hr style="border-color: rgba(255,255,255,0.1); margin: 15px 0;">

            <p><b>Invoice ID:</b> FS-${orderId.slice(0, 8).toUpperCase()}</p>
            <p><b>Status:</b> <span style="color: #00e5ff;">${order.status || 'Paid'}</span></p>

            <table style="width: 100%; border-collapse: collapse; margin: 15px 0; text-align: left;">
                <thead>
                    <tr style="background: #1e293b;">
                        <th style="padding: 8px;">#</th>
                        <th style="padding: 8px;">Product</th>
                        <th style="padding: 8px;">Price</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHTML || '<tr><td colspan="3" style="padding:8px; text-align:center;">General Order</td></tr>'}
                </tbody>
            </table>

            <hr style="border-color: rgba(255,255,255,0.1); margin: 15px 0;">
            <h2 style="color: #ffcc00; text-align: right; margin: 0;">Total Paid: ₹${order.total || 0}</h2>
            <p style="text-align: center; font-size: 12px; color: var(--muted); margin-top: 20px;">Thank you for shopping with Faraz Store ❤️</p>
        `;
    }

    const popup = document.getElementById("invoice-popup");
    if (popup) popup.style.display = "flex";
};

window.closeInvoice = function () {
    const popup = document.getElementById("invoice-popup");
    if (popup) popup.style.display = "none";
};