import { auth } from "./firebase-config.js";
import { 
    onAuthStateChanged, 
    setPersistence, 
    browserLocalPersistence 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Keep user logged in permanently until they press Logout
setPersistence(auth, browserLocalPersistence).catch(console.error);

onAuthStateChanged(auth, (user) => {
    const currentPath = window.location.pathname.split("/").pop() || "index.html";
    const isAuthPage = currentPath === "login.html" || currentPath === "signup.html";

    if (!user && !isAuthPage) {
        // Redirect non-logged-in users to login page
        window.location.href = "login.html";
    } else if (user && isAuthPage) {
        // If already logged in, don't show login page
        window.location.href = "index.html";
    }
});