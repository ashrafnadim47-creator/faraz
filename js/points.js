import { db, auth } from "./firebase-config.js";
import {
    doc,
    setDoc,
    updateDoc,
    increment,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// ⭐ ATOMIC REWARD POINTS ADDITION ENGINE
// ==========================================
export async function addPoints(pointsAmount) {
    const user = auth.currentUser;

    if (!user) {
        alert("🔒 Please log in to earn and redeem reward points!");
        return;
    }

    const points = Number(pointsAmount) || 0;
    if (points <= 0) return;

    const userRef = doc(db, "users", user.uid);

    try {
        // Atomic increment prevents race conditions
        await updateDoc(userRef, {
            points: increment(points),
            lastPointEarnedAt: serverTimestamp()
        });

        alert(`⭐ +${points} Reward Points Added to Your Wallet!`);
    } catch (error) {
        // If document doesn't exist, create it cleanly
        try {
            await setDoc(userRef, {
                email: user.email || "",
                points: points,
                createdAt: serverTimestamp()
            }, { merge: true });

            alert(`⭐ +${points} Reward Points Added!`);
        } catch (err) {
            console.error("Error updating points balance:", err);
            alert("❌ Failed to update reward points.");
        }
    }
}