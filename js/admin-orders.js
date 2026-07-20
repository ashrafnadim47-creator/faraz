import { db } from "./firebase-config.js";
import {
    collection,
    getDocs,
    updateDoc,
    setDoc,
    doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const box = document.getElementById("admin-order-list");

// ==========================================================================
// 📦 LOAD ALL ORDERS (FAST PARALLEL FETCH)
// ==========================================================================
async function loadOrders() {
    if (!box) return;

    box.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Syncing Live Orders...</p>
        </div>
    `;

    try {
        const usersSnap = await getDocs(collection(db, "users"));
        
        // Fetch all user order subcollections concurrently in parallel
        const userOrdersPromises = usersSnap.docs.map(async (userDoc) => {
            const userData = userDoc.data();
            const uid = userDoc.id;
            const ordersSnap = await getDocs(collection(db, "users", uid, "orders"));
            
            return ordersSnap.docs.map(orderDoc => ({
                uid,
                orderId: orderDoc.id,
                userData,
                orderData: orderDoc.data()
            }));
        });

        const nestedOrders = await Promise.all(userOrdersPromises);
        const allOrders = nestedOrders.flat();

        if (allOrders.length === 0) {
            box.innerHTML = `<h3 style="text-align: center; color: var(--muted); margin-top: 30px;">No Orders Found 📦</h3>`;
            return;
        }

        // Single Pass HTML Construction
        box.innerHTML = allOrders.map(item => renderOrderCard(item)).join('');

        // Attach safe listeners for dropdown changes
        attachStatusChangeListeners();

    } catch (error) {
        console.error("Error loading orders:", error);
        box.innerHTML = `<h3 style="text-align: center; color: var(--danger); margin-top: 30px;">❌ Orders Load Failed</h3>`;
    }
}

// ==========================================================================
// 🎨 ORDER CARD RENDERER
// ==========================================================================
function renderOrderCard({ uid, orderId, userData, orderData }) {
    const status = orderData.status || "Pending";
    const userEmail = userData.email || userData.name || "Customer";
    const amount = orderData.total || orderData.price || 0;
    const items = orderData.productName || (orderData.items ? orderData.items.map(i => i.name).join(', ') : "Store Item");

    const statusColors = {
        Pending: "#eab308",
        Packed: "#38bdf8",
        Shipped: "#8b5cf6",
        Delivered: "#22c55e"
    };

    const currentStatusColor = statusColors[status] || "#00e5ff";

    return `
        <div class="order-card glassmorphism" style="padding: 20px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.1); margin-bottom: 16px; background: rgba(17, 24, 39, 0.85);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px dashed rgba(255, 255, 255, 0.1); padding-bottom: 10px;">
                <h3 style="color: var(--primary); font-size: 16px; margin: 0;">📦 Order #${orderId}</h3>
                <span style="background: rgba(255,255,255,0.05); padding: 4px 12px; border-radius: 20px; font-size: 12px; color: ${currentStatusColor}; font-weight: 800; border: 1px solid ${currentStatusColor};">
                    ${status}
                </span>
            </div>

            <p style="margin: 6px 0; font-size: 14px; color: #e2e8f0;">👤 Customer: <b style="color: #38bdf8;">${userEmail}</b></p>
            <p style="margin: 6px 0; font-size: 14px; color: #e2e8f0;">🛍️ Items: <b>${items}</b></p>
            <p style="margin: 6px 0; font-size: 14px; color: #e2e8f0;">💰 Amount: <b style="color: #ffcc00;">₹${amount}</b></p>

            <div style="margin-top: 14px; display: flex; align-items: center; gap: 10px;">
                <label style="font-size: 12px; color: var(--muted); font-weight: 700;">UPDATE STATUS:</label>
                <select class="status-select-btn" data-uid="${uid}" data-id="${orderId}" style="padding: 8px 12px; border-radius: 8px; background: #0f172a; color: #ffffff; border: 1px solid #334155; font-size: 13px; font-weight: 700; cursor: pointer; outline: none;">
                    <option value="Pending" ${status === 'Pending' ? 'selected' : ''}>🟡 Pending</option>
                    <option value="Packed" ${status === 'Packed' ? 'selected' : ''}>📦 Packed</option>
                    <option value="Shipped" ${status === 'Shipped' ? 'selected' : ''}>🚚 Shipped</option>
                    <option value="Delivered" ${status === 'Delivered' ? 'selected' : ''}>✅ Delivered</option>
                </select>
            </div>
        </div>
    `;
}

// ==========================================================================
// ⚡ EVENT DELEGATION FOR STATUS UPDATES
// ==========================================================================
function attachStatusChangeListeners() {
    document.querySelectorAll(".status-select-btn").forEach(selectEl => {
        selectEl.addEventListener("change", async (e) => {
            const select = e.target;
            const uid = select.getAttribute("data-uid");
            const orderId = select.getAttribute("data-id");
            const newStatus = select.value;

            select.disabled = true;
            
            try {
                // 1. Update Order Status in Firestore
                await updateDoc(doc(db, "users", uid, "orders", orderId), {
                    status: newStatus
                });

                // 2. Push Realtime Notification to User
                await setDoc(doc(db, "users", uid, "notifications", Date.now().toString()), {
                    title: "Order Status Updated 📦",
                    message: `Your Order #${orderId} is now ${newStatus}`,
                    time: new Date().toLocaleString()
                });

                alert(`✅ Order #${orderId} updated to "${newStatus}" and notification sent!`);
                loadOrders();

            } catch (err) {
                console.error("Error updating status:", err);
                alert("❌ Failed to update status.");
                select.disabled = false;
            }
        });
    });
}

// Initial Load Trigger
loadOrders();