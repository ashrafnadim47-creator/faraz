const assert = require('assert');

async function testDirAndFollowers() {
    console.log('🧪 Testing Directory, Followers, Following & Profile Updates...');
    
    // Login as Faraz
    const loginRes = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: 'faraz_anjum', password: 'faraz123' })
    });
    assert.strictEqual(loginRes.status, 200);
    const faraz = await loginRes.json();
    console.log('✓ Faraz logged in successfully');

    // 1. User Directory
    const dirRes = await fetch('http://localhost:4000/api/users/directory', {
        headers: { 'Authorization': `Bearer ${faraz.token}` }
    });
    assert.strictEqual(dirRes.status, 200);
    const { users } = await dirRes.json();
    assert.ok(Array.isArray(users), 'users should be array');
    assert.ok(users.length > 0, 'Directory should have users');
    console.log(`✓ User Directory returned ${users.length} registered contacts`);

    // Search directory
    const searchRes = await fetch('http://localhost:4000/api/users/directory?q=rush', {
        headers: { 'Authorization': `Bearer ${faraz.token}` }
    });
    assert.strictEqual(searchRes.status, 200);
    const searchData = await searchRes.json();
    assert.ok(searchData.users.some(u => u.username === 'tk_rush'), 'Found tk_rush in directory search');
    console.log('✓ Directory search filtered correctly');

    // 2. Profile update
    const updateRes = await fetch('http://localhost:4000/api/users/profile', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${faraz.token}`
        },
        body: JSON.stringify({
            displayName: 'Faraz Anjum Official',
            bio: 'Creator & Founder | Building NOVA Super App 🚀'
        })
    });
    assert.strictEqual(updateRes.status, 200);
    const updated = await updateRes.json();
    assert.strictEqual(updated.user.display_name, 'Faraz Anjum Official');
    console.log('✓ Faraz profile updated successfully with new bio & name');

    // 3. Followers / Following
    const followersRes = await fetch(`http://localhost:4000/api/users/${faraz.user.id}/followers`, {
        headers: { 'Authorization': `Bearer ${faraz.token}` }
    });
    assert.strictEqual(followersRes.status, 200);
    const followersData = await followersRes.json();
    assert.ok(Array.isArray(followersData.followers), 'followers must be an array');
    console.log(`✓ Followers endpoint responded with ${followersData.followers.length} followers`);

    const followingRes = await fetch(`http://localhost:4000/api/users/${faraz.user.id}/following`, {
        headers: { 'Authorization': `Bearer ${faraz.token}` }
    });
    assert.strictEqual(followingRes.status, 200);
    const followingData = await followingRes.json();
    assert.ok(Array.isArray(followingData.following), 'following must be an array');
    console.log(`✓ Following endpoint responded with ${followingData.following.length} following`);

    console.log('\n🎉 ALL DIRECTORY & PROFILE VERIFICATION TESTS PASSED 100%!');
}

testDirAndFollowers().catch(e => {
    console.error('Test error:', e);
    process.exit(1);
});
