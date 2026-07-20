import { db } from "./firebase-config.js";
import {
    collection,
    getDocs,
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// 1. STATS LOADER (PARALLEL CONCURRENT FETCH)
// ==========================================
async function loadStats() {
    try {
        const [productsSnap, usersSnap] = await Promise.all([
            getDocs(collection(db, "products")),
            getDocs(collection(db, "users"))
        ]);

        let points = 0;

        // Fetch all orders subcollections concurrently
        const ordersPromises = usersSnap.docs.map(async (userDoc) => {
            const data = userDoc.data();
            points += data.points || 0;
            return await getDocs(collection(db, "users", userDoc.id, "orders"));
        });

        const ordersSnapshots = await Promise.all(ordersPromises);
        const totalOrdersCount = ordersSnapshots.reduce((acc, snap) => acc + snap.size, 0);

        const prodEl = document.getElementById("product-count");
        const userEl = document.getElementById("user-count");
        const pointEl = document.getElementById("points-count");
        const orderEl = document.getElementById("order-count");

        if (prodEl) prodEl.innerText = productsSnap.size;
        if (userEl) userEl.innerText = usersSnap.size;
        if (pointEl) pointEl.innerText = points;
        if (orderEl) orderEl.innerText = totalOrdersCount;

    } catch (error) {
        console.error("Error loading stats:", error);
    }
}

loadStats();

// ==========================================
// 2. VOUCHER GENERATOR ENGINE
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const genButton = document.getElementById('admin-gen-btn');

    if (genButton) {
        genButton.addEventListener('click', async () => {
            const diamondInput = document.getElementById('admin-diamond-input');
            const outputBox = document.getElementById('admin-code-output');

            if (!diamondInput) return;
            const amount = parseInt(diamondInput.value, 10);

            if (isNaN(amount) || amount <= 0) {
                alert("❌ Please enter a valid diamond amount greater than 0!");
                return;
            }

            genButton.disabled = true;
            genButton.innerText = "GENERATING...";

            // Code Generation Pattern
            const randomStamp = Math.random().toString(36).substring(2, 6).toUpperCase();
            const newGeneratedCode = `FZ-${amount}-${randomStamp}`;

            try {
                // Save voucher document to Firestore
                await setDoc(doc(db, "vouchers", newGeneratedCode), {
                    code: newGeneratedCode,
                    amount: amount,
                    used: false,
                    status: "active",
                    createdAt: serverTimestamp()
                });

                if (outputBox) {
                    outputBox.innerText = newGeneratedCode;
                    outputBox.style.display = "block";
                }

                // Clipboard writing fallback
                if (navigator.clipboard) {
                    await navigator.clipboard.writeText(newGeneratedCode);
                }

                alert(`⚡ Live Firebase Code Generated!\n\nCode: ${newGeneratedCode}\nWorth: 💎 ${amount}\n\nCopied & Saved online!`);

                diamondInput.value = "";
            } catch (error) {
                console.error("Firebase write error: ", error);
                alert("⛔ Admin Error: Firebase database write failed. Check permissions.");
            } finally {
                genButton.disabled = false;
                genButton.innerText = "GENERATE CODE";
            }
        });
    }
});