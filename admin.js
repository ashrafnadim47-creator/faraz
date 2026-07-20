// admin.js

import { db, auth } from "./firebase.js";

import {
    collection,
    getDocs,
    doc,
    updateDoc
}
from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
}
from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


// =========================
// ADMIN GUARD
// =========================

onAuthStateChanged(auth, (user) => {

    if (!user) {

        window.location.href = "admin-login.html";
        return;

    }

    loadAdminOrders();

});


// =========================
// LOAD ADMIN ORDERS
// =========================

async function loadAdminOrders() {

    const box = document.getElementById("adminOrders");

    const snap = await getDocs(
        collection(db, "orders")
    );

    console.log("Firebase Orders:", snap.size);

    box.innerHTML = "";

    let totalOrders = 0;
    let totalSales = 0;
    let processing = 0;
    let delivered = 0;

    snap.forEach((data) => {

        const order = data.data();

        const id = data.id;

        totalOrders++;

        totalSales += Number(order.total || 0);

        if (order.status === "🟡 Processing") {

            processing++;

        }

        if (order.status === "🟢 Delivered") {

            delivered++;

        }

        box.innerHTML += `

<div class="order-card">

<h2>📦 ${order.orderId}</h2>

<p><b>Customer:</b> ${order.customerName}</p>

<p><b>Phone:</b> ${order.phone}</p>

<p><b>Total:</b> ₹${order.total}</p>

<p><b>Status:</b> ${order.status}</p>

<select id="status-${id}">

<option>🟡 Processing</option>

<option>📦 Packed</option>

<option>🚚 Shipped</option>

<option>🏠 Out for Delivery</option>

<option>🟢 Delivered</option>

<option>❌ Cancelled</option>

</select>

<button onclick="updateStatus('${id}')">

Update Status

</button>

</div>

`;

    });

    document.getElementById("totalOrders").innerHTML =
        totalOrders;

    document.getElementById("totalSales").innerHTML =
        "₹" + totalSales.toLocaleString();

    document.getElementById("processingOrders").innerHTML =
        processing;

    document.getElementById("deliveredOrders").innerHTML =
        delivered;

}
// =========================
// UPDATE STATUS
// =========================

window.updateStatus = async function(id){

    const value = document.getElementById("status-" + id).value;

    await updateDoc(
        doc(db, "orders", id),
        {
            status: value
        }
    );

    alert("✅ Status Updated");

};


window.logout = async function () {

    await signOut(auth);

    // Purana session clear
    localStorage.clear();
    sessionStorage.clear();

    // Direct Home Page
    window.location.replace("index.html");

};