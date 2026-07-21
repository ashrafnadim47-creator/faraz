import { db, auth } from "./firebase-config.js";
import { doc, getDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// 👑 FREE FIRE PRIME LEVEL CONFIGURATION
// ==========================================
export const PRIME_CONFIG = [
    { level: 1, minSpent: 0, maxSpent: 500, title: "PRIME 1", emblem: "🥇", rewards: ["Basic Avatar", "Bronze Badge"] },
    { level: 2, minSpent: 500, maxSpent: 2000, title: "PRIME 2", emblem: "🎖️", rewards: ["Silver Frame", "+20 Friend Slots"] },
    { level: 3, minSpent: 2000, maxSpent: 5000, title: "PRIME 3", emblem: "🥉", rewards: ["Name Change Card", "+50 Friend Slots"] },
    { level: 4, minSpent: 5000, maxSpent: 10000, title: "PRIME 4", emblem: "👑", rewards: ["Louder Please Emote", "Advanced Banner", "+100 Friend Slots", "Prime 4 Symbol"] },
    { level: 5, minSpent: 10000, maxSpent: 25000, title: "PRIME 5", emblem: "💎", rewards: ["Exclusive Bundle", "Supreme Badge", "Auto Top-Up Pass"] }
];

// Calculate Current Level based on Diamonds/Spent
export function calculatePrimeStatus(spent = 0) {
    let currentLevel = PRIME_CONFIG[0];
    let nextLevel = PRIME_CONFIG[1];

    for (let i = 0; i < PRIME_CONFIG.length; i++) {
        if (spent >= PRIME_CONFIG[i].minSpent) {
            currentLevel = PRIME_CONFIG[i];
            nextLevel = PRIME_CONFIG[i + 1] || PRIME_CONFIG[i]; // Max level fallback
        }
    }

    const progressMax = nextLevel.minSpent || currentLevel.maxSpent;
    const currentProgress = Math.min(spent, progressMax);
    const neededToNext = Math.max(0, progressMax - spent);
    const progressPercent = Math.min(100, Math.floor((currentProgress / progressMax) * 100));

    return {
        currentLevel,
        nextLevel,
        spent,
        progressMax,
        currentProgress,
        neededToNext,
        progressPercent
    };
}

// AUTO-UPDATE USER SPENT AMOUNT (Call this when order completes)
export async function addPurchaseAmount(userId, amount) {
    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            totalSpent: increment(amount)
        });
        console.log(`✅ Updated user ${userId} total spent by ₹${amount}`);
    } catch (err) {
        console.error("❌ Failed to auto-update Prime status:", err);
    }
}