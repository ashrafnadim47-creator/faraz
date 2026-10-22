const assert = require('assert');

async function testAdminAndChannels() {
    console.log('🧪 Testing Admin Dashboard, Leave Channel, and New Modals...');
    
    // 1. Check /admin static route
    const adminHtmlRes = await fetch('http://localhost:4000/admin');
    assert.strictEqual(adminHtmlRes.status, 200);
    const htmlText = await adminHtmlRes.text();
    assert.ok(htmlText.includes('NOVA Central Admin'), 'Admin HTML served');
    console.log('✓ /admin serves admin.html successfully');

    // 2. Faraz login
    const loginRes = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: 'faraz_anjum', password: 'faraz123' })
    });
    const faraz = await loginRes.json();

    // 3. Admin Metrics
    const metricsRes = await fetch('http://localhost:4000/api/admin/metrics', {
        headers: { 'Authorization': 'Bearer ' + faraz.token }
    });
    assert.strictEqual(metricsRes.status, 200);
    const metrics = await metricsRes.json();
    assert.ok(metrics.totalUsers > 0, 'Total users counted');
    console.log('✓ Admin metrics returned:', metrics);

    // 4. Admin Users
    const usersRes = await fetch('http://localhost:4000/api/admin/users', {
        headers: { 'Authorization': 'Bearer ' + faraz.token }
    });
    assert.strictEqual(usersRes.status, 200);
    const { users } = await usersRes.json();
    assert.ok(users.length > 0, 'Users list returned');
    console.log('✓ Admin users list returned: ' + users.length + ' accounts');

    // 5. Leave channel
    const leaveRes = await fetch('http://localhost:4000/api/channels/chat_channel_nova/leave', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + faraz.token }
    });
    assert.strictEqual(leaveRes.status, 200);
    console.log('✓ Leave channel endpoint verified');

    console.log('\n🎉 ALL NEW VERIFICATIONS PASSED 100%!');
}

testAdminAndChannels().catch(e => {
    console.error('Test failed:', e);
    process.exit(1);
});
