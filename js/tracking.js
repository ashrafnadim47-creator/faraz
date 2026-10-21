import { auth, db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const orderID = new URLSearchParams(location.search).get("id");
const box = document.getElementById("tracking-data");

// ==========================================
// 📦 LIVE ORDER TRACKING ENGINE
// ==========================================
async function renderTrackingOrder(order) {
    if (!box) return;

    let progress = 25;
    const status = order.status || "Processing";

    if (status.includes("Packed")) progress = 50;
    else if (status.includes("Shipped")) progress = 75;
    else if (status.includes("Delivered") || status.includes("Completed")) progress = 100;
    else progress = 35;

    const date = order.date || (order.orderedAt?.toDate ? order.orderedAt.toDate().toLocaleDateString() : new Date().toLocaleDateString());
    const itemsName = order.productName || (order.items ? order.items.map(i => i.name).join(', ') : "Gaming Order");

    box.innerHTML = `
        <div class="track-card glassmorphism">

            <!-- Header Summary -->
            <div class="track-summary">
                <div>
                    <h2 class="order-title">Order #${orderID}</h2>
                    <p class="order-items">Items: <b>${itemsName}</b></p>
                </div>
                <div class="status-badge" style="padding: 4px 12px; border-radius: 12px; background: rgba(0,229,255,0.15); color: #00e5ff; border: 1px solid #00e5ff; font-weight: 800;">
                    ${status}
                </div>
            </div>

            <p class="order-date">Ordered On: <b>${date}</b></p>

            <!-- Progress Bar -->
            <div class="progress" style="margin: 20px 0; background: rgba(255,255,255,0.1); border-radius: 999px; height: 10px; overflow: hidden;">
                <div class="progress-fill" style="width:${progress}%; height: 100%; background: linear-gradient(90deg, #00e5ff, #22c55e);"></div>
            </div>

            <!-- Timeline Steps -->
            <div class="timeline" style="margin-top: 25px;">
                <div class="step active" style="margin-bottom: 14px;">
                    <div>
                        <h4 style="color: #22c55e; margin: 0;">✓ Order Placed</h4>
                        <p style="color: #94a3b8; font-size: 12px; margin: 2px 0 0 0;">Your order was received and confirmed</p>
                    </div>
                </div>

                <div class="step ${progress >= 50 ? "active" : ""}" style="margin-bottom: 14px;">
                    <div>
                        <h4 style="color: ${progress >= 50 ? '#22c55e' : '#64748b'}; margin: 0;">${progress >= 50 ? '✓' : '○'} Packed</h4>
                        <p style="color: #94a3b8; font-size: 12px; margin: 2px 0 0 0;">Item inspected and sealed in warehouse</p>
                    </div>
                </div>

                <div class="step ${progress >= 75 ? "active" : ""}" style="margin-bottom: 14px;">
                    <div>
                        <h4 style="color: ${progress >= 75 ? '#22c55e' : '#64748b'}; margin: 0;">${progress >= 75 ? '✓' : '○'} Dispatched</h4>
                        <p style="color: #94a3b8; font-size: 12px; margin: 2px 0 0 0;">Handed over to delivery carrier</p>
                    </div>
                </div>

                <div class="step ${progress >= 100 ? "active" : ""}">
                    <div>
                        <h4 style="color: ${progress >= 100 ? '#22c55e' : '#64748b'}; margin: 0;">${progress >= 100 ? '✓' : '○'} Delivered</h4>
                        <p style="color: #94a3b8; font-size: 12px; margin: 2px 0 0 0;">Delivered safely to customer</p>
                    </div>
                </div>
            </div>

        </div>
    `;
}

async function fetchOrder() {
    if (!orderID) {
        if (box) {
            box.innerHTML = `
                <div class="track-card glassmorphism" style="text-align: center; padding: 40px;">
                    <h2 style="color: #ef4444; font-size: 20px;">Order ID Missing</h2>
                    <p style="color: #94a3b8; margin-top: 10px;">Please enter or select a valid order from your orders list.</p>
                    <button onclick="location.href='orders.html'" class="primary-btn" style="margin-top: 15px; padding: 8px 20px;">View My Orders</button>
                </div>
            `;
        }
        return;
    }

    // 1. Check local storage first
    try {
        const localOrders = JSON.parse(localStorage.getItem('faraz_local_orders') || "[]");
        const found = localOrders.find(o => o.orderId === orderID || o.id === orderID);
        if (found) {
            renderTrackingOrder(found);
            return;
        }
    } catch (e) {}

    // 2. Check Firestore
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const snap = await getDoc(doc(db, "users", user.uid, "orders", orderID));
                if (snap.exists()) {
                    renderTrackingOrder(snap.data());
                    return;
                }
            } catch (err) {}
        }

        // 3. Fallback tracking order display
        renderTrackingOrder({
            orderId: orderID,
            status: "Processing",
            total: 799,
            productName: "Faraz Store Verified Order"
        });
    });
}

fetchOrder();
