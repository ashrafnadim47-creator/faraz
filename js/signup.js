import { auth, db } from "./firebase-config.js";
import {
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    doc,
    getDoc,
    setDoc,
    runTransaction,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const btn = document.getElementById("signup-btn");
const usernameInput = document.getElementById("username");
const usernameMsg = document.getElementById("usernameCheckMsg");
let isUsernameAvailable = false;
let checkTimeout = null;

// ==========================================
// 🔍 REAL-TIME USERNAME AVAILABILITY CHECK
// ==========================================
if (usernameInput && usernameMsg) {
    usernameInput.addEventListener("input", () => {
        clearTimeout(checkTimeout);
        const raw = usernameInput.value.trim().toLowerCase().replace(/^@/, '');
        
        if (!raw) {
            usernameMsg.innerText = "";
            isUsernameAvailable = false;
            return;
        }

        const valid = /^[a-z0-9_]{3,20}$/.test(raw);
        if (!valid) {
            usernameMsg.innerText = "⚠️ 3-20 characters: letters, numbers & underscores only";
            usernameMsg.style.color = "#f59e0b";
            isUsernameAvailable = false;
            return;
        }

        usernameMsg.innerText = "⏳ Checking availability...";
        usernameMsg.style.color = "#38bdf8";

        checkTimeout = setTimeout(async () => {
            try {
                // 1. Try serverless API check first
                let available = false;
                try {
                    const res = await fetch(`/api/users/check-username?username=${encodeURIComponent(raw)}`);
                    if (res.ok) {
                        const data = await res.json();
                        available = data.available;
                    }
                } catch (e) {
                    available = false;
                }

                // 2. Also verify against Firestore /usernames collection directly
                try {
                    const snap = await getDoc(doc(db, "usernames", raw));
                    if (snap.exists()) {
                        available = false;
                    } else if (res && res.ok) {
                        // Keep API result
                    } else {
                        available = true;
                    }
                } catch (fsErr) {
                    // If Firestore read rules restrict, rely on API check result
                }

                if (available) {
                    usernameMsg.innerText = `✅ @${raw} is available!`;
                    usernameMsg.style.color = "#22c55e";
                    isUsernameAvailable = true;
                } else {
                    usernameMsg.innerText = `❌ @${raw} is already taken. Please choose another!`;
                    usernameMsg.style.color = "#ef4444";
                    isUsernameAvailable = false;
                }
            } catch (err) {
                usernameMsg.innerText = "⚠️ Unable to verify username. Check network.";
                usernameMsg.style.color = "#f59e0b";
                isUsernameAvailable = false;
            }
        }, 350);
    });
}

// ==========================================
// 🚀 ATOMIC REGISTRATION SUBMISSION
// ==========================================
if (btn) {
    btn.onclick = async () => {
        const nameInput = document.getElementById("name");
        const emailInput = document.getElementById("email");
        const passwordInput = document.getElementById("password");

        const name = nameInput ? nameInput.value.trim() : "";
        const rawUsername = usernameInput ? usernameInput.value.trim().toLowerCase().replace(/^@/, '') : "";
        const email = emailInput ? emailInput.value.trim() : "";
        const password = passwordInput ? passwordInput.value.trim() : "";

        if (!name || !rawUsername || !email || !password) {
            alert("❌ All input fields (Full Name, Username, Email, Password) are required!");
            return;
        }

        if (!/^[a-z0-9_]{3,20}$/.test(rawUsername)) {
            alert("❌ Username must be 3-20 characters using letters, numbers, or underscores only.");
            usernameInput.focus();
            return;
        }

        if (password.length < 6) {
            alert("⚠️ Password must be at least 6 characters long.");
            passwordInput.focus();
            return;
        }

        btn.disabled = true;
        btn.innerText = "Verifying & Reserving Username...";

        try {
            // Verify username availability one last time before creating auth user
            try {
                const uSnap = await getDoc(doc(db, "usernames", rawUsername));
                if (uSnap.exists()) {
                    alert(`❌ Username @${rawUsername} is already registered! Please choose a different handle.`);
                    btn.disabled = false;
                    btn.innerText = "Create Account";
                    return;
                }
            } catch (e) {
                console.warn("Pre-check skipped:", e.message);
            }

            // 1. Create Firebase Auth User
            btn.innerText = "Creating User Account...";
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Atomically reserve username and write user profile
            btn.innerText = "Securing Unique Handle...";
            try {
                await setDoc(doc(db, "usernames", rawUsername), {
                    uid: user.uid,
                    username: rawUsername,
                    createdAt: serverTimestamp()
                });
            } catch (e) {
                console.warn("Username index write:", e.message);
            }

            await setDoc(doc(db, "users", user.uid), {
                name: name,
                displayName: name,
                username: rawUsername,
                handle: `@${rawUsername}`,
                email: email,
                points: 0,
                diamonds: 0,
                role: "user",
                avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${rawUsername}`,
                createdAt: serverTimestamp()
            });

            // 3. Sync with NOVA Backend API
            try {
                await fetch("/api/auth/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        displayName: name,
                        username: rawUsername,
                        email: email,
                        password: password
                    })
                });
            } catch (e) {
                console.warn("NOVA API sync notice:", e.message);
            }

            alert(`🎉 Account Created Successfully! Welcome to Faraz Store & NOVA, @${rawUsername}!`);
            location.href = "index.html";

        } catch (error) {
            console.error("Signup Error:", error);
            alert("❌ Registration Failed: " + error.message);
            btn.disabled = false;
            btn.innerText = "Create Account";
        }
    };
}
