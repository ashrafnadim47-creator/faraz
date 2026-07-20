import { auth, db } from "./firebase-config.js";
import {
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const btn = document.getElementById("signup-btn");

if (btn) {
    btn.onclick = async () => {
        const nameInput = document.getElementById("name");
        const emailInput = document.getElementById("email");
        const passwordInput = document.getElementById("password");

        const name = nameInput ? nameInput.value.trim() : "";
        const email = emailInput ? emailInput.value.trim() : "";
        const password = passwordInput ? passwordInput.value.trim() : "";

        if (!name || !email || !password) {
            alert("❌ All input fields are required!");
            return;
        }

        if (password.length < 6) {
            alert("⚠️ Password must be at least 6 characters long.");
            return;
        }

        btn.disabled = true;
        btn.innerText = "Creating Account...";

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await setDoc(doc(db, "users", user.uid), {
                name: name,
                email: email,
                points: 0,
                diamonds: 0,
                role: "user",
                createdAt: serverTimestamp()
            });

            alert("🎉 Account Created Successfully! Welcome to Faraz Store.");
            location.href = "index.html";

        } catch (error) {
            console.error("Signup Error:", error);
            alert("❌ Registration Failed: " + error.message);
            btn.disabled = false;
            btn.innerText = "Sign Up";
        }
    };
}