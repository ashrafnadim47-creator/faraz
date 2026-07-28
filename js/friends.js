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
// 🔑 AUTH CHECK & AUTO PLAYER ID GENERATOR
// ==========================================
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        document.getElementById("user-email-display").innerText = user.email || "Gamer";
        
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const data = userSnap.data();
            if (data.playerUid) {
                myPlayerUid = data.playerUid;
            } else {
                // Generate 8-Digit Unique Free Fire Style ID
                myPlayerUid = Math.floor(10000000 + Math.random() * 90000000).toString();
                await setDoc(userRef, { playerUid: myPlayerUid, isOnline: true }, { merge: true });
            }
        } else {
            myPlayerUid = Math.floor(10000000 + Math.random() * 90000000).toString();
            await setDoc(userRef, { playerUid: myPlayerUid, isOnline: true }, { merge: true });
        }

        document.getElementById("user-player-uid").innerText = myPlayerUid;

        // Set Presence Online
        await updateDoc(userRef, { isOnline: true, lastSeen: serverTimestamp() });
        
        // Load Friends & Requests real-time
        listenToFriendsAndRequests();
    }
});

// Update Offline Status when user leaves tab/page
window.addEventListener("beforeunload", () => {
    if (currentUser) {
        updateDoc(doc(db, "users", currentUser.uid), { isOnline: false });
    }
});

// COPY ID FUNCTION
window.copyPlayerId = function() {
    navigator.clipboard.writeText(myPlayerUid);
    alert(`📋 Player ID Copied: ${myPlayerUid}`);
};

// ==========================================
// 🔍 SEARCH PLAYER BY 8-DIGIT ID
// ==========================================
window.searchPlayerById = async function() {
    const inputVal = document.getElementById("friend-search-id")?.value.trim();
    const container = document.getElementById("search-result-container");

    if (!inputVal || inputVal.length < 5) return alert("Please enter a valid Player ID!");

    container.innerHTML = "<p style='color:#00e5ff; font-size:12px;'>Searching player...</p>";

    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("playerUid", "==", inputVal));
        const querySnap = await getDocs(q);

        if (querySnap.empty) {
            container.innerHTML = "<p style='color:#ef4444; font-size:12px;'>❌ Player Not Found!</p>";
            return;
        }

        container.innerHTML = "";
        querySnap.forEach((d) => {
            const targetData = d.data();
            const targetUid = d.id;

            if (targetUid === currentUser?.uid) {
                container.innerHTML = "<p style='color:#ffcc00; font-size:12px;'>⚠️ This is your own Player ID!</p>";
                return;
            }

            const item = document.createElement("div");
            item.className = "friend-item";
            item.innerHTML = `
                <div>
                    <strong style="color: #fff; font-size: 13px;">${targetData.email || 'Player'}</strong>
                    <div style="font-size: 10px; color: #94a3b8;">ID: ${targetData.playerUid}</div>
                </div>
                <button class="btn-action-small btn-invite" onclick="sendRequest('${targetUid}', '${targetData.playerUid}')">➕ Send Request</button>
            `;
            container.appendChild(item);
        });
    } catch(e) { console.error(e); }
};

// SEND REQUEST
window.sendRequest = async function(targetUid, targetPlayerId) {
    if (!currentUser) return;
    try {
        await setDoc(doc(db, "users", targetUid, "friend_requests", currentUser.uid), {
            fromUid: currentUser.uid,
            fromPlayerUid: myPlayerUid,
            fromEmail: currentUser.email || "Gamer",
            timestamp: serverTimestamp()
        });
        alert(`✅ Friend Request sent to ID: ${targetPlayerId}!`);
    } catch(e) { alert("Failed to send request."); }
};

// ==========================================
// 👥 LISTEN TO FRIENDS & REQUESTS (REALTIME)
// ==========================================
function listenToFriendsAndRequests() {
    if (!currentUser) return;

    // 1. Pending Requests Listener
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

    // 2. Friends List Listener
    onSnapshot(collection(db, "users", currentUser.uid, "friends"), async (snapshot) => {
        const friendsContainer = document.getElementById("my-friends-list");
        if (!friendsContainer) return;

        if (snapshot.empty) {
            friendsContainer.innerHTML = "<p style='color: #64748b; font-size: 12px; text-align: center;'>No friends added yet. Click 'Add Friend' tab!</p>";
            return;
        }

        friendsContainer.innerHTML = "";
        snapshot.forEach(async (docSnap) => {
            const friendData = docSnap.data();
            const friendUid = docSnap.id;

            // Fetch live online status of friend
            const fSnap = await getDoc(doc(db, "users", friendUid));
            const isOnline = fSnap.exists() ? fSnap.data().isOnline : false;

            const item = document.createElement("div");
            item.className = "friend-item";
            item.innerHTML = `
                <div>
                    <div>
                        <span class="status-dot ${isOnline ? 'dot-online' : 'dot-offline'}"></span>
                        <strong style="color: #fff; font-size: 13px;">${friendData.email || 'Friend'}</strong>
                    </div>
                    <div style="font-size: 10px; color: #94a3b8; margin-left: 14px;">ID: ${friendData.playerUid} | ${isOnline ? '🟢 Online' : '🔴 Offline'}</div>
                </div>
                <button class="btn-action-small btn-invite" onclick="inviteFriend('${friendData.email}')">${isOnline ? '📣 Call/Invite' : '📩 Message'}</button>
            `;
            friendsContainer.appendChild(item);
        });
    });
}

// ACCEPT REQUEST
window.acceptRequest = async function(reqUserUid, reqEmail, reqPlayerUid) {
    try {
        // Add to My Friends
        await setDoc(doc(db, "users", currentUser.uid, "friends", reqUserUid), {
            uid: reqUserUid,
            email: reqEmail,
            playerUid: reqPlayerUid
        });

        // Add Me to Target's Friends
        await setDoc(doc(db, "users", reqUserUid, "friends", currentUser.uid), {
            uid: currentUser.uid,
            email: currentUser.email || "Gamer",
            playerUid: myPlayerUid
        });

        // Delete Request
        await deleteDoc(doc(db, "users", currentUser.uid, "friend_requests", reqUserUid));

        alert(`🎉 You are now friends with ${reqEmail}!`);
    } catch(e) { console.error(e); }
};

// REJECT REQUEST
window.rejectRequest = async function(reqUserUid) {
    await deleteDoc(doc(db, "users", currentUser.uid, "friend_requests", reqUserUid));
};

// INVITE FRIEND
window.inviteFriend = function(email) {
    alert(`📣 Invitation alert sent to ${email}!`);
};

// MODAL CONTROLS
window.openFriendsModal = () => document.getElementById("friends-modal").style.display = "flex";
window.closeFriendsModal = () => document.getElementById("friends-modal").style.display = "none";

window.switchFriendsTab = (tabName) => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.getElementById(`tab-${tabName === 'friends' ? 'my-friends' : tabName === 'add' ? 'add-friend' : 'requests'}`).classList.add("active");

    document.getElementById("panel-friends").style.display = tabName === 'friends' ? 'block' : 'none';
    document.getElementById("panel-add").style.display = tabName === 'add' ? 'block' : 'none';
    document.getElementById("panel-requests").style.display = tabName === 'requests' ? 'block' : 'none';
};