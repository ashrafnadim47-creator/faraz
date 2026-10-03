import { db } from "./firebase-config.js";
import {
    collection,
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// 📦 INITIAL PRODUCTS CATALOG SCHEMA
// ==========================================
export const defaultProducts = [
    {
        id: "prod_gaming_headset",
        name: "Gaming Headset Pro",
        price: 1999,
        image: "🎧",
        category: "Audio",
        stock: 15,
        description: "Premium gaming headset with 7.1 surround sound and noise-canceling mic."
    },
    {
        id: "prod_rgb_keyboard",
        name: "RGB Mechanical Keyboard",
        price: 2999,
        image: "⌨️",
        category: "Accessories",
        stock: 10,
        description: "Tactile mechanical RGB gaming keyboard with custom lighting keys."
    },
    {
        id: "prod_gaming_mouse",
        name: "Precision Gaming Mouse",
        price: 999,
        image: "🖱️",
        category: "Accessories",
        stock: 25,
        description: "High precision 12000 DPI gaming mouse with ergonomic grip."
    }
];

// ==========================================
// 🚀 FIRESTORE SEED UTILITY FUNCTION
// ==========================================
export async function seedProductsToDatabase() {
    try {
        for (const product of defaultProducts) {
            const productRef = doc(db, "products", product.id);
            await setDoc(productRef, {
                name: product.name,
                price: Number(product.price),
                image: product.image,
                category: product.category,
                stock: Number(product.stock),
                description: product.description,
                createdAt: serverTimestamp()
            }, { merge: true });
        }
        console.log("✅ Initial Products Seeded Successfully into Firestore!");
    } catch (error) {
        console.error("❌ Error seeding products to Firestore:", error);
    }
}