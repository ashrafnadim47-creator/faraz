import { auth, db } from "./firebase-config.js";
import {
    doc,
    getDoc,
    updateDoc,
    addDoc,
    collection,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const xpCount = document.getElementById("xp-count");
const message = document.getElementById("message");

let uid = null;
let currentXp = 0;

// ==========================================
// 🔑 AUTH CHECK & INITIAL XP FETCH
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        location.href = "login.html";
        return;
    }

    uid = user.uid;
    await fetchUserXp();
});

async function fetchUserXp() {
    try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
            currentXp = snap.data().xp || 0;
        } else {
            currentXp = 0;
        }

        if (xpCount) {
            xpCount.innerText = currentXp.toLocaleString();
        }
    } catch (error) {
        console.error("Error fetching XP balance:", error);
    }
}

// ==========================================
// 🔄 EXCHANGE REWARD ENGINE
// ==========================================
window.exchangeReward = async function (cost, reward) {
    if (!uid) {
        if (message) message.innerHTML = `<span style="color: #ef4444;">❌ Please login first</span>`;
        return;
    }

    if (currentXp < cost) {
        if (message) {
            message.innerHTML = `<span style="color: #ef4444;">❌ Not enough XP balance. You need ${cost - currentXp} more XP!</span>`;
        }
        return;
    }

    if (message) {
        message.innerHTML = `<span style="color: #00e5ff;">⏳ Processing XP Exchange...</span>`;
    }

    try {
        currentXp -= cost;
        const userRef = doc(db, "users", uid);

        // 1. Deduct XP from User Document
        await updateDoc(userRef, {
            xp: currentXp
        });

        // 2. Log Claimed Reward Subcollection
        await addDoc(collection(db, "users", uid, "rewards"), {
            reward: reward,
            xpUsed: cost,
            createdAt: serverTimestamp()
        });

        // 3. Save to coupons list if it's a code
        if (reward !== "VIP") {
            await addDoc(collection(db, "users", uid, "coupons"), {
                code: reward,
                createdAt: serverTimestamp()
            });
        }

        if (message) {
            message.innerHTML = `<span style="color: #22c55e;">🎉 Reward Claimed Successfully: <b>${reward}</b>!</span>`;
        }

        if (xpCount) {
            xpCount.innerText = currentXp.toLocaleString();
        }

        alert(`🎉 Success!\n\nYou exchanged ${cost} XP for "${reward}". Check your account for details.`);

    } catch (error) {
        console.error("Exchange error:", error);
        currentXp += cost; // Revert locally on failure
        if (xpCount) xpCount.innerText = currentXp.toLocaleString();
        if (message) {
            message.innerHTML = `<span style="color: #ef4444;">❌ Exchange failed due to network issues.</span>`;
        }
    }
};