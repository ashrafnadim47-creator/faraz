
import { auth, db } from "./firebase-config.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const orderID = new URLSearchParams(location.search).get("id");

const box = document.getElementById("tracking-data");

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        location.href = "login.html";
        return;
    }

    if (!orderID) {
        box.innerHTML = "<h2>❌ Order not found</h2>";
        return;
    }

    const ref = doc(db, "users", user.uid, "orders", orderID);

    const snap = await getDoc(ref);

    if (!snap.exists()) {
        box.innerHTML = "<h2>❌ Order not found</h2>";
        return;
    }

    const order = snap.data();

    let progress = 25;

    switch (order.status) {
        case "Packed":
            progress = 50;
            break;

        case "Shipped":
            progress = 75;
            break;

        case "Delivered":
            progress = 100;
            break;

        default:
            progress = 25;
    }

    const date = order.orderedAt?.toDate
        ? order.orderedAt.toDate().toLocaleDateString()
        : "Processing";

    box.innerHTML = `

<div class="track-card">

<h2>📦 Order #${orderID}</h2>

<p><b>Status:</b> <span class="status">${order.status}</span></p>

<p><b>Ordered:</b> ${date}</p>

<div class="progress">

<div class="progress-fill" style="width:${progress}%"></div>

</div>


<div class="truck-section">

<div class="truck-box">

<div class="road"></div>

<div class="warehouse">🏬</div>

<div class="truck"
style="left:calc(${progress}% - 20px)">
🚚
</div>

<div class="home">🏠</div>

</div>

</div>


<div class="timeline">

<div class="step ${progress>=25?"active":""}">
✅ Order Placed
</div>

<div class="step ${progress>=50?"active":""}">
📦 Packed
</div>

<div class="step ${progress>=75?"active":""}">
🚚 Shipped
</div>

<div class="step ${progress>=100?"active":""}">
🏠 Delivered
</div>

</div>


<div class="map-card">

<h3>📍 Delivery Route</h3>

<div class="point ${progress>=25?"done":""}">
🏬 Warehouse
</div>

<div class="point ${progress>=75?"done":""}">
🚚 On The Way
</div>

<div class="point ${progress>=100?"done":""}">
🏠 Destination
</div>

</div>


<div class="delivery-card">

<h3>🚚 Delivery Information</h3>

<p>📅 Estimated Delivery: <b>2 - 4 Days</b></p>

<p>🚛 Courier: <b>Faraz Express</b></p>

<p>📞 Support: <b>support@farazstore.com</b></p>

<p>💳 Payment: <b>Cash on Delivery</b></p>

</div>

</div>

`;

});