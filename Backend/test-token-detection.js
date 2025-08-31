/**
 * Test script to verify DuckChain token detection in enhanced-intent API
 * Run with: node test-token-detection.js
 */

const messageClassificationService = require('./services/messageClassificationService');

// Test cases for DuckChain token detection
const testCases = [
  // Swap test cases
  {
    message: "Swap 100 WTON for DUCK",
    expectedType: "actions",
    expectedSubtype: "swap",
    description: "Basic WTON to DUCK swap"
  },
  {
    message: "Exchange 50 DUCK to WTON",
    expectedType: "actions", 
    expectedSubtype: "swap",
    description: "DUCK to WTON swap"
  },
  {
    message: "Convert 25 WTON to DUCK with 1% slippage",
    expectedType: "actions",
    expectedSubtype: "swap", 
    description: "Swap with slippage"
  },
  {
    message: "Trade my DUCK for WTON",
    expectedType: "actions",
    expectedSubtype: "swap",
    description: "Trade language"
  },
  {
    message: "I want to swap 10 TON for DUCK",
    expectedType: "actions",
    expectedSubtype: "swap",
    description: "TON swap"
  },
  {
    message: "Exchange USDT for WTON",
    expectedType: "actions",
    expectedSubtype: "swap",
    description: "USDT swap"
  },

  // Transfer test cases (should NOT be swaps)
  {
    message: "Send 100 DUCK to Alice",
    expectedType: "actions",
    expectedSubtype: "transfer", 
    description: "Transfer (not swap)"
  },
  {
    message: "Transfer 0.1 TON to Bob",
    expectedType: "actions",
    expectedSubtype: "transfer",
    description: "TON transfer"
  },

  // Information test cases (should NOT be swaps)
  {
    message: "What is DUCK price?",
    expectedType: "information",
    expectedSubtype: null,
    description: "Price inquiry (not swap)"
  },
  {
    message: "Show my WTON balance",
    expectedType: "actions",
    expectedSubtype: "balance",
    description: "Balance check (not swap)"
  },

  // Edge cases
  {
    message: "swap some tokens",
    expectedType: "actions",
    expectedSubtype: "swap", 
    description: "Generic swap (missing tokens)"
  },
  {
    message: "I want to exchange tokens on DuckChain",
    expectedType: "actions",
    expectedSubtype: "swap",
    description: "DuckChain mention"
  }
];

async function runTests() {
  console.log('🧪 Starting DuckChain Token Detection Tests\n');
  
  let passedTests = 0;
  let failedTests = 0;
  const results = [];

  for (const testCase of testCases) {
    try {
      console.log(`Testing: "${testCase.message}"`);
      
      const classification = await messageClassificationService.classifyMessage(testCase.message);
      
      const typeMatch = classification.type === testCase.expectedType;
      const subtypeMatch = testCase.expectedSubtype ? 
        classification.actionSubtype === testCase.expectedSubtype : true;
      
      const passed = typeMatch && subtypeMatch;
      
      if (passed) {
        console.log(`✅ PASS - ${testCase.description}`);
        console.log(`   Type: ${classification.type} | Subtype: ${classification.actionSubtype || 'none'}`);
        passedTests++;
      } else {
        console.log(`❌ FAIL - ${testCase.description}`);
        console.log(`   Expected: ${testCase.expectedType}/${testCase.expectedSubtype || 'none'}`);
        console.log(`   Got: ${classification.type}/${classification.actionSubtype || 'none'}`);
        failedTests++;
      }
      
      results.push({
        ...testCase,
        actualType: classification.type,
        actualSubtype: classification.actionSubtype,
        passed: passed,
        confidence: classification.confidence
      });
      
      console.log(`   Confidence: ${classification.confidence}`);
      console.log('');
      
    } catch (error) {
      console.log(`❌ ERROR - ${testCase.description}`);
      console.log(`   Error: ${error.message}`);
      failedTests++;
      console.log('');
    }
  }

  // Summary
  console.log('📊 Test Results Summary:');
  console.log(`Total Tests: ${testCases.length}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Success Rate: ${((passedTests / testCases.length) * 100).toFixed(1)}%`);

  // Detailed Results
  console.log('\n📋 Detailed Results:');
  results.forEach((result, index) => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${result.description}`);
    console.log(`   Message: "${result.message}"`);
    console.log(`   Expected: ${result.expectedType}/${result.expectedSubtype || 'none'}`);
    console.log(`   Got: ${result.actualType}/${result.actualSubtype || 'none'}`);
    console.log(`   Confidence: ${result.confidence}`);
    console.log('');
  });

  // Focus on swap detection
  const swapTests = results.filter(r => r.expectedSubtype === 'swap');
  const swapPassed = swapTests.filter(r => r.passed).length;
  console.log(`🔄 Swap Detection Results: ${swapPassed}/${swapTests.length} passed`);
  
  const failedSwaps = swapTests.filter(r => !r.passed);
  if (failedSwaps.length > 0) {
    console.log('\n❌ Failed Swap Detections:');
    failedSwaps.forEach(swap => {
      console.log(`   "${swap.message}" -> ${swap.actualType}/${swap.actualSubtype}`);
    });
  }

  console.log('\n🎯 Recommendations:');
  if (failedTests > 0) {
    console.log('- Review failed test cases above');
    console.log('- Check if LLM prompts need more examples');
    console.log('- Verify token vocabulary is complete');
    console.log('- Consider adjusting confidence thresholds');
  } else {
    console.log('- All tests passed! Token detection is working correctly');
    console.log('- Ready for production use');
  }
}

// API Test Function
async function testApiEndpoint() {
  console.log('\n🌐 Testing Enhanced Intent API Endpoint...');
  
  const testMessages = [
    "Swap 100 WTON for DUCK",
    "Exchange 50 DUCK to WTON", 
    "Send 0.1 TON to Alice"
  ];

  for (const message of testMessages) {
    try {
      console.log(`\nTesting API with: "${message}"`);
      
      // This would be your actual API call
      // const response = await fetch('http://localhost:5001/api/enhanced-intent/process', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     message: message,
      //     userId: '68b2464f83132f5576e8ea8d'
      //   })
      // });
      // const result = await response.json();
      
      console.log('🔄 Manual API testing required - uncomment code above');
      
    } catch (error) {
      console.log(`❌ API Error: ${error.message}`);
    }
  }
}

// Run the tests
if (require.main === module) {
  runTests()
    .then(() => testApiEndpoint())
    .then(() => {
      console.log('\n✅ Testing complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Testing failed:', error);
      process.exit(1);
    });
}

module.exports = { runTests, testCases };