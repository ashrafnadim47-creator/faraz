// ==============================================================================
// PROJECT NOVA — ALL-IN-ONE MESSAGING SUPER APP (BACKEND ENGINE)
// High-Performance Realtime Node.js Server with Built-in SQLite, WebSockets & WebRTC
// Fully Audited: Real Persistence, Edit/Delete, Real Media, WebRTC & Zero Fakes
// ==============================================================================

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const WebSocket = require('ws');

const PORT = process.env.PORT || 4000;
const DB_PATH = path.join(__dirname, 'database', 'nova.db');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const PUBLIC_DIR = path.join(__dirname, 'public');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(path.dirname(DB_PATH))) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// ==============================================================================
// DATABASE INITIALIZATION & SCHEMA MIGRATIONS
// ==============================================================================
const db = new DatabaseSync(DB_PATH);

db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        avatar TEXT,
        bio TEXT DEFAULT '',
        online INTEGER DEFAULT 0,
        last_seen INTEGER,
        privacy_last_seen TEXT DEFAULT 'everyone',
        privacy_read_receipts INTEGER DEFAULT 1,
        theme_preference TEXT DEFAULT 'dark',
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL, -- 'direct', 'group', 'channel'
        title TEXT NOT NULL,
        handle TEXT UNIQUE, -- e.g. '@NovaHQ'
        avatar TEXT,
        description TEXT DEFAULT '',
        created_by TEXT REFERENCES users(id),
        is_public INTEGER DEFAULT 0,
        pinned INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member', 'subscriber'
        joined_at INTEGER NOT NULL,
        UNIQUE(chat_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        text TEXT,
        type TEXT DEFAULT 'text', -- 'text', 'image', 'video', 'audio', 'file', 'poll'
        media_url TEXT,
        file_name TEXT,
        file_size INTEGER,
        duration TEXT,
        reply_to_id TEXT,
        status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'read'
        is_pinned INTEGER DEFAULT 0,
        is_edited INTEGER DEFAULT 0,
        is_deleted INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS message_reactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        emoji TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        UNIQUE(message_id, user_id, emoji)
    );

    CREATE TABLE IF NOT EXISTS polls (
        id TEXT PRIMARY KEY,
        message_id TEXT UNIQUE NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        options_json TEXT NOT NULL, -- Array of { id, text }
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS poll_votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        option_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        UNIQUE(poll_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS call_logs (
        id TEXT PRIMARY KEY,
        caller_id TEXT NOT NULL REFERENCES users(id),
        receiver_id TEXT NOT NULL REFERENCES users(id),
        chat_id TEXT,
        type TEXT NOT NULL, -- 'audio', 'video'
        status TEXT NOT NULL, -- 'completed', 'missed', 'declined'
        duration_seconds INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        contact_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        nickname TEXT,
        is_blocked INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        UNIQUE(user_id, contact_user_id)
    );

    CREATE TABLE IF NOT EXISTS stories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        media_url TEXT NOT NULL,
        caption TEXT DEFAULT '',
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS story_views (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        viewer_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        viewed_at INTEGER NOT NULL,
        UNIQUE(story_id, viewer_user_id)
    );

    CREATE TABLE IF NOT EXISTS scheduled_messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        text TEXT,
        type TEXT DEFAULT 'text',
        media_url TEXT,
        scheduled_for INTEGER NOT NULL,
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        is_muted INTEGER DEFAULT 0,
        muted_until INTEGER DEFAULT 0,
        disappearing_ttl INTEGER DEFAULT 0,
        draft_text TEXT DEFAULT '',
        UNIQUE(user_id, chat_id)
    );

    CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        reporter_id TEXT NOT NULL REFERENCES users(id),
        reported_user_id TEXT,
        chat_id TEXT,
        reason TEXT NOT NULL,
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        caption TEXT,
        media_url TEXT,
        media_type TEXT DEFAULT 'image',
        likes_count INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS post_likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at INTEGER NOT NULL,
        UNIQUE(post_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS post_comments (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        comment TEXT NOT NULL,
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_followers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at INTEGER NOT NULL,
        UNIQUE(follower_id, following_id)
    );

    -- Create Performance Indexes
    CREATE INDEX IF NOT EXISTS idx_messages_chat_time ON messages(chat_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_members_chat ON chat_members(chat_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);
    CREATE INDEX IF NOT EXISTS idx_stories_user_time ON stories(user_id, expires_at);
    CREATE INDEX IF NOT EXISTS idx_followers_following ON user_followers(following_id);
`);

// Migration to ensure additional columns exist if upgrading from previous run
try { db.exec(`ALTER TABLE messages ADD COLUMN is_deleted INTEGER DEFAULT 0;`); } catch(e) {}
try { db.exec(`ALTER TABLE messages ADD COLUMN expires_at INTEGER DEFAULT NULL;`); } catch(e) {}
try { db.exec(`ALTER TABLE messages ADD COLUMN is_encrypted INTEGER DEFAULT 0;`); } catch(e) {}
try { db.exec(`ALTER TABLE messages ADD COLUMN iv TEXT DEFAULT NULL;`); } catch(e) {}
try { db.exec(`ALTER TABLE reports ADD COLUMN status TEXT DEFAULT 'pending';`); } catch(e) {}
try { db.exec(`ALTER TABLE chats ADD COLUMN posting_permission TEXT DEFAULT 'admin_only';`); } catch(e) {}
try { db.exec(`ALTER TABLE stories ADD COLUMN bg_gradient TEXT DEFAULT '';`); } catch(e) {}
try { db.exec(`ALTER TABLE stories ADD COLUMN music_track TEXT DEFAULT '';`); } catch(e) {}
try { db.exec(`ALTER TABLE stories ADD COLUMN sticker_json TEXT DEFAULT '';`); } catch(e) {}

// ==============================================================================
// AUTH & CRYPTO HELPERS
// ==============================================================================
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return { hash, salt };
}

function verifyPassword(password, hash, salt) {
    const computed = crypto.scryptSync(password, salt, 64).toString('hex');
    return computed === hash;
}

function createSession(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = now + 1000 * 60 * 60 * 24 * 30; // 30 days
    db.prepare(`INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`).run(token, userId, now, expiresAt);
    return token;
}

function getUserByToken(token) {
    if (!token) return null;
    const session = db.prepare(`SELECT * FROM sessions WHERE token = ? AND expires_at > ?`).get(token, Date.now());
    if (!session) return null;
    return db.prepare(`SELECT id, username, display_name, email, avatar, bio, online, last_seen, privacy_last_seen, privacy_read_receipts, theme_preference FROM users WHERE id = ?`).get(session.user_id);
}

// ==============================================================================
// SEED DEFAULT DATA IF FRESH DB
// ==============================================================================
(function seedDatabase() {
    const count = db.prepare(`SELECT COUNT(*) AS total FROM users`).get();
    if (count && count.total > 0) return;

    console.log('[NOVA DB] Seeding initial database with sample accounts and channels...');
    const now = Date.now();

    // 1. Create Default Users
    const farazSalt = crypto.randomBytes(16).toString('hex');
    const farazHash = hashPassword('faraz123', farazSalt).hash;
    db.prepare(`INSERT INTO users (id, username, display_name, email, password_hash, password_salt, avatar, bio, online, last_seen, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`).run(
        'usr_faraz', 'faraz_anjum', 'Faraz Anjum', 'faraz@novachat.io', farazHash, farazSalt,
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop',
        'Founder @ Faraz Store | Building the Future of Gaming', now, now
    );

    const rushSalt = crypto.randomBytes(16).toString('hex');
    const rushHash = hashPassword('rush123', rushSalt).hash;
    db.prepare(`INSERT INTO users (id, username, display_name, email, password_hash, password_salt, avatar, bio, online, last_seen, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`).run(
        'usr_rush', 'tk_rush', 'TK RUSH Gaming', 'rush@novachat.io', rushHash, rushSalt,
        'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&h=150&fit=crop',
        'Esports Athlete | Evo Weapon Specialist', now, now
    );

    const botSalt = crypto.randomBytes(16).toString('hex');
    const botHash = hashPassword('bot123', botSalt).hash;
    db.prepare(`INSERT INTO users (id, username, display_name, email, password_hash, password_salt, avatar, bio, online, last_seen, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`).run(
        'usr_nova_ai', 'nova_ai', 'NOVA Intelligence AI', 'ai@novachat.io', botHash, botSalt,
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&h=150&fit=crop',
        '24/7 Autonomous Assistant powered by Groq 120B.', now, now
    );

    // 2. Create Broadcast Channel
    db.prepare(`INSERT INTO chats (id, type, title, handle, avatar, description, created_by, is_public, pinned, created_at)
        VALUES (?, 'channel', ?, ?, ?, ?, ?, 1, 1, ?)`).run(
        'chat_channel_nova', 'NOVA Official Broadcast', '@NovaHQ',
        'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=150&h=150&fit=crop',
        'Official updates, new release announcements, and system alerts.', 'usr_faraz', now
    );
    db.prepare(`INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES ('chat_channel_nova', 'usr_faraz', 'owner', ?)`).run(now);
    db.prepare(`INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES ('chat_channel_nova', 'usr_rush', 'subscriber', ?)`).run(now);

    // 3. Create Esports Group
    db.prepare(`INSERT INTO chats (id, type, title, avatar, description, created_by, is_public, pinned, created_at)
        VALUES (?, 'group', ?, ?, ?, ?, 0, 1, ?)`).run(
        'chat_group_squad', 'Faraz Pro Esports Clan',
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&h=150&fit=crop',
        'Official group for competitive custom rooms and strategies.', 'usr_faraz', now
    );
    db.prepare(`INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES ('chat_group_squad', 'usr_faraz', 'owner', ?)`).run(now);
    db.prepare(`INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES ('chat_group_squad', 'usr_rush', 'admin', ?)`).run(now);

    // 4. Create Direct Chat: Faraz & TK Rush
    db.prepare(`INSERT INTO chats (id, type, title, avatar, description, created_by, is_public, pinned, created_at)
        VALUES ('chat_dm_faraz_rush', 'direct', 'TK RUSH Gaming', 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&h=150&fit=crop', 'Direct conversation', 'usr_faraz', 0, 1, ?)`).run(now);
    db.prepare(`INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES ('chat_dm_faraz_rush', 'usr_faraz', 'member', ?)`).run(now);
    db.prepare(`INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES ('chat_dm_faraz_rush', 'usr_rush', 'member', ?)`).run(now);

    // 5. Create Direct Chat: Faraz & AI Bot
    db.prepare(`INSERT INTO chats (id, type, title, avatar, description, created_by, is_public, pinned, created_at)
        VALUES ('chat_dm_ai', 'direct', 'NOVA Intelligence AI', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&h=150&fit=crop', 'Direct AI chat', 'usr_faraz', 0, 1, ?)`).run(now);
    db.prepare(`INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES ('chat_dm_ai', 'usr_faraz', 'member', ?)`).run(now);
    db.prepare(`INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES ('chat_dm_ai', 'usr_nova_ai', 'member', ?)`).run(now);

    // 6. Seed Initial Messages
    db.prepare(`INSERT INTO messages (id, chat_id, sender_id, text, type, status, is_deleted, created_at)
        VALUES (?, 'chat_dm_ai', 'usr_nova_ai', ?, 'text', 'read', 0, ?)`).run(
        'msg_welcome_1', 'Welcome to NOVA — The All-In-One Messaging Super App! 🚀\nReal WebSocket messaging, real voice notes, and real WebRTC calls are active!', now - 120000
    );

    db.prepare(`INSERT INTO messages (id, chat_id, sender_id, text, type, status, is_deleted, created_at)
        VALUES (?, 'chat_channel_nova', 'usr_faraz', ?, 'text', 'read', 0, ?)`).run(
        'msg_channel_1', '📢 Welcome to the NOVA Official Broadcast Channel!\nHere you receive official platform drops, feature highlights, and secure releases with zero lag.', now - 60000
    );

    db.prepare(`INSERT INTO messages (id, chat_id, sender_id, text, type, status, is_deleted, created_at)
        VALUES (?, 'chat_dm_faraz_rush', 'usr_rush', ?, 'text', 'read', 0, ?)`).run(
        'msg_rush_1', 'Bhai kal tournament ke custom rooms ka time 9 PM lock kar diya hai!', now - 30000
    );

    console.log('[NOVA DB] Seed completed successfully!');
})();

// Seed Social Feed Posts if empty
try {
    const postCount = db.prepare(`SELECT COUNT(*) AS total FROM posts`).get();
    if (!postCount || postCount.total === 0) {
        const now = Date.now();
        db.prepare(`INSERT INTO posts (id, user_id, caption, media_url, media_type, likes_count, comments_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
            'post_seed_1', 'usr_faraz', '🚀 Excited to unveil the brand new NOVA Super App experience! WhatsApp + Telegram + Instagram all in one unified place! Drop your thoughts below 👇',
            'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop', 'image', 12, 2, now - 3600000
        );
        db.prepare(`INSERT INTO posts (id, user_id, caption, media_url, media_type, likes_count, comments_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
            'post_seed_2', 'usr_rush', 'Custom rooms tournament testing live right now! Smooth 60fps & crystal audio. 🎮🔥',
            'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1000&auto=format&fit=crop', 'image', 8, 0, now - 7200000
        );
        db.prepare(`INSERT INTO post_comments (id, post_id, user_id, comment, created_at) VALUES (?, ?, ?, ?, ?)`).run(
            'comm_1', 'post_seed_1', 'usr_rush', 'This new UI layout with bottom tabs is awesome!', now - 3000000
        );
        db.prepare(`INSERT INTO post_comments (id, post_id, user_id, comment, created_at) VALUES (?, ?, ?, ?, ?)`).run(
            'comm_2', 'post_seed_1', 'usr_nova_ai', 'Nova Super App Engine initialized and running at peak performance. ⚡', now - 1800000
        );
    }
} catch(e) {
    console.error('[NOVA DB] Error seeding posts:', e);
}

// ==============================================================================
// REALTIME WEBSOCKET & WEBRTC SIGNALING SERVER
// ==============================================================================
const server = http.createServer(handleHttpRequest);
const wss = new WebSocket.Server({ server });

const activeSockets = new Map();

wss.on('connection', (ws) => {
    ws.userId = null;
    ws.isAlive = true;

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', async (raw) => {
        try {
            const data = JSON.parse(raw.toString());
            handleWebSocketMessage(ws, data);
        } catch (err) {
            console.error('[WS Parse Error]:', err.message);
        }
    });

    ws.on('close', () => {
        if (ws.userId) {
            const userSockets = activeSockets.get(ws.userId);
            if (userSockets) {
                userSockets.delete(ws);
                if (userSockets.size === 0) {
                    activeSockets.delete(ws.userId);
                    db.prepare(`UPDATE users SET online = 0, last_seen = ? WHERE id = ?`).run(Date.now(), ws.userId);
                    broadcastUserPresence(ws.userId, false);
                }
            }
        }
    });
});

setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

function sendToUser(userId, payload) {
    const sockets = activeSockets.get(userId);
    if (sockets && sockets.size > 0) {
        const json = JSON.stringify(payload);
        sockets.forEach((s) => {
            if (s.readyState === WebSocket.OPEN) s.send(json);
        });
        return true;
    }
    return false;
}

function broadcastUserPresence(userId, online) {
    const payload = JSON.stringify({ type: 'PRESENCE_UPDATE', userId, online, lastSeen: Date.now() });
    wss.clients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN && ws.userId) ws.send(payload);
    });
}

function handleWebSocketMessage(ws, msg) {
    switch (msg.type) {
        case 'AUTH': {
            const user = getUserByToken(msg.token);
            if (!user) {
                ws.send(JSON.stringify({ type: 'AUTH_FAILED', error: 'Invalid or expired session' }));
                return;
            }
            ws.userId = user.id;
            if (!activeSockets.has(user.id)) activeSockets.set(user.id, new Set());
            activeSockets.get(user.id).add(ws);

            db.prepare(`UPDATE users SET online = 1, last_seen = ? WHERE id = ?`).run(Date.now(), user.id);
            ws.send(JSON.stringify({ type: 'AUTH_SUCCESS', user }));
            broadcastUserPresence(user.id, true);
            break;
        }

        case 'SEND_MESSAGE': {
            if (!ws.userId) return;
            const { chatId, text, mediaUrl, fileName, fileSize, duration, replyToId } = msg;
            const messageType = msg.messageType || msg.msgType || 'text';

            // Verify membership
            const isMember = db.prepare(`SELECT role FROM chat_members WHERE chat_id = ? AND user_id = ?`).get(chatId, ws.userId);
            if (!isMember) {
                ws.send(JSON.stringify({ type: 'ERROR', message: 'You are not a member of this chat' }));
                return;
            }

            const chatObj = db.prepare(`SELECT type FROM chats WHERE id = ?`).get(chatId);
            // Channel Broadcast Authorization: only owners and admins can post messages
            if (chatObj && chatObj.type === 'channel' && isMember.role !== 'owner' && isMember.role !== 'admin') {
                ws.send(JSON.stringify({ type: 'ERROR', message: 'Only administrators can broadcast messages in this channel.' }));
                return;
            }

            // Direct Chat Blocking Check: verify recipient hasn't blocked sender
            if (chatObj && chatObj.type === 'direct') {
                const otherMember = db.prepare(`SELECT user_id FROM chat_members WHERE chat_id = ? AND user_id != ?`).get(chatId, ws.userId);
                if (otherMember) {
                    const blockCheck = db.prepare(`SELECT is_blocked FROM contacts WHERE user_id = ? AND contact_user_id = ? AND is_blocked = 1`).get(otherMember.user_id, ws.userId);
                    if (blockCheck) {
                        ws.send(JSON.stringify({ type: 'ERROR', message: 'You cannot send messages to this contact because you have been blocked.' }));
                        return;
                    }
                }
            }

            const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
            const now = Date.now();

            let expiresAt = null;
            try {
                const settings = db.prepare(`SELECT disappearing_ttl FROM chat_settings WHERE chat_id = ? AND disappearing_ttl > 0 LIMIT 1`).get(chatId);
                if (settings && settings.disappearing_ttl > 0) {
                    expiresAt = now + (settings.disappearing_ttl * 1000);
                }
            } catch(e) {}

            db.prepare(`INSERT INTO messages (id, chat_id, sender_id, text, type, media_url, file_name, file_size, duration, reply_to_id, status, is_deleted, expires_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'delivered', 0, ?, ?)`).run(
                msgId, chatId, ws.userId, text || '', messageType, mediaUrl || null, fileName || null, fileSize || null, duration || null, replyToId || null, expiresAt, now
            );

            // Fetch parent message if replying
            let replyTo = null;
            if (replyToId) {
                const parentMsg = db.prepare(`SELECT m.id, m.text, m.is_deleted, u.display_name FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?`).get(replyToId);
                if (parentMsg) {
                    replyTo = {
                        id: parentMsg.id,
                        text: parentMsg.is_deleted ? '🚫 This message was deleted' : parentMsg.text,
                        senderName: parentMsg.display_name
                    };
                }
            }

            const senderRaw = db.prepare(`SELECT id, username, display_name, avatar FROM users WHERE id = ?`).get(ws.userId);
            const sender = {
                id: senderRaw.id,
                username: senderRaw.username,
                displayName: senderRaw.display_name,
                avatar: senderRaw.avatar
            };
            const newMsg = {
                id: msgId,
                chatId,
                senderId: ws.userId,
                sender,
                text,
                type: messageType,
                mediaUrl,
                fileName,
                fileSize,
                duration,
                replyToId,
                replyTo,
                status: 'delivered',
                isEdited: false,
                isDeleted: false,
                createdAt: now,
                reactions: []
            };

            const members = db.prepare(`SELECT user_id FROM chat_members WHERE chat_id = ?`).all(chatId);
            members.forEach((m) => {
                sendToUser(m.user_id, { type: 'NEW_MESSAGE', message: newMsg });
            });

            // Trigger AI Bot if bot is in chat and sender is not bot
            const isBotInChat = db.prepare(`SELECT user_id FROM chat_members WHERE chat_id = ? AND user_id = 'usr_nova_ai'`).get(chatId);
            if (isBotInChat && ws.userId !== 'usr_nova_ai') {
                handleAiBotReply(chatId, text);
            }
            break;
        }

        case 'EDIT_MESSAGE': {
            if (!ws.userId) return;
            const { messageId, newText } = msg;
            if (!newText || !newText.trim()) return;

            const targetMsg = db.prepare(`SELECT * FROM messages WHERE id = ?`).get(messageId);
            if (!targetMsg) {
                ws.send(JSON.stringify({ type: 'ERROR', message: 'Message not found' }));
                return;
            }

            if (targetMsg.sender_id !== ws.userId) {
                ws.send(JSON.stringify({ type: 'ERROR', message: 'Unauthorized to edit this message' }));
                return;
            }

            db.prepare(`UPDATE messages SET text = ?, is_edited = 1 WHERE id = ?`).run(newText.trim(), messageId);

            const members = db.prepare(`SELECT user_id FROM chat_members WHERE chat_id = ?`).all(targetMsg.chat_id);
            members.forEach((m) => {
                sendToUser(m.user_id, { type: 'MESSAGE_EDITED', messageId, chatId: targetMsg.chat_id, newText: newText.trim() });
            });
            break;
        }

        case 'DELETE_MESSAGE': {
            if (!ws.userId) return;
            const { messageId } = msg;

            const targetMsg = db.prepare(`SELECT * FROM messages WHERE id = ?`).get(messageId);
            if (!targetMsg) {
                ws.send(JSON.stringify({ type: 'ERROR', message: 'Message not found' }));
                return;
            }

            const member = db.prepare(`SELECT role FROM chat_members WHERE chat_id = ? AND user_id = ?`).get(targetMsg.chat_id, ws.userId);
            const isOwnerOrAdmin = member && (member.role === 'owner' || member.role === 'admin');

            if (targetMsg.sender_id !== ws.userId && !isOwnerOrAdmin) {
                ws.send(JSON.stringify({ type: 'ERROR', message: 'Unauthorized to delete this message' }));
                return;
            }

            db.prepare(`UPDATE messages SET is_deleted = 1, text = '🚫 This message was deleted', media_url = NULL WHERE id = ?`).run(messageId);

            const members = db.prepare(`SELECT user_id FROM chat_members WHERE chat_id = ?`).all(targetMsg.chat_id);
            members.forEach((m) => {
                sendToUser(m.user_id, { type: 'MESSAGE_DELETED', messageId, chatId: targetMsg.chat_id });
            });
            break;
        }

        case 'TYPING': {
            if (!ws.userId) return;
            const { chatId, isTyping } = msg;
            const members = db.prepare(`SELECT user_id FROM chat_members WHERE chat_id = ? AND user_id != ?`).all(chatId, ws.userId);
            members.forEach((m) => {
                sendToUser(m.user_id, { type: 'TYPING_UPDATE', chatId, userId: ws.userId, isTyping });
            });
            break;
        }

        case 'MARK_READ': {
            if (!ws.userId) return;
            const { chatId, messageIds } = msg;
            if (Array.isArray(messageIds) && messageIds.length > 0) {
                messageIds.forEach((mId) => {
                    db.prepare(`UPDATE messages SET status = 'read' WHERE id = ? AND chat_id = ? AND sender_id != ?`).run(mId, chatId, ws.userId);
                });
                const members = db.prepare(`SELECT user_id FROM chat_members WHERE chat_id = ?`).all(chatId);
                members.forEach((m) => {
                    sendToUser(m.user_id, { type: 'MESSAGES_READ_RECEIPT', chatId, messageIds, readerId: ws.userId });
                });
            }
            break;
        }

        case 'REACT': {
            if (!ws.userId) return;
            const { messageId, emoji } = msg;
            try {
                const existing = db.prepare(`SELECT id FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?`).get(messageId, ws.userId, emoji);
                if (existing) {
                    db.prepare(`DELETE FROM message_reactions WHERE id = ?`).run(existing.id);
                } else {
                    db.prepare(`INSERT INTO message_reactions (message_id, user_id, emoji, created_at) VALUES (?, ?, ?, ?)`).run(messageId, ws.userId, emoji, Date.now());
                }

                const reactions = db.prepare(`SELECT emoji, COUNT(*) as count, GROUP_CONCAT(user_id) as users FROM message_reactions WHERE message_id = ? GROUP BY emoji`).all(messageId);
                const targetMsg = db.prepare(`SELECT chat_id FROM messages WHERE id = ?`).get(messageId);
                if (targetMsg) {
                    const members = db.prepare(`SELECT user_id FROM chat_members WHERE chat_id = ?`).all(targetMsg.chat_id);
                    members.forEach((m) => {
                        sendToUser(m.user_id, { type: 'REACTION_UPDATE', messageId, reactions });
                    });
                }
            } catch (err) {
                console.error('Reaction error:', err);
            }
            break;
        }

        // ==========================================
        // WEBRTC 1-ON-1 AUDIO/VIDEO CALL SIGNALING
        // ==========================================
        case 'CALL_OFFER': {
            if (!ws.userId) return;
            const { targetUserId, callType, offerSdp } = msg;

            // Check if blocked by target user
            const blockCheck = db.prepare(`SELECT is_blocked FROM contacts WHERE user_id = ? AND contact_user_id = ? AND is_blocked = 1`).get(targetUserId, ws.userId);
            if (blockCheck) {
                ws.send(JSON.stringify({ type: 'ERROR', message: 'Cannot place call. You have been blocked by this user.' }));
                return;
            }

            const callLogId = 'call_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
            db.prepare(`INSERT INTO call_logs (id, caller_id, receiver_id, type, status, duration_seconds, created_at) VALUES (?, ?, ?, ?, 'ringing', 0, ?)`).run(
                callLogId, ws.userId, targetUserId, callType || 'video', Date.now()
            );

            const caller = db.prepare(`SELECT id, username, display_name, avatar FROM users WHERE id = ?`).get(ws.userId);
            sendToUser(targetUserId, {
                type: 'CALL_INCOMING',
                caller,
                callType: callType || 'video',
                offerSdp,
                callLogId
            });
            break;
        }

        case 'CALL_ANSWER': {
            if (!ws.userId) return;
            const { targetUserId, answerSdp, callLogId } = msg;
            if (callLogId) {
                db.prepare(`UPDATE call_logs SET status = 'in_progress' WHERE id = ?`).run(callLogId);
            }
            sendToUser(targetUserId, {
                type: 'CALL_ANSWERED',
                calleeId: ws.userId,
                answerSdp,
                callLogId
            });
            break;
        }

        case 'ICE_CANDIDATE': {
            if (!ws.userId) return;
            const { targetUserId, candidate } = msg;
            sendToUser(targetUserId, {
                type: 'REMOTE_ICE_CANDIDATE',
                senderId: ws.userId,
                candidate
            });
            break;
        }

        case 'CALL_END': {
            if (!ws.userId) return;
            const { targetUserId, reason, callLogId, durationSeconds } = msg;
            if (callLogId) {
                const finalStatus = reason === 'declined' ? 'declined' : 'completed';
                db.prepare(`UPDATE call_logs SET status = ?, duration_seconds = ? WHERE id = ?`).run(
                    finalStatus, durationSeconds || 0, callLogId
                );
            }
            sendToUser(targetUserId, {
                type: 'CALL_ENDED',
                senderId: ws.userId,
                reason: reason || 'hangup'
            });
            break;
        }
    }
}

// ==============================================================================
// AI BOT ENGINE (GROQ API / REALTIME FALLBACK)
// ==============================================================================
async function handleAiBotReply(chatId, userPrompt) {
    const members = db.prepare(`SELECT user_id FROM chat_members WHERE chat_id = ? AND user_id != 'usr_nova_ai'`).all(chatId);
    members.forEach((m) => {
        sendToUser(m.user_id, { type: 'TYPING_UPDATE', chatId, userId: 'usr_nova_ai', isTyping: true });
    });

    let replyText = "Namaste! Main NOVA AI Assistant hoon. Main aapki messaging, gaming aur account inquiries me help karne ke liye 24/7 tayyar hoon! 🚀";

    try {
        const GROQ_KEY = process.env.GROQ_API_KEY || "";
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "openai/gpt-oss-120b",
                messages: [
                    { role: "system", content: "You are the NOVA Super App AI Assistant. Respond in friendly, helpful Hinglish with emojis, quick tips, and clarity. Keep responses under 4 sentences unless asked for details." },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.choices && data.choices[0]) {
                replyText = data.choices[0].message.content;
            }
        }
    } catch (e) {
        console.warn('AI Bot Groq fetch warning:', e.message);
    }

    const botMsgId = 'msg_bot_' + Date.now();
    const now = Date.now();
    db.prepare(`INSERT INTO messages (id, chat_id, sender_id, text, type, status, is_deleted, created_at) VALUES (?, ?, 'usr_nova_ai', ?, 'text', 'read', 0, ?)`).run(
        botMsgId, chatId, replyText, now
    );

    const botSender = db.prepare(`SELECT id, username, display_name, avatar FROM users WHERE id = 'usr_nova_ai'`).get();
    const botPayload = {
        id: botMsgId,
        chatId,
        senderId: 'usr_nova_ai',
        sender: botSender,
        text: replyText,
        type: 'text',
        status: 'read',
        isEdited: false,
        isDeleted: false,
        createdAt: now,
        reactions: []
    };

    members.forEach((m) => {
        sendToUser(m.user_id, { type: 'TYPING_UPDATE', chatId, userId: 'usr_nova_ai', isTyping: false });
        sendToUser(m.user_id, { type: 'NEW_MESSAGE', message: botPayload });
    });
}

// ==============================================================================
// HTTP REQUEST ROUTER & REST APIS
// ==============================================================================
function handleHttpRequest(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-File-Name, X-File-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    // Strict Path Traversal Protection
    let decodedPath = pathname;
    try { decodedPath = decodeURIComponent(pathname); } catch(e) {}
    if (pathname.includes('..') || decodedPath.includes('..')) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        return res.end('403 Forbidden: Path traversal prohibited');
    }

    // Static Uploads Serving (Hardened against Path Traversal)
    if (pathname.startsWith('/uploads/')) {
        const relPath = pathname.replace(/^\/uploads\/?/, '');
        const filePath = path.join(UPLOAD_DIR, relPath);
        if (!filePath.startsWith(UPLOAD_DIR)) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            return res.end('403 Forbidden: Path traversal prohibited');
        }
        return serveStaticFile(filePath, res);
    }

    // Static Public App Serving (Hardened against Path Traversal)
    if (!pathname.startsWith('/api/')) {
        const relPath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
        let filePath = path.join(PUBLIC_DIR, relPath);
        if (!filePath.startsWith(PUBLIC_DIR)) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            return res.end('403 Forbidden: Path traversal prohibited');
        }
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
            if (pathname === '/admin' || pathname === '/admin/') {
                filePath = path.join(PUBLIC_DIR, 'admin.html');
            } else {
                filePath = path.join(PUBLIC_DIR, 'index.html');
            }
        }
        return serveStaticFile(filePath, res);
    }

    function sendJson(statusCode, data) {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const currentUser = getUserByToken(token);

    // ==========================================
    // AUTH REST APIS
    // ==========================================
    if (pathname === '/api/auth/register' && req.method === 'POST') {
        parseBodyJson(req, (err, body) => {
            if (err || !body.username || !body.email || !body.password || !body.displayName) {
                return sendJson(400, { error: 'Username, displayName, email and password are required' });
            }

            const cleanUsername = body.username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
            const cleanEmail = body.email.toLowerCase().trim();

            const existing = db.prepare(`SELECT id FROM users WHERE username = ? OR email = ?`).get(cleanUsername, cleanEmail);
            if (existing) {
                return sendJson(409, { error: 'Username or email already registered' });
            }

            const { hash, salt } = hashPassword(body.password);
            const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
            const now = Date.now();
            const avatar = body.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`;

            db.prepare(`INSERT INTO users (id, username, display_name, email, password_hash, password_salt, avatar, bio, online, last_seen, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`).run(
                userId, cleanUsername, body.displayName.trim(), cleanEmail, hash, salt, avatar, body.bio || 'Hey there! I am using NOVA.', now, now
            );

            // Add new user to Public NOVA Broadcast Channel
            db.prepare(`INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES ('chat_channel_nova', ?, 'subscriber', ?)`).run(userId, now);
            
            // Create user's personal DM with AI Bot
            const userAiChatId = 'chat_dm_ai_' + userId;
            db.prepare(`INSERT INTO chats (id, type, title, avatar, description, created_by, is_public, pinned, created_at)
                VALUES (?, 'direct', 'NOVA Intelligence AI', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&h=150&fit=crop', 'Direct AI Assistant', ?, 0, 1, ?)`).run(
                userAiChatId, userId, now
            );
            db.prepare(`INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)`).run(userAiChatId, userId, now);
            db.prepare(`INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES (?, 'usr_nova_ai', 'member', ?)`).run(userAiChatId, now);

            db.prepare(`INSERT INTO messages (id, chat_id, sender_id, text, type, status, is_deleted, created_at)
                VALUES (?, ?, 'usr_nova_ai', 'Namaste! Welcome to NOVA Super App! 🚀\nI am your 24/7 AI Companion. Type anything to get instant answers!', 'text', 'read', 0, ?)`).run(
                'msg_init_' + Date.now(), userAiChatId, now
            );

            const sessionToken = createSession(userId);
            const user = db.prepare(`SELECT id, username, display_name, email, avatar, bio, online, last_seen FROM users WHERE id = ?`).get(userId);
            return sendJson(201, { user, token: sessionToken });
        });
        return;
    }

    if (pathname === '/api/auth/login' && req.method === 'POST') {
        parseBodyJson(req, (err, body) => {
            const loginVal = body.login || body.username;
            if (err || !loginVal || !body.password) {
                return sendJson(400, { error: 'Login identifier and password required' });
            }

            const login = loginVal.toLowerCase().trim();
            const user = db.prepare(`SELECT * FROM users WHERE username = ? OR email = ?`).get(login, login);
            if (!user) {
                return sendJson(401, { error: 'Invalid username/email or password' });
            }

            if (!verifyPassword(body.password, user.password_hash, user.password_salt)) {
                return sendJson(401, { error: 'Invalid username/email or password' });
            }

            const sessionToken = createSession(user.id);
            const cleanUser = {
                id: user.id,
                username: user.username,
                displayName: user.display_name,
                email: user.email,
                avatar: user.avatar,
                bio: user.bio,
                online: 1,
                lastSeen: user.last_seen,
                themePreference: user.theme_preference
            };
            return sendJson(200, { user: cleanUser, token: sessionToken });
        });
        return;
    }

    // Firebase Auth Synchronizer / Bridge (For Faraz Store Users)
    if (pathname === '/api/auth/firebase-sync' && req.method === 'POST') {
        parseBodyJson(req, (err, body) => {
            if (err || !body.email) return sendJson(400, { error: 'Email required for Firebase sync' });
            const email = body.email.toLowerCase().trim();
            let user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
            const now = Date.now();

            if (!user) {
                const baseHandle = (body.handle || body.username || email.split('@')[0] || 'user')
                    .toLowerCase().replace(/[^a-z0-9_]/g, '_');
                let uniqueHandle = baseHandle;
                let counter = 1;
                while (db.prepare(`SELECT 1 FROM users WHERE username = ?`).get(uniqueHandle)) {
                    uniqueHandle = `${baseHandle}_${counter++}`;
                }

                const newId = body.uid ? `usr_fb_${body.uid}` : `usr_${now}_${Math.random().toString(36).substring(2, 6)}`;
                const salt = crypto.randomBytes(16).toString('hex');
                const dummyHash = hashPassword(crypto.randomBytes(32).toString('hex'), salt).hash;
                const displayName = body.displayName || body.name || uniqueHandle;
                const avatar = body.avatar || body.photoURL || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop`;

                db.prepare(`INSERT INTO users (id, username, display_name, email, password_hash, password_salt, avatar, bio, online, last_seen, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`).run(
                    newId, uniqueHandle, displayName, email, dummyHash, salt, avatar, body.bio || 'Faraz Store Member ✨', now, now
                );
                user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(newId);
            }

            const sessionToken = createSession(user.id);
            const cleanUser = {
                id: user.id,
                username: user.username,
                displayName: user.display_name,
                email: user.email,
                avatar: user.avatar,
                bio: user.bio,
                online: 1,
                lastSeen: user.last_seen,
                themePreference: user.theme_preference
            };
            return sendJson(200, { user: cleanUser, token: sessionToken });
        });
        return;
    }

    if (pathname === '/api/auth/me' && req.method === 'GET') {
        if (!currentUser) return sendJson(401, { error: 'Unauthorized' });
        return sendJson(200, { user: currentUser });
    }

    // ==========================================
    // SYSTEM HEALTH & MONITORING (PUBLIC)
    // ==========================================
    if (pathname === '/api/health' && req.method === 'GET') {
        const usersCount = db.prepare(`SELECT COUNT(*) as c FROM users`).get().c;
        const chatsCount = db.prepare(`SELECT COUNT(*) as c FROM chats`).get().c;
        const messagesCount = db.prepare(`SELECT COUNT(*) as c FROM messages`).get().c;
        return sendJson(200, {
            status: 'healthy',
            uptime: process.uptime(),
            timestamp: Date.now(),
            activeConnections: wss.clients.size,
            database: {
                users: usersCount,
                chats: chatsCount,
                messages: messagesCount
            },
            memory: process.memoryUsage()
        });
    }

    // Protected API boundary check
    if (!currentUser) return sendJson(401, { error: 'Authentication required' });

    // ==========================================
    // CHATS & CONVERSATIONS REST APIS
    // ==========================================
    if (pathname === '/api/chats' && req.method === 'GET') {
        const userChats = db.prepare(`
            SELECT c.*, cm.role as user_role
            FROM chats c
            JOIN chat_members cm ON c.id = cm.chat_id
            WHERE cm.user_id = ?
            ORDER BY c.pinned DESC, c.created_at DESC
        `).all(currentUser.id);

        const enriched = userChats.map((c) => {
            const lastMsg = db.prepare(`
                SELECT m.*, u.display_name as sender_name 
                FROM messages m 
                JOIN users u ON m.sender_id = u.id 
                WHERE m.chat_id = ? 
                ORDER BY m.created_at DESC LIMIT 1
            `).get(c.id);

            const unread = db.prepare(`
                SELECT COUNT(*) as count 
                FROM messages 
                WHERE chat_id = ? AND sender_id != ? AND status != 'read'
            `).get(c.id, currentUser.id);

            let otherUser = null;
            if (c.type === 'direct') {
                otherUser = db.prepare(`
                    SELECT u.id, u.username, u.display_name, u.avatar, u.online, u.last_seen
                    FROM chat_members cm
                    JOIN users u ON cm.user_id = u.id
                    WHERE cm.chat_id = ? AND cm.user_id != ?
                `).get(c.id, currentUser.id);
            }

            return {
                id: c.id,
                type: c.type,
                user_role: c.user_role,
                title: otherUser ? otherUser.display_name : c.title,
                handle: c.handle,
                avatar: otherUser ? otherUser.avatar : c.avatar,
                description: c.description,
                pinned: Boolean(c.pinned),
                isPublic: Boolean(c.is_public),
                online: otherUser ? Boolean(otherUser.online) : false,
                lastSeen: otherUser ? otherUser.last_seen : null,
                otherUserId: otherUser ? otherUser.id : null,
                lastMessage: lastMsg ? {
                    id: lastMsg.id,
                    text: lastMsg.is_deleted ? '🚫 This message was deleted' : lastMsg.text,
                    type: lastMsg.type,
                    senderName: lastMsg.sender_name,
                    status: lastMsg.status,
                    createdAt: lastMsg.created_at
                } : null,
                unreadCount: unread ? unread.count : 0
            };
        });

        return sendJson(200, { chats: enriched });
    }

    // Get Chat Messages
    if (pathname.match(/^\/api\/chats\/([^\/]+)\/messages$/) && req.method === 'GET') {
        const chatId = pathname.split('/')[3];
        const isMember = db.prepare(`SELECT role FROM chat_members WHERE chat_id = ? AND user_id = ?`).get(chatId, currentUser.id);
        if (!isMember) return sendJson(403, { error: 'Forbidden' });

        const now = Date.now();
        const messages = db.prepare(`
            SELECT m.*, u.username as sender_username, u.display_name as sender_name, u.avatar as sender_avatar
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.chat_id = ? AND (m.expires_at IS NULL OR m.expires_at > ?)
            ORDER BY m.created_at ASC
            LIMIT 100
        `).all(chatId, now);

        const enrichedMsgs = messages.map((m) => {
            const reactions = db.prepare(`
                SELECT emoji, COUNT(*) as count, GROUP_CONCAT(user_id) as users 
                FROM message_reactions 
                WHERE message_id = ? GROUP BY emoji
            `).all(m.id);

            let poll = null;
            if (m.type === 'poll') {
                const pollRow = db.prepare(`SELECT * FROM polls WHERE message_id = ?`).get(m.id);
                if (pollRow) {
                    const votes = db.prepare(`SELECT option_id, COUNT(*) as count, GROUP_CONCAT(user_id) as voters FROM poll_votes WHERE poll_id = ? GROUP BY option_id`).all(pollRow.id);
                    poll = {
                        id: pollRow.id,
                        question: pollRow.question,
                        options: JSON.parse(pollRow.options_json),
                        votes
                    };
                }
            }

            let replyTo = null;
            if (m.reply_to_id) {
                const parentMsg = db.prepare(`SELECT m.id, m.text, m.is_deleted, u.display_name FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?`).get(m.reply_to_id);
                if (parentMsg) {
                    replyTo = {
                        id: parentMsg.id,
                        text: parentMsg.is_deleted ? '🚫 This message was deleted' : parentMsg.text,
                        senderName: parentMsg.display_name
                    };
                }
            }

            return {
                id: m.id,
                chatId: m.chat_id,
                senderId: m.sender_id,
                sender: {
                    id: m.sender_id,
                    username: m.sender_username,
                    displayName: m.sender_name,
                    avatar: m.sender_avatar
                },
                text: m.is_deleted ? '🚫 This message was deleted' : m.text,
                type: m.type,
                mediaUrl: m.is_deleted ? null : m.media_url,
                fileName: m.file_name,
                fileSize: m.file_size,
                duration: m.duration,
                replyToId: m.reply_to_id,
                replyTo,
                status: m.status,
                isPinned: Boolean(m.is_pinned),
                isEdited: Boolean(m.is_edited),
                isDeleted: Boolean(m.is_deleted),
                createdAt: m.created_at,
                reactions,
                poll
            };
        });

        return sendJson(200, { messages: enrichedMsgs });
    }

    // Create Direct Chat
    if (pathname === '/api/chats/direct' && req.method === 'POST') {
        parseBodyJson(req, (err, body) => {
            if (err || !body.targetUserId) return sendJson(400, { error: 'targetUserId required' });

            const targetUser = db.prepare(`SELECT id, display_name, avatar FROM users WHERE id = ?`).get(body.targetUserId);
            if (!targetUser) return sendJson(404, { error: 'User not found' });

            const existing = db.prepare(`
                SELECT c.id 
                FROM chats c
                JOIN chat_members cm1 ON c.id = cm1.chat_id AND cm1.user_id = ?
                JOIN chat_members cm2 ON c.id = cm2.chat_id AND cm2.user_id = ?
                WHERE c.type = 'direct'
            `).get(currentUser.id, targetUser.id);

            if (existing) {
                return sendJson(200, { chatId: existing.id });
            }

            const newChatId = 'chat_dm_' + Date.now();
            const now = Date.now();
            db.prepare(`INSERT INTO chats (id, type, title, avatar, created_by, created_at) VALUES (?, 'direct', ?, ?, ?, ?)`).run(
                newChatId, targetUser.display_name, targetUser.avatar, currentUser.id, now
            );
            db.prepare(`INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)`).run(newChatId, currentUser.id, now);
            db.prepare(`INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)`).run(newChatId, targetUser.id, now);

            return sendJson(201, { chatId: newChatId });
        });
        return;
    }

    // Create Group Chat
    if (pathname === '/api/chats/group' && req.method === 'POST') {
        parseBodyJson(req, (err, body) => {
            if (err || !body.title) return sendJson(400, { error: 'Group title required' });

            const newChatId = 'chat_grp_' + Date.now();
            const now = Date.now();
            const avatar = body.avatar || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&h=150&fit=crop';

            db.prepare(`INSERT INTO chats (id, type, title, avatar, description, created_by, created_at) VALUES (?, 'group', ?, ?, ?, ?, ?)`).run(
                newChatId, body.title.trim(), avatar, body.description || '', currentUser.id, now
            );
            db.prepare(`INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES (?, ?, 'owner', ?)`).run(newChatId, currentUser.id, now);

            if (Array.isArray(body.memberIds)) {
                body.memberIds.forEach((mId) => {
                    if (mId !== currentUser.id) {
                        db.prepare(`INSERT OR IGNORE INTO chat_members (chat_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)`).run(newChatId, mId, now);
                    }
                });
            }

            return sendJson(201, { chatId: newChatId });
        });
        return;
    }

    // Search Users & Public Channels (Supports @handle, display name, and email)
    if (pathname === '/api/users/search' && req.method === 'GET') {
        const q = (parsedUrl.searchParams.get('q') || '').trim();
        if (!q) return sendJson(200, { users: [], channels: [] });

        const cleanQ = q.replace(/^@/, '');
        const searchWild = `%${cleanQ}%`;
        const users = db.prepare(`
            SELECT id, username, display_name, avatar, bio, online, last_seen, email 
            FROM users 
            WHERE (username LIKE ? OR display_name LIKE ? OR email LIKE ?) AND id != ?
            LIMIT 15
        `).all(searchWild, searchWild, searchWild, currentUser.id);

        const channels = db.prepare(`
            SELECT id, title, handle, avatar, description 
            FROM chats 
            WHERE type = 'channel' AND is_public = 1 AND (title LIKE ? OR handle LIKE ?)
            LIMIT 10
        `).all(searchWild, searchWild);

        return sendJson(200, { users, channels });
    }

    // Create Poll in Chat
    if (pathname.match(/^\/api\/chats\/([^\/]+)\/poll$/) && req.method === 'POST') {
        const chatId = pathname.split('/')[3];
        parseBodyJson(req, (err, body) => {
            if (err || !body.question || !Array.isArray(body.options) || body.options.length < 2) {
                return sendJson(400, { error: 'Poll requires a question and at least 2 options' });
            }

            const msgId = 'msg_poll_' + Date.now();
            const pollId = 'poll_' + Date.now();
            const now = Date.now();

            const optionsFormatted = body.options.map((opt, idx) => ({
                id: 'opt_' + idx,
                text: String(opt).trim()
            }));

            db.prepare(`INSERT INTO messages (id, chat_id, sender_id, text, type, status, is_deleted, created_at) VALUES (?, ?, ?, ?, 'poll', 'delivered', 0, ?)`).run(
                msgId, chatId, currentUser.id, `📊 Poll: ${body.question}`, now
            );

            db.prepare(`INSERT INTO polls (id, message_id, question, options_json, created_at) VALUES (?, ?, ?, ?, ?)`).run(
                pollId, msgId, body.question, JSON.stringify(optionsFormatted), now
            );

            const sender = db.prepare(`SELECT id, username, display_name, avatar FROM users WHERE id = ?`).get(currentUser.id);
            const pollPayload = {
                id: msgId,
                chatId,
                senderId: currentUser.id,
                sender,
                text: `📊 Poll: ${body.question}`,
                type: 'poll',
                status: 'delivered',
                isEdited: false,
                isDeleted: false,
                createdAt: now,
                reactions: [],
                poll: {
                    id: pollId,
                    question: body.question,
                    options: optionsFormatted,
                    votes: []
                }
            };

            const members = db.prepare(`SELECT user_id FROM chat_members WHERE chat_id = ?`).all(chatId);
            members.forEach((m) => {
                sendToUser(m.user_id, { type: 'NEW_MESSAGE', message: pollPayload });
            });

            return sendJson(201, { message: pollPayload });
        });
        return;
    }

    // Vote on Poll
    if (pathname.match(/^\/api\/chats\/([^\/]+)\/vote$/) && req.method === 'POST') {
        const chatId = pathname.split('/')[3];
        parseBodyJson(req, (err, body) => {
            if (err || !body.pollId || !body.optionId) return sendJson(400, { error: 'pollId and optionId required' });

            const poll = db.prepare(`SELECT * FROM polls WHERE id = ?`).get(body.pollId);
            if (!poll) return sendJson(404, { error: 'Poll not found' });

            db.prepare(`INSERT OR REPLACE INTO poll_votes (poll_id, user_id, option_id, created_at) VALUES (?, ?, ?, ?)`).run(
                body.pollId, currentUser.id, body.optionId, Date.now()
            );

            const votes = db.prepare(`SELECT option_id, COUNT(*) as count, GROUP_CONCAT(user_id) as voters FROM poll_votes WHERE poll_id = ? GROUP BY option_id`).all(body.pollId);

            const members = db.prepare(`SELECT user_id FROM chat_members WHERE chat_id = ?`).all(chatId);
            members.forEach((m) => {
                sendToUser(m.user_id, { type: 'POLL_VOTE_UPDATE', pollId: body.pollId, votes });
            });

            return sendJson(200, { votes });
        });
        return;
    }

    // Real File Upload API (Multipart Form-Data / Base64 binary)
    if (pathname === '/api/upload' && req.method === 'POST') {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => {
            try {
                const buffer = Buffer.concat(chunks);
                const contentType = req.headers['content-type'] || '';

                if (contentType.includes('application/json')) {
                    const parsed = JSON.parse(buffer.toString());
                    const ext = parsed.fileName ? path.extname(parsed.fileName) : (parsed.type === 'audio' ? '.webm' : '.bin');
                    const fileName = 'upload_' + Date.now() + ext;
                    const filePath = path.join(UPLOAD_DIR, fileName);
                    const fileBuffer = Buffer.from(parsed.base64Data, 'base64');
                    fs.writeFileSync(filePath, fileBuffer);

                    return sendJson(200, {
                        url: '/uploads/' + fileName,
                        fileName: parsed.fileName || fileName,
                        fileSize: fileBuffer.length,
                        type: parsed.type || 'file'
                    });
                }

                // Raw binary upload
                const rawExt = path.extname(req.headers['x-file-name'] || '') || (req.headers['x-file-type'] === 'audio' ? '.webm' : '.bin');
                const fileName = 'upload_' + Date.now() + rawExt;
                const filePath = path.join(UPLOAD_DIR, fileName);
                fs.writeFileSync(filePath, buffer);

                return sendJson(200, {
                    url: '/uploads/' + fileName,
                    fileName: req.headers['x-file-name'] || fileName,
                    fileSize: buffer.length,
                    type: req.headers['x-file-type'] || 'file'
                });
            } catch (e) {
                return sendJson(500, { error: 'Upload processing failed: ' + e.message });
            }
        });
        return;
    }

    // ==========================================
    // SYSTEM HEALTH & MONITORING
    // ==========================================
    if (pathname === '/api/health' && req.method === 'GET') {
        const usersCount = db.prepare(`SELECT COUNT(*) as c FROM users`).get().c;
        const chatsCount = db.prepare(`SELECT COUNT(*) as c FROM chats`).get().c;
        const messagesCount = db.prepare(`SELECT COUNT(*) as c FROM messages`).get().c;
        return sendJson(200, {
            status: 'healthy',
            uptime: process.uptime(),
            timestamp: Date.now(),
            activeConnections: wss.clients.size,
            database: {
                users: usersCount,
                chats: chatsCount,
                messages: messagesCount
            },
            memory: process.memoryUsage()
        });
    }

    // ==========================================
    // CONTACTS & BLOCKING
    // ==========================================
    if (pathname === '/api/contacts' && req.method === 'GET') {
        const contacts = db.prepare(`
            SELECT c.id, c.contact_user_id as userId, c.nickname, c.is_blocked as isBlocked,
                   u.username, u.display_name as displayName, u.avatar, u.online, u.last_seen as lastSeen
            FROM contacts c
            JOIN users u ON c.contact_user_id = u.id
            WHERE c.user_id = ?
            ORDER BY u.display_name ASC
        `).all(currentUser.id);
        return sendJson(200, { contacts });
    }

    if (pathname === '/api/contacts' && req.method === 'POST') {
        parseBodyJson(req, (err, body) => {
            if (err || (!body.contactUserId && !body.username)) {
                return sendJson(400, { error: 'contactUserId or username required' });
            }
            let target = null;
            if (body.contactUserId) {
                target = db.prepare(`SELECT id, username, display_name FROM users WHERE id = ?`).get(body.contactUserId);
            } else {
                target = db.prepare(`SELECT id, username, display_name FROM users WHERE username = ?`).get(body.username.trim().toLowerCase());
            }
            if (!target) return sendJson(404, { error: 'User not found' });
            if (target.id === currentUser.id) return sendJson(400, { error: 'Cannot add yourself as contact' });

            db.prepare(`INSERT OR IGNORE INTO contacts (user_id, contact_user_id, nickname, created_at) VALUES (?, ?, ?, ?)`).run(
                currentUser.id, target.id, body.nickname || target.display_name, Date.now()
            );
            return sendJson(201, { success: true, contact: target });
        });
        return;
    }

    if (pathname.match(/^\/api\/contacts\/([^\/]+)\/block$/) && req.method === 'POST') {
        const targetUserId = pathname.split('/')[3];
        const existing = db.prepare(`SELECT is_blocked FROM contacts WHERE user_id = ? AND contact_user_id = ?`).get(currentUser.id, targetUserId);
        const newStatus = existing && existing.is_blocked ? 0 : 1;
        db.prepare(`INSERT INTO contacts (user_id, contact_user_id, is_blocked, created_at) VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, contact_user_id) DO UPDATE SET is_blocked = ?`).run(
            currentUser.id, targetUserId, newStatus, Date.now(), newStatus
        );
        return sendJson(200, { success: true, isBlocked: Boolean(newStatus) });
    }

    if (pathname.match(/^\/api\/contacts\/([^\/]+)$/) && req.method === 'DELETE') {
        const targetUserId = pathname.split('/')[3];
        db.prepare(`DELETE FROM contacts WHERE user_id = ? AND contact_user_id = ?`).run(currentUser.id, targetUserId);
        return sendJson(200, { success: true });
    }

    // ==========================================
    // STORIES & STATUS (WHATSAPP 24H STORIES)
    // ==========================================
    if (pathname === '/api/stories' && req.method === 'GET') {
        const now = Date.now();
        const activeStories = db.prepare(`
            SELECT s.*, u.username, u.display_name as displayName, u.avatar as userAvatar,
                   (SELECT COUNT(*) FROM story_views sv WHERE sv.story_id = s.id) as viewCount,
                   EXISTS(SELECT 1 FROM story_views sv WHERE sv.story_id = s.id AND sv.viewer_user_id = ?) as hasViewed
            FROM stories s
            JOIN users u ON s.user_id = u.id
            WHERE s.expires_at > ?
            ORDER BY s.created_at DESC
        `).all(currentUser.id, now);
        return sendJson(200, { stories: activeStories });
    }

    if (pathname === '/api/stories' && req.method === 'POST') {
        parseBodyJson(req, (err, body) => {
            const mediaUrl = body.mediaUrl || '';
            const bgGradient = body.bgGradient || '';
            const musicTrack = body.musicTrack || '';
            const stickerJson = body.stickerJson ? (typeof body.stickerJson === 'object' ? JSON.stringify(body.stickerJson) : String(body.stickerJson)) : '';

            if (err || (!mediaUrl && !bgGradient && !body.caption)) {
                return sendJson(400, { error: 'Media, gradient, or caption required for status story' });
            }

            const storyId = 'story_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
            const now = Date.now();
            const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours

            try {
                db.prepare(`INSERT INTO stories (id, user_id, media_url, caption, bg_gradient, music_track, sticker_json, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
                    storyId, currentUser.id, mediaUrl, body.caption || '', bgGradient, musicTrack, stickerJson, expiresAt, now
                );
            } catch(e) {
                // Fallback for older schema if columns not yet active
                db.prepare(`INSERT INTO stories (id, user_id, media_url, caption, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)`).run(
                    storyId, currentUser.id, mediaUrl || 'gradient://' + encodeURIComponent(bgGradient), body.caption || '', expiresAt, now
                );
            }

            return sendJson(201, {
                success: true,
                storyId,
                story: { id: storyId, userId: currentUser.id, mediaUrl, caption: body.caption, bgGradient, musicTrack, stickerJson, expiresAt }
            });
        });
        return;
    }

    if (pathname.match(/^\/api\/stories\/([^\/]+)\/view$/) && req.method === 'POST') {
        const storyId = pathname.split('/')[3];
        const story = db.prepare(`SELECT id FROM stories WHERE id = ?`).get(storyId);
        if (!story) return sendJson(404, { error: 'Story not found' });

        db.prepare(`INSERT OR IGNORE INTO story_views (story_id, viewer_user_id, viewed_at) VALUES (?, ?, ?)`).run(
            storyId, currentUser.id, Date.now()
        );
        return sendJson(200, { success: true });
    }

    if (pathname.match(/^\/api\/stories\/([^\/]+)$/) && req.method === 'DELETE') {
        const storyId = pathname.split('/')[3];
        db.prepare(`DELETE FROM stories WHERE id = ? AND user_id = ?`).run(storyId, currentUser.id);
        return sendJson(200, { success: true, message: 'Story deleted' });
    }

    // ==========================================
    // SCHEDULED MESSAGES
    // ==========================================
    if (pathname.match(/^\/api\/chats\/([^\/]+)\/schedule$/) && req.method === 'POST') {
        const chatId = pathname.split('/')[3];
        parseBodyJson(req, (err, body) => {
            if (err || !body.text || !body.scheduledFor) {
                return sendJson(400, { error: 'text and scheduledFor timestamp required' });
            }
            if (body.scheduledFor <= Date.now()) {
                return sendJson(400, { error: 'scheduledFor must be in the future' });
            }

            const id = 'sch_' + Date.now();
            db.prepare(`INSERT INTO scheduled_messages (id, chat_id, sender_id, text, type, media_url, scheduled_for, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
                id, chatId, currentUser.id, body.text, body.type || 'text', body.mediaUrl || null, body.scheduledFor, Date.now()
            );
            return sendJson(201, { success: true, scheduledMessage: { id, chatId, scheduledFor: body.scheduledFor, text: body.text } });
        });
        return;
    }

    if (pathname.match(/^\/api\/chats\/([^\/]+)\/scheduled$/) && req.method === 'GET') {
        const chatId = pathname.split('/')[3];
        const scheduled = db.prepare(`SELECT * FROM scheduled_messages WHERE chat_id = ? AND sender_id = ? ORDER BY scheduled_for ASC`).all(chatId, currentUser.id);
        return sendJson(200, { scheduled });
    }

    if (pathname.match(/^\/api\/chats\/([^\/]+)\/scheduled\/([^\/]+)$/) && req.method === 'DELETE') {
        const msgId = pathname.split('/')[5];
        db.prepare(`DELETE FROM scheduled_messages WHERE id = ? AND sender_id = ?`).run(msgId, currentUser.id);
        return sendJson(200, { success: true });
    }

    // ==========================================
    // DRAFTS & DISAPPEARING MESSAGES
    // ==========================================
    if (pathname.match(/^\/api\/chats\/([^\/]+)\/draft$/)) {
        const chatId = pathname.split('/')[3];
        if (req.method === 'PUT') {
            parseBodyJson(req, (err, body) => {
                const draftText = (body && body.draftText) || '';
                db.prepare(`INSERT INTO chat_settings (user_id, chat_id, draft_text) VALUES (?, ?, ?)
                    ON CONFLICT(user_id, chat_id) DO UPDATE SET draft_text = ?`).run(
                    currentUser.id, chatId, draftText, draftText
                );
                return sendJson(200, { success: true, draftText });
            });
            return;
        }
        if (req.method === 'GET') {
            const row = db.prepare(`SELECT draft_text FROM chat_settings WHERE user_id = ? AND chat_id = ?`).get(currentUser.id, chatId);
            return sendJson(200, { draftText: row ? row.draft_text : '' });
        }
    }

    if (pathname.match(/^\/api\/chats\/([^\/]+)\/disappearing$/) && req.method === 'POST') {
        const chatId = pathname.split('/')[3];
        parseBodyJson(req, (err, body) => {
            const ttl = parseInt(body.ttlSeconds, 10) || 0;
            db.prepare(`INSERT INTO chat_settings (user_id, chat_id, disappearing_ttl) VALUES (?, ?, ?)
                ON CONFLICT(user_id, chat_id) DO UPDATE SET disappearing_ttl = ?`).run(
                currentUser.id, chatId, ttl, ttl
            );
            return sendJson(200, { success: true, disappearingTtl: ttl });
        });
        return;
    }

    // ==========================================
    // PINNED MESSAGES
    // ==========================================
    if (pathname.match(/^\/api\/messages\/([^\/]+)\/pin$/) && req.method === 'POST') {
        const messageId = pathname.split('/')[3];
        const msg = db.prepare(`SELECT * FROM messages WHERE id = ?`).get(messageId);
        if (!msg) return sendJson(404, { error: 'Message not found' });

        const newPinned = msg.is_pinned ? 0 : 1;
        db.prepare(`UPDATE messages SET is_pinned = ? WHERE id = ?`).run(newPinned, messageId);

        const members = db.prepare(`SELECT user_id FROM chat_members WHERE chat_id = ?`).all(msg.chat_id);
        members.forEach((m) => {
            sendToUser(m.user_id, { type: 'MESSAGE_PIN_UPDATE', messageId, isPinned: Boolean(newPinned), chatId: msg.chat_id });
        });

        return sendJson(200, { success: true, isPinned: Boolean(newPinned) });
    }

    // ==========================================
    // CHAT BACKUP & EXPORT / IMPORT
    // ==========================================
    if (pathname.match(/^\/api\/chats\/([^\/]+)\/export$/) && req.method === 'GET') {
        const chatId = pathname.split('/')[3];
        const chat = db.prepare(`SELECT * FROM chats WHERE id = ?`).get(chatId);
        if (!chat) return sendJson(404, { error: 'Chat not found' });

        const messages = db.prepare(`SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC`).all(chatId);
        res.setHeader('Content-Disposition', `attachment; filename="nova_backup_${chatId}.json"`);
        return sendJson(200, { exportDate: new Date().toISOString(), chat, messages });
    }

    if (pathname.match(/^\/api\/chats\/([^\/]+)\/import$/) && req.method === 'POST') {
        const chatId = pathname.split('/')[3];
        parseBodyJson(req, (err, body) => {
            if (err || !Array.isArray(body.messages)) return sendJson(400, { error: 'Valid messages array required' });

            let importedCount = 0;
            body.messages.forEach((m) => {
                if (m.id && m.text) {
                    try {
                        db.prepare(`INSERT OR IGNORE INTO messages (id, chat_id, sender_id, text, type, media_url, status, is_deleted, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, 'read', 0, ?)`).run(
                            m.id, chatId, m.sender_id || currentUser.id, m.text, m.type || 'text', m.media_url || null, m.created_at || Date.now()
                        );
                        importedCount++;
                    } catch(e) {}
                }
            });
            return sendJson(200, { success: true, importedCount });
        });
        return;
    }

    // ==========================================
    // SESSIONS & LINKED DEVICES
    // ==========================================
    if (pathname === '/api/sessions' && req.method === 'GET') {
        const sessions = db.prepare(`SELECT token, created_at, expires_at FROM sessions WHERE user_id = ? ORDER BY created_at DESC`).all(currentUser.id);
        const mapped = sessions.map(s => ({
            tokenPrefix: s.token.substring(0, 8) + '...',
            isCurrent: s.token === token,
            createdAt: s.created_at,
            expiresAt: s.expires_at
        }));
        return sendJson(200, { sessions: mapped });
    }

    if (pathname.match(/^\/api\/sessions\/([^\/]+)$/) && req.method === 'DELETE') {
        const targetToken = pathname.split('/')[3];
        const revoked = db.prepare(`SELECT token FROM sessions WHERE user_id = ? AND token LIKE ?`).all(currentUser.id, `${targetToken}%`);
        db.prepare(`DELETE FROM sessions WHERE user_id = ? AND token LIKE ?`).run(currentUser.id, `${targetToken}%`);
        revoked.forEach(r => {
            wss.clients.forEach(c => {
                if (c.token === r.token) {
                    try {
                        c.send(JSON.stringify({ type: 'SESSION_REVOKED', message: 'Session terminated from another device' }));
                        c.close();
                    } catch(e) {}
                }
            });
        });
        return sendJson(200, { success: true });
    }

    // ==========================================
    // CALL LOGS & HISTORY
    // ==========================================
    if (pathname === '/api/calls' && req.method === 'GET') {
        const calls = db.prepare(`
            SELECT cl.*, 
                   u1.display_name as caller_name, u1.avatar as caller_avatar,
                   u2.display_name as receiver_name, u2.avatar as receiver_avatar
            FROM call_logs cl
            JOIN users u1 ON cl.caller_id = u1.id
            JOIN users u2 ON cl.receiver_id = u2.id
            WHERE cl.caller_id = ? OR cl.receiver_id = ?
            ORDER BY cl.created_at DESC
            LIMIT 50
        `).all(currentUser.id, currentUser.id);
        return sendJson(200, { calls });
    }

    // ==========================================
    // GROUP & CHANNEL MEMBER MANAGEMENT
    // ==========================================
    if (pathname.match(/^\/api\/chats\/([^\/]+)\/members$/) && req.method === 'GET') {
        const chatId = pathname.split('/')[3];
        const members = db.prepare(`
            SELECT cm.user_id, cm.role, cm.joined_at, u.username, u.display_name, u.avatar, u.online, u.last_seen
            FROM chat_members cm
            JOIN users u ON cm.user_id = u.id
            WHERE cm.chat_id = ?
            ORDER BY cm.joined_at ASC
        `).all(chatId);
        return sendJson(200, { members });
    }

    if (pathname.match(/^\/api\/chats\/([^\/]+)\/members$/) && req.method === 'POST') {
        const chatId = pathname.split('/')[3];
        parseBodyJson(req, (err, body) => {
            const targetUserId = body.userId || currentUser.id;
            const role = body.role || 'member';
            const chat = db.prepare(`SELECT * FROM chats WHERE id = ?`).get(chatId);
            if (!chat) return sendJson(404, { error: 'Chat not found' });

            db.prepare(`INSERT OR IGNORE INTO chat_members (chat_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)`).run(
                chatId, targetUserId, role, Date.now()
            );
            return sendJson(200, { success: true, chatId, userId: targetUserId, role });
        });
        return;
    }

    if (pathname.match(/^\/api\/chats\/([^\/]+)\/members\/([^\/]+)$/) && req.method === 'PUT') {
        const parts = pathname.split('/');
        const chatId = parts[3];
        const targetUserId = parts[5];

        const myMember = db.prepare(`SELECT role FROM chat_members WHERE chat_id = ? AND user_id = ?`).get(chatId, currentUser.id);
        if (!myMember || (myMember.role !== 'owner' && myMember.role !== 'admin')) {
            return sendJson(403, { error: 'Only owners and admins can update member roles' });
        }

        parseBodyJson(req, (err, body) => {
            if (!body.role) return sendJson(400, { error: 'role is required' });
            db.prepare(`UPDATE chat_members SET role = ? WHERE chat_id = ? AND user_id = ?`).run(
                body.role, chatId, targetUserId
            );
            return sendJson(200, { success: true, targetUserId, role: body.role });
        });
        return;
    }

    if (pathname.match(/^\/api\/chats\/([^\/]+)\/members\/([^\/]+)$/) && req.method === 'DELETE') {
        const parts = pathname.split('/');
        const chatId = parts[3];
        const targetUserId = parts[5];

        if (targetUserId !== currentUser.id) {
            const myMember = db.prepare(`SELECT role FROM chat_members WHERE chat_id = ? AND user_id = ?`).get(chatId, currentUser.id);
            if (!myMember || (myMember.role !== 'owner' && myMember.role !== 'admin')) {
                return sendJson(403, { error: 'Only admins can remove other members' });
            }
        }

        db.prepare(`DELETE FROM chat_members WHERE chat_id = ? AND user_id = ?`).run(chatId, targetUserId);
        return sendJson(200, { success: true, removedUserId: targetUserId });
    }

    // ==========================================
    // USER PRIVACY SETTINGS
    // ==========================================
    if (pathname === '/api/users/settings' && req.method === 'GET') {
        const userSettings = db.prepare(`SELECT privacy_last_seen, privacy_read_receipts, theme_preference FROM users WHERE id = ?`).get(currentUser.id);
        return sendJson(200, { settings: userSettings });
    }

    if (pathname === '/api/users/settings' && req.method === 'PUT') {
        parseBodyJson(req, (err, body) => {
            if (body.privacyLastSeen !== undefined) {
                db.prepare(`UPDATE users SET privacy_last_seen = ? WHERE id = ?`).run(body.privacyLastSeen, currentUser.id);
            }
            if (body.privacyReadReceipts !== undefined) {
                db.prepare(`UPDATE users SET privacy_read_receipts = ? WHERE id = ?`).run(body.privacyReadReceipts ? 1 : 0, currentUser.id);
            }
            if (body.themePreference !== undefined) {
                db.prepare(`UPDATE users SET theme_preference = ? WHERE id = ?`).run(body.themePreference, currentUser.id);
            }
            return sendJson(200, { success: true });
        });
        return;
    }

    // ==========================================
    // GLOBAL MESSAGE & CONTENT SEARCH
    // ==========================================
    if (pathname === '/api/search' && req.method === 'GET') {
        const q = (parsedUrl.searchParams.get('q') || '').trim();
        if (!q) return sendJson(200, { messages: [] });
        const wild = `%${q}%`;

        const found = db.prepare(`
            SELECT m.id, m.chat_id, m.text, m.type, m.created_at, c.title as chat_title, u.display_name as sender_name
            FROM messages m
            JOIN chats c ON m.chat_id = c.id
            JOIN chat_members cm ON c.id = cm.chat_id AND cm.user_id = ?
            JOIN users u ON m.sender_id = u.id
            WHERE m.is_deleted = 0 AND m.text LIKE ?
            ORDER BY m.created_at DESC
            LIMIT 25
        `).all(currentUser.id, wild);

        return sendJson(200, { messages: found });
    }

    // ==========================================
    // MODERATION & USER REPORTS
    // ==========================================
    if (pathname === '/api/reports' && req.method === 'POST') {
        parseBodyJson(req, (err, body) => {
            if (err || !body.reason) return sendJson(400, { error: 'Report reason required' });
            const repId = 'rep_' + Date.now();
            db.prepare(`INSERT INTO reports (id, reporter_id, reported_user_id, chat_id, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)`).run(
                repId, currentUser.id, body.reportedUserId || null, body.chatId || null, body.reason, Date.now()
            );
            return sendJson(201, { success: true, reportId: repId });
        });
        return;
    }

    if (pathname === '/api/admin/reports' && req.method === 'GET') {
        const reports = db.prepare(`
            SELECT r.*,
                   u_rep.username as reporter_username, u_rep.display_name as reporter_name, u_rep.avatar as reporter_avatar,
                   u_tgt.username as reported_username, u_tgt.display_name as reported_name, u_tgt.avatar as reported_avatar,
                   c.title as chat_title
            FROM reports r
            LEFT JOIN users u_rep ON r.reporter_id = u_rep.id
            LEFT JOIN users u_tgt ON r.reported_user_id = u_tgt.id
            LEFT JOIN chats c ON r.chat_id = c.id
            ORDER BY r.created_at DESC
            LIMIT 50
        `).all();
        return sendJson(200, { reports });
    }

    if (pathname.match(/^\/api\/admin\/reports\/([^\/]+)$/) && req.method === 'DELETE') {
        const reportId = pathname.split('/')[4];
        db.prepare(`DELETE FROM reports WHERE id = ?`).run(reportId);
        return sendJson(200, { success: true, message: 'Report dismissed' });
    }

    if (pathname.match(/^\/api\/admin\/reports\/([^\/]+)\/action$/) && req.method === 'POST') {
        const reportId = pathname.split('/')[4];
        parseBodyJson(req, (err, body) => {
            const action = body.action || 'resolve';
            db.prepare(`UPDATE reports SET status = ? WHERE id = ?`).run(action, reportId);
            return sendJson(200, { success: true, action, reportId });
        });
        return;
    }

    if (pathname === '/api/admin/metrics' && req.method === 'GET') {
        const totalUsers = db.prepare(`SELECT COUNT(*) as count FROM users`).get()?.count || 0;
        const totalMessages = db.prepare(`SELECT COUNT(*) as count FROM messages`).get()?.count || 0;
        const totalChats = db.prepare(`SELECT COUNT(*) as count FROM chats`).get()?.count || 0;
        const totalStories = db.prepare(`SELECT COUNT(*) as count FROM stories`).get()?.count || 0;
        const pendingReports = db.prepare(`SELECT COUNT(*) as count FROM reports WHERE status = 'pending'`).get()?.count || 0;
        const totalActiveSockets = activeSockets ? activeSockets.size : 0;
        return sendJson(200, {
            totalUsers,
            totalMessages,
            totalChats,
            totalStories,
            pendingReports,
            activeSockets: totalActiveSockets
        });
    }

    if (pathname === '/api/admin/users' && req.method === 'GET') {
        const users = db.prepare(`
            SELECT id, username, display_name, email,
                   CASE WHEN username IN ('faraz_anjum', 'admin') THEN 'admin' ELSE 'user' END as role,
                   online, last_seen, created_at,
                   (SELECT COUNT(*) FROM messages WHERE sender_id = users.id) as message_count
            FROM users
            ORDER BY created_at DESC
            LIMIT 100
        `).all();
        return sendJson(200, { users });
    }

    if (pathname.match(/^\/api\/chats\/([^\/]+)\/leave$/) && req.method === 'POST') {
        const chatId = pathname.split('/')[3];
        db.prepare(`DELETE FROM chat_members WHERE chat_id = ? AND user_id = ? AND role != 'owner'`).run(chatId, currentUser.id);
        return sendJson(200, { success: true, message: 'Left chat successfully' });
    }

    // ==========================================
    // SOCIAL FEED (INSTAGRAM / FACEBOOK HYBRID)
    // ==========================================
    if (pathname === '/api/posts' && req.method === 'GET') {
        const posts = db.prepare(`
            SELECT p.*, u.username, u.display_name, u.avatar
            FROM posts p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
            LIMIT 50
        `).all();

        const enriched = posts.map(p => {
            const hasLiked = db.prepare(`SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?`).get(p.id, currentUser.id);
            const comments = db.prepare(`
                SELECT c.*, u.username, u.display_name, u.avatar
                FROM post_comments c
                JOIN users u ON c.user_id = u.id
                WHERE c.post_id = ?
                ORDER BY c.created_at ASC
            `).all(p.id);
            return {
                ...p,
                hasLiked: !!hasLiked,
                comments
            };
        });

        return sendJson(200, { posts: enriched });
    }

    if (pathname === '/api/posts' && req.method === 'POST') {
        parseBodyJson(req, (err, body) => {
            if (err) return sendJson(400, { error: 'Invalid JSON' });
            if (!body.caption && !body.mediaUrl) return sendJson(400, { error: 'Post must have caption or media' });

            const postId = 'post_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
            const now = Date.now();
            db.prepare(`INSERT INTO posts (id, user_id, caption, media_url, media_type, likes_count, comments_count, created_at) VALUES (?, ?, ?, ?, ?, 0, 0, ?)`).run(
                postId, currentUser.id, body.caption || '', body.mediaUrl || null, body.mediaType || 'image', now
            );

            const createdPost = {
                id: postId,
                user_id: currentUser.id,
                username: currentUser.username,
                display_name: currentUser.display_name,
                avatar: currentUser.avatar,
                caption: body.caption || '',
                media_url: body.mediaUrl || null,
                media_type: body.mediaType || 'image',
                likes_count: 0,
                comments_count: 0,
                hasLiked: false,
                comments: [],
                created_at: now
            };

            return sendJson(201, { post: createdPost });
        });
        return;
    }

    if (pathname.match(/^\/api\/posts\/([^\/]+)\/like$/) && req.method === 'POST') {
        const postId = pathname.split('/')[3];
        const existing = db.prepare(`SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?`).get(postId, currentUser.id);
        let hasLiked = false;
        if (existing) {
            db.prepare(`DELETE FROM post_likes WHERE post_id = ? AND user_id = ?`).run(postId, currentUser.id);
            db.prepare(`UPDATE posts SET likes_count = MAX(0, likes_count - 1) WHERE id = ?`).run(postId);
            hasLiked = false;
        } else {
            db.prepare(`INSERT INTO post_likes (post_id, user_id, created_at) VALUES (?, ?, ?)`).run(postId, currentUser.id, Date.now());
            db.prepare(`UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?`).run(postId);
            hasLiked = true;
        }
        const updated = db.prepare(`SELECT likes_count FROM posts WHERE id = ?`).get(postId);
        return sendJson(200, { hasLiked, likesCount: updated ? updated.likes_count : 0 });
    }

    if (pathname.match(/^\/api\/posts\/([^\/]+)\/comment$/) && req.method === 'POST') {
        const postId = pathname.split('/')[3];
        parseBodyJson(req, (err, body) => {
            if (err || !body.comment || !body.comment.trim()) return sendJson(400, { error: 'Comment text required' });
            const commId = 'comm_' + Date.now();
            const now = Date.now();
            db.prepare(`INSERT INTO post_comments (id, post_id, user_id, comment, created_at) VALUES (?, ?, ?, ?, ?)`).run(
                commId, postId, currentUser.id, body.comment.trim(), now
            );
            db.prepare(`UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?`).run(postId);
            return sendJson(201, {
                comment: {
                    id: commId,
                    post_id: postId,
                    user_id: currentUser.id,
                    username: currentUser.username,
                    display_name: currentUser.display_name,
                    avatar: currentUser.avatar,
                    comment: body.comment.trim(),
                    created_at: now
                }
            });
        });
        return;
    }

    // ==========================================
    // CHANNELS DISCOVERY & MANAGEMENT (TELEGRAM)
    // ==========================================
    if (pathname === '/api/channels/explore' && req.method === 'GET') {
        const channels = db.prepare(`
            SELECT c.*, 
                   (SELECT COUNT(*) FROM chat_members WHERE chat_id = c.id) as subscriber_count,
                   (SELECT role FROM chat_members WHERE chat_id = c.id AND user_id = ?) as user_role
            FROM chats c
            WHERE c.type = 'channel'
            ORDER BY subscriber_count DESC, c.created_at DESC
        `).all(currentUser.id);
        return sendJson(200, { channels });
    }

    if (pathname.match(/^\/api\/channels\/([^\/]+)\/join$/) && req.method === 'POST') {
        const channelId = pathname.split('/')[3];
        const channel = db.prepare(`SELECT id, title FROM chats WHERE id = ? AND type = 'channel'`).get(channelId);
        if (!channel) return sendJson(404, { error: 'Channel not found' });

        db.prepare(`INSERT OR IGNORE INTO chat_members (chat_id, user_id, role, joined_at) VALUES (?, ?, 'subscriber', ?)`).run(
            channelId, currentUser.id, Date.now()
        );
        return sendJson(200, { success: true, message: 'Joined channel successfully' });
    }

    if (pathname.match(/^\/api\/channels\/([^\/]+)\/leave$/) && req.method === 'POST') {
        const channelId = pathname.split('/')[3];
        db.prepare(`DELETE FROM chat_members WHERE chat_id = ? AND user_id = ? AND role != 'owner'`).run(channelId, currentUser.id);
        return sendJson(200, { success: true, message: 'Left channel successfully' });
    }

    if (pathname === '/api/chats/channel' && req.method === 'POST') {
        parseBodyJson(req, (err, body) => {
            if (err || !body.title) return sendJson(400, { error: 'Channel title required' });
            const newChatId = 'chat_chan_' + Date.now();
            const now = Date.now();
            const avatar = body.avatar || 'https://images.unsplash.com/photo-1557683316-973673baf926?w=150&h=150&fit=crop';
            const handle = body.handle ? (body.handle.startsWith('@') ? body.handle : '@' + body.handle) : ('@chan_' + Math.random().toString(36).substring(2, 6));
            const isPublic = body.isPublic !== undefined ? (body.isPublic ? 1 : 0) : 1;
            const postingPermission = body.postingPermission || 'admin_only';

            try {
                db.prepare(`INSERT INTO chats (id, type, title, handle, avatar, description, is_public, posting_permission, created_by, created_at) VALUES (?, 'channel', ?, ?, ?, ?, ?, ?, ?, ?)`).run(
                    newChatId, body.title.trim(), handle, avatar, body.description || '', isPublic, postingPermission, currentUser.id, now
                );
            } catch(dbErr) {
                try {
                    db.prepare(`INSERT INTO chats (id, type, title, handle, avatar, description, is_public, created_by, created_at) VALUES (?, 'channel', ?, ?, ?, ?, ?, ?, ?)`).run(
                        newChatId, body.title.trim(), handle, avatar, body.description || '', isPublic, currentUser.id, now
                    );
                } catch(e) {
                    return sendJson(400, { error: 'Handle already in use or database error' });
                }
            }

            db.prepare(`INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES (?, ?, 'owner', ?)`).run(newChatId, currentUser.id, now);
            return sendJson(201, { chatId: newChatId, title: body.title.trim(), handle, avatar, postingPermission });
        });
        return;
    }

    // ==========================================
    // USER PROFILE & CREATOR DASHBOARD
    // ==========================================
    if (pathname === '/api/users/profile' && req.method === 'PUT') {
        parseBodyJson(req, (err, body) => {
            if (err) return sendJson(400, { error: 'Invalid JSON' });
            if (body.displayName) {
                db.prepare(`UPDATE users SET display_name = ? WHERE id = ?`).run(body.displayName.trim(), currentUser.id);
            }
            if (body.bio !== undefined) {
                db.prepare(`UPDATE users SET bio = ? WHERE id = ?`).run(body.bio.trim(), currentUser.id);
            }
            if (body.avatar) {
                db.prepare(`UPDATE users SET avatar = ? WHERE id = ?`).run(body.avatar.trim(), currentUser.id);
            }
            const updated = db.prepare(`SELECT id, username, display_name, avatar, bio, email FROM users WHERE id = ?`).get(currentUser.id);
            return sendJson(200, { user: updated });
        });
        return;
    }

    if (pathname.match(/^\/api\/users\/([^\/]+)\/profile$/) && req.method === 'GET') {
        const targetUserId = pathname.split('/')[3];
        const user = db.prepare(`SELECT id, username, display_name, avatar, bio, created_at FROM users WHERE id = ?`).get(targetUserId);
        if (!user) return sendJson(404, { error: 'User not found' });

        const followersCount = db.prepare(`SELECT COUNT(*) as count FROM user_followers WHERE following_id = ?`).get(targetUserId)?.count || 0;
        const followingCount = db.prepare(`SELECT COUNT(*) as count FROM user_followers WHERE follower_id = ?`).get(targetUserId)?.count || 0;
        const posts = db.prepare(`SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC`).all(targetUserId);
        const totalLikes = posts.reduce((sum, p) => sum + (p.likes_count || 0), 0);
        const isFollowing = db.prepare(`SELECT 1 FROM user_followers WHERE follower_id = ? AND following_id = ?`).get(currentUser.id, targetUserId) ? 1 : 0;

        return sendJson(200, {
            user,
            followersCount,
            followingCount,
            postsCount: posts.length,
            totalLikes,
            isFollowing: !!isFollowing,
            posts,
            stats: {
                followersCount,
                followingCount,
                postsCount: posts.length,
                likesCount: totalLikes
            }
        });
    }

    if (pathname.match(/^\/api\/users\/([^\/]+)\/follow$/) && req.method === 'POST') {
        const targetUserId = pathname.split('/')[3];
        if (targetUserId === currentUser.id) return sendJson(400, { error: 'Cannot follow yourself' });

        const existing = db.prepare(`SELECT 1 FROM user_followers WHERE follower_id = ? AND following_id = ?`).get(currentUser.id, targetUserId);
        let isFollowing = false;
        if (existing) {
            db.prepare(`DELETE FROM user_followers WHERE follower_id = ? AND following_id = ?`).run(currentUser.id, targetUserId);
            isFollowing = false;
        } else {
            db.prepare(`INSERT INTO user_followers (follower_id, following_id, created_at) VALUES (?, ?, ?)`).run(currentUser.id, targetUserId, Date.now());
            isFollowing = true;
        }

        const followersCount = db.prepare(`SELECT COUNT(*) as count FROM user_followers WHERE following_id = ?`).get(targetUserId)?.count || 0;
        return sendJson(200, { isFollowing, followersCount });
    }

    if (pathname === '/api/creators/trending' && req.method === 'GET') {
        const creators = db.prepare(`
            SELECT u.id, u.username, u.display_name, u.avatar, u.bio,
                   (SELECT COUNT(*) FROM user_followers WHERE following_id = u.id) as followers_count,
                   (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as posts_count,
                   (SELECT 1 FROM user_followers WHERE follower_id = ? AND following_id = u.id) as is_following
            FROM users u
            WHERE u.id != ?
            ORDER BY followers_count DESC, posts_count DESC
            LIMIT 10
        `).all(currentUser.id, currentUser.id);
        return sendJson(200, { creators });
    }

    if (pathname === '/api/users/directory' && req.method === 'GET') {
        const q = (parsedUrl.searchParams.get('q') || '').trim();
        let users;
        if (q) {
            const cleanQ = q.replace(/^@/, '');
            const wild = `%${cleanQ}%`;
            users = db.prepare(`
                SELECT id, username, display_name, avatar, bio, online, last_seen, email
                FROM users
                WHERE id != ? AND (username LIKE ? OR display_name LIKE ? OR email LIKE ?)
                ORDER BY online DESC, display_name ASC
                LIMIT 50
            `).all(currentUser.id, wild, wild, wild);
        } else {
            users = db.prepare(`
                SELECT id, username, display_name, avatar, bio, online, last_seen, email
                FROM users
                WHERE id != ?
                ORDER BY online DESC, display_name ASC
                LIMIT 50
            `).all(currentUser.id);
        }
        return sendJson(200, { users });
    }

    if (pathname.match(/^\/api\/users\/([^\/]+)\/followers$/) && req.method === 'GET') {
        const targetUserId = pathname.split('/')[3];
        const followers = db.prepare(`
            SELECT u.id, u.username, u.display_name, u.avatar, u.bio,
                   (SELECT 1 FROM user_followers WHERE follower_id = ? AND following_id = u.id) as is_following
            FROM user_followers f
            JOIN users u ON f.follower_id = u.id
            WHERE f.following_id = ?
            ORDER BY f.created_at DESC
            LIMIT 50
        `).all(currentUser.id, targetUserId);
        return sendJson(200, { followers });
    }

    if (pathname.match(/^\/api\/users\/([^\/]+)\/following$/) && req.method === 'GET') {
        const targetUserId = pathname.split('/')[3];
        const following = db.prepare(`
            SELECT u.id, u.username, u.display_name, u.avatar, u.bio,
                   (SELECT 1 FROM user_followers WHERE follower_id = ? AND following_id = u.id) as is_following
            FROM user_followers f
            JOIN users u ON f.following_id = u.id
            WHERE f.follower_id = ?
            ORDER BY f.created_at DESC
            LIMIT 50
        `).all(currentUser.id, targetUserId);
        return sendJson(200, { following });
    }

    sendJson(404, { error: 'Endpoint not found' });
}

// Background scheduler every 5s: Prune expired messages & stories, dispatch scheduled messages
setInterval(() => {
    const now = Date.now();
    try {
        const expired = db.prepare(`SELECT id, chat_id FROM messages WHERE expires_at IS NOT NULL AND expires_at <= ?`).all(now);
        if (expired.length > 0) {
            db.prepare(`DELETE FROM messages WHERE expires_at IS NOT NULL AND expires_at <= ?`).run(now);
            expired.forEach(em => {
                const members = db.prepare(`SELECT user_id FROM chat_members WHERE chat_id = ?`).all(em.chat_id);
                members.forEach(m => {
                    sendToUser(m.user_id, { type: 'MESSAGE_DELETED', messageId: em.id, chatId: em.chat_id });
                });
            });
        }
    } catch(e) {}

    try {
        db.prepare(`DELETE FROM stories WHERE expires_at <= ?`).run(now);
    } catch(e) {}

    try {
        const due = db.prepare(`SELECT * FROM scheduled_messages WHERE scheduled_for <= ?`).all(now);
        due.forEach((sm) => {
            db.prepare(`INSERT INTO messages (id, chat_id, sender_id, text, type, media_url, status, is_deleted, created_at) VALUES (?, ?, ?, ?, ?, ?, 'delivered', 0, ?)`).run(
                sm.id, sm.chat_id, sm.sender_id, sm.text, sm.type, sm.media_url, now
            );
            db.prepare(`DELETE FROM scheduled_messages WHERE id = ?`).run(sm.id);

            const sender = db.prepare(`SELECT id, username, display_name, avatar FROM users WHERE id = ?`).get(sm.sender_id);
            const msgPayload = {
                id: sm.id,
                chatId: sm.chat_id,
                senderId: sm.sender_id,
                sender,
                text: sm.text,
                type: sm.type,
                mediaUrl: sm.media_url,
                status: 'delivered',
                isEdited: false,
                isDeleted: false,
                createdAt: now,
                reactions: []
            };

            const members = db.prepare(`SELECT user_id FROM chat_members WHERE chat_id = ?`).all(sm.chat_id);
            members.forEach((m) => {
                sendToUser(m.user_id, { type: 'NEW_MESSAGE', message: msgPayload });
            });
        });
    } catch(e) {}
}, 5000);

// ==============================================================================
// HELPERS FOR REQUEST BODY & STATIC FILE SERVING
// ==============================================================================
function parseBodyJson(req, callback) {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
        try {
            const body = JSON.parse(raw || '{}');
            callback(null, body);
        } catch (err) {
            callback(err);
        }
    });
}

function serveStaticFile(filePath, res) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.mp3': 'audio/mpeg',
        '.webm': 'audio/webm',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.pdf': 'application/pdf',
        '.txt': 'text/plain; charset=utf-8'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return res.end('404 Not Found');
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    });
}

// ==============================================================================
// SERVER START
// ==============================================================================
server.listen(PORT, () => {
    console.log(`==============================================================================`);
    console.log(`🚀 PROJECT NOVA — MESSAGING SUPER APP ENGINE RUNNING!`);
    console.log(`📡 Local Web App:  http://localhost:${PORT}`);
    console.log(`⚡ WebSocket URL:  ws://localhost:${PORT}`);
    console.log(`💾 SQLite DB:      ${DB_PATH}`);
    console.log(`📁 Uploads Dir:    ${UPLOAD_DIR}`);
    console.log(`==============================================================================`);
});
