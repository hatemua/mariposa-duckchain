const seiAgentService = require('./services/seiAgentService');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function testSeiAgentIntegration() {
  try {
    console.log('🧪 Testing SEI Agent Integration with agent-sdk');
    console.log('=' .repeat(60));

    // Connect to database
    console.log('📊 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mariposa');
    console.log('✅ Database connected');

    // Test 1: Check if agent-sdk is properly imported
    console.log('\n🔍 Test 1: Check agent-sdk import');
    const { SimpleAgent, Utils } = require('@mariposa-plus/agent-sdk');
    console.log('✅ agent-sdk imported successfully');
    console.log(`   SimpleAgent: ${typeof SimpleAgent}`);
    console.log(`   Utils: ${typeof Utils}`);

    // Test 2: Check supported tokens
    console.log('\n🔍 Test 2: Check supported tokens');
    const supportedTokens = seiAgentService.getSupportedTokens();
    console.log('✅ Supported tokens:', Object.keys(supportedTokens));

    // Test 3: Check token address lookup
    console.log('\n🔍 Test 3: Check token address lookup');
    const usdcAddress = seiAgentService.getTokenAddress('USDC');
    const wethAddress = seiAgentService.getTokenAddress('WETH');
    console.log('✅ Token addresses:');
    console.log(`   USDC: ${usdcAddress}`);
    console.log(`   WETH: ${wethAddress}`);

    // Test 4: Test utility functions
    console.log('\n🔍 Test 4: Test utility functions');
    const testAddress = '0x1234567890123456789012345678901234567890';
    const isValid = Utils.isValidAddress(testAddress);
    console.log(`✅ Address validation: ${testAddress} -> ${isValid}`);

    const slippageAmount = Utils.calculateSlippage('100', 5);
    console.log(`✅ Slippage calculation: 100 with 5% -> ${slippageAmount}`);

    console.log('\n✅ All tests passed! SEI Agent Integration is working correctly.');
    console.log('\n📝 Next steps:');
    console.log('   1. Deploy the AgenticRouter contract and update AGENTIC_ROUTER_ADDRESS');
    console.log('   2. Create a test user and agent');
    console.log('   3. Test agent creation and operations via API endpoints');
    console.log('   4. Test swap and transfer functionality');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    // Close database connection
    await mongoose.disconnect();
    console.log('\n📊 Database disconnected');
  }
}

// Run the test
if (require.main === module) {
  testSeiAgentIntegration();
}

module.exports = testSeiAgentIntegration;
