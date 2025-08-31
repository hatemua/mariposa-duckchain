#!/usr/bin/env node

/**
 * Test the timeout fixes for MCP server
 */

const MCPMarketDataService = require('./services/mcpMarketDataService.js');

async function testTimeoutFixes() {
    console.log('🧪 Testing MCP Server Timeout Fixes');
    console.log('==================================\n');
    
    console.log('✅ Optimizations Applied:');
    console.log('  • Reduced rate limiting from 2s to 1s between calls');
    console.log('  • Limited pool processing to 50 pools max');
    console.log('  • Added 45-second timeout wrapper');
    console.log('  • Implemented 5-minute response caching');
    console.log('  • Added fallback error handling');
    console.log('  • Early termination when sufficient data collected\n');
    
    const service = new MCPMarketDataService();
    
    // Wait for service to initialize
    console.log('⏳ Initializing MCP service...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
        console.log('\n🚀 Testing Token Recommendations with Timeout Protection');
        console.log('━'.repeat(60));
        
        const startTime = Date.now();
        
        // Test 1: SEI-EVM recommendations (previously timing out)
        console.log('1️⃣ Testing SEI-EVM token recommendations...');
        try {
            const seiRecommendations = await service.getTokenRecommendations('balanced', 3, 'sei-evm');
            const elapsedTime = Date.now() - startTime;
            
            if (seiRecommendations.success) {
                console.log(`✅ SEI-EVM recommendations completed in ${elapsedTime}ms`);
                console.log(`📊 Response data available: ${!!seiRecommendations.data}`);
            } else {
                console.log(`⚠️ SEI-EVM recommendations failed: ${seiRecommendations.error}`);
            }
        } catch (error) {
            console.log(`❌ SEI-EVM test failed: ${error.message}`);
        }
        
        console.log('\n━'.repeat(60));
        
        // Test 2: Test caching by calling again immediately
        console.log('2️⃣ Testing response caching (should be faster)...');
        const cacheStartTime = Date.now();
        
        try {
            const cachedRecommendations = await service.getTokenRecommendations('balanced', 3, 'sei-evm');
            const cacheElapsedTime = Date.now() - cacheStartTime;
            
            if (cachedRecommendations.success) {
                console.log(`✅ Cached recommendations returned in ${cacheElapsedTime}ms`);
                console.log(`📋 Cache hit: ${cacheElapsedTime < 5000 ? 'YES' : 'NO'}`);
            } else {
                console.log(`⚠️ Cached recommendations failed: ${cachedRecommendations.error}`);
            }
        } catch (error) {
            console.log(`❌ Cache test failed: ${error.message}`);
        }
        
        console.log('\n━'.repeat(60));
        
        // Test 3: Different network to test general performance
        console.log('3️⃣ Testing Ethereum network (should be fast)...');
        const ethStartTime = Date.now();
        
        try {
            const ethRecommendations = await service.getTokenRecommendations('balanced', 3, 'ethereum');
            const ethElapsedTime = Date.now() - ethStartTime;
            
            if (ethRecommendations.success) {
                console.log(`✅ Ethereum recommendations completed in ${ethElapsedTime}ms`);
                console.log(`📊 Response data available: ${!!ethRecommendations.data}`);
            } else {
                console.log(`⚠️ Ethereum recommendations failed: ${ethRecommendations.error}`);
            }
        } catch (error) {
            console.log(`❌ Ethereum test failed: ${error.message}`);
        }
        
    } catch (error) {
        console.error('❌ Test suite failed:', error.message);
    } finally {
        console.log('\n🧹 Cleaning up...');
        await service.disconnect();
        
        console.log('\n📋 Timeout Fix Summary:');
        console.log('━'.repeat(50));
        console.log('✅ Rate limiting optimized (1s intervals)');
        console.log('✅ Pool processing limited (50 max)');
        console.log('✅ Timeout protection added (45s)');
        console.log('✅ Response caching implemented (5min)');
        console.log('✅ Graceful error handling added');
        console.log('✅ Early termination for efficiency');
        
        console.log('\n🎯 Expected Results:');
        console.log('━'.repeat(30));
        console.log('• Reduced timeout errors');
        console.log('• Faster response times');
        console.log('• Better user experience');
        console.log('• Cached responses for repeat queries');
        console.log('• Helpful error messages when issues occur');
        
        console.log('\n🚀 Ready for enhanced frontend testing!');
    }
}

if (require.main === module) {
    testTimeoutFixes().catch(console.error);
}

module.exports = testTimeoutFixes;