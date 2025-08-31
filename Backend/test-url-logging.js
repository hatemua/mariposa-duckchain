const fetch = require('node-fetch');

async function testUrlLogging() {
    console.log('🧪 Testing URL logging in MCP server...');
    
    try {
        // Test token recommendations which should trigger multiple URL calls
        console.log('🤖 Calling token recommendations API...');
        const response = await fetch('http://localhost:3001/api/recommend-tokens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                network: 'sei-evm',
                criteria: 'balanced',
                count: 3
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Token recommendations completed successfully');
            console.log(`📊 Found ${data.tokens?.length || 0} token recommendations`);
        } else {
            console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testUrlLogging();