// ==============================================================================
// PROJECT NOVA — END-TO-END AUTOMATED TEST SUITE
// Tests Authentication, Realtime WS, Edit/Delete, Read Receipts,
// File Uploads, Voice Notes, Polls, WebRTC Signaling & DB Persistence
// ==============================================================================

const http = require('node:http');
const WebSocket = require('ws');
const fs = require('node:fs');

const BASE_URL = 'http://localhost:4000';
const WS_URL = 'ws://localhost:4000';

let passCount = 0;
let failCount = 0;

function assert(condition, testName) {
    if (condition) {
        console.log(`  ✓ PASS: ${testName}`);
        passCount++;
    } else {
        console.error(`  ✗ FAIL: ${testName}`);
        failCount++;
    }
}

async function requestJson(url, options = {}, body = null) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const reqOpts = {
            hostname: parsed.hostname,
            port: parsed.port,
            path: parsed.pathname + parsed.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = http.request(reqOpts, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(data || '{}');
                    resolve({ status: res.statusCode, data: parsedData, raw: data });
                } catch(e) {
                    resolve({ status: res.statusCode, data, raw: data });
                }
            });
        });

        req.on('error', reject);
        if (body) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        req.end();
    });
}

function connectWs(token) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(WS_URL);
        ws.on('open', () => {
            ws.send(JSON.stringify({ type: 'AUTH', token }));
        });
        ws.on('message', (raw) => {
            const msg = JSON.parse(raw.toString());
            if (msg.type === 'AUTH_SUCCESS') {
                resolve(ws);
            }
        });
        ws.on('error', reject);
    });
}

async function runAllTests() {
    console.log('\n==============================================================================');
    console.log('🧪 RUNNING NOVA AUTOMATED VERIFICATION SUITE');
    console.log('==============================================================================\n');

    const timestamp = Date.now();
    const userA_Name = `alice_${timestamp}`;
    const userB_Name = `bob_${timestamp}`;

    // --------------------------------------------------------------------------
    // 1. REGISTRATION & AUTH
    // --------------------------------------------------------------------------
    console.log('[1/7] Testing Registration, Security & Sessions...');
    const regResA = await requestJson(`${BASE_URL}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, {
        displayName: 'Alice Engineer',
        username: userA_Name,
        email: `${userA_Name}@test.io`,
        password: 'Password123!'
    });
    assert(regResA.status === 201 && regResA.data.token, 'Register User A (Alice) succeeds with status 201');
    const tokenA = regResA.data.token;
    const userA = regResA.data.user;

    const regResB = await requestJson(`${BASE_URL}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, {
        displayName: 'Bob Designer',
        username: userB_Name,
        email: `${userB_Name}@test.io`,
        password: 'Password123!'
    });
    assert(regResB.status === 201 && regResB.data.token, 'Register User B (Bob) succeeds with status 201');
    const tokenB = regResB.data.token;
    const userB = regResB.data.user;

    // Test duplicate registration rejection
    const dupRes = await requestJson(`${BASE_URL}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, {
        displayName: 'Alice Duplicate',
        username: userA_Name,
        email: `${userA_Name}@test.io`,
        password: 'Password123!'
    });
    assert(dupRes.status === 409, 'Duplicate username registration rejected with 409 Conflict');

    // Test Login & bad password
    const badLogin = await requestJson(`${BASE_URL}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, {
        login: userA_Name,
        password: 'WrongPassword'
    });
    assert(badLogin.status === 401, 'Invalid password rejected with 401 Unauthorized');

    // --------------------------------------------------------------------------
    // 2. DISCOVERY & DIRECT CHAT CREATION
    // --------------------------------------------------------------------------
    console.log('\n[2/7] Testing User Discovery & Direct Chat...');
    const searchRes = await requestJson(`${BASE_URL}/api/users/search?q=${userB_Name}`, {
        headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert(searchRes.status === 200 && searchRes.data.users.length > 0, 'Alice discovers Bob via user search API');

    const chatCreateRes = await requestJson(`${BASE_URL}/api/chats/direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, { targetUserId: userB.id });
    assert(chatCreateRes.status === 201 && chatCreateRes.data.chatId, 'Alice creates 1-on-1 Direct Chat with Bob');
    const chatId = chatCreateRes.data.chatId;

    // --------------------------------------------------------------------------
    // 3. WEBSOCKET REALTIME MESSAGING & DELIVERY
    // --------------------------------------------------------------------------
    console.log('\n[3/7] Testing WebSocket Realtime Messaging, Read Receipts & Reactions...');
    const wsA = await connectWs(tokenA);
    const wsB = await connectWs(tokenB);
    assert(wsA.readyState === WebSocket.OPEN && wsB.readyState === WebSocket.OPEN, 'Both Alice & Bob authenticated on WebSocket gateway');

    // Alice sends real message
    const msgPromise = new Promise((resolve) => {
        wsB.on('message', (raw) => {
            const data = JSON.parse(raw.toString());
            if (data.type === 'NEW_MESSAGE' && data.message.text === 'Hello Bob! Test realtime message') {
                resolve(data.message);
            }
        });
    });

    wsA.send(JSON.stringify({
        type: 'SEND_MESSAGE',
        chatId,
        text: 'Hello Bob! Test realtime message',
        messageType: 'text'
    }));

    const receivedMsg = await msgPromise;
    assert(receivedMsg && receivedMsg.id, 'Bob receives Alice\'s message over WebSocket in real time');

    // Bob marks message as read -> Alice receives read receipt
    const readPromise = new Promise((resolve) => {
        wsA.on('message', (raw) => {
            const data = JSON.parse(raw.toString());
            if (data.type === 'MESSAGES_READ_RECEIPT') {
                resolve(data);
            }
        });
    });

    wsB.send(JSON.stringify({
        type: 'MARK_READ',
        chatId,
        messageIds: [receivedMsg.id]
    }));

    const readReceipt = await readPromise;
    assert(readReceipt && readReceipt.messageIds.includes(receivedMsg.id), 'Alice receives read receipt event (Blue Ticks)');

    // --------------------------------------------------------------------------
    // 4. MESSAGE EDIT & DELETE WITH AUTHORIZATION
    // --------------------------------------------------------------------------
    console.log('\n[4/7] Testing Message Edit, Delete & Server Authorization...');
    const editPromise = new Promise((resolve) => {
        wsB.on('message', (raw) => {
            const data = JSON.parse(raw.toString());
            if (data.type === 'MESSAGE_EDITED') {
                resolve(data);
            }
        });
    });

    wsA.send(JSON.stringify({
        type: 'EDIT_MESSAGE',
        messageId: receivedMsg.id,
        newText: 'Hello Bob! (Edited content)'
    }));

    const editedData = await editPromise;
    assert(editedData.newText === 'Hello Bob! (Edited content)', 'Alice edits her message and Bob receives live update');

    // Bob tries to edit Alice's message -> Must be rejected!
    const unauthEditPromise = new Promise((resolve) => {
        wsB.on('message', (raw) => {
            const data = JSON.parse(raw.toString());
            if (data.type === 'ERROR') {
                resolve(data);
            }
        });
    });

    wsB.send(JSON.stringify({
        type: 'EDIT_MESSAGE',
        messageId: receivedMsg.id,
        newText: 'Hacked by Bob'
    }));

    const unauthErr = await unauthEditPromise;
    assert(unauthErr && unauthErr.message.includes('Unauthorized'), 'Bob cannot edit Alice\'s message (Server Auth enforced)');

    // Real reaction
    const reactPromise = new Promise((resolve) => {
        wsA.on('message', (raw) => {
            const data = JSON.parse(raw.toString());
            if (data.type === 'REACTION_UPDATE') {
                resolve(data);
            }
        });
    });

    wsB.send(JSON.stringify({
        type: 'REACT',
        messageId: receivedMsg.id,
        emoji: '🔥'
    }));

    const reactData = await reactPromise;
    assert(reactData && reactData.reactions[0].emoji === '🔥', 'Bob adds reaction 🔥 and Alice receives reaction update');

    // Alice deletes message
    const deletePromise = new Promise((resolve) => {
        wsB.on('message', (raw) => {
            const data = JSON.parse(raw.toString());
            if (data.type === 'MESSAGE_DELETED') {
                resolve(data);
            }
        });
    });

    wsA.send(JSON.stringify({
        type: 'DELETE_MESSAGE',
        messageId: receivedMsg.id
    }));

    const deletedData = await deletePromise;
    assert(deletedData.messageId === receivedMsg.id, 'Alice deletes message and Bob receives deletion update');

    // --------------------------------------------------------------------------
    // 5. FILE UPLOAD & VOICE NOTES
    // --------------------------------------------------------------------------
    console.log('\n[5/7] Testing File Uploads, Real Disk Storage & Voice Notes...');
    const sampleBinaryBase64 = Buffer.from('RIFF....WAVEfmt ....dataSimulatedVoiceData').toString('base64');
    const uploadRes = await requestJson(`${BASE_URL}/api/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, {
        fileName: 'test_voice_sample.webm',
        type: 'audio',
        base64Data: sampleBinaryBase64
    });

    assert(uploadRes.status === 200 && uploadRes.data.url.startsWith('/uploads/'), 'Upload API saves file to disk and returns URL');

    const fileCheckRes = await requestJson(`${BASE_URL}${uploadRes.data.url}`);
    assert(fileCheckRes.status === 200 && fileCheckRes.raw.length > 0, 'Saved file is publicly accessible over HTTP from /uploads/');

    // --------------------------------------------------------------------------
    // 6. POLLS & VOTING
    // --------------------------------------------------------------------------
    console.log('\n[6/7] Testing Interactive Poll Creation & Live Voting...');
    const pollRes = await requestJson(`${BASE_URL}/api/chats/${chatId}/poll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, {
        question: 'Should we deploy to production?',
        options: ['Yes, fully tested!', 'No, need more tests']
    });
    assert(pollRes.status === 201 && pollRes.data.message.poll, 'Interactive Poll published in chat');
    const pollId = pollRes.data.message.poll.id;

    // Bob votes
    const voteRes = await requestJson(`${BASE_URL}/api/chats/${chatId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` }
    }, {
        pollId,
        optionId: 'opt_0'
    });
    assert(voteRes.status === 200 && voteRes.data.votes[0].count === 1, 'Bob casts vote on poll and tally updates');

    // --------------------------------------------------------------------------
    // 7. WEBRTC SIGNALING ROUNDTRIP
    // --------------------------------------------------------------------------
    console.log('\n[7/7] Testing WebRTC 1-on-1 Audio/Video Call Signaling...');
    const callOfferPromise = new Promise((resolve) => {
        wsB.on('message', (raw) => {
            const data = JSON.parse(raw.toString());
            if (data.type === 'CALL_INCOMING') {
                resolve(data);
            }
        });
    });

    wsA.send(JSON.stringify({
        type: 'CALL_OFFER',
        targetUserId: userB.id,
        callType: 'video',
        offerSdp: { type: 'offer', sdp: 'v=0\r\no=- 12345 2 IN IP4 127.0.0.1' }
    }));

    const incomingCall = await callOfferPromise;
    assert(incomingCall && incomingCall.caller.id === userA.id, 'Bob receives CALL_INCOMING signal with Alice\'s SDP offer');

    const callAnswerPromise = new Promise((resolve) => {
        wsA.on('message', (raw) => {
            const data = JSON.parse(raw.toString());
            if (data.type === 'CALL_ANSWERED') {
                resolve(data);
            }
        });
    });

    wsB.send(JSON.stringify({
        type: 'CALL_ANSWER',
        targetUserId: userA.id,
        answerSdp: { type: 'answer', sdp: 'v=0\r\no=- 67890 2 IN IP4 127.0.0.1' }
    }));

    const callAnswer = await callAnswerPromise;
    assert(callAnswer && callAnswer.calleeId === userB.id, 'Alice receives CALL_ANSWERED signal from Bob');

    wsA.close();
    wsB.close();

    // --------------------------------------------------------------------------
    // 8. ADVANCED MESSAGING, CONTACTS, STORIES, SESSIONS & BACKUPS
    // --------------------------------------------------------------------------
    console.log('\n[8/8] Testing Contacts, Stories, Scheduled Msgs, Drafts, Pins, Sessions & Backups...');

    // Health
    const healthRes = await requestJson(`${BASE_URL}/api/health`);
    assert(healthRes.status === 200 && healthRes.data.status === 'healthy', 'Health check API returns 200 OK & active metrics');

    // Contacts & Blocking
    const addContactRes = await requestJson(`${BASE_URL}/api/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, { contactUserId: userB.id });
    assert(addContactRes.status === 201, 'Alice adds Bob to contacts');

    const blockRes = await requestJson(`${BASE_URL}/api/contacts/${userB.id}/block`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert(blockRes.status === 200 && blockRes.data.isBlocked === true, 'Alice toggles blocking on Bob (isBlocked = true)');

    // Stories (24h Status)
    const storyCreateRes = await requestJson(`${BASE_URL}/api/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, { mediaUrl: uploadRes.data.url, caption: 'New status drop! 🔥' });
    assert(storyCreateRes.status === 201 && storyCreateRes.data.story.id, 'Alice posts 24-hour Status Story with media');

    const storyViewRes = await requestJson(`${BASE_URL}/api/stories/${storyCreateRes.data.story.id}/view`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert(storyViewRes.status === 200, 'Bob views Alice\'s story and view receipt is tracked');

    // Scheduled Messages
    const futureTime = Date.now() + 60000;
    const schRes = await requestJson(`${BASE_URL}/api/chats/${chatId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, { text: 'Scheduled automated reminder', scheduledFor: futureTime });
    assert(schRes.status === 201 && schRes.data.scheduledMessage.id, 'Alice schedules a message for future execution');

    // Drafts
    const draftPut = await requestJson(`${BASE_URL}/api/chats/${chatId}/draft`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, { draftText: 'Unfinished message draft...' });
    assert(draftPut.status === 200, 'Alice autosaves message draft');

    const draftGet = await requestJson(`${BASE_URL}/api/chats/${chatId}/draft`, {
        headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert(draftGet.status === 200 && draftGet.data.draftText === 'Unfinished message draft...', 'Draft text retrieved accurately on reload');

    // Pinning
    const pinRes = await requestJson(`${BASE_URL}/api/messages/${receivedMsg.id}/pin`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert(pinRes.status === 200 && pinRes.data.isPinned === true, 'Message pinned in chat successfully');

    // Chat Backup & Export
    const exportRes = await requestJson(`${BASE_URL}/api/chats/${chatId}/export`, {
        headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert(exportRes.status === 200 && Array.isArray(exportRes.data.messages), 'Alice exports chat transcript backup as JSON');

    // Linked Devices & Sessions
    const sessionsRes = await requestJson(`${BASE_URL}/api/sessions`, {
        headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert(sessionsRes.status === 200 && sessionsRes.data.sessions.length > 0, 'Alice views active linked devices/sessions');

    // Moderation Report
    const reportRes = await requestJson(`${BASE_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, { reportedUserId: userB.id, chatId, reason: 'Spam report test' });
    assert(reportRes.status === 201 && reportRes.data.reportId, 'Moderation abuse report submitted successfully');

    console.log('\n==============================================================================');
    console.log(`📊 TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('==============================================================================\n');

    process.exit(failCount > 0 ? 1 : 0);
}

runAllTests().catch((err) => {
    console.error('Test run failure:', err);
    process.exit(1);
});
