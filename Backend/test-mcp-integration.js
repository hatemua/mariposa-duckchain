/**
 * Test MCP Market Data Integration
 * This script tests the MCP market data service integration
 */

const MCPMarketDataService = require('./services/mcpMarketDataService');
const mcpConfig = require('./config/mcpConfig');

class MCPIntegrationTester {
    constructor() {
        this.service = null;
        this.testResults = [];
    }

    async runAllTests() {
        console.log('🧪 Starting MCP Market Data Integration Tests...\n');
        
        try {
            // Initialize service
            await this.initializeService();
            
            // Run individual tests
            await this.testGetNetworks();
            await this.testGetSeiPools();
            await this.testGetTokenRecommendations();
            await this.testSearchPools();
            await this.testMarketContextForLLM();
            
            // NEW: Test SEI Pipeline
            await this.testSEIPipeline();
            
            await this.testServiceStatus();
            
            // Print results summary
            this.printTestSummary();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
        } finally {
            // Cleanup
            await this.cleanup();
        }
    }

    async initializeService() {
        console.log('🔧 Initializing MCP Market Data Service...');
        try {
            this.service = new MCPMarketDataService();
            
            // Wait a bit for initialization
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            console.log('✅ Service initialized successfully\n');
            this.addTestResult('Service Initialization', true, 'Service started successfully');
        } catch (error) {
            console.error('❌ Failed to initialize service:', error.message);
            this.addTestResult('Service Initialization', false, error.message);
            throw error;
        }
    }

    async testGetNetworks() {
        console.log('🌐 Testing Get Networks...');
        try {
            const result = await this.service.getNetworks();
            
            if (result.success && result.data && result.data.length > 0) {
                console.log(`✅ Found ${result.data.length} supported networks`);
                console.log('   Sample networks:', result.data.slice(0, 3).map(n => `${n.id} (${n.name})`).join(', '));
                this.addTestResult('Get Networks', true, `Found ${result.data.length} networks`);
            } else {
                throw new Error('No networks found or invalid response');
            }
        } catch (error) {
            console.error('❌ Get Networks failed:', error.message);
            this.addTestResult('Get Networks', false, error.message);
        }
        console.log('');
    }

    async testGetSeiPools() {
        console.log('⚡ Testing Get Sei Pools...');
        try {
            const result = await this.service.getSeiPools(1);
            
            if (result.success && result.data) {
                console.log('✅ Successfully retrieved Sei pools');
                console.log(`   Network: ${result.network}`);
                console.log('   Data preview:', result.data.substring(0, 200) + '...');
                this.addTestResult('Get Sei Pools', true, 'Retrieved Sei pools successfully');
            } else {
                throw new Error(result.error || 'Failed to get Sei pools');
            }
        } catch (error) {
            console.error('❌ Get Sei Pools failed:', error.message);
            this.addTestResult('Get Sei Pools', false, error.message);
        }
        console.log('');
    }

    async testGetTokenRecommendations() {
        console.log('🎯 Testing Token Recommendations...');
        try {
            const criteria = 'balanced';
            const count = 3;
            const result = await this.service.getTokenRecommendations(criteria, count);
            
            if (result.success && result.data) {
                console.log('✅ Successfully got token recommendations');
                console.log(`   Criteria: ${result.criteria}`);
                console.log(`   Network: ${result.network}`);
                console.log('   Recommendations preview:', result.data.substring(0, 300) + '...');
                this.addTestResult('Token Recommendations', true, 'Retrieved recommendations successfully');
            } else {
                throw new Error(result.error || 'Failed to get token recommendations');
            }
        } catch (error) {
            console.error('❌ Token Recommendations failed:', error.message);
            this.addTestResult('Token Recommendations', false, error.message);
        }
        console.log('');
    }

    async testSearchPools() {
        console.log('🔍 Testing Search Pools...');
        try {
            const query = 'USDC';
            const result = await this.service.searchPools(query);
            
            if (result.success && result.data) {
                console.log('✅ Successfully searched pools');
                console.log(`   Query: ${result.query}`);
                console.log('   Search results preview:', result.data.substring(0, 200) + '...');
                this.addTestResult('Search Pools', true, 'Pool search completed successfully');
            } else {
                throw new Error(result.error || 'Failed to search pools');
            }
        } catch (error) {
            console.error('❌ Search Pools failed:', error.message);
            this.addTestResult('Search Pools', false, error.message);
        }
        console.log('');
    }

    async testMarketContextForLLM() {
        console.log('🧠 Testing Market Context for LLM...');
        try {
            const options = {
                includeTopPools: true,
                includeTokenRecommendations: true,
                recommendationCriteria: 'balanced'
            };
            
            const context = await this.service.getMarketContextForLLM(options);
            
            if (context.success && context.data) {
                console.log('✅ Successfully generated LLM context');
                console.log(`   Network: ${context.network}`);
                console.log(`   Timestamp: ${context.timestamp}`);
                
                const formattedPrompt = this.service.formatMarketDataForLLM(context);
                console.log(`   Formatted prompt length: ${formattedPrompt.length} characters`);
                console.log('   Context preview:', formattedPrompt.substring(0, 300) + '...');
                
                this.addTestResult('LLM Market Context', true, 'Generated LLM context successfully');
            } else {
                throw new Error(context.error || 'Failed to generate LLM context');
            }
        } catch (error) {
            console.error('❌ LLM Market Context failed:', error.message);
            this.addTestResult('LLM Market Context', false, error.message);
        }
        console.log('');
    }

    async testSEIPipeline() {
        console.log('🚀 Testing SEI Network Pipeline...');
        try {
            const startTime = Date.now();
            
            // Test balanced criteria
            console.log('   Testing balanced criteria...');
            const balancedPipeline = await this.service.getSEINetworkPipeline({
                criteria: 'balanced',
                count: 3,
                includeDetailedPools: true,
                includeTokenSearch: true
            });
            
            if (balancedPipeline.success) {
                console.log('✅ SEI Pipeline (balanced) completed successfully');
                console.log(`   Pipeline steps: ${balancedPipeline.steps.length}`);
                console.log(`   Network found: ${balancedPipeline.data.network?.id} (${balancedPipeline.data.network?.name})`);
                console.log(`   Execution time: ${Date.now() - startTime}ms`);
                
                this.addTestResult('SEI Pipeline', true, `Pipeline completed with ${balancedPipeline.steps.length} steps`);
            } else {
                console.log('❌ SEI Pipeline failed:', balancedPipeline.errors.join(', '));
                this.addTestResult('SEI Pipeline', false, balancedPipeline.errors.join(', '));
            }
        } catch (error) {
            console.log('❌ SEI Pipeline test failed:', error.message);
            this.addTestResult('SEI Pipeline', false, error.message);
        }
        console.log('');
    }

    async testServiceStatus() {
        console.log('📊 Testing Service Status...');
        try {
            const status = this.service.getStatus();
            
            console.log('✅ Service status retrieved');
            console.log('   Connection status:', status.connected ? 'Connected' : 'Disconnected');
            console.log('   Sei Network ID:', status.seiNetworkId);
            console.log('   Supported networks:', status.supportedNetworksCount);
            console.log('   Cache sizes:', JSON.stringify(status.cacheSize));
            
            this.addTestResult('Service Status', true, 'Status retrieved successfully');
        } catch (error) {
            console.error('❌ Service Status failed:', error.message);
            this.addTestResult('Service Status', false, error.message);
        }
        console.log('');
    }

    addTestResult(testName, success, message) {
        this.testResults.push({
            test: testName,
            success,
            message,
            timestamp: new Date().toISOString()
        });
    }

    printTestSummary() {
        console.log('📋 Test Results Summary');
        console.log('=' .repeat(50));
        
        const passed = this.testResults.filter(t => t.success).length;
        const failed = this.testResults.filter(t => !t.success).length;
        const total = this.testResults.length;
        
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${passed} ✅`);
        console.log(`Failed: ${failed} ❌`);
        console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
        console.log('');
        
        this.testResults.forEach(result => {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} ${result.test}: ${result.message}`);
        });
        
        console.log('');
        if (failed === 0) {
            console.log('🎉 All tests passed! MCP integration is working correctly.');
        } else {
            console.log('⚠️  Some tests failed. Please check the error messages above.');
        }
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up...');
        if (this.service) {
            await this.service.disconnect();
            console.log('✅ Service disconnected');
        }
        console.log('✅ Cleanup completed');
    }
}

// Demo functions for different use cases
class MCPUsageDemo {
    constructor(service) {
        this.service = service;
    }

    async demoTradingAgent() {
        console.log('\n🤖 Demo: Trading Agent Context');
        console.log('=' .repeat(40));
        
        const context = await this.service.getMarketContextForLLM({
            includeTopPools: true,
            includeTokenRecommendations: true,
            recommendationCriteria: 'balanced'
        });
        
        if (context.success) {
            const prompt = this.service.formatMarketDataForLLM(context);
            console.log('Trading Agent Prompt:');
            console.log('-' .repeat(30));
            console.log(prompt.substring(0, 500) + '...');
            console.log('\n✅ Trading agent context generated successfully');
        } else {
            console.log('❌ Failed to generate trading agent context');
        }
    }

    async demoSeiMarketAnalysis() {
        console.log('\n⚡ Demo: Sei Market Analysis');
        console.log('=' .repeat(40));
        
        const seiPools = await this.service.getSeiPools(1);
        const recommendations = await this.service.getTokenRecommendations('safe', 5);
        
        if (seiPools.success && recommendations.success) {
            console.log('Sei Market Analysis:');
            console.log('-' .repeat(30));
            console.log('Top Pools Data Available:', seiPools.data ? 'Yes' : 'No');
            console.log('Token Recommendations Available:', recommendations.data ? 'Yes' : 'No');
            console.log('Network:', seiPools.network);
            console.log('\n✅ Sei market analysis data ready');
        } else {
            console.log('❌ Failed to generate Sei market analysis');
        }
    }
}

// Main execution
async function main() {
    const tester = new MCPIntegrationTester();
    
    console.log('🌟 MCP Market Data Integration Test Suite - SEI Network Focus');
    console.log('==========================================\n');
    
    // Run comprehensive tests
    await tester.runAllTests();
    
    // If tests passed, run usage demos
    if (tester.testResults.every(t => t.success)) {
        const demo = new MCPUsageDemo(tester.service);
        await demo.demoTradingAgent();
        await demo.demoSeiMarketAnalysis();
    }
    
    console.log('\n🏁 Test suite completed!');
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Test suite crashed:', error);
        process.exit(1);
    });
}

module.exports = {
    MCPIntegrationTester,
    MCPUsageDemo
};
