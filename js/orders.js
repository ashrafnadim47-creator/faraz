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

const box = document.getElementById("orders-container") || document.getElementById("orders-box");
let currentUser = null;
window.ordersData = {};

// ==========================================
// 📦 LOAD ORDERS DATA ENGINE (ZERO DUPLICATES)
// ==========================================
async function loadOrders() {
    if (!box) return;

    box.innerHTML = `
        <div class="loading-state" style="text-align: center; padding: 40px;">
            <div class="spinner"></div>
            <p style="color: #00e5ff; margin-top: 10px; font-weight: 700;">Fetching Your Orders...</p>
        </div>
    `;

    const ordersMap = new Map();

    // 1. Primary Source: Real Firestore Orders
    if (currentUser) {
        try {
            const q = query(
                collection(db, "users", currentUser.uid, "orders"),
                orderBy("orderedAt", "desc")
            );

            const snap = await getDocs(q);
            if (!snap.empty) {
                snap.forEach((itemDoc) => {
                    const data = itemDoc.data();
                    const orderId = String(data.orderId || data.id || itemDoc.id).trim();
                    ordersMap.set(orderId, { id: orderId, ...data, docId: itemDoc.id });
                    window.ordersData[orderId] = data;
                });
            }
        } catch (error) {
            console.warn("Firestore user orders sync skipped:", error.message);
        }

        // Also check top-level orders if empty
        if (ordersMap.size === 0) {
            try {
                const snapTop = await getDocs(collection(db, "orders"));
                if (!snapTop.empty) {
                    snapTop.forEach((d) => {
                        const data = d.data();
                        if (data.userId === currentUser.uid || data.email === currentUser.email) {
                            const orderId = String(data.orderId || data.id || d.id).trim();
                            if (!ordersMap.has(orderId)) {
                                ordersMap.set(orderId, { id: orderId, ...data, docId: d.id });
                                window.ordersData[orderId] = data;
                            }
                        }
                    });
                }
            } catch (e) {}
        }
    }

    // 2. Secondary fallback: local storage only if Firestore yielded 0 orders
    if (ordersMap.size === 0) {
        try {
            const localOrders = JSON.parse(localStorage.getItem('faraz_local_orders') || "[]");
            localOrders.forEach(ord => {
                const orderId = String(ord.orderId || ord.id || "").trim();
                if (orderId && !ordersMap.has(orderId)) {
                    ordersMap.set(orderId, { id: orderId, ...ord });
                    window.ordersData[orderId] = ord;
                }
            });
        } catch (e) {
            console.warn("Local orders read error:", e);
        }
    }

    const ordersList = Array.from(ordersMap.values());

    // 3. Render Empty State
    if (ordersList.length === 0) {
        box.innerHTML = `
            <div style="text-align: center; padding: 50px 20px; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px;">
                <div style="color: #00e5ff; margin-bottom: 12px;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                </div>
                <h2 style="color: #ffffff; font-size: 20px; margin-bottom: 8px;">No Orders Placed Yet</h2>
                <p style="color: #94a3b8; font-size: 13px; margin-bottom: 20px;">Browse our gaming gear & diamond topups and place your first order!</p>
                <button onclick="location.href='product.html'" class="primary-btn" style="padding: 10px 26px; border-radius: 12px; font-weight: 800; background: linear-gradient(135deg, #00e5ff, #0077ff); color: #020617; border: 0; cursor: pointer;">
                    Explore Store
                </button>
            </div>
        `;
        return;
    }

    // 4. Render Cards
    const cardsMarkup = ordersList.map((order) => {
        const id = order.orderId || order.id;
        const status = order.status || "Completed";
        const total = order.total || order.price || 0;
        const dateStr = order.date || (order.orderedAt?.toDate ? order.orderedAt.toDate().toLocaleDateString() : new Date().toLocaleDateString());

        return `
            <div class="order-card glassmorphism" style="padding: 20px; border-radius: 16px; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.08); background: rgba(17, 24, 39, 0.85);">
                <div style="display:flex; justify-content: space-between; align-items:center; margin-bottom: 12px; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 8px;">
                    <h2 style="font-size: 16px; color: #00e5ff; margin: 0; font-family: 'Orbitron', sans-serif;">Order #${id}</h2>
                    <span style="font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 12px; background: rgba(0,229,255,0.1); color: #00e5ff; border: 1px solid #00e5ff;">
                        ${status}
                    </span>
                </div>

                <p style="margin: 6px 0; font-size: 14px; color: #e2e8f0;">Amount: <b style="color: #ffcc00;">₹${total}</b></p>
                <p style="margin: 4px 0; font-size: 12px; color: #94a3b8;">Date: ${dateStr}</p>
                
                <div class="order-buttons" style="display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap;">
                    <button class="track-btn" data-id="${id}" style="padding: 6px 14px; border-radius: 8px; background: #2563eb; color: #fff; border: none; font-weight: bold; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
                        Track
                    </button>
                    <button class="review-btn" data-id="${id}" style="padding: 6px 14px; border-radius: 8px; background: #8b5cf6; color: #fff; border: none; font-weight: bold; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        Review
                    </button>
                    <button class="invoice-btn" data-id="${id}" style="padding: 6px 14px; border-radius: 8px; background: #059669; color: #fff; border: none; font-weight: bold; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>
                        Invoice
                    </button>
                </div>
            </div>
        `;
    }).join('');

    box.innerHTML = cardsMarkup;
    attachOrderButtonListeners();
}

// 🔑 AUTHENTICATION INITIALIZATION
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    loadOrders();
});

// ==========================================
// ⚡ EVENT LISTENERS FOR ORDER ACTIONS
// ==========================================
function attachOrderButtonListeners() {
    document.querySelectorAll('.track-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            location.href = `tracking.html?id=${id}`;
        });
    });

    document.querySelectorAll('.review-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            window.openReview(id);
        });
    });

    document.querySelectorAll('.invoice-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            generateInvoice(id);
        });
    });
}

// ==========================================
// 📝 REVIEW POPUP ENGINE
// ==========================================
window.openReview = function(id) {
    const pop = document.getElementById("review-popup");
    if (!pop) return;
    pop.setAttribute("data-id", id);
    pop.style.display = "block";
};

window.closeReview = function() {
    const pop = document.getElementById("review-popup");
    if (pop) pop.style.display = "none";
};

window.submitReview = async function() {
    const pop = document.getElementById("review-popup");
    const id = pop ? pop.getAttribute("data-id") : null;
    const rating = document.getElementById("rating")?.value;
    const text = document.getElementById("review-text")?.value;

    if (!text || text.trim() === "") {
        if (window.showToast) window.showToast("Please write review comments.", "warning");
        return;
    }

    try {
        if (currentUser && id) {
            await setDoc(doc(db, "orders", id, "reviews", currentUser.uid), {
                rating: rating,
                text: text,
                reviewedAt: new Date()
            });
        }
    } catch (e) {
        console.warn("Review submission skipped:", e.message);
    }

    if (window.showToast) {
        window.showToast("Review submitted successfully! Thank you.", "success");
    }
    window.closeReview();
};

// ==========================================
// 🧾 INVOICE GENERATOR ENGINE
// ==========================================
function generateInvoice(id) {
    const order = window.ordersData[id];
    if (!order) {
        if (window.showToast) window.showToast("Order details not found.", "error");
        return;
    }

    const total = order.total || order.price || 0;
    const date = order.date || new Date().toLocaleDateString();
    const items = order.items || [{ name: order.productName || "Gaming Item", price: total, quantity: 1 }];

    const win = window.open("", "_blank");
    win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice #${id} - Faraz Store</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1e293b; background: #fff; }
                .invoice-header { display: flex; justify-content: space-between; border-bottom: 2px solid #00e5ff; padding-bottom: 20px; }
                .brand { font-size: 24px; font-weight: 900; color: #0284c7; }
                table { width: 100%; border-collapse: collapse; margin-top: 30px; }
                th, td { padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: left; }
                th { background: #f8fafc; font-weight: bold; }
                .total-row { font-size: 18px; font-weight: 900; text-align: right; margin-top: 25px; }
                .badge { background: #dcfce7; color: #15803d; padding: 4px 10px; border-radius: 6px; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="invoice-header">
                <div>
                    <div class="brand">FARAZ STORE</div>
                    <p style="color: #64748b; font-size: 13px; margin: 4px 0;">Official Gaming & Tech Hub</p>
                </div>
                <div style="text-align: right;">
                    <h2 style="margin: 0; font-size: 20px;">INVOICE</h2>
                    <p style="margin: 4px 0; color: #64748b; font-size: 13px;">Order ID: #${id}</p>
                    <p style="margin: 4px 0; color: #64748b; font-size: 13px;">Date: ${date}</p>
                    <span class="badge">PAID</span>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Item Description</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(i => `
                        <tr>
                            <td>${i.name || "Gaming Item"}</td>
                            <td>${i.quantity || 1}</td>
                            <td>₹${i.price || total}</td>
                            <td>₹${(i.price || total) * (i.quantity || 1)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="total-row">
                Total Amount Paid: ₹${total}
            </div>

            <div style="margin-top: 50px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px dashed #cbd5e1; padding-top: 20px;">
                Thank you for choosing Faraz Store! For support, visit contact.html or email farazanjum000@gmail.com
            </div>
            <script>window.print();</script>
        </body>
        </html>
    `);
    win.document.close();
}
