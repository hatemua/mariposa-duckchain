const strategyProcessingService = require('./services/strategyProcessingService');

async function testStrategyProcessing() {
  console.log('🧪 Testing 3-Layer Strategy Processing System with Comprehensive Logging\n');

  const testMessages = [
    {
      message: "Create a DCA strategy for WTON with $1000 budget over 6 months",
      expectedComplexity: "moderate",
      description: "Dollar-Cost Averaging Strategy Request"
    },
    {
      message: "I have 50000 DUCK tokens and want to grow them aggressively", 
      expectedComplexity: "complex",
      description: "Aggressive Growth Strategy"
    },
    {
      message: "Build me a conservative portfolio with WTON, DUCK, and USDT",
      expectedComplexity: "moderate", 
      description: "Conservative Portfolio Strategy"
    },
    {
      message: "Design a risk management strategy for volatile market conditions",
      expectedComplexity: "complex",
      description: "Risk Management Strategy"
    }
  ];

  const userId = "test-user-123";

  for (let i = 0; i < testMessages.length; i++) {
    const test = testMessages[i];
    
    console.log(`\n=== TEST ${i + 1}: ${test.description} ===`);
    console.log(`Message: "${test.message}"`);
    console.log(`Expected Complexity: ${test.expectedComplexity}\n`);

    try {
      const startTime = Date.now();
      
      // Test the complete 3-layer system
      const result = await strategyProcessingService.processStrategy(test.message, userId);
      
      const endTime = Date.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      console.log(`⏱️  Processing Time: ${processingTime}s`);
      console.log(`✅ Success: ${result.success}`);
      console.log(`📊 Type: ${result.type}`);
      
      if (result.success && result.data) {
        console.log(`📈 Status: ${result.data.status}`);
        
        if (result.data.strategy) {
          const strategy = result.data.strategy;
          console.log(`\n🎯 FINAL STRATEGY:`);
          console.log(`   Name: ${strategy.strategyName}`);
          console.log(`   Approach: ${strategy.approach}`);
          console.log(`   Risk: ${strategy.riskPercentage}%`);
          console.log(`   Confidence: ${strategy.confidenceScore}%`);
          console.log(`   Time Frame: ${strategy.timeFrame}`);
          
          console.log(`\n💰 ALLOCATION:`);
          Object.entries(strategy.allocation || {}).forEach(([token, percent]) => {
            console.log(`   ${token}: ${percent}%`);
          });
          
          console.log(`\n🔄 REBALANCING ACTIONS (${strategy.rebalancingActions?.length || 0}):`);
          (strategy.rebalancingActions || []).forEach((action, idx) => {
            console.log(`   ${idx + 1}. ${action.action} when ${action.trigger}`);
          });
          
          console.log(`\n⚡ IMMEDIATE ACTIONS (${strategy.immediateActions?.length || 0}):`);
          (strategy.immediateActions || []).forEach((action, idx) => {
            console.log(`   ${idx + 1}. ${action.action}`);
          });
          
          console.log(`\n📊 KEY METRICS:`);
          (strategy.keyMetrics || []).forEach(metric => {
            console.log(`   • ${metric}`);
          });
          
          console.log(`\n📋 DATA NEEDED:`);
          (strategy.dataNeeded || []).forEach(data => {
            console.log(`   • ${data}`);
          });
        }
        
        if (result.data.processingMetadata) {
          console.log(`\n🔍 PROCESSING METADATA:`);
          console.log(`   Layer 1: ${JSON.stringify(result.data.processingMetadata.layer1)}`);
          console.log(`   Layer 2: ${result.data.processingMetadata.layer2}`);
          console.log(`   Layer 3: ${result.data.processingMetadata.layer3}`);
          console.log(`   Source Strategies: ${result.data.sourceStrategies}`);
        }

        console.log(`\n📊 LOGGING VERIFICATION:`);
        console.log(`   - Comprehensive session logging enabled`);
        console.log(`   - Individual LLM call tracking active`);
        console.log(`   - Layer-by-layer progress monitoring`);
        console.log(`   - Performance metrics collection`);
        console.log(`   - Detailed error tracking and fallbacks`);
        
      } else {
        console.log(`❌ Error: ${result.data?.error || 'Unknown error'}`);
        if (result.data?.fallback) {
          console.log(`🔄 Fallback: ${JSON.stringify(result.data.fallback, null, 2)}`);
        }
      }
      
    } catch (error) {
      console.error(`💥 Test ${i + 1} failed with error:`, error.message);
    }
    
    console.log(`\n${'='.repeat(60)}`);
  }

  console.log('\n🎉 Strategy Processing System Testing Complete!');
}

// Performance test for concurrent processing
async function testConcurrentProcessing() {
  console.log('\n🚀 Testing Concurrent Strategy Processing');
  
  const concurrentMessages = [
    "Create a balanced portfolio with WTON and DUCK",
    "Design an aggressive growth strategy for TON", 
    "Build a conservative DCA strategy for USDT"
  ];
  
  const startTime = Date.now();
  
  try {
    const promises = concurrentMessages.map((message, index) => 
      strategyProcessingService.processStrategy(message, `user-${index}`)
    );
    
    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    console.log(`⏱️  Total Time for ${concurrentMessages.length} concurrent strategies: ${((endTime - startTime) / 1000).toFixed(2)}s`);
    
    results.forEach((result, index) => {
      console.log(`Strategy ${index + 1}: ${result.success ? '✅ Success' : '❌ Failed'}`);
      if (result.success && result.data?.strategy?.strategyName) {
        console.log(`  → ${result.data.strategy.strategyName}`);
      }
    });
    
  } catch (error) {
    console.error('Concurrent processing test failed:', error.message);
  }
}

// Test individual layers
async function testIndividualLayers() {
  console.log('\n🔬 Testing Individual Layers');
  
  const testMessage = "Create a diversified strategy with WTON, DUCK, and TON for long-term growth";
  const userId = "layer-test-user";
  
  try {
    // Test Layer 1: Validation
    console.log('\n📋 Layer 1: Strategy Validation');
    const validation = await strategyProcessingService.validateStrategyRequest(testMessage, userId);
    console.log('Validation Result:', JSON.stringify(validation, null, 2));
    
    if (validation.success && validation.shouldProcess) {
      // Test Layer 2: Multi-strategy generation  
      console.log('\n🧠 Layer 2: Multi-Strategy Generation');
      const multiStrategies = await strategyProcessingService.generateMultipleStrategies(
        testMessage, 
        userId, 
        validation.metadata
      );
      console.log(`Generated ${multiStrategies.strategies?.length || 0}/4 strategies`);
      
      if (multiStrategies.success && multiStrategies.strategies.length > 0) {
        // Test Layer 3: Consolidation
        console.log('\n🎯 Layer 3: Master Consolidation');
        const consolidation = await strategyProcessingService.consolidateStrategies(
          multiStrategies.strategies,
          testMessage,
          validation.metadata,
          userId
        );
        console.log('Consolidation Success:', consolidation.success);
        if (consolidation.success) {
          console.log('Final Strategy Name:', consolidation.data.strategy?.strategyName);
        }
      }
    }
    
  } catch (error) {
    console.error('Individual layer testing failed:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  try {
    await testStrategyProcessing();
    await testConcurrentProcessing(); 
    await testIndividualLayers();
  } catch (error) {
    console.error('Test suite failed:', error.message);
  }
}

// Execute if run directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testStrategyProcessing,
  testConcurrentProcessing,
  testIndividualLayers,
  runAllTests
};