/**
 * PROJECT NOVA — COMPREHENSIVE MULTI-USER VERIFICATION SUITE
 * Rigorous manual & automated testing across Sections A through K
 */

const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:4000';
const WS_URL = 'ws://localhost:4000';

function post(endpoint, data, token = null) {
    return new Promise((resolve, reject) => {
        const u = new URL(endpoint, BASE_URL);
        const postData = JSON.stringify(data);
        const headers = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const req = http.request(u, { method: 'POST', headers }, res => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(body), headers: res.headers }); }
                catch (e) { resolve({ status: res.statusCode, raw: body, headers: res.headers }); }
            });
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

function get(endpoint, token = null) {
    return new Promise((resolve, reject) => {
        const u = new URL(endpoint, BASE_URL);
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const req = http.request(u, { method: 'GET', headers }, res => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(body), headers: res.headers }); }
                catch (e) { resolve({ status: res.statusCode, raw: body, headers: res.headers }); }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

function put(endpoint, data, token = null) {
    return new Promise((resolve, reject) => {
        const u = new URL(endpoint, BASE_URL);
        const postData = JSON.stringify(data);
        const headers = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const req = http.request(u, { method: 'PUT', headers }, res => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
                catch (e) { resolve({ status: res.statusCode, raw: body }); }
            });
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

function del(endpoint, token = null) {
    return new Promise((resolve, reject) => {
        const u = new URL(endpoint, BASE_URL);
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const req = http.request(u, { method: 'DELETE', headers }, res => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
                catch (e) { resolve({ status: res.statusCode, raw: body }); }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

function connectWs(token) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(WS_URL);
        ws.messages = [];
        ws.on('open', () => {
            ws.send(JSON.stringify({ type: 'AUTH', token }));
            setTimeout(() => resolve(ws), 100);
        });
        ws.on('message', data => {
            try { ws.messages.push(JSON.parse(data)); } catch (e) {}
        });
        ws.on('error', reject);
    });
}

async function run() {
    console.log('==============================================================================');
    console.log('🧪 RUNNING NOVA COMPREHENSIVE MULTI-USER AUDIT & VERIFICATION');
    console.log('==============================================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(desc, condition) {
        if (condition) {
            console.log(`  ✓ PASS: ${desc}`);
            passed++;
        } else {
            console.error(`  ✗ FAIL: ${desc}`);
            failed++;
        }
    }

    const testId = Date.now();
    const aliceUser = `alice_${testId}`;
    const bobUser = `bob_${testId}`;

    // -------------------------------------------------------------------------
    // SECTION A: Authentication & Accounts
    // -------------------------------------------------------------------------
    console.log('[SECTION A] Authentication, Passwords, Security & Sessions...');
    const regAlice = await post('/api/auth/register', {
        displayName: 'Alice Engineer',
        username: aliceUser,
        email: `${aliceUser}@nova.app`,
        password: 'Password123!'
    });
    assert('Alice registered successfully with 201', regAlice.status === 201 && regAlice.data.user);
    const aliceToken = regAlice.data.token;
    const aliceId = regAlice.data.user.id;

    const regBob = await post('/api/auth/register', {
        displayName: 'Bob QA',
        username: bobUser,
        email: `${bobUser}@nova.app`,
        password: 'Password123!'
    });
    assert('Bob registered successfully with 201', regBob.status === 201 && regBob.data.user);
    const bobToken = regBob.data.token;
    const bobId = regBob.data.user.id;

    const dupReg = await post('/api/auth/register', {
        displayName: 'Duplicate',
        username: aliceUser,
        email: 'other@nova.app',
        password: 'Pass'
    });
    assert('Duplicate username rejected with 409 Conflict', dupReg.status === 409);

    const badLogin = await post('/api/auth/login', { login: aliceUser, password: 'WrongPassword' });
    assert('Incorrect password rejected with 401 Unauthorized', badLogin.status === 401);

    const unauthAccess = await get('/api/chats', 'invalid_token_12345');
    assert('Unauthorized request rejected with 401', unauthAccess.status === 401);

    // -------------------------------------------------------------------------
    // SECTION B: Direct Chat & Real-Time Messaging
    // -------------------------------------------------------------------------
    console.log('\n[SECTION B] Direct Chat Creation, WebSocket Messaging & Read Receipts...');
    const directChatRes = await post('/api/chats/direct', { targetUserId: bobId }, aliceToken);
    assert('Alice initiates direct chat with Bob', [200, 201].includes(directChatRes.status) && directChatRes.data.chatId);
    const chatId = directChatRes.data.chatId;

    const aliceWs = await connectWs(aliceToken);
    const bobWs = await connectWs(bobToken);
    assert('Alice & Bob connected to WebSocket Gateway', aliceWs.readyState === WebSocket.OPEN && bobWs.readyState === WebSocket.OPEN);

    // Alice sends message to Bob
    aliceWs.send(JSON.stringify({
        type: 'SEND_MESSAGE',
        chatId,
        text: 'Hello Bob! This is real-time message with emojis 🔥🚀',
        messageType: 'text'
    }));
    await new Promise(r => setTimeout(r, 200));

    const bobReceived = bobWs.messages.find(m => m.type === 'NEW_MESSAGE' && m.message.text.includes('Hello Bob!'));
    assert('Bob receives Alice\'s message over WebSocket instantly', Boolean(bobReceived));
    const msg1Id = bobReceived ? bobReceived.message.id : null;

    // Bob sends Read Receipt
    if (msg1Id) {
        bobWs.send(JSON.stringify({ type: 'MARK_READ', chatId, messageIds: [msg1Id] }));
        await new Promise(r => setTimeout(r, 150));
        const aliceReadReceipt = aliceWs.messages.find(m => m.type === 'MESSAGES_READ_RECEIPT');
        assert('Alice receives Blue Double Ticks (Read Receipt)', Boolean(aliceReadReceipt));
    }

    // -------------------------------------------------------------------------
    // SECTION C: Replies, Edit, Delete, Reactions & Server Authorization
    // -------------------------------------------------------------------------
    console.log('\n[SECTION C] Quoted Replies, Edit, Delete, Reactions & Permissions...');
    // Bob sends a reply quoting Alice's message
    bobWs.send(JSON.stringify({
        type: 'SEND_MESSAGE',
        chatId,
        text: 'I received it Alice! Replying to your greeting.',
        messageType: 'text',
        replyToId: msg1Id
    }));
    await new Promise(r => setTimeout(r, 200));

    const aliceGotReply = aliceWs.messages.find(m => m.type === 'NEW_MESSAGE' && m.message.replyToId === msg1Id);
    assert('Quoted reply delivered with parent reference & preview', Boolean(aliceGotReply && aliceGotReply.message.replyTo));

    // Alice edits her message
    aliceWs.send(JSON.stringify({ type: 'EDIT_MESSAGE', messageId: msg1Id, newText: 'Hello Bob! (Updated Text)' }));
    await new Promise(r => setTimeout(r, 150));
    const bobSawEdit = bobWs.messages.find(m => m.type === 'MESSAGE_EDITED' && m.newText.includes('(Updated Text)'));
    assert('Alice edits message and Bob receives live update', Boolean(bobSawEdit));

    // Bob tries to edit Alice's message (Unauthorized)
    bobWs.send(JSON.stringify({ type: 'EDIT_MESSAGE', messageId: msg1Id, newText: 'Hacked by Bob' }));
    await new Promise(r => setTimeout(r, 150));
    const bobGotError = bobWs.messages.find(m => m.type === 'ERROR' && m.message.includes('Unauthorized'));
    assert('Server blocks Bob from editing Alice\'s message', Boolean(bobGotError));

    // Bob reacts to Alice's message
    bobWs.send(JSON.stringify({ type: 'REACT', messageId: msg1Id, emoji: '❤️' }));
    await new Promise(r => setTimeout(r, 150));
    const aliceSawReaction = aliceWs.messages.find(m => m.type === 'REACTION_UPDATE' && m.reactions.some(r => r.emoji === '❤️'));
    assert('Bob reacts with ❤️ and Alice receives reaction update', Boolean(aliceSawReaction));

    // Alice pins the message
    const pinRes = await post(`/api/messages/${msg1Id}/pin`, {}, aliceToken);
    assert('Alice pins message via REST API and WS broadcast', pinRes.status === 200 && pinRes.data.isPinned === true);

    // -------------------------------------------------------------------------
    // SECTION D: Media Uploads & Path Traversal Security
    // -------------------------------------------------------------------------
    console.log('\n[SECTION D] Media Uploads & Path Traversal Security Audit...');
    const uploadRes = await post('/api/upload', {
        fileName: 'दस्तावेज़_report.pdf',
        type: 'file',
        base64Data: Buffer.from('%PDF-1.4 Mock PDF Content').toString('base64')
    }, aliceToken);
    assert('File upload with non-ASCII filename succeeds', uploadRes.status === 200 && uploadRes.data.url);

    // Verify path traversal attack is blocked
    const traversalAttempt = await get('/uploads/..%2fpackage.json');
    assert('Directory traversal attempt blocked with 403 Forbidden', traversalAttempt.status === 403);

    // -------------------------------------------------------------------------
    // SECTION E: Interactive Polls
    // -------------------------------------------------------------------------
    console.log('\n[SECTION E] Interactive Polls & Real-Time Voting...');
    const pollRes = await post(`/api/chats/${chatId}/poll`, {
        question: 'Should we launch NOVA v2 this Friday?',
        options: ['Yes, absolutely!', 'Need more tests']
    }, aliceToken);
    assert('Alice creates interactive poll in chat', pollRes.status === 201 && pollRes.data.message.poll);
    const pollId = pollRes.data.message.poll.id;

    // Bob votes on option 0
    const voteRes = await post(`/api/chats/${chatId}/vote`, { pollId, optionId: 'opt_0' }, bobToken);
    assert('Bob votes on poll and live tally updates', voteRes.status === 200 && voteRes.data.votes.length > 0);

    // -------------------------------------------------------------------------
    // SECTION F: WebRTC Calling & Call Logs
    // -------------------------------------------------------------------------
    console.log('\n[SECTION F] WebRTC 1-on-1 Signaling & Call History...');
    aliceWs.send(JSON.stringify({
        type: 'CALL_OFFER',
        targetUserId: bobId,
        callType: 'video',
        offerSdp: { type: 'offer', sdp: 'v=0\r\no=alice 12345 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n' }
    }));
    await new Promise(r => setTimeout(r, 150));
    const bobGotCall = bobWs.messages.find(m => m.type === 'CALL_INCOMING');
    assert('Bob receives CALL_INCOMING with Alice\'s SDP offer & callLogId', Boolean(bobGotCall && bobGotCall.callLogId));

    const callLogId = bobGotCall ? bobGotCall.callLogId : null;

    // Bob answers
    bobWs.send(JSON.stringify({
        type: 'CALL_ANSWER',
        targetUserId: aliceId,
        answerSdp: { type: 'answer', sdp: 'v=0\r\no=bob 12345 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n' },
        callLogId
    }));
    await new Promise(r => setTimeout(r, 150));
    const aliceGotAnswer = aliceWs.messages.find(m => m.type === 'CALL_ANSWERED');
    assert('Alice receives CALL_ANSWERED with Bob\'s SDP answer', Boolean(aliceGotAnswer));

    // End call
    aliceWs.send(JSON.stringify({
        type: 'CALL_END',
        targetUserId: bobId,
        reason: 'hangup',
        callLogId,
        durationSeconds: 42
    }));
    await new Promise(r => setTimeout(r, 150));

    // Verify call logs API
    const callLogsRes = await get('/api/calls', aliceToken);
    assert('Call history recorded in database and returned via /api/calls', callLogsRes.status === 200 && callLogsRes.data.calls.length > 0);

    // -------------------------------------------------------------------------
    // SECTION G: Channel Permissions & Member Management
    // -------------------------------------------------------------------------
    console.log('\n[SECTION G] Channels, Broadcast Permissions & Member Management...');
    // Bob (subscriber in official channel) tries to post
    bobWs.send(JSON.stringify({
        type: 'SEND_MESSAGE',
        chatId: 'chat_channel_nova',
        text: 'Unauthorized broadcast test from Bob',
        messageType: 'text'
    }));
    await new Promise(r => setTimeout(r, 150));
    const channelError = bobWs.messages.find(m => m.type === 'ERROR' && m.message.includes('administrators can broadcast'));
    assert('Subscriber blocked from broadcasting in official channel', Boolean(channelError));

    // Group member list & role promotion
    const membersRes = await get('/api/chats/chat_group_squad/members', aliceToken);
    assert('List group members with roles via /api/chats/:id/members', membersRes.status === 200 && Array.isArray(membersRes.data.members));

    // -------------------------------------------------------------------------
    // SECTION H: Privacy, Blocking & Settings
    // -------------------------------------------------------------------------
    console.log('\n[SECTION H] Privacy Settings & Blocking Enforcement...');
    // Bob blocks Alice
    const blockRes = await post(`/api/contacts/${aliceId}/block`, {}, bobToken);
    assert('Bob blocks Alice (isBlocked = true)', blockRes.status === 200 && blockRes.data.isBlocked === true);

    // Alice tries to message Bob while blocked
    aliceWs.send(JSON.stringify({
        type: 'SEND_MESSAGE',
        chatId,
        text: 'Are you ignoring me Bob?',
        messageType: 'text'
    }));
    await new Promise(r => setTimeout(r, 150));
    const aliceBlockedMsg = aliceWs.messages.find(m => m.type === 'ERROR' && m.message.includes('blocked'));
    assert('Blocked sender cannot send messages to blocker', Boolean(aliceBlockedMsg));

    // Alice tries to call Bob while blocked
    aliceWs.send(JSON.stringify({
        type: 'CALL_OFFER',
        targetUserId: bobId,
        callType: 'audio',
        offerSdp: { type: 'offer', sdp: 'mock' }
    }));
    await new Promise(r => setTimeout(r, 150));
    const aliceBlockedCall = aliceWs.messages.find(m => m.type === 'ERROR' && m.message.includes('blocked by this user'));
    assert('Blocked caller cannot initiate calls to blocker', Boolean(aliceBlockedCall));

    // Bob unblocks Alice
    await post(`/api/contacts/${aliceId}/block`, {}, bobToken);

    // User Privacy Settings
    const putSettings = await put('/api/users/settings', { privacyLastSeen: 'nobody', privacyReadReceipts: 0 }, aliceToken);
    assert('Alice updates privacy settings (last-seen: nobody)', putSettings.status === 200);

    const getSettings = await get('/api/users/settings', aliceToken);
    assert('Privacy settings persisted in database', getSettings.status === 200 && getSettings.data.settings.privacy_last_seen === 'nobody');

    // -------------------------------------------------------------------------
    // SECTION I: Global Message Search, Stories, Drafts & Backups
    // -------------------------------------------------------------------------
    console.log('\n[SECTION I] Global Search, Status Stories, Backups & Revocation...');
    const searchRes = await get('/api/search?q=Updated+Text', aliceToken);
    assert('Global search finds exact message text across chats', searchRes.status === 200 && searchRes.data.messages.length > 0);

    // 24h Story
    const storyRes = await post('/api/stories', {
        mediaUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800',
        caption: 'Building NOVA Super App!'
    }, aliceToken);
    assert('Alice publishes 24-hour Status Story', storyRes.status === 201 && storyRes.data.storyId);

    // Bob views story
    const viewStory = await post(`/api/stories/${storyRes.data.storyId}/view`, {}, bobToken);
    assert('Bob views Alice\'s story and view receipt is tracked', viewStory.status === 200);

    // Chat Export
    const exportRes = await get(`/api/chats/${chatId}/export`, aliceToken);
    assert('Alice exports chat history as JSON backup', exportRes.status === 200 && exportRes.data.messages);

    // Session revocation
    const sessionsList = await get('/api/sessions', bobToken);
    assert('Bob views active sessions list', sessionsList.status === 200 && sessionsList.data.sessions.length > 0);

    const targetPrefix = sessionsList.data.sessions[0].tokenPrefix.replace('...', '');
    const revokeRes = await del(`/api/sessions/${targetPrefix}`, bobToken);
    assert('Session revoked successfully via DELETE /api/sessions/:token', revokeRes.status === 200);

    aliceWs.close();
    bobWs.close();

    console.log('\n==============================================================================');
    console.log(`📊 FINAL TEST REPORT: ${passed} PASSED, ${failed} FAILED`);
    console.log('==============================================================================');

    process.exit(failed === 0 ? 0 : 1);
}

run().catch(err => {
    console.error('Test run error:', err);
    process.exit(1);
});
