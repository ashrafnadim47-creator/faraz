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
let myNickname = "";
let currentSquadId = null;
let squadUnsubscribe = null;

let localAudioStream = null;
let isMicActive = false;

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
                myNickname = data.nickname || user.email.split("@")[0];
                if (data.playerUid) {
                    myPlayerUid = String(data.playerUid);
                } else {
                    myPlayerUid = String(Math.floor(10000000 + Math.random() * 90000000));
                    await setDoc(userRef, { playerUid: myPlayerUid, isOnline: true }, { merge: true });
                }
            } else {
                myPlayerUid = String(Math.floor(10000000 + Math.random() * 90000000));
                await setDoc(userRef, { playerUid: myPlayerUid, email: user.email, isOnline: true }, { merge: true });
            }

            const playerUidElem = document.getElementById("user-player-uid");
            if (playerUidElem) playerUidElem.innerText = myPlayerUid;

            await updateDoc(userRef, { isOnline: true, lastSeen: serverTimestamp() });
        } catch (e) {
            console.error("Auth init error:", e);
        }

        listenToFriendsAndRequests();
        listenToTeamInvites();
    }
});

window.copyPlayerId = function() {
    if (!myPlayerUid) return;
    navigator.clipboard.writeText(myPlayerUid);
    alert(`📋 Player ID Copied: ${myPlayerUid}`);
};

// SEARCH SYSTEM
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

        let q1 = query(usersRef, where("playerUid", "==", String(inputVal)));
        let snap1 = await getDocs(q1);
        snap1.forEach(d => matchedDocs.push({ id: d.id, data: d.data() }));

        if (matchedDocs.length === 0) {
            let q2 = query(usersRef, where("email", "==", inputVal.toLowerCase()));
            let snap2 = await getDocs(q2);
            snap2.forEach(d => matchedDocs.push({ id: d.id, data: d.data() }));
        }

        if (matchedDocs.length === 0) {
            container.innerHTML = "<p style='color:#ef4444; font-size:12px;'>❌ Player Not Found!</p>";
            return;
        }

        container.innerHTML = "";
        const docItem = matchedDocs[0];
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

    } catch(e) { 
        console.error("Search Error:", e);
        container.innerHTML = "<p style='color:#ef4444; font-size:12px;'>Search failed.</p>";
    }
};

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

// LISTENERS
function listenToFriendsAndRequests() {
    if (!currentUser) return;

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

    onSnapshot(collection(db, "users", currentUser.uid, "friends"), (snapshot) => {
        const friendsContainer = document.getElementById("my-friends-list");
        if (!friendsContainer) return;

        if (snapshot.empty) {
            friendsContainer.innerHTML = "<p style='color: #64748b; font-size: 12px; text-align: center;'>No friends added yet. Search Player ID to add!</p>";
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
                        <button class="btn-action-small btn-invite" style="background:${isOnline ? '#ffcc00' : '#334155'}; color:${isOnline ? '#000' : '#fff'}; border:none; padding:6px 12px; border-radius:8px; font-weight:bold; cursor:${isOnline ? 'pointer' : 'default'};" ${isOnline ? `onclick="inviteFriend('${friendUid}', '${fName}')"` : 'disabled'}>
                            ${isOnline ? '📣 Invite Team' : '🔴 Offline'}
                        </button>
                    </div>
                `;
            });
        });
    });
}

// ACCEPT / REJECT
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

window.rejectRequest = async function(reqUserUid) {
    if (!currentUser) return;
    try {
        await deleteDoc(doc(db, "users", currentUser.uid, "friend_requests", reqUserUid));
    } catch(e) { console.error(e); }
};

// MIC TOGGLE
window.toggleMicStream = async function() {
    const micBtn = document.getElementById("lobby-mic-btn");

    if (!isMicActive) {
        try {
            localAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            isMicActive = true;

            if (micBtn) {
                micBtn.innerText = "🎙️ MIC ON";
                micBtn.style.background = "#22c55e";
            }

            if (currentUser && currentSquadId) {
                await updateDoc(doc(db, "squads", currentSquadId, "members", currentUser.uid), {
                    isMicOn: true
                });
            }
        } catch (err) {
            alert("⚠️ Microphone permission denied or mic not connected!");
        }
    } else {
        if (localAudioStream) {
            localAudioStream.getTracks().forEach(track => track.stop());
            localAudioStream = null;
        }
        isMicActive = false;

        if (micBtn) {
            micBtn.innerText = "🔇 MIC OFF";
            micBtn.style.background = "#ef4444";
        }

        if (currentUser && currentSquadId) {
            await updateDoc(doc(db, "squads", currentSquadId, "members", currentUser.uid), {
                isMicOn: false
            });
        }
    }
};

// LOBBY & INVITE ENGINE
window.inviteFriend = async function(targetUid, friendName) {
    if (!currentUser) return;

    currentSquadId = currentSquadId || `squad_${currentUser.uid}`;

    try {
        const userSnap = await getDoc(doc(db, "users", currentUser.uid));
        const uData = userSnap.data() || {};

        await setDoc(doc(db, "squads", currentSquadId, "members", currentUser.uid), {
            uid: currentUser.uid,
            name: myNickname || currentUser.email.split("@")[0],
            avatar: uData.equippedAvatar || "images/avtar.png",
            isMicOn: isMicActive,
            isLeader: true
        });

        await setDoc(doc(db, "users", targetUid, "invites", currentUser.uid), {
            fromUid: currentUser.uid,
            squadId: currentSquadId,
            fromName: myNickname || currentUser.email.split("@")[0],
            timestamp: serverTimestamp()
        });

        alert(`📣 Team Invite sent to ${friendName}! Opening Landscape Lobby...`);
        openLandscapeLobby(currentSquadId);

    } catch(e) { console.error("Invite error:", e); }
};

function listenToTeamInvites() {
    if (!currentUser) return;

    onSnapshot(collection(db, "users", currentUser.uid, "invites"), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const invite = change.doc.data();
                showInvitePopup(change.doc.id, invite.fromName, invite.squadId);
            }
        });
    });
}

function showInvitePopup(inviteId, fromName, squadId) {
    let popup = document.getElementById("ff-team-invite-popup");
    if (!popup) {
        popup = document.createElement("div");
        popup.id = "ff-team-invite-popup";
        popup.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 9999;
            background: linear-gradient(135deg, #0f172a, #1e293b);
            border: 2px solid #ffcc00; border-radius: 16px; padding: 16px;
            box-shadow: 0 0 25px rgba(255, 204, 0, 0.4); max-width: 320px; text-align: center;
        `;
        document.body.appendChild(popup);
    }

    popup.innerHTML = `
        <div style="font-family:'Orbitron', sans-serif; color:#ffcc00; font-weight:900; font-size:14px; margin-bottom:6px;">
            🎮 TEAM INVITE RECEIVED!
        </div>
        <p style="color:#fff; font-size:12px; margin:0 0 12px;"><strong>${fromName}</strong> invited you to join their squad!</p>
        <div style="display:flex; gap:8px;">
            <button onclick="respondInvite('${inviteId}', '${squadId}', true)" style="flex:1; background:#22c55e; color:#000; border:none; padding:8px; border-radius:8px; font-weight:900; cursor:pointer;">ACCEPT</button>
            <button onclick="respondInvite('${inviteId}', '${squadId}', false)" style="flex:1; background:#ef4444; color:#fff; border:none; padding:8px; border-radius:8px; font-weight:900; cursor:pointer;">DECLINE</button>
        </div>
    `;

    popup.style.display = "block";
}

window.respondInvite = async function(inviteId, squadId, accepted) {
    const popup = document.getElementById("ff-team-invite-popup");
    if (popup) popup.style.display = "none";

    if (currentUser) {
        await deleteDoc(doc(db, "users", currentUser.uid, "invites", inviteId));
    }

    if (accepted && squadId) {
        const userSnap = await getDoc(doc(db, "users", currentUser.uid));
        const uData = userSnap.data() || {};

        await setDoc(doc(db, "squads", squadId, "members", currentUser.uid), {
            uid: currentUser.uid,
            name: myNickname || currentUser.email.split("@")[0],
            avatar: uData.equippedAvatar || "images/avtar.png",
            isMicOn: isMicActive,
            isLeader: false
        });

        openLandscapeLobby(squadId);
    }
};

function openLandscapeLobby(squadId) {
    currentSquadId = squadId;
    const modal = document.getElementById("landscape-squad-lobby");
    if (modal) modal.style.display = "flex";

    if (squadUnsubscribe) squadUnsubscribe();

    squadUnsubscribe = onSnapshot(collection(db, "squads", squadId, "members"), (snapshot) => {
        const stageContainer = document.getElementById("landscape-character-stage");
        if (!stageContainer) return;

        stageContainer.innerHTML = "";
        const members = [];
        snapshot.forEach(d => members.push(d.data()));

        for (let i = 0; i < 2; i++) {
            const member = members[i];
            const podium = document.createElement("div");

            if (member) {
                podium.className = "character-podium active-player";
                podium.innerHTML = `
                    <img src="${member.avatar}" class="character-img-standing" onerror="this.src='images/avtar.png'">
                    <div class="podium-base">
                        <div class="player-name-tag">${member.name} ${member.isLeader ? '👑' : ''}</div>
                        <div class="mic-indicator" style="color: ${member.isMicOn ? '#22c55e' : '#ef4444'};">
                            ${member.isMicOn ? '🎙️ SPEAKING' : '🔇 MUTED'}
                        </div>
                    </div>
                `;
            } else {
                podium.className = "character-podium open-slot-podium";
                podium.onclick = () => openLobbyInviteModal();
                podium.innerHTML = `
                    <div style="font-size:36px; color:#ffcc00; margin-bottom: 60px;">➕</div>
                    <div class="podium-base">
                        <div class="player-name-tag" style="color:#00e5ff;">TAP TO INVITE</div>
                    </div>
                `;
            }
            stageContainer.appendChild(podium);
        }
    });
}

// IN-LOBBY FRIEND LIST MODAL CONTROLS (FIXED TYPO HERE)
window.openLobbyInviteModal = async function() {
    const modal = document.getElementById("inlobby-invite-overlay");
    const container = document.getElementById("inlobby-online-friends-list");
    if (!modal || !container) return;

    modal.style.display = "flex";
    container.innerHTML = "<p style='color:#00e5ff; font-size:12px; text-align:center;'>Loading Online Friends...</p>";

    if (!currentUser) return;

    try {
        const snap = await getDocs(collection(db, "users", currentUser.uid, "friends"));
        if (snap.empty) {
            container.innerHTML = "<p style='color:#64748b; font-size:12px; text-align:center;'>No friends added yet.</p>";
            return;
        }

        container.innerHTML = "";
        for (const docSnap of snap.docs) {
            const friendData = docSnap.data();
            const friendUid = docSnap.id;

            const fSnap = await getDoc(doc(db, "users", friendUid));
            // TYPO FIX: Changed fDocSnap to fSnap
            const isOnline = fSnap.exists() ? fSnap.data().isOnline : false;

            const fName = friendData.email || 'Friend';

            const item = document.createElement("div");
            item.style.cssText = "background:rgba(30,41,59,0.8); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:10px; display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;";
            item.innerHTML = `
                <div>
                    <strong style="color:#fff; font-size:13px;">${fName}</strong>
                    <div style="font-size:10px; color:${isOnline ? '#22c55e' : '#94a3b8'}; font-weight:bold;">${isOnline ? '🟢 Online' : '🔴 Offline'}</div>
                </div>
                <button style="background:#00e5ff; color:#000; font-weight:900; border:none; padding:6px 12px; border-radius:8px; cursor:pointer;" onclick="inviteFriend('${friendUid}', '${fName}'); closeLobbyInviteModal();">INVITE</button>
            `;
            container.appendChild(item);
        }
    } catch(e) {
        console.error("Lobby invite error:", e);
        container.innerHTML = "<p style='color:#ef4444; font-size:12px; text-align:center;'>Failed to load friends.</p>";
    }
};

window.closeLobbyInviteModal = function() {
    const modal = document.getElementById("inlobby-invite-overlay");
    if (modal) modal.style.display = "none";
};

window.leaveSquadLobby = async function() {
    if (localAudioStream) {
        localAudioStream.getTracks().forEach(track => track.stop());
        localAudioStream = null;
    }
    isMicActive = false;

    if (currentUser && currentSquadId) {
        await deleteDoc(doc(db, "squads", currentSquadId, "members", currentUser.uid));
    }
    if (squadUnsubscribe) squadUnsubscribe();
    currentSquadId = null;

    const modal = document.getElementById("landscape-squad-lobby");
    if (modal) modal.style.display = "none";
};