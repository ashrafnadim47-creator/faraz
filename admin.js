import { db, auth } from "./firebase.js";
import {
    collection,
    getDocs,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// =========================
// 🛡️ ADMIN GUARD & AUTH
// =========================
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "admin-login.html";
        return;
    }

    loadAdminOrders();
});

// =========================
// 📦 LOAD ADMIN ORDERS ENGINE
// =========================
async function loadAdminOrders() {
    const box = document.getElementById("adminOrders");
    if (!box) return;

    box.innerHTML = `
        <div class="loading-state" style="text-align: center; padding: 40px;">
            <div class="spinner"></div>
            <p style="color: #00e5ff; margin-top: 10px; font-weight: 700;">Syncing Orders Database...</p>
        </div>
    `;

    try {
        const snap = await getDocs(collection(db, "orders"));

        if (snap.empty) {
            box.innerHTML = `<h3 style="text-align: center; color: var(--muted); padding: 40px;">No Orders Found 📦</h3>`;
            document.getElementById("totalOrders").innerText = "0";
            document.getElementById("totalSales").innerText = "₹0";
            document.getElementById("processingOrders").innerText = "0";
            document.getElementById("deliveredOrders").innerText = "0";
            return;
        }

        let totalOrders = 0;
        let totalSales = 0;
        let processing = 0;
        let delivered = 0;

        const statusOptions = [
            "🟡 Processing",
            "📦 Packed",
            "🚚 Shipped",
            "🏠 Out for Delivery",
            "🟢 Delivered",
            "❌ Cancelled"
        ];

        // Single Pass High-Performance Rendering
        const cardsHTML = snap.docs.map((dataDoc) => {
            const order = dataDoc.data();
            const id = dataDoc.id;

            totalOrders++;
            totalSales += Number(order.total || order.price || 0);

            const currentStatus = order.status || "🟡 Processing";

            if (currentStatus === "🟡 Processing") processing++;
            if (currentStatus === "🟢 Delivered") delivered++;

            const optionsHTML = statusOptions.map(opt => `
                <option value="${opt}" ${opt === currentStatus ? 'selected' : ''}>${opt}</option>
            `).join('');

            return `
                <div class="order-card glassmorphism" style="padding: 20px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(30, 41, 59, 0.6); display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; justify-between; align-items: center; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 8px;">
                        <h2 style="font-size: 16px; color: #00e5ff; margin: 0; font-family: 'Orbitron', sans-serif;">📦 #${order.orderId || id}</h2>
                        <span style="font-size: 12px; font-weight: 800; color: #ffcc00; background: rgba(255, 204, 0, 0.1); padding: 4px 10px; border-radius: 12px; border: 1px solid rgba(255, 204, 0, 0.3);">
                            ${currentStatus}
                        </span>
                    </div>

                    <p style="margin: 2px 0; font-size: 14px; color: #e2e8f0;"><b>Customer:</b> <span style="color: #38bdf8;">${order.customerName || order.userEmail || "Customer"}</span></p>
                    <p style="margin: 2px 0; font-size: 14px; color: #e2e8f0;"><b>Phone:</b> ${order.phone || order.mobile || "N/A"}</p>
                    <p style="margin: 2px 0; font-size: 14px; color: #e2e8f0;"><b>Items:</b> ${order.productName || "Store Products"}</p>
                    <p style="margin: 2px 0; font-size: 14px; color: #e2e8f0;"><b>Total Amount:</b> <b style="color: #ffcc00;">₹${order.total || order.price || 0}</b></p>

                    <div style="margin-top: 10px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                        <select id="status-${id}" style="padding: 10px 14px; border-radius: 10px; background: #0f1118; color: #ffffff; border: 1px solid #334155; font-size: 13px; font-weight: 700; outline: none; cursor: pointer; flex: 1; min-width: 180px;">
                            ${optionsHTML}
                        </select>

                        <button onclick="updateStatus('${id}')" class="primary-btn" style="padding: 10px 20px; border-radius: 10px; font-size: 13px; background: linear-gradient(135deg, #2563eb, #7c3aed); color: #ffffff; border: none; font-weight: 800; cursor: pointer;">
                            Update Status
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        box.innerHTML = cardsHTML;

        // Dynamic Counters Update
        document.getElementById("totalOrders").innerText = totalOrders;
        document.getElementById("totalSales").innerText = "₹" + totalSales.toLocaleString();
        document.getElementById("processingOrders").innerText = processing;
        document.getElementById("deliveredOrders").innerText = delivered;

    } catch (error) {
        console.error("Error fetching admin orders:", error);
        box.innerHTML = `<h3 style="text-align: center; color: var(--danger); padding: 40px;">❌ Error Loading Orders</h3>`;
    }
}

// =========================
// 🔄 UPDATE STATUS ACTION
// =========================
window.updateStatus = async function (id) {
    const statusSelect = document.getElementById("status-" + id);
    if (!statusSelect) return;

    const selectedValue = statusSelect.value;

    try {
        await updateDoc(doc(db, "orders", id), {
            status: selectedValue
        });

        alert(`✅ Status Updated To: "${selectedValue}"`);
        loadAdminOrders();
    } catch (error) {
        console.error("Error updating order status:", error);
        alert("❌ Failed to update status.");
    }
};

// =========================
// 🚪 LOGOUT ACTION
// =========================
window.logout = async function () {
    try {
        await signOut(auth);
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace("index.html");
    } catch (error) {
        console.error("Logout error:", error);
        window.location.replace("index.html");
    }
};