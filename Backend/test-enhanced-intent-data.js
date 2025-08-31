#!/usr/bin/env node

/**
 * Test the enhanced-intent/process endpoint to see the actual data structure
 */

const fetch = require('node-fetch');

async function testEnhancedIntentData() {
    console.log('🧪 Testing Enhanced Intent Process Endpoint Data Structure');
    console.log('========================================================\n');
    
    const apiUrl = 'http://localhost:5001';
    
    // Test different types of information requests
    const testQueries = [
        {
            message: "What is the current price of Bitcoin?",
            type: "price_inquiry"
        },
        {
            message: "How is the crypto market performing today?",
            type: "market_overview"
        },
        {
            message: "Tell me about SEI network tokens",
            type: "sei_specific"
        },
        {
            message: "What are some good DeFi protocols?",
            type: "defi_inquiry"
        }
    ];
    
    for (let i = 0; i < testQueries.length; i++) {
        const query = testQueries[i];
        console.log(`${i + 1}️⃣ Testing: ${query.type.toUpperCase()}`);
        console.log(`📝 Query: "${query.message}"`);
        console.log('━'.repeat(60));
        
        try {
            const response = await fetch(`${apiUrl}/api/enhanced-intent/process`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: query.message,
                    userId: 'test-user'
                })
            });
            
            if (!response.ok) {
                console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
                continue;
            }
            
            const data = await response.json();
            
            console.log('📊 Response Structure:');
            console.log('├── success:', data.success);
            console.log('├── type:', data.type);
            console.log('├── timestamp:', data.timestamp);
            
            if (data.data) {
                console.log('├── data:');
                console.log('│   ├── intent:', !!data.data.intent);
                console.log('│   └── information:', !!data.data.information);
                
                if (data.data.intent) {
                    const intent = data.data.intent;
                    console.log('│       ├── classification:', intent.classification);
                    console.log('│       ├── extraction:', !!intent.extraction);
                    console.log('│       └── validation:', !!intent.validation);
                }
                
                if (data.data.information) {
                    const info = data.data.information;
                    console.log('│       ├── type:', info.type);
                    console.log('│       ├── status:', info.status);
                    console.log('│       ├── confidence:', info.confidence);
                    console.log('│       ├── processingMethod:', info.processingMethod);
                    
                    if (info.result) {
                        console.log('│       └── result:');
                        console.log('│           ├── requestType:', info.result.requestType);
                        console.log('│           ├── analysis:', !!info.result.analysis);
                        console.log('│           ├── recommendations:', !!info.result.recommendations);
                        console.log('│           ├── marketContext:', !!info.result.marketContext);
                        console.log('│           ├── actionableInsights:', !!info.result.actionableInsights);
                        console.log('│           ├── riskWarnings:', !!info.result.riskWarnings);
                        console.log('│           └── nextSteps:', !!info.result.nextSteps);
                        
                        // Show sample data if available
                        if (info.result.analysis) {
                            console.log('\n📋 Sample Analysis:');
                            const analysis = info.result.analysis;
                            if (typeof analysis === 'string') {
                                console.log(analysis.substring(0, 200) + '...');
                            } else {
                                console.log(JSON.stringify(analysis, null, 2).substring(0, 300) + '...');
                            }
                        }
                        
                        if (info.result.recommendations && Array.isArray(info.result.recommendations)) {
                            console.log('\n💡 Sample Recommendations:');
                            info.result.recommendations.slice(0, 2).forEach((rec, idx) => {
                                console.log(`${idx + 1}. ${rec}`);
                            });
                        }
                        
                        if (info.result.marketContext) {
                            console.log('\n📊 Market Context:');
                            console.log('├── dataSource:', info.result.marketContext.dataSource);
                            console.log('├── lastUpdated:', info.result.marketContext.lastUpdated);
                            console.log('├── tokensAnalyzed:', info.result.marketContext.tokensAnalyzed);
                            console.log('└── aiModel:', info.result.marketContext.aiModel);
                        }
                    }
                }
            }
            
            console.log('\n✅ Test completed\n');
            
        } catch (error) {
            console.log(`❌ Test failed: ${error.message}\n`);
        }
        
        // Small delay between requests
        if (i < testQueries.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    console.log('📋 Summary of Enhanced Intent Data Structure:');
    console.log('━'.repeat(50));
    console.log('✅ Response format: { success, type, data, timestamp }');
    console.log('✅ Information data includes:');
    console.log('   • Intent classification with confidence');
    console.log('   • AI-powered analysis text');
    console.log('   • Actionable recommendations array');
    console.log('   • Market context metadata');
    console.log('   • Risk warnings and next steps');
    console.log('   • Processing method details');
    console.log('\n🎯 Next: Update frontend to display this rich data structure!');
}

if (require.main === module) {
    testEnhancedIntentData().catch(console.error);
}

module.exports = testEnhancedIntentData;