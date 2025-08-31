const strategyProcessingService = require('./services/strategyProcessingService');

async function testLoggingSystem() {
  console.log('🔍 Testing Comprehensive Logging System\n');

  const testMessage = "Create a balanced strategy for WTON and DUCK with moderate risk";
  const userId = "logging-test-user";

  try {
    console.log('📋 Starting strategy processing with comprehensive logging...\n');
    
    const result = await strategyProcessingService.processStrategy(testMessage, userId);
    
    console.log('\n✅ Logging Test Completed!');
    console.log(`Result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Type: ${result.type}`);
    console.log(`Status: ${result.data?.status || 'unknown'}`);
    
    if (result.success && result.data?.strategy) {
      console.log(`Strategy Generated: ${result.data.strategy.strategyName}`);
    }

    // Check if logging worked by looking for the session logs
    console.log('\n📊 Logging System Verification:');
    console.log(`- Session-based logging: ${strategyProcessingService.sessionLogs ? '✅' : '❌'}`);
    console.log(`- Active sessions: ${strategyProcessingService.sessionLogs?.size || 0}`);
    
    // The logs should have been output during processing, showing:
    // - Session initialization
    // - Layer 1 validation with LLM call logs
    // - Layer 2 parallel LLM strategy generation logs  
    // - Layer 3 master consolidation logs
    // - Final summary with performance metrics
    
  } catch (error) {
    console.error('❌ Logging test failed:', error.message);
  }
}

async function testIndividualLayerLogging() {
  console.log('\n🧪 Testing Individual Layer Logging\n');

  const strategyService = strategyProcessingService;
  const testMessage = "Test logging for individual layers";
  const userId = "layer-logging-test";
  
  // Test session initialization
  console.log('1. Testing session initialization...');
  const sessionId = strategyService.initializeLogging(testMessage, userId);
  console.log(`   Session ID created: ${sessionId}`);

  // Test layer logging
  console.log('\n2. Testing layer logging...');
  strategyService.logLayer(sessionId, 1, 'test_phase', {
    summary: 'Testing layer logging functionality',
    details: { testData: 'test value' }
  });

  // Test LLM call logging
  console.log('\n3. Testing LLM call logging...');
  strategyService.logLLMCall(
    sessionId, 
    'test-model', 
    'Test Role', 
    'Test Phase',
    'Test prompt content',
    'Test response content'
  );

  // Test error logging
  console.log('\n4. Testing error logging...');
  strategyService.logLLMCall(
    sessionId,
    'error-model',
    'Error Test Role', 
    'Error Phase',
    'Error prompt',
    null,
    new Error('Test error message')
  );

  // Test finalization
  console.log('\n5. Testing log finalization...');
  const mockResult = {
    success: true,
    type: 'strategy',
    data: { status: 'test_completed' }
  };
  
  strategyService.finalizeLogging(sessionId, mockResult);
  
  console.log('\n✅ Individual layer logging test completed!');
}

// Run logging tests
async function runLoggingTests() {
  try {
    await testLoggingSystem();
    await testIndividualLayerLogging();
  } catch (error) {
    console.error('Logging test suite failed:', error.message);
  }
}

if (require.main === module) {
  runLoggingTests().catch(console.error);
}

module.exports = {
  testLoggingSystem,
  testIndividualLayerLogging,
  runLoggingTests
};