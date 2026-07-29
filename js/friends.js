import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    collection, 
    query, 
    where, 
    getDocs,
    deleteDoc,
    onSnapshot,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let currentUser = null;
let myPlayerUid = "";

// ==========================================
// 🔑 AUTH CHECK & ONLINE PRESENCE TRACKER
// ==========================================
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        const emailElem = document.getElementById("user-email-display");
        if (emailElem) emailElem.innerText = user.email || "Gamer";

        const userRef = doc(db, "users", user.uid);
        try {
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();
                if (data.playerUid) {
                    myPlayerUid = String(data.playerUid);
                } else {
                    myPlayerUid = String(Math.floor(10000000 + Math.random() * 90000000));
                    await setDoc(userRef, { playerUid: myPlayerUid, isOnline: true }, { merge: true });
                }
            } else {
                myPlayerUid = String(Math.floor(10000000 + Math.random() * 90000000));
                await setDoc(userRef, { playerUid: myPlayerUid, isOnline: true }, { merge: true });
            }

            const playerUidElem = document.getElementById("user-player-uid");
            if (playerUidElem) playerUidElem.innerText = myPlayerUid;

            // Set User Online State in Database
            await updateDoc(userRef, { isOnline: true, lastSeen: serverTimestamp() });
        } catch (e) {
            console.error("Auth init error:", e);
        }

        listenToFriendsAndRequests();
    }
});

// Set User Offline when page closes
window.addEventListener("beforeunload", () => {
    if (currentUser) {
        updateDoc(doc(db, "users", currentUser.uid), { isOnline: false });
    }
});

// COPY PLAYER ID
window.copyPlayerId = function() {
    if (!myPlayerUid) return;
    navigator.clipboard.writeText(myPlayerUid);
    alert(`📋 Player ID Copied: ${myPlayerUid}`);
};

// ==========================================
// 🔍 WORKING SEARCH SYSTEM (BY ID / EMAIL)
// ==========================================
window.searchPlayerById = async function() {
    const inputElem = document.getElementById("friend-search-id");
    const container = document.getElementById("search-result-container");

    if (!inputElem || !container) return;

    const inputVal = inputElem.value.trim();
    if (!inputVal) return alert("Please enter Player ID or Email!");

    container.innerHTML = "<p style='color:#00e5ff; font-size:12px;'>🔍 Searching player...</p>";

    try {
        const usersRef = collection(db, "users");
        let matchedDocs = [];

        // Search 1: Match playerUid as String
        let q1 = query(usersRef, where("playerUid", "==", String(inputVal)));
        let snap1 = await getDocs(q1);

        snap1.forEach(d => matchedDocs.push({ id: d.id, data: d.data() }));

        // Search 2: If empty, match email
        if (matchedDocs.length === 0) {
            let q2 = query(usersRef, where("email", "==", inputVal.toLowerCase()));
            let snap2 = await getDocs(q2);
            snap2.forEach(d => matchedDocs.push({ id: d.id, data: d.data() }));
        }

        if (matchedDocs.length === 0) {
            container.innerHTML = "<p style='color:#ef4444; font-size:12px;'>❌ Player Not Found! Verify the ID or Email.</p>";
            return;
        }

        container.innerHTML = "";
        matchedDocs.forEach((docItem) => {
            const targetData = docItem.data;
            const targetUid = docItem.id;

            if (targetUid === currentUser?.uid) {
                container.innerHTML = "<p style='color:#ffcc00; font-size:12px;'>⚠️ This is your own Player ID!</p>";
                return;
            }

            const item = document.createElement("div");
            item.className = "friend-item";
            item.style.cssText = "background: rgba(30,41,59,0.8); border: 1px solid #00e5ff; border-radius: 12px; padding: 10px; display: flex; justify-content: space-between; align-items: center; margin-top: 10px;";
            item.innerHTML = `
                <div>
                    <strong style="color: #fff; font-size: 13px;">${targetData.nickname || targetData.email || 'Player'}</strong>
                    <div style="font-size: 10px; color: #ffcc00;">ID: ${targetData.playerUid || targetUid.substring(0,8)}</div>
                </div>
                <button class="btn-action-small btn-invite" style="background:#00e5ff; color:#000; font-weight:900; border:none; padding:6px 12px; border-radius:8px; cursor:pointer;" onclick="sendRequest('${targetUid}', '${targetData.playerUid || targetUid.substring(0,8)}')">➕ Send Request</button>
            `;
            container.appendChild(item);
        });
    } catch(e) { 
        console.error("Search Error:", e);
        container.innerHTML = "<p style='color:#ef4444; font-size:12px;'>Search failed. Try again.</p>";
    }
};
// SEND REQUEST
window.sendRequest = async function(targetUid, targetPlayerId) {
    if (!currentUser) return alert("Please log in first!");
    try {
        await setDoc(doc(db, "users", targetUid, "friend_requests", currentUser.uid), {
            fromUid: currentUser.uid,
            fromPlayerUid: myPlayerUid,
            fromEmail: currentUser.email || "Gamer",
            timestamp: serverTimestamp()
        });
        alert(`✅ Friend Request sent to ID: ${targetPlayerId}!`);
    } catch(e) { 
        console.error("Send request error:", e); 
        alert("Failed to send request.");
    }
};

// ==========================================
// 👥 REALTIME FRIENDS & ONLINE STATUS LISTENERS
// ==========================================
function listenToFriendsAndRequests() {
    if (!currentUser) return;

    // 1. Requests Listener
    onSnapshot(collection(db, "users", currentUser.uid, "friend_requests"), (snapshot) => {
        const reqContainer = document.getElementById("pending-requests-list");
        if (!reqContainer) return;

        if (snapshot.empty) {
            reqContainer.innerHTML = "<p style='color: #64748b; font-size: 12px; text-align: center;'>No pending requests.</p>";
            return;
        }

        reqContainer.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const req = docSnap.data();
            const reqUserUid = docSnap.id;

            const item = document.createElement("div");
            item.className = "friend-item";
            item.innerHTML = `
                <div>
                    <strong style="color: #fff; font-size: 13px;">${req.fromEmail}</strong>
                    <div style="font-size: 10px; color: #00e5ff;">ID: ${req.fromPlayerUid}</div>
                </div>
                <div>
                    <button class="btn-action-small btn-accept" onclick="acceptRequest('${reqUserUid}', '${req.fromEmail}', '${req.fromPlayerUid}')">Accept</button>
                    <button class="btn-action-small btn-reject" onclick="rejectRequest('${reqUserUid}')">Reject</button>
                </div>
            `;
            reqContainer.appendChild(item);
        });
    });

    // 2. Realtime Friends Listener with Live Online Status
    onSnapshot(collection(db, "users", currentUser.uid, "friends"), (snapshot) => {
        const friendsContainer = document.getElementById("my-friends-list");
        if (!friendsContainer) return;

        if (snapshot.empty) {
            friendsContainer.innerHTML = "<p style='color: #64748b; font-size: 12px; text-align: center;'>No friends added yet. Click 'Add Friend' tab!</p>";
            return;
        }

        friendsContainer.innerHTML = "";
        
        snapshot.docs.forEach((docSnap) => {
            const friendData = docSnap.data();
            const friendUid = docSnap.id;

            const friendNode = document.createElement("div");
            friendNode.id = `friend-node-${friendUid}`;
            friendNode.className = "friend-item";
            friendsContainer.appendChild(friendNode);

            // Realtime Listener on friend's online status
            onSnapshot(doc(db, "users", friendUid), (fDoc) => {
                const node = document.getElementById(`friend-node-${friendUid}`);
                if (!node) return;

                const isOnline = fDoc.exists() ? fDoc.data().isOnline : false;
                const fName = friendData.email || 'Friend';
                const fId = friendData.playerUid || friendUid.substring(0,8);

                node.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 6px 0;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${isOnline ? '#22c55e' : '#64748b'}; box-shadow: ${isOnline ? '0 0 8px #22c55e' : 'none'}; display: inline-block;"></span>
                                <strong style="color: #fff; font-size: 13px;">${fName}</strong>
                            </div>
                            <div style="font-size: 10px; color: ${isOnline ? '#22c55e' : '#94a3b8'}; margin-left: 14px; font-weight: bold;">
                                ID: ${fId} | ${isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}
                            </div>
                        </div>
                        <button class="btn-action-small btn-invite" style="background:${isOnline ? '#ffcc00' : '#334155'}; color:${isOnline ? '#000' : '#fff'}; border:none; padding:6px 12px; border-radius:8px; font-weight:bold; cursor:pointer;" onclick="inviteFriend('${fName}')">
                            ${isOnline ? '📣 Invite' : '📩 Offline'}
                        </button>
                    </div>
                `;
            });
        });
    });
}

// ACCEPT REQUEST
window.acceptRequest = async function(reqUserUid, reqEmail, reqPlayerUid) {
    if (!currentUser) return;
    try {
        await setDoc(doc(db, "users", currentUser.uid, "friends", reqUserUid), {
            uid: reqUserUid,
            email: reqEmail,
            playerUid: reqPlayerUid
        });

        await setDoc(doc(db, "users", reqUserUid, "friends", currentUser.uid), {
            uid: currentUser.uid,
            email: currentUser.email || "Gamer",
            playerUid: myPlayerUid
        });

        await deleteDoc(doc(db, "users", currentUser.uid, "friend_requests", reqUserUid));
        alert(`🎉 You are now friends with ${reqEmail}!`);
    } catch(e) { console.error(e); }
};

// REJECT REQUEST
window.rejectRequest = async function(reqUserUid) {
    if (!currentUser) return;
    try {
        await deleteDoc(doc(db, "users", currentUser.uid, "friend_requests", reqUserUid));
    } catch(e) { console.error(e); }
};

// INVITE FRIEND
window.inviteFriend = function(email) {
    alert(`📣 Invitation alert sent to ${email}!`);
};

// MODAL CONTROLS
window.openFriendsModal = () => {
    const modal = document.getElementById("friends-modal");
    if (modal) modal.style.display = "flex";
};

window.closeFriendsModal = () => {
    const modal = document.getElementById("friends-modal");
    if (modal) modal.style.display = "none";
};

window.switchFriendsTab = (tabName) => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    const activeTabBtn = document.getElementById(`tab-${tabName === 'friends' ? 'my-friends' : tabName === 'add' ? 'add-friend' : 'requests'}`);
    if (activeTabBtn) activeTabBtn.classList.add("active");

    const pFriends = document.getElementById("panel-friends");
    const pAdd = document.getElementById("panel-add");
    const pRequests = document.getElementById("panel-requests");

    if (pFriends) pFriends.style.display = tabName === 'friends' ? 'block' : 'none';
    if (pAdd) pAdd.style.display = tabName === 'add' ? 'block' : 'none';
    if (pRequests) pRequests.style.display = tabName === 'requests' ? 'block' : 'none';
};