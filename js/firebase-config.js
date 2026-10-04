import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, 
    setPersistence, 
    browserLocalPersistence 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// 🔥 FIREBASE SDK INITIALIZATION CONFIG
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyC0FBv1oWWS54-J1Ld6hT0JW_EMQyOh5lk",
    authDomain: "faraz-store-7a28a.firebaseapp.com",
    projectId: "faraz-store-7a28a",
    storageBucket: "faraz-store-7a28a.firebasestorage.app",
    messagingSenderId: "263496752921",
    appId: "1:263496752921:web:36b7247ccf8bdb452daf88",
    measurementId: "G-CHK2W2DM5H"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// 🚀 MANDATORY FOR NATIVE APK: PERMANENT LOCAL PERSISTENCE
// Isse app band hone ke baad bhi user permanently logged-in rahega!
setPersistence(auth, browserLocalPersistence)
    .then(() => {
        console.log("✅ Local Auth Persistence Enabled");
    })
    .catch((error) => {
        console.error("❌ Auth Persistence Error:", error);
    });

export const db = getFirestore(app);