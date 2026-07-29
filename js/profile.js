import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    doc, 
    getDoc, 
    setDoc,
    updateDoc, 
    increment, 
    arrayUnion,
    collection, 
    query, 
    where, 
    getDocs,
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let currentUser = null;
let userDataState = {};
let activeVaultTab = "avatars";

const defaultVaultItems = [
    { id: "avatar_default", name: "Classic Avatar", img: "images/avtar.png", type: "avatar" },
    { id: "banner_default", name: "Diwali Banner", img: "images/diwali_bundle.png", type: "banner" }
];

// ==========================================
// 🔑 AUTH & REALTIME FIRESTORE LISTENER
// ==========================================
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        const userRef = doc(db, "users", user.uid);
        
        // Realtime Listener
        onSnapshot(userRef, async (docSnap) => {
            if (docSnap.exists()) {
                userDataState = docSnap.data();

                // FIX: Permanently save Player UID if missing so it NEVER changes on refresh
                if (!userDataState.playerUid) {
                    const fixedPlayerUid = String(Math.floor(10000000 + Math.random() * 90000000));
                    await setDoc(userRef, { playerUid: fixedPlayerUid }, { merge: true });
                    userDataState.playerUid = fixedPlayerUid;
                }

                renderProfileData();
                renderVaultItems();
            } else {
                // Initial creation if document doesn't exist
                const fixedPlayerUid = String(Math.floor(10000000 + Math.random() * 90000000));
                await setDoc(userRef, { 
                    playerUid: fixedPlayerUid, 
                    email: user.email,
                    diamonds: 0,
                    likes: 0,
                    streak: 1,
                    xp: 0
                }, { merge: true });
            }
        });

        checkLoginStreak(user.uid);
        loadOrdersCount(user.uid);
    } else {
        window.location.href = "login.html";
    }
});

// ==========================================
// 🚪 LOGOUT HANDLER
// ==========================================
document.getElementById("profile-logout-btn")?.addEventListener("click", async () => {
    if (confirm("Are you sure you want to log out?")) {
        try {
            if (currentUser) {
                await updateDoc(doc(db, "users", currentUser.uid), { isOnline: false });
            }
            await signOut(auth);
            window.location.href = "login.html";
        } catch (e) {
            console.error("Logout Error:", e);
            alert("Logout failed!");
        }
    }
});

// ==========================================
// 👤 PROFILE DATA RENDERER
// ==========================================
function renderProfileData() {
    const data = userDataState;
    const diamonds = data.diamonds ?? data.wallet ?? 0;

    const nameElem = document.getElementById("display-nickname");
    const idElem = document.getElementById("display-player-id");
    if (nameElem) nameElem.innerText = data.nickname || (currentUser?.email ? currentUser.email.split("@")[0] : "Gamer");
    if (idElem) idElem.innerText = data.playerUid || "-------";

    const avatarImgElem = document.getElementById("user-avatar-img");
    if (avatarImgElem) {
        avatarImgElem.src = data.equippedAvatar || "images/avtar.png";
    }

    const bannerBgElem = document.getElementById("profile-banner-bg");
    if (bannerBgElem) {
        const bannerUrl = data.equippedBanner || "images/diwali_bundle.png";
        bannerBgElem.style.backgroundImage = `url('${bannerUrl}')`;
    }

    const streakElem = document.getElementById("display-streak");
    const likesElem = document.getElementById("display-likes");
    const xpElem = document.getElementById("display-xp");

    if (streakElem) streakElem.innerText = data.streak || 1;
    if (likesElem) likesElem.innerText = data.likes || 0;
    if (xpElem) xpElem.innerText = (data.xp || data.points || 0).toLocaleString();

    // Prime Level Tier
    let primeTitle = "LEVEL 1 (BRONZE)";
    let target = 500;

    if (diamonds >= 10000) {
        primeTitle = "LEVEL 5 (CROWN 👑)";
        target = 10000;
    } else if (diamonds >= 5000) {
        primeTitle = "LEVEL 4 (DIAMOND 💎)";
        target = 10000;
    } else if (diamonds >= 2000) {
        primeTitle = "LEVEL 3 (GOLD 🥇)";
        target = 5000;
    } else if (diamonds >= 500) {
        primeTitle = "LEVEL 2 (SILVER 🥈)";
        target = 2000;
    }

    const percentage = Math.min(100, Math.floor((diamonds / target) * 100));

    const primeTitleElem = document.getElementById("display-prime-title");
    const diamondsCountElem = document.getElementById("display-diamonds-count");
    const progressFillElem = document.getElementById("prime-progress-fill");

    if (primeTitleElem) primeTitleElem.innerText = `👑 PRIME ${primeTitle}`;
    if (diamondsCountElem) diamondsCountElem.innerText = `💎 ${diamonds.toLocaleString()} / ${target.toLocaleString()}`;
    if (progressFillElem) progressFillElem.style.width = `${percentage}%`;
}

// ==========================================
// ❤️ STRICT 1-LIKE PER USER SYSTEM
// ==========================================
window.addProfileLike = async function() {
    if (!currentUser) return alert("🔒 Please log in first!");

    try {
        const userRef = doc(db, "users", currentUser.uid);
        const likedByArray = userDataState.likedBy || [];

        // Check if current user already liked
        if (likedByArray.includes(currentUser.uid)) {
            alert("❌ You have already liked this profile! Only 1 like per account is allowed.");
            return;
        }

        await updateDoc(userRef, {
            likes: increment(1),
            likedBy: arrayUnion(currentUser.uid)
        });

        alert("❤️ Profile Liked!");
    } catch (e) {
        console.error("Like Error:", e);
    }
};

window.changeNickname = async function() {
    const newName = prompt("Enter new Gaming Nickname:", userDataState.nickname || "");
    if (newName && newName.trim().length >= 3) {
        await updateDoc(doc(db, "users", currentUser.uid), { nickname: newName.trim() });
    }
};

window.copyPlayerId = function() {
    const uid = document.getElementById("display-player-id")?.innerText;
    if (uid && uid !== "-------") {
        navigator.clipboard.writeText(uid);
        alert("📋 Player ID Copied: " + uid);
    }
};

async function checkLoginStreak(uid) {
    const today = new Date().toDateString();
    const lastLogin = localStorage.getItem(`streak_date_${uid}`);

    if (lastLogin !== today) {
        await updateDoc(doc(db, "users", uid), {
            streak: increment(1),
            xp: increment(50)
        });
        localStorage.setItem(`streak_date_${uid}`, today);
    }
}

async function loadOrdersCount(uid) {
    try {
        const q = query(collection(db, "orders"), where("userId", "==", uid));
        const snap = await getDocs(q);
        const countElem = document.getElementById("count-orders");
        if (countElem) countElem.innerText = `${snap.size} Orders Placed`;
    } catch(e){}
}

// ==========================================
// 🧰 VAULT INVENTORY & EQUIP LOGIC
// ==========================================
window.openVaultModal = () => {
    const modal = document.getElementById("vault-modal");
    if (modal) {
        modal.style.display = "flex";
        renderVaultItems();
    }
};

window.closeVaultModal = () => {
    const modal = document.getElementById("vault-modal");
    if (modal) modal.style.display = "none";
};

window.switchVaultTab = (type) => {
    activeVaultTab = type;
    
    const avTab = document.getElementById("vtab-avatars");
    const bnTab = document.getElementById("vtab-banners");

    if (type === 'avatars') {
        if (avTab) { avTab.style.background = '#00e5ff'; avTab.style.color = '#000'; }
        if (bnTab) { bnTab.style.background = '#1e293b'; bnTab.style.color = '#fff'; }
    } else {
        if (bnTab) { bnTab.style.background = '#00e5ff'; bnTab.style.color = '#000'; }
        if (avTab) { avTab.style.background = '#1e293b'; avTab.style.color = '#fff'; }
    }

    renderVaultItems();
};

function renderVaultItems() {
    const container = document.getElementById("vault-items-container");
    if (!container) return;
    container.innerHTML = "";

    const userVault = userDataState.vault && userDataState.vault.length > 0 
        ? [...defaultVaultItems, ...userDataState.vault] 
        : defaultVaultItems;

    const targetType = activeVaultTab === 'avatars' ? 'avatar' : 'banner';
    const items = userVault.filter(i => (i.type || 'avatar') === targetType);

    if (items.length === 0) {
        container.innerHTML = `<p style="grid-column: span 3; text-align: center; color: #64748b; font-size: 12px; padding: 20px;">No items in this section.</p>`;
        return;
    }

    items.forEach((item) => {
        const isEquipped = (targetType === 'avatar' && userDataState.equippedAvatar === item.img) ||
                           (targetType === 'banner' && userDataState.equippedBanner === item.img);

        const card = document.createElement("div");
        card.className = `vault-item ${isEquipped ? 'equipped' : ''}`;
        card.innerHTML = `
            <img src="${item.img}" alt="${item.name}" onerror="this.src='images/avtar.png'">
            <div class="vault-item-name">${item.name}</div>
            <button class="equip-btn" style="margin-top: 6px; padding: 6px; font-size: 10px; border: none; border-radius: 8px; font-weight: 900; background: ${isEquipped ? '#22c55e' : '#00e5ff'}; color: #000; cursor: pointer; width: 100%;">
                ${isEquipped ? 'EQUIPPED ✅' : 'EQUIP'}
            </button>
        `;

        card.onclick = () => equipVaultItem(targetType, item.img);
        container.appendChild(card);
    });
}

async function equipVaultItem(type, imgUrl) {
    if (!currentUser) return;

    try {
        const userRef = doc(db, "users", currentUser.uid);
        if (type === 'avatar') {
            await updateDoc(userRef, { equippedAvatar: imgUrl });
        } else if (type === 'banner') {
            await updateDoc(userRef, { equippedBanner: imgUrl });
        }
    } catch (e) {
        console.error("Equip Error:", e);
    }
}