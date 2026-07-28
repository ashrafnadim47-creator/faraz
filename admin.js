import { db } from "./js/firebase-config.js";
import {
    collection,
    onSnapshot,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ordersContainer = document.getElementById("adminOrders");
const totalSalesElem = document.getElementById("totalSales");
const totalOrdersElem = document.getElementById("totalOrders");
const processingOrdersElem = document.getElementById("processingOrders");
const deliveredOrdersElem = document.getElementById("deliveredOrders");
const totalUsersElem = document.getElementById("totalUsers");

// ==========================================
// 📊 REALTIME ORDERS & REVENUE TRACKER
// ==========================================
function listenToOrders() {
    onSnapshot(collection(db, "orders"), (snapshot) => {
        let totalSales = 0;
        let totalOrders = 0;
        let processing = 0;
        let delivered = 0;

        if (snapshot.empty) {
            ordersContainer.innerHTML = `<p style="color: #94a3b8;">No orders placed yet.</p>`;
        } else {
            ordersContainer.innerHTML = "";
        }

        snapshot.forEach((docSnap) => {
            const order = docSnap.data();
            const id = docSnap.id;

            totalOrders++;
            const amount = Number(order.price || order.totalAmount || 0);
            totalSales += amount;

            if (order.status === "Delivered") {
                delivered++;
            } else {
                processing++;
            }

            // Render Order Card
            const card = document.createElement("div");
            card.className = "order-card";
            card.innerHTML = `
                <div>
                    <strong style="color: #00e5ff;">#${id.substring(0, 8)}</strong> - ${order.itemName || 'Product'} 
                    <br><small style="color: #94a3b8;">User: ${order.userEmail || 'Guest'} | Price: ₹${amount}</small>
                </div>
                <div>
                    <span style="padding: 4px 10px; border-radius: 8px; font-weight: bold; font-size: 12px; background: ${order.status === 'Delivered' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)'}; color: ${order.status === 'Delivered' ? '#22c55e' : '#eab308'};">
                        ${order.status || 'Processing'}
                    </span>
                    ${order.status !== 'Delivered' ? `<button onclick="markDelivered('${id}')" style="margin-left: 10px; padding: 6px 12px; background: #22c55e; border: none; color: #000; font-weight: bold; border-radius: 8px; cursor: pointer;">Deliver</button>` : ''}
                </div>
            `;
            ordersContainer.appendChild(card);
        });

        if (totalSalesElem) totalSalesElem.innerText = `₹${totalSales}`;
        if (totalOrdersElem) totalOrdersElem.innerText = totalOrders;
        if (processingOrdersElem) processingOrdersElem.innerText = processing;
        if (deliveredOrdersElem) deliveredOrdersElem.innerText = delivered;
    });
}

// ==========================================
// 👥 REALTIME USERS COUNT
// ==========================================
function listenToUsers() {
    onSnapshot(collection(db, "users"), (snapshot) => {
        if (totalUsersElem) {
            totalUsersElem.innerText = snapshot.size;
        }
    });
}

window.markDelivered = async function(orderId) {
    try {
        await updateDoc(doc(db, "orders", orderId), { status: "Delivered" });
        alert("✅ Order marked as Delivered!");
    } catch (err) {
        console.error(err);
        alert("Failed to update status.");
    }
};

// Initialize
listenToOrders();
listenToUsers();