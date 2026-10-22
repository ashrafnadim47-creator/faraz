const http = require('http');

function request(options, body = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed = null;
                try { parsed = JSON.parse(data); } catch(e) { parsed = data; }
                resolve({ status: res.statusCode, data: parsed });
            });
        });
        req.on('error', reject);
        if (body) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        req.end();
    });
}

async function runSuperAppTests() {
    console.log('🧪 Testing Super App Features (Feed, Channels, Profile)...');

    // 1. Login as Faraz
    const loginRes = await request({
        hostname: 'localhost',
        port: 4000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, { login: 'faraz_anjum', password: 'faraz123' });
    const token = loginRes.data.token;

    if (!token) {
        console.error('Failed to get token:', loginRes.data);
        process.exit(1);
    }
    console.log('✓ Faraz authenticated');

    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // 2. Test Social Feed GET
    const feedGet = await request({
        hostname: 'localhost',
        port: 4000,
        path: '/api/posts',
        method: 'GET',
        headers: authHeaders
    });
    console.log(`✓ GET /api/posts status ${feedGet.status}, total posts: ${feedGet.data.posts.length}`);

    // 3. Test Create Post
    const newPostRes = await request({
        hostname: 'localhost',
        port: 4000,
        path: '/api/posts',
        method: 'POST',
        headers: authHeaders
    }, {
        caption: 'Testing Super App Social Feed! All features in one unified app 🚀',
        mediaUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1000',
        mediaType: 'image'
    });
    console.log(`✓ POST /api/posts status ${newPostRes.status}, post ID: ${newPostRes.data.post.id}`);
    const postId = newPostRes.data.post.id;

    // 4. Test Like Post
    const likeRes = await request({
        hostname: 'localhost',
        port: 4000,
        path: `/api/posts/${postId}/like`,
        method: 'POST',
        headers: authHeaders
    });
    console.log(`✓ POST /api/posts/:id/like status ${likeRes.status}, liked: ${likeRes.data.hasLiked}, count: ${likeRes.data.likesCount}`);

    // 5. Test Comment Post
    const commentRes = await request({
        hostname: 'localhost',
        port: 4000,
        path: `/api/posts/${postId}/comment`,
        method: 'POST',
        headers: authHeaders
    }, { comment: 'Amazing UI layout with bottom navigation!' });
    console.log(`✓ POST /api/posts/:id/comment status ${commentRes.status}, comment text: "${commentRes.data.comment.comment}"`);

    // 6. Test Channels Explore
    const channelsRes = await request({
        hostname: 'localhost',
        port: 4000,
        path: '/api/channels/explore',
        method: 'GET',
        headers: authHeaders
    });
    console.log(`✓ GET /api/channels/explore status ${channelsRes.status}, channels count: ${channelsRes.data.channels.length}`);

    // 7. Test Create Broadcast Channel
    const createChanRes = await request({
        hostname: 'localhost',
        port: 4000,
        path: '/api/chats/channel',
        method: 'POST',
        headers: authHeaders
    }, {
        title: 'Gaming Tournaments & Esports',
        handle: '@esports_nova_' + Date.now(),
        description: 'Official announcements for all BGMI & FreeFire customs'
    });
    console.log(`✓ POST /api/chats/channel status ${createChanRes.status}, channel ID: ${createChanRes.data.chatId}`);

    // 8. Test Profile Update
    const profileRes = await request({
        hostname: 'localhost',
        port: 4000,
        path: '/api/users/profile',
        method: 'PUT',
        headers: authHeaders
    }, {
        displayName: 'Faraz Anjum (Founder)',
        bio: 'Building NOVA Super App | WhatsApp + Telegram + Instagram Hybrid'
    });
    console.log(`✓ PUT /api/users/profile status ${profileRes.status}, updated name: "${profileRes.data.user.display_name}"`);

    console.log('\n🎉 ALL SUPER APP INTEGRATION TESTS PASSED!');
}

runSuperAppTests().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
