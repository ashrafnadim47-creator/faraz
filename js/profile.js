import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    doc, 
    getDoc, 
    updateDoc, 
    increment, 
    collection, 
    query, 
    where, 
    getDocs,
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let currentUser = null;
let userDataState = {};
let activeVaultTab = "avatars";

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
    const diamonds = data.diamonds ?? data.wallet ?? 0;
    const playerUid = data.playerUid || Math.floor(10000000 + Math.random() * 90000000).toString();

    document.getElementById("display-nickname").innerText = data.nickname || (currentUser?.email ? currentUser.email.split("@")[0] : "Gamer");
    document.getElementById("display-player-id").innerText = playerUid;

    if (data.equippedAvatar) document.getElementById("user-avatar-img").src = data.equippedAvatar;
    if (data.equippedBanner) document.getElementById("profile-banner-bg").style.backgroundImage = `url('${data.equippedBanner}')`;

    document.getElementById("display-streak").innerText = data.streak || 1;
    document.getElementById("display-likes").innerText = data.likes || 0;
    document.getElementById("display-xp").innerText = (data.xp || data.points || 0).toLocaleString();

    // PRIME LEVEL CALCULATION (10,000 Diamonds = LEVEL 5 CROWN 👑)
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

    document.getElementById("display-prime-title").innerText = `👑 PRIME ${primeTitle}`;
    document.getElementById("display-diamonds-count").innerText = `💎 ${diamonds.toLocaleString()} / ${target.toLocaleString()}`;
    document.getElementById("prime-progress-fill").style.width = `${percentage}%`;
}

window.changeNickname = async function() {
    const newName = prompt("Enter new Gaming Nickname:", userDataState.nickname || "");
    if (newName && newName.trim().length >= 3) {
        await updateDoc(doc(db, "users", currentUser.uid), { nickname: newName.trim() });
    }
};

window.addProfileLike = async function() {
    if (!currentUser) return;
    await updateDoc(doc(db, "users", currentUser.uid), { likes: increment(1) });
};

window.copyPlayerId = function() {
    const uid = document.getElementById("display-player-id").innerText;
    navigator.clipboard.writeText(uid);
    alert("📋 Player ID Copied: " + uid);
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

// VAULT MODAL
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
    const items = userVault.filter(i => (i.type || 'avatar') === (activeVaultTab === 'avatars' ? 'avatar' : 'banner'));

    if (items.length === 0) {
        container.innerHTML = `<p style="grid-column: span 3; text-align: center; color: #64748b; font-size: 12px;">No items in this section yet.</p>`;
        return;
    }

    items.forEach((item) => {
        const isEquipped = (activeVaultTab === 'avatars' && userDataState.equippedAvatar === item.img) ||
                           (activeVaultTab === 'banners' && userDataState.equippedBanner === item.img);

        const card = document.createElement("div");
        card.className = `vault-item ${isEquipped ? 'equipped' : ''}`;
        card.innerHTML = `
            <img src="${item.img}" alt="${item.name}">
            <div style="font-size: 10px; font-weight: bold; color: #fff;">${item.name}</div>
            <button style="margin-top: 6px; padding: 4px 8px; font-size: 9px; border: none; border-radius: 6px; font-weight: bold; background: ${isEquipped ? '#22c55e' : '#00e5ff'}; color: #000; cursor: pointer;">
                ${isEquipped ? 'EQUIPPED' : 'EQUIP'}
            </button>
        `;

        card.onclick = () => equipVaultItem(item.type, item.img);
        container.appendChild(card);
    });
}

async function equipVaultItem(type, img) {
    const updateObj = type === 'avatar' ? { equippedAvatar: img } : { equippedBanner: img };
    await updateDoc(doc(db, "users", currentUser.uid), updateObj);
    renderVaultItems();
}