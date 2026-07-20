import { auth, db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const orderID = new URLSearchParams(location.search).get("id");
const box = document.getElementById("tracking-data");

// ==========================================
// 📦 LIVE ORDER TRACKING ENGINE
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        location.href = "login.html";
        return;
    }

    if (!box) return;

    if (!orderID) {
        box.innerHTML = `
            <div class="track-card glassmorphism" style="text-align: center; padding: 40px;">
                <h2 style="color: var(--danger, #ef4444); font-size: 20px;">❌ Order ID Missing</h2>
                <p style="color: var(--muted, #94a3b8); margin-top: 10px;">Please select a valid order from your orders list.</p>
            </div>
        `;
        return;
    }

    try {
        const ref = doc(db, "users", user.uid, "orders", orderID);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
            box.innerHTML = `
                <div class="track-card glassmorphism" style="text-align: center; padding: 40px;">
                    <h2 style="color: var(--danger, #ef4444); font-size: 20px;">❌ Order Not Found</h2>
                    <p style="color: var(--muted, #94a3b8); margin-top: 10px;">Order #${orderID} could not be located in your account.</p>
                </div>
            `;
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
            ? order.orderedAt.toDate().toLocaleDateString("en-US", {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            })
            : "Processing";

        const itemsName = order.productName || (order.items ? order.items.map(i => i.name).join(', ') : "Store Item");

        box.innerHTML = `
            <div class="track-card glassmorphism">

                <!-- Header Summary -->
                <div class="track-summary">
                    <div>
                        <h2 class="order-title">📦 Order #${orderID}</h2>
                        <p class="order-items">Items: <b>${itemsName}</b></p>
                    </div>
                    <div class="status-badge status-${order.status ? order.status.toLowerCase() : 'pending'}">
                        ${order.status || 'Pending'}
                    </div>
                </div>

                <p class="order-date">📅 Ordered On: <b>${date}</b></p>

                <!-- Progress Bar -->
                <div class="progress">
                    <div class="progress-fill" style="width:${progress}%"></div>
                </div>

                <!-- Truck Animation Arena -->
                <div class="truck-section">
                    <div class="truck-box">
                        <div class="road"></div>
                        <div class="warehouse" title="Warehouse">🏬</div>
                        <div class="truck" style="left: calc(${progress}% - 22px)">🚚</div>
                        <div class="home" title="Destination">🏠</div>
                    </div>
                </div>

                <!-- Timeline Steps -->
                <div class="timeline">
                    <div class="step ${progress >= 25 ? "active" : ""}">
                        <span class="step-icon">✅</span>
                        <div>
                            <h4>Order Placed</h4>
                            <p>Your order was received and confirmed</p>
                        </div>
                    </div>

                    <div class="step ${progress >= 50 ? "active" : ""}">
                        <span class="step-icon">📦</span>
                        <div>
                            <h4>Packed</h4>
                            <p>Item inspected and sealed in warehouse</p>
                        </div>
                    </div>

                    <div class="step ${progress >= 75 ? "active" : ""}">
                        <span class="step-icon">🚚</span>
                        <div>
                            <h4>Shipped</h4>
                            <p>In transit with Faraz Express courier</p>
                        </div>
                    </div>

                    <div class="step ${progress >= 100 ? "active" : ""}">
                        <span class="step-icon">🏠</span>
                        <div>
                            <h4>Delivered</h4>
                            <p>Package safely handed over</p>
                        </div>
                    </div>
                </div>

                <!-- Map & Route Info Grid -->
                <div class="info-grid">
                    <div class="map-card glassmorphism">
                        <h3>📍 Delivery Route</h3>
                        <div class="point ${progress >= 25 ? "done" : ""}">
                            🏬 Dispatch Hub (Warehouse)
                        </div>
                        <div class="point ${progress >= 75 ? "done" : ""}">
                            🚚 Transit Checkpoint (On The Way)
                        </div>
                        <div class="point ${progress >= 100 ? "done" : ""}">
                            🏠 Final Destination
                        </div>
                    </div>

                    <div class="delivery-card glassmorphism">
                        <h3>🚚 Delivery Details</h3>
                        <p>📅 Estimated Delivery: <b>2 - 4 Business Days</b></p>
                        <p>🚛 Courier: <b>Faraz Express Live</b></p>
                        <p>📞 Support: <b>support@farazstore.com</b></p>
                        <p>💳 Total Amount: <b>₹${order.total || 0}</b></p>
                    </div>
                </div>

            </div>
        `;
    } catch (error) {
        console.error("Tracking error:", error);
        box.innerHTML = `
            <div class="track-card glassmorphism" style="text-align: center; padding: 40px;">
                <h2 style="color: var(--danger, #ef4444); font-size: 20px;">❌ Error Fetching Tracking Data</h2>
                <p style="color: var(--muted, #94a3b8); margin-top: 10px;">Please try refreshing or check back later.</p>
            </div>
        `;
    }
});