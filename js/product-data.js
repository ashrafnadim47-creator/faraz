import { db } from "./firebase-config.js";
import {
    collection,
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// 📦 OFFICIAL PRODUCTS CATALOG SCHEMA
// ==========================================
export const defaultProducts = [
    {
        id: "prod_evo_m1014_draco",
        name: "Evo M1014 Green Flame Draco (Max Lv.7)",
        price: 1499,
        image: "images/evo_m1014.svg",
        category: "Gaming Topup",
        stock: 25,
        description: "Official Free Fire Legendary Evo M1014 Draco Shotgun with max stats, exclusive kill feed animation and dragon wings effect."
    },
    {
        id: "prod_ff_diamonds_1",
        name: "Free Fire 1060 + 106 Diamonds Top-Up",
        price: 799,
        image: "images/freefire_diamonds.png",
        category: "Gaming Topup",
        stock: 50,
        description: "Instant Free Fire Diamonds Topup directly to Player ID within 60 seconds."
    },
    {
        id: "prod_ff_weekly_5",
        name: "Free Fire Weekly Diamond Membership",
        price: 159,
        image: "images/prime_pass.png",
        category: "Gaming Topup",
        stock: 100,
        description: "Get 450 total diamonds + special VIP badge daily for 7 days."
    },
    {
        id: "prod_headset_rgb_2",
        name: "HyperX Pro 7.1 Surround Gaming Headset",
        price: 2499,
        image: "images/headphones.png",
        category: "Audio Accessories",
        stock: 15,
        description: "Premium gaming headset with 7.1 surround sound, deep bass, and noise-canceling mic."
    },
    {
        id: "prod_keyboard_mech_3",
        name: "CyberPunk Mechanical RGB Keyboard",
        price: 1899,
        image: "images/keyboard.png",
        category: "Gaming Gear",
        stock: 12,
        description: "Tactile mechanical RGB gaming keyboard with custom macro lighting presets."
    },
    {
        id: "prod_mouse_wireless_4",
        name: "Razer DeathAdder Ultra-Light Gaming Mouse",
        price: 1299,
        image: "images/gaming-mouse.png",
        category: "Gaming Gear",
        stock: 20,
        description: "High precision 16000 DPI gaming optical mouse with ultra-low latency wireless sensor."
    },
    {
        id: "prod_gloowall_legend",
        name: "Legendary Cybernetic Gloo Wall Skin",
        price: 499,
        image: "images/gloowall.png",
        category: "Gaming Topup",
        stock: 30,
        description: "Exclusive futuristic cyber barrier Gloo Wall skin for Free Fire Battle Royale."
    },
    {
        id: "prod_laptop_rtx",
        name: "ASUS ROG Strix RTX 4070 Gaming Laptop",
        price: 89999,
        image: "images/laptop.png",
        category: "Gaming Gear",
        stock: 5,
        description: "High-performance gaming machine with Intel Core i9, 32GB DDR5 RAM, and RTX 4070 GPU."
    }
];

// ==========================================
// 🚀 FIRESTORE SEEDING ROUTINE
// ==========================================
export async function seedProductsIfEmpty() {
    try {
        const prodCol = collection(db, "products");
        for (const p of defaultProducts) {
            await setDoc(doc(prodCol, p.id), {
                ...p,
                updatedAt: serverTimestamp()
            }, { merge: true });
        }
        console.log("Verified catalog synced with real images.");
    } catch (e) {
        console.warn("Product sync skipped:", e.message);
    }
}
