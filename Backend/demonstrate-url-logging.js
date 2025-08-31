#!/usr/bin/env node

/**
 * Demonstration of GeckoTerminal URL logging
 * Shows exactly what URLs are called during token recommendations
 */

const MCPMarketDataService = require('./services/mcpMarketDataService.js');

async function demonstrateURLLogging() {
    console.log('🎯 GeckoTerminal URL Logging Demonstration');
    console.log('===========================================\n');
    
    console.log('🌐 URL Logging Implementation Summary:');
    console.log('━'.repeat(60));
    console.log('✅ Backend URL logging: Added to mcpMarketDataService.js');
    console.log('✅ MCP Server URL logging: Added to market-mcp/src/index.ts');
    console.log('✅ Rate limiting: Improved with longer delays');
    console.log('✅ Error handling: Added fallbacks for rate limits\n');
    
    console.log('🔍 What URLs You\'ll See During Token Recommendations:');
    console.log('━'.repeat(60));
    console.log('1. 🌐 [GECKO URL] [FETCH_NETWORKS] - Get all supported networks');
    console.log('2. 🌐 [GECKO URL] [ALL_POOLS[sailor][P1]] - Fetch pools from Sailor DEX');
    console.log('3. 🌐 [GECKO URL] [ALL_POOLS[dragonswap][P1]] - Fetch pools from DragonSwap');
    console.log('4. 🌐 [GECKO URL] [FETCH_POOL_DATA[0x123...]] - Get detailed pool data');
    console.log('5. 🌐 [GECKO URL] [SEARCH_POOLS[query]] - Search for specific tokens');
    console.log('6. 🌐 [GECKO URL] [TOKEN_PRICES[count]] - Get token prices\n');
    
    const service = new MCPMarketDataService();
    
    // Wait for service to initialize
    console.log('⏳ Initializing MCP service...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
        console.log('\n🚀 Example: Token Recommendation Pipeline URLs');
        console.log('━'.repeat(60));
        console.log('When you call: POST /api/agents/route with token recommendation message');
        console.log('You will see URLs like this in your backend console:\n');
        
        // Show what the backend logs look like
        console.log('🤖 [TOKEN RECOMMENDATIONS] Getting token recommendations for network: sei-evm (criteria: balanced, count: 3)');
        console.log('🌐 [TOKEN RECOMMENDATIONS] This will trigger multiple GeckoTerminal API calls...');
        console.log('🌐 [MCP URL] [RECOMMEND_TOKENS] http://localhost:3001/api/recommend-tokens');
        
        // Simulate the MCP server URL logs (these happen inside the MCP server process)
        console.log('\n📡 [MCP SERVER] URLs that would be logged inside MCP server:');
        console.log('🌐 [GECKO URL] [FETCH_NETWORKS] https://api.geckoterminal.com/api/v2/networks');
        console.log('🌐 [GECKO URL] [ALL_POOLS[sailor][P1]] https://api.geckoterminal.com/api/v2/networks/sei-evm/dexes/sailor/pools?page=1&include=base_token,quote_token,dex');
        console.log('🌐 [GECKO URL] [ALL_POOLS[dragonswap][P1]] https://api.geckoterminal.com/api/v2/networks/sei-evm/dexes/dragonswap/pools?page=1&include=base_token,quote_token,dex');
        console.log('🌐 [GECKO URL] [FETCH_POOL_DATA[0x1234567...]] https://api.geckoterminal.com/api/v2/networks/sei-evm/pools/0x1234567.../include=base_token,quote_token,dex');
        
        console.log('\n🎯 Direct Backend API Calls (visible in backend console):');
        console.log('━'.repeat(60));
        
        // Test a simple direct call that should work
        try {
            console.log('🔍 Testing direct backend URL logging...');
            const directResult = await service.callGeckoTerminalDirectly('search_pools', {
                query: 'BTC',
                network: 'base'  // Use Base network which might have less rate limiting
            });
            console.log('✅ Direct API call completed (check above for URL log)\n');
        } catch (error) {
            console.log(`⚠️ Direct API call rate limited: ${error.message}\n`);
        }
        
    } catch (error) {
        console.error('❌ Demonstration error:', error.message);
    } finally {
        console.log('🧹 Cleaning up...');
        await service.disconnect();
        
        console.log('\n📋 Implementation Complete!');
        console.log('━'.repeat(50));
        console.log('✅ URL logging is now active in your backend');
        console.log('✅ Run token recommendations to see URLs in console');
        console.log('✅ Rate limiting improved to reduce 429 errors');
        console.log('✅ Fallback mechanisms added for robustness');
        
        console.log('\n🚀 Usage:');
        console.log('━'.repeat(30));
        console.log('1. Start your backend server');
        console.log('2. Call POST /api/agents/route with token recommendation message');
        console.log('3. Watch your backend console for 🌐 [GECKO URL] entries');
        console.log('4. MCP server URLs are logged inside the MCP server process');
    }
}

if (require.main === module) {
    demonstrateURLLogging().catch(console.error);
}

module.exports = demonstrateURLLogging;