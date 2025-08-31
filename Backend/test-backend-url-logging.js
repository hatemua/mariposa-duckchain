#!/usr/bin/env node

/**
 * Test script to demonstrate GeckoTerminal URL logging in the backend console
 */

const MCPMarketDataService = require('./services/mcpMarketDataService.js');

async function testBackendURLLogging() {
    console.log('🧪 Testing Backend URL Logging for GeckoTerminal API calls');
    console.log('===============================================\n');
    
    const service = new MCPMarketDataService();
    
    // Wait for service to initialize
    console.log('⏳ Waiting for MCP service to initialize...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
        console.log('\n🚀 Starting token recommendation pipeline...\n');
        
        // Test 1: Get token recommendations (this should trigger the most URLs)
        console.log('1️⃣ Testing getTokenRecommendations() - should show multiple GeckoTerminal URLs:');
        console.log('━'.repeat(80));
        
        const recommendations = await service.getTokenRecommendations('balanced', 3, 'sei-evm');
        
        if (recommendations.success) {
            console.log('✅ Token recommendations completed successfully\n');
        } else {
            console.log('❌ Token recommendations failed:', recommendations.error, '\n');
        }
        
        // Test 2: Direct GeckoTerminal API calls (these should show URLs in backend console)
        console.log('2️⃣ Testing direct GeckoTerminal API calls:');
        console.log('━'.repeat(80));
        
        // Call the method that uses direct GeckoTerminal API calls
        try {
            console.log('🔍 Calling callGeckoTerminalDirectly for search_pools...');
            const directSearchResult = await service.callGeckoTerminalDirectly('search_pools', {
                query: 'USDC',
                network: 'ethereum'
            });
            console.log('✅ Direct search completed\n');
        } catch (error) {
            console.log('❌ Direct search failed:', error.message, '\n');
        }
        
        try {
            console.log('🔍 Calling callGeckoTerminalDirectly for get_network_pools...');
            const directPoolsResult = await service.callGeckoTerminalDirectly('get_network_pools', {
                network: 'ethereum',
                page: 1
            });
            console.log('✅ Direct network pools completed\n');
        } catch (error) {
            console.log('❌ Direct network pools failed:', error.message, '\n');
        }
        
        try {
            console.log('🔍 Calling callGeckoTerminalDirectly for get_token_prices...');
            const directPricesResult = await service.callGeckoTerminalDirectly('get_token_prices', {
                network: 'ethereum',
                token_addresses: ['0xa0b86a33e6b0b89204e4b2ce51a3d79a17fb80fd', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2']
            });
            console.log('✅ Direct token prices completed\n');
        } catch (error) {
            console.log('❌ Direct token prices failed:', error.message, '\n');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        console.log('🧹 Cleaning up...');
        await service.disconnect();
        console.log('✅ Test completed!\n');
        
        console.log('📋 Summary:');
        console.log('━'.repeat(50));
        console.log('🌐 Look for "[GECKO URL]" entries above to see GeckoTerminal API calls');
        console.log('🌐 Look for "[MCP URL]" entries to see MCP server calls');
        console.log('🤖 Look for "[TOKEN RECOMMENDATIONS]" entries for pipeline info');
    }
}

if (require.main === module) {
    testBackendURLLogging().catch(console.error);
}

module.exports = testBackendURLLogging;