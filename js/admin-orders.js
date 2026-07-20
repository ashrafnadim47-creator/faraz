import { db } from "./firebase-config.js";
import {
    collection,
    getDocs,
    updateDoc,
    setDoc,
    doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const box = document.getElementById("admin-order-list");

async function loadOrders() {
    if (!box) return;

    box.innerHTML = `<h3>Loading Orders...</h3>`;

    try {
        const users = await getDocs(collection(db, "users"));
        box.innerHTML = "";
        let totalOrders = 0;

        for (let userDoc of users.docs) {
            const userData = userDoc.data();
            const orders = await getDocs(collection(db, "users", userDoc.id, "orders"));

            orders.forEach((orderDoc) => {
                totalOrders++;
                const data = orderDoc.data();
                const status = data.status || "Pending";

                box.innerHTML += `
                <div class="order-card" style="background:#1e293b; border:1px solid #334155; padding:15px; border-radius:12px; margin-bottom:15px; color:#fff;">
                    <h3>📦 Order #${orderDoc.id}</h3>
                    <p>👤 User: <b>${userData.email || "User"}</b></p>
                    <p>💰 Amount: <b>₹${data.total || 0}</b></p>
                    <p>Current Status: <b style="color:#00e5ff">${status}</b></p>

                    <select onchange="changeStatus('${userDoc.id}', '${orderDoc.id}', this.value)" style="padding:8px; border-radius:6px; background:#0f172a; color:#fff; border:1px solid #4b5563; margin-top:8px; cursor:pointer;">
                        <option value="Pending" ${status === 'Pending' ? 'selected' : ''}>🟡 Pending</option>
                        <option value="Packed" ${status === 'Packed' ? 'selected' : ''}>📦 Packed</option>
                        <option value="Shipped" ${status === 'Shipped' ? 'selected' : ''}>🚚 Shipped</option>
                        <option value="Delivered" ${status === 'Delivered' ? 'selected' : ''}>✅ Delivered</option>
                    </select>
                </div>
                `;
            });
        }

        if (totalOrders === 0) {
            box.innerHTML = `<h2>No Orders Found 📦</h2>`;
        }

    } catch (error) {
        console.error("Error loading orders:", error);
        box.innerHTML = `<h2>❌ Orders Load Failed</h2>`;
    }
}

// Global function for Status Change
window.changeStatus = async function (uid, id, status) {
    try {
        // Update Order Status in Firestore
        await updateDoc(doc(db, "users", uid, "orders", id), {
            status: status
        });

        // Send Notification to User
        await setDoc(doc(db, "users", uid, "notifications", Date.now().toString()), {
            title: "Order Status Updated 📦",
            message: `Your Order #${id} is now ${status}`,
            time: new Date().toLocaleString()
        });

        alert("✅ Order Updated + Notification Sent");
        loadOrders();
    } catch (err) {
        console.error("Error updating status:", err);
        alert("❌ Failed to update status");
    }
};

loadOrders();