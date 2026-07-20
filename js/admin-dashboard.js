import { db } from "./firebase-config.js";
import {
    collection,
    getDocs,
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 1. STATS LOADER (Synchronous & Accurate)
async function loadStats() {
    try {
        const products = await getDocs(collection(db, "products"));
        const users = await getDocs(collection(db, "users"));

        let ordersCount = 0;
        let points = 0;

        // Loop through all users
        for (const userDoc of users.docs) {
            const data = userDoc.data();
            points += data.points || 0;

            // Get total orders count
            const orders = await getDocs(collection(db, "users", userDoc.id, "orders"));
            ordersCount += orders.size;
        }

        // Update UI
        const prodEl = document.getElementById("product-count");
        const userEl = document.getElementById("user-count");
        const pointEl = document.getElementById("points-count");
        const orderEl = document.getElementById("order-count");

        if (prodEl) prodEl.innerText = products.size;
        if (userEl) userEl.innerText = users.size;
        if (pointEl) pointEl.innerText = points;
        if (orderEl) orderEl.innerText = ordersCount;

    } catch (error) {
        console.error("Error loading stats:", error);
    }
}

loadStats();

// 2. FIREBASE V10 COMPATIBLE VOUCHER GENERATOR
window.addEventListener('DOMContentLoaded', () => {
    const genButton = document.getElementById('admin-gen-btn');

    if (genButton) {
        genButton.addEventListener('click', async () => {
            const diamondInput = document.getElementById('admin-diamond-input');
            const outputBox = document.getElementById('admin-code-output');

            if (!diamondInput) return;
            const amount = parseInt(diamondInput.value);

            if (isNaN(amount) || amount <= 0) {
                alert("❌ Please enter a valid diamond amount greater than 0!");
                return;
            }

            // 1. Generate unique code
            const randomStamp = Math.random().toString(36).substring(2, 6).toUpperCase();
            const newGeneratedCode = `FZ-${amount}-${randomStamp}`;

            try {
                // 2. Save in Firebase Firestore "vouchers" collection using Modular v10 syntax
                await setDoc(doc(db, "vouchers", newGeneratedCode), {
                    amount: amount,
                    createdAt: serverTimestamp()
                });

                // 3. Display in UI
                if (outputBox) {
                    outputBox.innerText = newGeneratedCode;
                    outputBox.style.display = "block";
                }

                // 4. Copy to Clipboard
                await navigator.clipboard.writeText(newGeneratedCode);
                alert(`⚡ Live Firebase Code Generated!\n\nCode: ${newGeneratedCode}\nWorth: 💎 ${amount}\n\nCopied & Saved online!`);

                diamondInput.value = "";
            } catch (error) {
                console.error("Firebase write error: ", error);
                alert("⛔ Admin Error: Firebase database se connection nahi ho paya.");
            }
        });
    }
});