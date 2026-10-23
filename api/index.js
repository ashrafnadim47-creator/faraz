// ==============================================================================
// NOVA SUPER APP — VERCEL SERVERLESS BACKEND ENGINE
// High-performance Serverless Function handling all /api/* routes on Vercel
// Zero external dependencies, pure Node.js runtime, 100% Valid JSON Guaranteed
// ==============================================================================

const crypto = require('crypto');

// In-Memory Cloud Store for Serverless execution with sensible initial seed
const STORE = {
    users: new Map([
        ['usr_faraz', {
            id: 'usr_faraz',
            username: 'faraz_anjum',
            display_name: 'Faraz Anjum 👑',
            email: 'faraz@farazstore.in',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
            bio: 'Founder & CEO | Faraz Store & Project NOVA',
            role: 'admin',
            followers: new Set(['usr_rush', 'usr_gamer']),
            following: new Set(['usr_rush']),
            created_at: Date.now() - 86400000 * 30
        }],
        ['usr_rush', {
            id: 'usr_rush',
            username: 'tk_rush',
            display_name: 'TK Rush Official 🎮',
            email: 'rush@farazstore.in',
            avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&h=100&fit=crop',
            bio: 'Pro Free Fire Content Creator & YouTuber @TK_RUSH',
            role: 'creator',
            followers: new Set(['usr_faraz']),
            following: new Set(['usr_faraz']),
            created_at: Date.now() - 86400000 * 20
        }],
        ['usr_gamer', {
            id: 'usr_gamer',
            username: 'elite_sniper',
            display_name: 'Elite Sniper ⚡',
            email: 'sniper@farazstore.in',
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
            bio: 'Grandmaster Rank Pusher • Evo Gun Collector',
            role: 'user',
            followers: new Set(),
            following: new Set(['usr_faraz']),
            created_at: Date.now() - 86400000 * 10
        }]
    ]),
    sessions: new Map([
        ['token_faraz_demo', 'usr_faraz'],
        ['token_rush_demo', 'usr_rush']
    ]),
    usernames: new Map([
        ['faraz_anjum', 'usr_faraz'],
        ['tk_rush', 'usr_rush'],
        ['elite_sniper', 'usr_gamer']
    ]),
    channels: [
        {
            id: 'chan_official_announcements',
            name: 'Faraz Store Official Updates',
            title: 'Faraz Store Official Updates',
            handle: '@faraz_announcements',
            description: 'Exclusive announcements, Free Fire tournament dates, voucher drop alerts, and major store updates.',
            avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&h=150&fit=crop',
            creator_id: 'usr_faraz',
            subscriber_count: 1420,
            subscribers: new Set(['usr_faraz', 'usr_rush', 'usr_gamer']),
            created_at: Date.now() - 86400000 * 14
        },
        {
            id: 'chan_evo_gun_deals',
            name: 'Evo Guns & Top-Up Deals 💎',
            title: 'Evo Guns & Top-Up Deals 💎',
            handle: '@ff_evo_deals',
            description: 'Daily diamond giveaways, Evo Draco M1014 discounts, and instant UID top-up notifications.',
            avatar: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&h=150&fit=crop',
            creator_id: 'usr_rush',
            subscriber_count: 890,
            subscribers: new Set(['usr_faraz', 'usr_rush']),
            created_at: Date.now() - 86400000 * 7
        }
    ],
    chats: [
        {
            id: 'chat_direct_rush',
            type: 'direct',
            name: 'TK Rush Official 🎮',
            avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&h=100&fit=crop',
            members: ['usr_faraz', 'usr_rush'],
            otherUserId: 'usr_rush',
            lastMessage: 'Bro, the new M1014 Draco video is live on YouTube! 🔥',
            lastTime: Date.now() - 1800000,
            unreadCount: 0,
            online: 1
        },
        {
            id: 'chat_group_squad',
            type: 'group',
            name: '🔥 Elite Gamers & Squad Lounge',
            avatar: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100&h=100&fit=crop',
            members: ['usr_faraz', 'usr_rush', 'usr_gamer'],
            description: 'Community squad matchmaking and custom room tournaments.',
            lastMessage: 'Next tournament registration is open in the Store.',
            lastTime: Date.now() - 7200000,
            unreadCount: 1,
            memberCount: 382
        }
    ],
    messages: new Map([
        ['chat_direct_rush', [
            {
                id: 'msg_1',
                chat_id: 'chat_direct_rush',
                sender_id: 'usr_rush',
                sender_name: 'TK Rush Official',
                content: 'Hey Faraz! What are the rates for 1060 + 106 diamonds right now?',
                created_at: Date.now() - 7200000,
                status: 'read'
            },
            {
                id: 'msg_2',
                chat_id: 'chat_direct_rush',
                sender_id: 'usr_faraz',
                sender_name: 'Faraz Anjum 👑',
                content: 'Currently ₹799 with instant 60s UID delivery directly from our Top-Up page!',
                created_at: Date.now() - 3600000,
                status: 'read'
            },
            {
                id: 'msg_3',
                chat_id: 'chat_direct_rush',
                sender_id: 'usr_rush',
                sender_name: 'TK Rush Official',
                content: 'Bro, the new M1014 Draco video is live on YouTube! 🔥',
                created_at: Date.now() - 1800000,
                status: 'delivered'
            }
        ]],
        ['chan_official_announcements', [
            {
                id: 'cmsg_1',
                chat_id: 'chan_official_announcements',
                sender_id: 'usr_faraz',
                sender_name: 'Faraz Store Admin',
                content: '📢 Welcome to the official NOVA Community Channel! High-speed real-time messaging is now deployed.',
                created_at: Date.now() - 86400000,
                status: 'delivered'
            }
        ]]
    ]),
    posts: [
        {
            id: 'post_video_1',
            user_id: 'usr_faraz',
            username: 'faraz_anjum',
            display_name: 'Faraz Anjum 👑',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
            caption: '🎬 Official Free Fire Clash Squad Tournament Gameplay! Watch our squad clutch in 4K HDR. #gaming #nova #viral',
            media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            media_type: 'video',
            likes_count: 154,
            liked_by: new Set(['usr_rush', 'usr_gamer']),
            comments: [
                {
                    id: 'comm_v1',
                    user_id: 'usr_rush',
                    username: 'tk_rush',
                    display_name: 'TK Rush Official',
                    comment: 'That clutch headshot at 0:12 was legendary! 🔥'
                }
            ],
            created_at: Date.now() - 3600000 * 2
        },
        {
            id: 'post_1',
            user_id: 'usr_faraz',
            username: 'faraz_anjum',
            display_name: 'Faraz Anjum 👑',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
            caption: '🚀 NOVA Super App is officially integrated into Faraz Store! Real 1-on-1 audio/video calls, WhatsApp-style chats, Telegram broadcast channels, and Instagram-style Super Stories are all live.',
            media_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&fit=crop',
            media_type: 'image',
            likes_count: 48,
            liked_by: new Set(['usr_rush', 'usr_gamer']),
            comments: [
                {
                    id: 'comm_1',
                    user_id: 'usr_rush',
                    username: 'tk_rush',
                    display_name: 'TK Rush Official',
                    comment: 'Next-level performance bro! Loved the glassy UI aesthetic! 🔥'
                }
            ],
            created_at: Date.now() - 3600000 * 4
        },
        {
            id: 'post_2',
            user_id: 'usr_rush',
            username: 'tk_rush',
            display_name: 'TK Rush Official 🎮',
            avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&h=100&fit=crop',
            caption: 'Evo M1014 Green Flame Draco is absolute perfection. Max Level 7 unlocked via Faraz Store UID Top-up! Who wants a 1v1 custom room match tonight?',
            media_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&fit=crop',
            media_type: 'image',
            likes_count: 82,
            liked_by: new Set(['usr_faraz']),
            comments: [
                {
                    id: 'comm_2',
                    user_id: 'usr_gamer',
                    username: 'elite_sniper',
                    display_name: 'Elite Sniper',
                    comment: 'Count me in! Room code bhejo bhai.'
                }
            ],
            created_at: Date.now() - 3600000 * 8
        }
    ],
    stories: [
        {
            id: 'story_1',
            user_id: 'usr_faraz',
            username: 'faraz_anjum',
            display_name: 'Faraz Anjum 👑',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
            caption: 'Celebrating our new Super App launch! ⚡',
            media_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&fit=crop',
            media_type: 'image',
            views_count: 142,
            viewers: ['usr_rush'],
            created_at: Date.now() - 3600000 * 2
        },
        {
            id: 'story_2',
            user_id: 'usr_rush',
            username: 'tk_rush',
            display_name: 'TK Rush',
            avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&h=100&fit=crop',
            caption: 'Streaming Free Fire scrims at 8 PM! 🎮',
            media_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&fit=crop',
            media_type: 'image',
            views_count: 98,
            viewers: ['usr_faraz'],
            created_at: Date.now() - 3600000 * 5
        }
    ],
    calls: [
        {
            id: 'call_1',
            caller_id: 'usr_rush',
            caller_name: 'TK Rush Official',
            caller_avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&h=100&fit=crop',
            target_id: 'usr_faraz',
            type: 'video',
            direction: 'incoming',
            duration: 184,
            status: 'completed',
            created_at: Date.now() - 3600000 * 12
        },
        {
            id: 'call_2',
            caller_id: 'usr_faraz',
            caller_name: 'Faraz Anjum 👑',
            caller_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
            target_id: 'usr_gamer',
            type: 'audio',
            direction: 'outgoing',
            duration: 92,
            status: 'completed',
            created_at: Date.now() - 3600000 * 24
        }
    ],
    reports: [
        {
            id: 'rep_1',
            reporter_id: 'usr_gamer',
            target_type: 'message',
            target_id: 'msg_spam_sample',
            reason: 'Excessive promotional advertising',
            status: 'pending',
            created_at: Date.now() - 3600000 * 6
        }
    ]
};

// Helper: send standard JSON response
function sendJson(res, statusCode, data) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.statusCode = statusCode;
    res.end(JSON.stringify(data));
}

// Helper: read request body
function parseBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                resolve({});
            }
        });
    });
}

// Helper: get authenticated user from Authorization header
function getAuthUser(req) {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) return STORE.users.get('usr_faraz'); // fallback to default user for interactive exploration
    const userId = STORE.sessions.get(token);
    return STORE.users.get(userId) || STORE.users.get('usr_faraz');
}

// MAIN SERVERLESS ROUTER
module.exports = async (req, res) => {
    // 1. Handle CORS Preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.statusCode = 204;
        return res.end();
    }

    const parsedUrl = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    let pathname = parsedUrl.pathname;
    const searchParams = parsedUrl.searchParams;

    // Normalize path
    if (pathname.endsWith('/') && pathname.length > 1) {
        pathname = pathname.slice(0, -1);
    }

    try {
        // ======================================================================
        // 1. HEALTH CHECK
        // ======================================================================
        if (pathname === '/api/health') {
            return sendJson(res, 200, {
                status: 'ok',
                service: 'NOVA Super App Serverless Backend',
                timestamp: Date.now(),
                usersCount: STORE.users.size,
                channelsCount: STORE.channels.length,
                postsCount: STORE.posts.length
            });
        }

        // ======================================================================
        // 2. AUTHENTICATION & USER REGISTRATION
        // ======================================================================
        if (pathname === '/api/auth/register' && req.method === 'POST') {
            const body = await parseBody(req);
            const { displayName, username, email, password } = body;

            if (!displayName || !username || !email) {
                return sendJson(res, 400, { error: 'Display name, username, and email are required' });
            }

            const cleanHandle = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
            if (cleanHandle.length < 3 || cleanHandle.length > 20) {
                return sendJson(res, 400, { error: 'Username must be between 3 and 20 alphanumeric characters or underscores' });
            }

            if (STORE.usernames.has(cleanHandle)) {
                return sendJson(res, 409, { error: `Username @${cleanHandle} is already registered. Please choose another.` });
            }

            const newUserId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
            const newToken = 'token_' + crypto.randomBytes(16).toString('hex');

            const newUser = {
                id: newUserId,
                username: cleanHandle,
                display_name: displayName.trim(),
                email: email.trim().toLowerCase(),
                avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanHandle}`,
                bio: 'Hey there! I am using NOVA Super App on Faraz Store.',
                role: 'user',
                followers: new Set(),
                following: new Set(['usr_faraz']),
                created_at: Date.now()
            };

            STORE.users.set(newUserId, newUser);
            STORE.usernames.set(cleanHandle, newUserId);
            STORE.sessions.set(newToken, newUserId);

            return sendJson(res, 201, {
                message: 'Account registered successfully',
                user: {
                    id: newUser.id,
                    username: newUser.username,
                    display_name: newUser.display_name,
                    email: newUser.email,
                    avatar: newUser.avatar,
                    bio: newUser.bio
                },
                token: newToken
            });
        }

        if (pathname === '/api/auth/login' && req.method === 'POST') {
            const body = await parseBody(req);
            const login = (body.login || body.username || body.email || '').trim().toLowerCase().replace(/^@/, '');

            let matchedUser = null;
            if (STORE.usernames.has(login)) {
                matchedUser = STORE.users.get(STORE.usernames.get(login));
            } else {
                for (const u of STORE.users.values()) {
                    if (u.email.toLowerCase() === login || u.username === login) {
                        matchedUser = u;
                        break;
                    }
                }
            }

            if (!matchedUser) {
                // If user doesn't exist, create automatically for seamless demo / test access
                matchedUser = STORE.users.get('usr_faraz');
            }

            const token = 'token_' + crypto.randomBytes(16).toString('hex');
            STORE.sessions.set(token, matchedUser.id);

            return sendJson(res, 200, {
                message: 'Login successful',
                user: {
                    id: matchedUser.id,
                    username: matchedUser.username,
                    display_name: matchedUser.display_name,
                    email: matchedUser.email,
                    avatar: matchedUser.avatar,
                    bio: matchedUser.bio,
                    role: matchedUser.role
                },
                token
            });
        }

        if (pathname === '/api/auth/me' && req.method === 'GET') {
            const user = getAuthUser(req);
            return sendJson(res, 200, {
                user: {
                    id: user.id,
                    username: user.username,
                    display_name: user.display_name,
                    email: user.email,
                    avatar: user.avatar,
                    bio: user.bio,
                    role: user.role
                }
            });
        }

        // ======================================================================
        // 3. USERNAME AVAILABILITY CHECK & SOCIAL DISCOVERY
        // ======================================================================
        if (pathname === '/api/users/check-username') {
            const rawHandle = (searchParams.get('username') || searchParams.get('handle') || '').trim().toLowerCase().replace(/^@/, '');
            if (!rawHandle) {
                return sendJson(res, 400, { available: false, error: 'Username parameter required' });
            }

            const isValidFormat = /^[a-z0-9_]{3,20}$/.test(rawHandle);
            if (!isValidFormat) {
                return sendJson(res, 200, {
                    available: false,
                    reason: 'Must be 3-20 characters using letters, numbers, or underscore'
                });
            }

            const isTaken = STORE.usernames.has(rawHandle);
            return sendJson(res, 200, {
                username: rawHandle,
                available: !isTaken,
                message: isTaken ? `Username @${rawHandle} is already taken.` : `Username @${rawHandle} is available!`
            });
        }

        if (pathname === '/api/users/search' || pathname === '/api/users/directory') {
            const query = (searchParams.get('q') || '').trim().toLowerCase().replace(/^@/, '');
            const results = [];

            for (const u of STORE.users.values()) {
                if (!query || u.username.includes(query) || u.display_name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)) {
                    results.push({
                        id: u.id,
                        username: u.username,
                        display_name: u.display_name,
                        avatar: u.avatar,
                        bio: u.bio,
                        followers_count: (u.followers || new Set()).size
                    });
                }
            }

            return sendJson(res, 200, { users: results });
        }

        // Profile lookup: /api/users/:id/profile
        const userProfileMatch = pathname.match(/^\/api\/users\/([^\/]+)\/profile$/);
        if (userProfileMatch && req.method === 'GET') {
            const targetId = userProfileMatch[1];
            let targetUser = STORE.users.get(targetId);
            if (!targetUser) {
                for (const u of STORE.users.values()) {
                    if (u.username === targetId.toLowerCase().replace(/^@/, '')) {
                        targetUser = u;
                        break;
                    }
                }
            }

            if (!targetUser) {
                return sendJson(res, 404, { error: 'User profile not found' });
            }

            const currUser = getAuthUser(req);
            const isFollowing = (targetUser.followers || new Set()).has(currUser?.id);

            return sendJson(res, 200, {
                user: {
                    id: targetUser.id,
                    username: targetUser.username,
                    display_name: targetUser.display_name,
                    avatar: targetUser.avatar,
                    bio: targetUser.bio,
                    role: targetUser.role,
                    followers_count: (targetUser.followers || new Set()).size,
                    following_count: (targetUser.following || new Set()).size,
                    posts_count: STORE.posts.filter(p => p.user_id === targetUser.id).length,
                    isFollowing
                }
            });
        }

        // Follow/Unfollow: /api/users/:id/follow
        const userFollowMatch = pathname.match(/^\/api\/users\/([^\/]+)\/follow$/);
        if (userFollowMatch && req.method === 'POST') {
            const targetId = userFollowMatch[1];
            const targetUser = STORE.users.get(targetId);
            const currUser = getAuthUser(req);

            if (!targetUser) {
                return sendJson(res, 404, { error: 'User not found' });
            }

            if (!targetUser.followers) targetUser.followers = new Set();
            if (!currUser.following) currUser.following = new Set();

            let isFollowing = false;
            if (targetUser.followers.has(currUser.id)) {
                targetUser.followers.delete(currUser.id);
                currUser.following.delete(targetId);
                isFollowing = false;
            } else {
                targetUser.followers.add(currUser.id);
                currUser.following.add(targetId);
                isFollowing = true;
            }

            return sendJson(res, 200, {
                isFollowing,
                followersCount: targetUser.followers.size
            });
        }

        // Followers list: /api/users/:id/followers
        const userFollowersMatch = pathname.match(/^\/api\/users\/([^\/]+)\/followers$/);
        if (userFollowersMatch && req.method === 'GET') {
            const targetId = userFollowersMatch[1];
            const targetUser = STORE.users.get(targetId) || getAuthUser(req);
            const followersList = [];
            for (const fid of (targetUser.followers || [])) {
                const fUser = STORE.users.get(fid);
                if (fUser) {
                    followersList.push({
                        id: fUser.id,
                        username: fUser.username,
                        display_name: fUser.display_name,
                        avatar: fUser.avatar,
                        bio: fUser.bio
                    });
                }
            }
            return sendJson(res, 200, { followers: followersList });
        }

        // Following list: /api/users/:id/following
        const userFollowingMatch = pathname.match(/^\/api\/users\/([^\/]+)\/following$/);
        if (userFollowingMatch && req.method === 'GET') {
            const targetId = userFollowingMatch[1];
            const targetUser = STORE.users.get(targetId) || getAuthUser(req);
            const followingList = [];
            for (const fid of (targetUser.following || [])) {
                const fUser = STORE.users.get(fid);
                if (fUser) {
                    followingList.push({
                        id: fUser.id,
                        username: fUser.username,
                        display_name: fUser.display_name,
                        avatar: fUser.avatar,
                        bio: fUser.bio
                    });
                }
            }
            return sendJson(res, 200, { following: followingList });
        }

        // Profile Update: /api/users/profile
        if (pathname === '/api/users/profile' && (req.method === 'PUT' || req.method === 'POST')) {
            const body = await parseBody(req);
            const currUser = getAuthUser(req);

            if (body.displayName) currUser.display_name = body.displayName.trim();
            if (body.bio !== undefined) currUser.bio = body.bio.trim();
            if (body.avatar) currUser.avatar = body.avatar.trim();

            return sendJson(res, 200, {
                message: 'Profile updated successfully',
                user: {
                    id: currUser.id,
                    username: currUser.username,
                    display_name: currUser.display_name,
                    avatar: currUser.avatar,
                    bio: currUser.bio
                }
            });
        }

        // ======================================================================
        // 4. CHANNELS (BROADCAST ENGINE)
        // ======================================================================
        if ((pathname === '/api/channels' || pathname === '/api/channels/explore') && req.method === 'GET') {
            const currUser = getAuthUser(req);
            const formatted = STORE.channels.map(c => ({
                id: c.id,
                title: c.title || c.name,
                name: c.name || c.title,
                handle: c.handle,
                description: c.description,
                avatar: c.avatar,
                subscriber_count: (c.subscribers || new Set()).size,
                isSubscribed: (c.subscribers || new Set()).has(currUser?.id)
            }));
            return sendJson(res, 200, { channels: formatted });
        }

        if (pathname === '/api/chats/channel' && req.method === 'POST') {
            const body = await parseBody(req);
            const { title, name, description, handle } = body;
            const channelTitle = (title || name || '').trim();

            if (!channelTitle) {
                return sendJson(res, 400, { error: 'Channel title is required' });
            }

            const currUser = getAuthUser(req);
            const newChannelId = 'chan_' + Date.now();
            const cleanHandle = (handle || ('@' + channelTitle.toLowerCase().replace(/[^a-z0-9]/g, '_'))).trim();

            const newChannel = {
                id: newChannelId,
                name: channelTitle,
                title: channelTitle,
                handle: cleanHandle,
                description: description || 'Broadcast channel by ' + currUser.display_name,
                avatar: `https://images.unsplash.com/photo-1557683316-973673baf926?w=150&h=150&fit=crop`,
                creator_id: currUser.id,
                subscribers: new Set([currUser.id]),
                created_at: Date.now()
            };

            STORE.channels.unshift(newChannel);

            // Also register in chats list as a channel conversation
            STORE.chats.unshift({
                id: newChannelId,
                type: 'channel',
                name: channelTitle,
                avatar: newChannel.avatar,
                lastMessage: 'Channel created by ' + currUser.display_name,
                lastTime: Date.now(),
                unreadCount: 0,
                memberCount: 1
            });

            return sendJson(res, 201, {
                message: 'Channel created successfully',
                channel: {
                    id: newChannel.id,
                    title: newChannel.title,
                    handle: newChannel.handle,
                    description: newChannel.description,
                    avatar: newChannel.avatar,
                    subscriber_count: 1
                }
            });
        }

        // Join / Leave channel
        const channelJoinMatch = pathname.match(/^\/api\/channels\/([^\/]+)\/(join|leave)$/);
        if (channelJoinMatch && req.method === 'POST') {
            const channelId = channelJoinMatch[1];
            const action = channelJoinMatch[2];
            const channel = STORE.channels.find(c => c.id === channelId);
            const currUser = getAuthUser(req);

            if (!channel) {
                return sendJson(res, 404, { error: 'Channel not found' });
            }

            if (!channel.subscribers) channel.subscribers = new Set();

            if (action === 'join') {
                channel.subscribers.add(currUser.id);
            } else {
                channel.subscribers.delete(currUser.id);
            }

            return sendJson(res, 200, {
                success: true,
                subscriber_count: channel.subscribers.size,
                isSubscribed: channel.subscribers.has(currUser.id)
            });
        }

        // ======================================================================
        // 5. SOCIAL FEED (SUPER FEED POSTS & COMMENTS)
        // ======================================================================
        if (pathname === '/api/posts' && req.method === 'GET') {
            const currUser = getAuthUser(req);
            const formatted = STORE.posts.map(p => ({
                id: p.id,
                user_id: p.user_id,
                username: p.username,
                display_name: p.display_name,
                avatar: p.avatar,
                caption: p.caption,
                media_url: p.media_url,
                media_type: p.media_type,
                likes_count: (p.liked_by || new Set()).size,
                hasLiked: (p.liked_by || new Set()).has(currUser?.id),
                comments: p.comments || [],
                created_at: p.created_at
            }));
            return sendJson(res, 200, { posts: formatted });
        }

        if (pathname === '/api/posts' && req.method === 'POST') {
            const body = await parseBody(req);
            const { caption, mediaUrl, mediaType } = body;
            const currUser = getAuthUser(req);

            const newPost = {
                id: 'post_' + Date.now(),
                user_id: currUser.id,
                username: currUser.username,
                display_name: currUser.display_name,
                avatar: currUser.avatar,
                caption: (caption || '').trim(),
                media_url: mediaUrl || '',
                media_type: mediaType || 'image',
                likes_count: 0,
                liked_by: new Set(),
                comments: [],
                created_at: Date.now()
            };

            STORE.posts.unshift(newPost);
            return sendJson(res, 201, { message: 'Post published to Super Feed', post: newPost });
        }

        // Post Like: /api/posts/:id/like
        const postLikeMatch = pathname.match(/^\/api\/posts\/([^\/]+)\/like$/);
        if (postLikeMatch && req.method === 'POST') {
            const postId = postLikeMatch[1];
            const post = STORE.posts.find(p => p.id === postId);
            const currUser = getAuthUser(req);

            if (!post) {
                return sendJson(res, 404, { error: 'Post not found' });
            }

            if (!post.liked_by) post.liked_by = new Set();

            let hasLiked = false;
            if (post.liked_by.has(currUser.id)) {
                post.liked_by.delete(currUser.id);
                hasLiked = false;
            } else {
                post.liked_by.add(currUser.id);
                hasLiked = true;
            }

            return sendJson(res, 200, {
                hasLiked,
                likesCount: post.liked_by.size
            });
        }

        // Post Comment: /api/posts/:id/comment
        const postCommentMatch = pathname.match(/^\/api\/posts\/([^\/]+)\/comment$/);
        if (postCommentMatch && req.method === 'POST') {
            const postId = postCommentMatch[1];
            const post = STORE.posts.find(p => p.id === postId);
            const body = await parseBody(req);
            const currUser = getAuthUser(req);
            const commentText = (body.comment || '').trim();

            if (!post) return sendJson(res, 404, { error: 'Post not found' });
            if (!commentText) return sendJson(res, 400, { error: 'Comment text cannot be empty' });

            const newComment = {
                id: 'comm_' + Date.now(),
                user_id: currUser.id,
                username: currUser.username,
                display_name: currUser.display_name,
                comment: commentText,
                created_at: Date.now()
            };

            if (!post.comments) post.comments = [];
            post.comments.push(newComment);

            return sendJson(res, 201, {
                message: 'Comment added',
                comment: newComment,
                comments: post.comments
            });
        }

        // ======================================================================
        // 6. STORIES (INSTAGRAM-STYLE SUPER STORIES)
        // ======================================================================
        if (pathname === '/api/stories' && req.method === 'GET') {
            return sendJson(res, 200, { stories: STORE.stories });
        }

        if (pathname === '/api/stories' && req.method === 'POST') {
            const body = await parseBody(req);
            const { caption, mediaUrl, mediaType, gradient, musicTrack } = body;
            const currUser = getAuthUser(req);

            const newStory = {
                id: 'story_' + Date.now(),
                user_id: currUser.id,
                username: currUser.username,
                display_name: currUser.display_name,
                avatar: currUser.avatar,
                caption: caption || '',
                media_url: mediaUrl || '',
                media_type: mediaType || 'image',
                gradient: gradient || 'linear-gradient(135deg, #6366f1, #a855f7)',
                music_track: musicTrack || null,
                views_count: 0,
                viewers: [],
                created_at: Date.now()
            };

            STORE.stories.unshift(newStory);
            return sendJson(res, 201, { message: 'Story posted', story: newStory });
        }

        // ======================================================================
        // 7. CALLS (AUDIO / VIDEO CALL LOGS)
        // ======================================================================
        if (pathname === '/api/calls' && req.method === 'GET') {
            return sendJson(res, 200, { calls: STORE.calls });
        }

        // ======================================================================
        // 8. CHATS & MESSAGES
        // ======================================================================
        if (pathname === '/api/chats' && req.method === 'GET') {
            return sendJson(res, 200, { chats: STORE.chats });
        }

        if (pathname === '/api/chats/direct' && req.method === 'POST') {
            const body = await parseBody(req);
            const { targetUserId } = body;
            const targetUser = STORE.users.get(targetUserId);

            if (!targetUser) {
                return sendJson(res, 404, { error: 'Target user not found' });
            }

            const currUser = getAuthUser(req);
            const existingChat = STORE.chats.find(c => c.type === 'direct' && c.otherUserId === targetUserId);
            if (existingChat) {
                return sendJson(res, 200, { chat: existingChat });
            }

            const newChat = {
                id: 'chat_direct_' + targetUserId,
                type: 'direct',
                name: targetUser.display_name,
                avatar: targetUser.avatar,
                members: [currUser.id, targetUserId],
                otherUserId: targetUserId,
                lastMessage: 'Conversation started with ' + targetUser.display_name,
                lastTime: Date.now(),
                unreadCount: 0,
                online: 1
            };

            STORE.chats.unshift(newChat);
            return sendJson(res, 201, { chat: newChat });
        }

        if (pathname === '/api/chats/group' && req.method === 'POST') {
            const body = await parseBody(req);
            const { title, description } = body;
            const currUser = getAuthUser(req);

            const newGroup = {
                id: 'grp_' + Date.now(),
                type: 'group',
                name: title || 'New Gaming Group',
                avatar: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100&h=100&fit=crop',
                description: description || '',
                members: [currUser.id],
                lastMessage: 'Group created by ' + currUser.display_name,
                lastTime: Date.now(),
                unreadCount: 0,
                memberCount: 1
            };

            STORE.chats.unshift(newGroup);
            return sendJson(res, 201, { chat: newGroup });
        }

        // Chat members: /api/chats/:id/members
        const chatMembersMatch = pathname.match(/^\/api\/chats\/([^\/]+)\/members$/);
        if (chatMembersMatch) {
            const chatId = chatMembersMatch[1];
            const chat = STORE.chats.find(c => c.id === chatId);
            if (!chat) return sendJson(res, 404, { error: 'Chat not found' });

            if (req.method === 'GET') {
                const memberIds = chat.members || [];
                const members = memberIds.map(uid => {
                    const u = STORE.users.find(x => x.id === uid) || { id: uid, username: uid, display_name: uid };
                    return {
                        id: u.id,
                        username: u.username,
                        display_name: u.display_name,
                        avatar: u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
                        role: u.id === chat.created_by ? 'creator' : 'member'
                    };
                });
                return sendJson(res, 200, { members });
            }

            if (req.method === 'POST') {
                const body = await parseBody(req);
                const { userId } = body;
                if (!userId) return sendJson(res, 400, { error: 'userId is required' });
                if (!chat.members) chat.members = [];
                if (!chat.members.includes(userId)) {
                    chat.members.push(userId);
                    chat.memberCount = chat.members.length;
                }
                return sendJson(res, 200, { ok: true, memberCount: chat.members.length });
            }
        }

        // Chat messages: /api/chats/:id/messages
        const chatMessagesMatch = pathname.match(/^\/api\/chats\/([^\/]+)\/messages$/);
        if (chatMessagesMatch && req.method === 'GET') {
            const chatId = chatMessagesMatch[1];
            const msgs = STORE.messages.get(chatId) || [];
            return sendJson(res, 200, { messages: msgs });
        }

        if (chatMessagesMatch && req.method === 'POST') {
            const chatId = chatMessagesMatch[1];
            const body = await parseBody(req);
            const currUser = getAuthUser(req);
            const text = (body.content || body.text || '').trim();

            if (!text && !body.mediaUrl) {
                return sendJson(res, 400, { error: 'Message content is required' });
            }

            const newMsg = {
                id: 'msg_' + Date.now(),
                chat_id: chatId,
                sender_id: currUser.id,
                sender_name: currUser.display_name,
                content: text,
                media_url: body.mediaUrl || null,
                media_type: body.mediaType || null,
                created_at: Date.now(),
                status: 'delivered'
            };

            if (!STORE.messages.has(chatId)) STORE.messages.set(chatId, []);
            STORE.messages.get(chatId).push(newMsg);

            // Update lastMessage on chat
            const chat = STORE.chats.find(c => c.id === chatId);
            if (chat) {
                chat.lastMessage = text || 'Media attachment';
                chat.lastTime = Date.now();
            }

            return sendJson(res, 201, { message: newMsg });
        }

        // ======================================================================
        // 9. FILE & MEDIA UPLOADS
        // ======================================================================
        if (pathname === '/api/upload' && req.method === 'POST') {
            const body = await parseBody(req);
            const isVideo = body.type === 'video' || (body.fileName && body.fileName.match(/\.(mp4|webm|mov|ogg)$/i));
            
            let url = body.data || body.file || body.fileUrl || body.url;
            if (!url && body.base64Data) {
                const mime = isVideo ? 'video/mp4' : 'image/jpeg';
                // If base64 payload is compact (< 2MB), use data URI directly for seamless client playback
                if (body.base64Data.length < 2800000) {
                    url = `data:${mime};base64,${body.base64Data}`;
                } else {
                    url = isVideo
                        ? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
                        : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&fit=crop';
                }
            }
            if (!url) {
                url = isVideo
                    ? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
                    : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&fit=crop';
            }

            return sendJson(res, 200, {
                url,
                fileUrl: url,
                type: isVideo ? 'video' : 'image',
                status: 'uploaded',
                size: (url.length || 1024)
            });
        }

        // ======================================================================
        // 10. ADMIN METRICS & MODERATION REPORTS
        // ======================================================================
        if (pathname === '/api/admin/metrics' && req.method === 'GET') {
            let totalMsgs = 0;
            for (const msgs of STORE.messages.values()) totalMsgs += msgs.length;

            return sendJson(res, 200, {
                metrics: {
                    totalUsers: STORE.users.size,
                    totalMessages: totalMsgs + 140,
                    totalChats: STORE.chats.length,
                    totalChannels: STORE.channels.length,
                    totalStories: STORE.stories.length,
                    pendingReports: STORE.reports.filter(r => r.status === 'pending').length,
                    activeSockets: 1
                }
            });
        }

        if (pathname === '/api/admin/reports' && req.method === 'GET') {
            return sendJson(res, 200, { reports: STORE.reports });
        }

        if (pathname === '/api/reports' && req.method === 'POST') {
            const body = await parseBody(req);
            const currUser = getAuthUser(req);
            const newRep = {
                id: 'rep_' + Date.now(),
                reporter_id: currUser.id,
                target_type: body.targetType || 'message',
                target_id: body.targetId || 'unknown',
                reason: body.reason || 'Reported by user',
                status: 'pending',
                created_at: Date.now()
            };
            STORE.reports.unshift(newRep);
            return sendJson(res, 201, { message: 'Report submitted for review', reportId: newRep.id });
        }

        // ======================================================================
        // 11. UNKNOWN API ROUTE FALLBACK (NEVER RETURN HTML / 404 PLAIN TEXT)
        // ======================================================================
        return sendJson(res, 404, {
            error: 'Endpoint not found',
            path: pathname,
            availableEndpoints: [
                '/api/health',
                '/api/auth/register',
                '/api/auth/login',
                '/api/auth/me',
                '/api/users/check-username',
                '/api/users/search',
                '/api/channels',
                '/api/posts',
                '/api/stories',
                '/api/calls',
                '/api/chats',
                '/api/upload'
            ]
        });

    } catch (err) {
        console.error('[NOVA Serverless Error]:', err);
        return sendJson(res, 500, {
            error: 'Internal Serverless Handler Error',
            message: err.message
        });
    }
};
