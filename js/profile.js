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
let activeVaultCategory = "avatar";

const defaultVaultItems = [
    { id: "default_av", name: "Classic Avatar", img: "images/avtar.png", type: "avatar" },
    { id: "default_bn", name: "Default Banner", img: "images/diwali_bundle.png", type: "banner" }
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

    document.getElementById("display-nickname").innerText = data.nickname || (currentUser?.email ? currentUser.email.split("@")[0] : "Gamer");
    document.getElementById("display-player-id").innerText = playerUid;

    if (data.equippedAvatar) {
        document.getElementById("user-avatar-img").src = data.equippedAvatar;
    }
    if (data.equippedBanner) {
        document.getElementById("profile-banner-bg").style.backgroundImage = `url('${data.equippedBanner}')`;
    }

    document.getElementById("display-streak").innerText = data.streak || 1;
    document.getElementById("display-likes").innerText = data.likes || 0;
    document.getElementById("display-xp").innerText = (data.xp || data.points || 0).toLocaleString();

    // PRIME LEVEL 5 CROWN (10,000 Diamonds = LEVEL 5 CROWN)
    let primeLevel = "LEVEL 1 (BRONZE)";
    let targetDiamonds = 500;

    if (diamonds >= 10000) {
        primeLevel = "LEVEL 5 (CROWN 👑)";
        targetDiamonds = 10000;
    } else if (diamonds >= 5000) {
        primeLevel = "LEVEL 4 (DIAMOND 💎)";
        targetDiamonds = 10000;
    } else if (diamonds >= 2000) {
        primeLevel = "LEVEL 3 (GOLD 🥇)";
        targetDiamonds = 5000;
    } else if (diamonds >= 500) {
        primeLevel = "LEVEL 2 (SILVER 🥈)";
        targetDiamonds = 2000;
    }

    const percentage = Math.min(100, Math.floor((diamonds / targetDiamonds) * 100));

    document.getElementById("display-prime-title").innerText = `👑 PRIME ${primeLevel}`;
    document.getElementById("display-diamonds-count").innerText = `💎 ${diamonds.toLocaleString()} / ${targetDiamonds.toLocaleString()}`;
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
        document.getElementById("count-orders").innerText = `${snap.size} Orders Placed`;
    } catch(e){}
}

// VAULT MODAL CONTROLS
window.openVaultModal = () => {
    document.getElementById("vault-modal").style.display = "flex";
    renderVaultItems();
};

window.closeVaultModal = () => {
    document.getElementById("vault-modal").style.display = "none";
};

window.switchVaultCategory = (cat) => {
    activeVaultCategory = cat;
    document.querySelectorAll(".vault-cat-btn").forEach(b => b.classList.remove("active"));
    document.getElementById(`vcat-${cat}`).classList.add("active");
    renderVaultItems();
};

function renderVaultItems() {
    const container = document.getElementById("vault-items-container");
    container.innerHTML = "";

    const userVault = userDataState.vault || defaultVaultItems;
    const items = userVault.filter(i => (i.type || 'avatar') === activeVaultCategory);

    if (items.length === 0) {
        container.innerHTML = `<p style="grid-column: span 3; text-align: center; color: #64748b; font-size: 12px;">No items in this category yet. Spin Luck Royale to win!</p>`;
        return;
    }

    items.forEach((item) => {
        const isEquipped = (activeVaultCategory === 'avatar' && userDataState.equippedAvatar === item.img) ||
                           (activeVaultCategory === 'banner' && userDataState.equippedBanner === item.img);

        const card = document.createElement("div");
        card.className = `vault-item-node ${isEquipped ? 'equipped' : ''}`;
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
    if (type === 'avatar') {
        await updateDoc(doc(db, "users", currentUser.uid), { equippedAvatar: img });
    } else if (type === 'banner') {
        await updateDoc(doc(db, "users", currentUser.uid), { equippedBanner: img });
    }
    renderVaultItems();
}