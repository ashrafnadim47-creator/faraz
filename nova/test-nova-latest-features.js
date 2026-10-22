const { DatabaseSync } = require('node:sqlite');
const assert = require('assert');

async function testLatestFeatures() {
    console.log('🧪 Testing Latest Features: Status Studio, Admin Reports, Follows & Profiles...');

    // 1. Register test user C & D
    const ts = Date.now();
    const userCRes = await fetch('http://localhost:4000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: `creator_${ts}`,
            email: `creator_${ts}@test.io`,
            displayName: 'Pro Creator',
            password: 'Password123!',
            bio: 'Designing Next-Gen Apps'
        })
    });
    assert.strictEqual(userCRes.status, 201);
    const userC = await userCRes.json();

    const userDRes = await fetch('http://localhost:4000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: `fan_${ts}`,
            email: `fan_${ts}@test.io`,
            displayName: 'Fan User',
            password: 'Password123!',
            bio: 'Learning from the best'
        })
    });
    assert.strictEqual(userDRes.status, 201);
    const userD = await userDRes.json();
    console.log('✓ Creator and Fan registered');

    // 2. Status Creator Studio: Gradient, Music Track, Sticker Story
    const storyRes = await fetch('http://localhost:4000/api/stories', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userC.token}`
        },
        body: JSON.stringify({
            caption: 'Late night coding vibes 🎧',
            bgGradient: 'linear-gradient(135deg, #10b981, #00f2fe)',
            musicTrack: 'Midnight City • M83',
            stickerJson: JSON.stringify({ emoji: '🔥' })
        })
    });
    assert.strictEqual(storyRes.status, 201);
    const storyData = await storyRes.json();
    console.log('✓ Status Story posted with gradient, music sticker & emoji:', storyData.storyId);

    // Verify in GET /api/stories
    const getStories = await fetch('http://localhost:4000/api/stories', {
        headers: { 'Authorization': `Bearer ${userD.token}` }
    });
    const { stories } = await getStories.json();
    const myPosted = stories.find(s => s.id === storyData.storyId);
    assert.ok(myPosted, 'Story should exist in feed');
    assert.strictEqual(myPosted.bg_gradient, 'linear-gradient(135deg, #10b981, #00f2fe)');
    assert.strictEqual(myPosted.music_track, 'Midnight City • M83');
    console.log('✓ Status Story retrieved with intact gradient and music track metadata');

    // 3. User Profile & Follows
    const followRes = await fetch(`http://localhost:4000/api/users/${userC.user.id}/follow`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${userD.token}` }
    });
    assert.strictEqual(followRes.status, 200);
    const followData = await followRes.json();
    assert.strictEqual(followData.isFollowing, true);
    assert.strictEqual(followData.followersCount, 1);
    console.log('✓ Fan successfully followed Creator (follower count = 1)');

    const profRes = await fetch(`http://localhost:4000/api/users/${userC.user.id}/profile`, {
        headers: { 'Authorization': `Bearer ${userD.token}` }
    });
    assert.strictEqual(profRes.status, 200);
    const profData = await profRes.json();
    assert.strictEqual(profData.isFollowing, true);
    const followers = profData.stats ? profData.stats.followersCount : profData.followersCount;
    assert.strictEqual(followers, 1);
    console.log('✓ Creator profile verified with accurate follower stats and isFollowing: true');

    // 4. Admin Reports Queue
    // Submit abuse report
    const reportSubmit = await fetch('http://localhost:4000/api/reports', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userD.token}`
        },
        body: JSON.stringify({
            targetId: userC.user.id,
            targetType: 'user',
            reason: 'Impersonating another account'
        })
    });
    assert.strictEqual(reportSubmit.status, 201);
    console.log('✓ Abuse report submitted');

    // Admin lists reports
    const adminReports = await fetch('http://localhost:4000/api/admin/reports', {
        headers: { 'Authorization': `Bearer ${userC.token}` }
    });
    assert.strictEqual(adminReports.status, 200);
    const repData = await adminReports.json();
    const reportsList = Array.isArray(repData) ? repData : (repData.reports || []);
    assert.ok(reportsList.length > 0, 'Admin reports queue should contain pending report');
    const targetReport = reportsList.find(r => r.reporter_username === userD.user.username);
    assert.ok(targetReport, 'Target report found in queue');
    console.log('✓ Admin reports list verified with active report ID:', targetReport.id);

    // Resolve report
    const resolveRes = await fetch(`http://localhost:4000/api/admin/reports/${targetReport.id}/action`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userC.token}`
        },
        body: JSON.stringify({ action: 'resolved' })
    });
    assert.strictEqual(resolveRes.status, 200);
    console.log('✓ Admin report resolved successfully');

    // 5. Channel Creation with Custom Permissions
    const chanRes = await fetch('http://localhost:4000/api/chats/channel', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userC.token}`
        },
        body: JSON.stringify({
            title: 'Nova Alpha Broadcasts',
            handle: `@nova_alpha_${ts}`,
            description: 'Official development updates',
            avatar: 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=150&h=150&fit=crop',
            postingPermission: 'admin_only',
            isPublic: 1
        })
    });
    assert.strictEqual(chanRes.status, 201);
    const chanData = await chanRes.json();
    console.log('✓ Channel created with admin_only broadcast permission, ID:', chanData.chatId);

    console.log('\n🎉 ALL LATEST FEATURE TESTS PASSED 100%!');
}

testLatestFeatures().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
