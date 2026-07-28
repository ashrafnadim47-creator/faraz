import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    increment, 
    collection, 
    query, 
    where, 
    getDocs,
    arrayUnion,
    onSnapshot,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let currentUser = null;
let userDataState = {};
let activeVaultTab = "avatars";

// Default Vault Items
const defaultVault = [
    { id: "avatar_default", name: "Classic Avatar", img: "images/avtar.png", type: "avatar" },
    { id: "banner_default", name: "Default Banner", img: "images/diwali_bundle.png", type: "banner" }
];

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                userDataState = docSnap.data();
                renderProfileData();
            }
        });
        checkLoginStreak(user.uid);
        loadOrdersCount(user.uid);
    }
});

function renderProfileData() {
    const data = userDataState;
    const diamonds = data.diamonds ?? 0;
    const playerUid = data.playerUid || Math.floor(10000000 + Math.random() * 90000000).toString();

    // 1. Name & Player ID
    document.getElementById("display-nickname").innerText = data.nickname || currentUser.email.split("@")[0];
    document.getElementById("display-player-id").innerText = playerUid;

    // 2. Avatar & Banner
    if (data.equippedAvatar) {
        document.getElementById("user-avatar-img").src = data.equippedAvatar;
    }
    if (data.equippedBanner) {
        document.getElementById("profile-banner-bg").style.backgroundImage = `url('${data.equippedBanner}')`;
    }

    // 3. Stats (Streak, Likes, XP)
    document.getElementById("display-streak").innerText = data.streak || 1;
    document.getElementById("display-likes").innerText = data.likes || 0;
    document.getElementById("display-xp").innerText = (data.xp || 0).toLocaleString();

    // 4. PRIME LEVEL 5 CALCULATION FIX (10,000 Diamonds = Level 5 Crown)
    let primeLevel = "LEVEL 1 (BRONZE)";
    let targetDiamonds = 500;
    let levelNum = 1;

    if (diamonds >= 10000) {
        primeLevel = "LEVEL 5 (CROWN 👑)";
        targetDiamonds = 10000;
        levelNum = 5;
    } else if (diamonds >= 5000) {
        primeLevel = "LEVEL 4 (DIAMOND 💎)";
        targetDiamonds = 10000;
        levelNum = 4;
    } else if (diamonds >= 2000) {
        primeLevel = "LEVEL 3 (GOLD 🥇)";
        targetDiamonds = 5000;
        levelNum = 3;
    } else if (diamonds >= 500) {
        primeLevel = "LEVEL 2 (SILVER 🥈)";
        targetDiamonds = 2000;
        levelNum = 2;
    }

    const percentage = Math.min(100, Math.floor((diamonds / targetDiamonds) * 100));

    document.getElementById("display-prime-title").innerText = `👑 PRIME ${primeLevel}`;
    document.getElementById("display-diamonds-count").innerText = `💎 ${diamonds.toLocaleString()} / ${targetDiamonds.toLocaleString()}`;
    document.getElementById("prime-progress-fill").style.width = `${percentage}%`;
}

// EDIT NICKNAME
window.changeNickname = async function() {
    const newName = prompt("Enter new Gaming Nickname:", userDataState.nickname || "");
    if (newName && newName.trim().length >= 3) {
        await updateDoc(doc(db, "users", currentUser.uid), { nickname: newName.trim() });
        alert("✅ Nickname updated!");
    }
};

// LIKE PROFILE
window.addProfileLike = async function() {
    if (!currentUser) return;
    await updateDoc(doc(db, "users", currentUser.uid), { likes: increment(1) });
};

// COPY PLAYER ID
window.copyPlayerId = function() {
    const uid = document.getElementById("display-player-id").innerText;
    navigator.clipboard.writeText(uid);
    alert("📋 Player ID Copied: " + uid);
};

// CHECK DAILY STREAK
async function checkLoginStreak(uid) {
    const today = new Date().toDateString();
    const lastLogin = localStorage.getItem(`streak_date_${uid}`);

    if (lastLogin !== today) {
        await updateDoc(doc(db, "users", uid), {
            streak: increment(1),
            xp: increment(50) // Reward +50 XP daily
        });
        localStorage.setItem(`streak_date_${uid}`, today);
    }
}

// LOAD ORDERS COUNT
async function loadOrdersCount(uid) {
    try {
        const q = query(collection(db, "orders"), where("userId", "==", uid));
        const snap = await getDocs(q);
        document.getElementById("count-orders").innerText = `${snap.size} Orders Placed`;
    } catch(e){}
}

// ==========================================
// 🧰 VAULT INVENTORY & EQUIP LOGIC
// ==========================================
window.openVaultModal = () => {
    document.getElementById("vault-modal").style.display = "flex";
    renderVaultItems();
};

window.closeVaultModal = () => {
    document.getElementById("vault-modal").style.display = "none";
};

window.switchVaultTab = (type) => {
    activeVaultTab = type;
    document.getElementById("vtab-avatars").style.background = type === 'avatars' ? '#00e5ff' : '#1e293b';
    document.getElementById("vtab-avatars").style.color = type === 'avatars' ? '#000' : '#fff';
    document.getElementById("vtab-banners").style.background = type === 'banners' ? '#00e5ff' : '#1e293b';
    document.getElementById("vtab-banners").style.color = type === 'banners' ? '#000' : '#fff';
    renderVaultItems();
};

function renderVaultItems() {
    const container = document.getElementById("vault-items-container");
    container.innerHTML = "";

    const userVault = userDataState.vault || defaultVault;
    const filtered = userVault.filter(i => i.type === (activeVaultTab === 'avatars' ? 'avatar' : 'banner'));

    filtered.forEach((item) => {
        const isEquipped = (activeVaultTab === 'avatars' && userDataState.equippedAvatar === item.img) ||
                           (activeVaultTab === 'banners' && userDataState.equippedBanner === item.img);

        const card = document.createElement("div");
        card.className = `vault-card ${isEquipped ? 'equipped' : ''}`;
        card.innerHTML = `
            <img src="${item.img}" alt="Item">
            <div style="font-size: 10px; font-weight: bold; margin-top: 4px; color: #fff;">${item.name}</div>
            <button style="margin-top: 6px; padding: 4px 8px; font-size: 9px; border: none; border-radius: 6px; font-weight: bold; background: ${isEquipped ? '#22c55e' : '#00e5ff'}; color: #000; cursor: pointer;">
                ${isEquipped ? 'EQUIPPED' : 'EQUIP'}
            </button>
        `;

        card.onclick = () => equipVaultItem(item.type, item.img);
        container.appendChild(card);
    });
}

async function equipVaultItem(type, img) {
    const updateField = type === 'avatar' ? { equippedAvatar: img } : { equippedBanner: img };
    await updateDoc(doc(db, "users", currentUser.uid), updateField);
    renderVaultItems();
}