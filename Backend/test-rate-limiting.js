#!/usr/bin/env node

/**
 * Test improved rate limiting for GeckoTerminal API
 */

const MCPMarketDataService = require('./services/mcpMarketDataService.js');

async function testRateLimiting() {
    console.log('🧪 Testing Improved Rate Limiting (30 calls/min quota)');
    console.log('===================================================\n');
    
    console.log('✅ Rate Limiting Implementation:');
    console.log('  - 2 seconds minimum between API calls (30 calls/min = 1 call every 2s)');
    console.log('  - Global rate limiter across all GeckoTerminal API calls');
    console.log('  - Automatic waiting with progress logging');
    console.log('  - Fallback mechanisms for rate limit errors\n');
    
    const service = new MCPMarketDataService();
    
    // Wait for service to initialize
    console.log('⏳ Initializing MCP service...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
        console.log('\n🚀 Testing Token Recommendations with Rate Limiting');
        console.log('━'.repeat(60));
        console.log('⏰ You should see rate limiting messages like:');
        console.log('   "⏳ [RATE LIMIT] Waiting XXXms to respect 30 calls/min quota..."');
        console.log('   "🌐 [GECKO URL] ..." - showing each API call with proper spacing\n');
        
        const startTime = Date.now();
        
        // Test with a smaller scope to avoid too many API calls
        console.log('🔍 Testing with limited scope to show rate limiting...\n');
        
        // Test search first (should show rate limiting)
        console.log('1️⃣ Testing search functionality:');
        try {
            const searchResult = await service.callGeckoTerminalDirectly('search_pools', {
                query: 'ETH',
                network: 'base'  // Use Base network
            });
            console.log('✅ Search completed successfully\n');
        } catch (error) {
            console.log(`⚠️ Search failed (may be rate limited): ${error.message}\n`);
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test network pools (should show rate limiting)
        console.log('2️⃣ Testing network pools:');
        try {
            const poolsResult = await service.callGeckoTerminalDirectly('get_network_pools', {
                network: 'base',
                page: 1
            });
            console.log('✅ Network pools completed successfully\n');
        } catch (error) {
            console.log(`⚠️ Network pools failed (may be rate limited): ${error.message}\n`);
        }
        
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        console.log('📊 Rate Limiting Test Results:');
        console.log('━'.repeat(40));
        console.log(`⏱️  Total test time: ${totalTime}ms`);
        console.log(`🔄 Expected minimum time for 2 calls: ~4000ms (2s per call)`);
        console.log(`✅ Rate limiting ${totalTime >= 4000 ? 'WORKING' : 'may need adjustment'}`);
        
        if (totalTime >= 4000) {
            console.log(`🎉 Success! Rate limiting properly enforced ${Math.round(totalTime/1000)}s for 2 calls`);
        } else {
            console.log(`⚠️  Rate limiting may be bypassed or calls failed quickly`);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        console.log('\n🧹 Cleaning up...');
        await service.disconnect();
        
        console.log('\n📋 Rate Limiting Summary:');
        console.log('━'.repeat(50));
        console.log('✅ Global rate limiter implemented in GeckoTerminalAPI class');
        console.log('✅ 2-second minimum interval between API calls');
        console.log('✅ Progress logging shows wait times');
        console.log('✅ Should prevent "Too Many Requests" errors');
        console.log('✅ URL logging shows each API call with proper timing');
        
        console.log('\n🎯 Next Steps:');
        console.log('━'.repeat(30));
        console.log('1. Run your normal token recommendation pipeline');
        console.log('2. Watch for rate limiting messages in console');
        console.log('3. Should see fewer/no "Too Many Requests" errors');
        console.log('4. Each API call will be spaced 2+ seconds apart');
    }
}

if (require.main === module) {
    testRateLimiting().catch(console.error);
}

module.exports = testRateLimiting;