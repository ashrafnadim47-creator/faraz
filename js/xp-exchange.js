import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const xpCountElem = document.getElementById("xp-count");
let currentUser = null;

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists() && xpCountElem) {
            xpCountElem.innerText = snap.data().points || snap.data().xp || 0;
        }
    }
});

window.exchangeReward = async function(cost, rewardType) {
    if (!currentUser) {
        alert("🔒 Please log in first!");
        window.location.href = "login.html";
        return;
    }

    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    const currentXP = userSnap.data()?.points || userSnap.data()?.xp || 0;

    if (currentXP < cost) {
        alert(`❌ Insufficient XP! You need at least ${cost} XP.`);
        return;
    }

    try {
        // Deduct XP
        await setDoc(userRef, {
            points: increment(-cost)
        }, { merge: true });

        // Grant Reward
        if (rewardType === 'VIP') {
            await setDoc(userRef, { isVip: true }, { merge: true });
            alert("🏆 VIP Badge Unlocked successfully!");
        } else {
            await setDoc(doc(db, "users", currentUser.uid, "coupons", rewardType), {
                code: rewardType,
                createdAt: serverTimestamp()
            }, { merge: true });
            alert(`🎟️ Coupon ${rewardType} unlocked successfully!`);
        }

        location.reload();
    } catch (err) {
        console.error(err);
        alert("Exchange failed.");
    }
};