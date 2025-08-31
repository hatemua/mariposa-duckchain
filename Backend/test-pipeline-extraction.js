/**
 * Test file to demonstrate Pipeline Extraction functionality
 * Run with: node test-pipeline-extraction.js
 */

const EnhancedIntentService = require('./services/enhancedIntentService');

async function testPipelineExtraction() {
  console.log('🚀 Testing Pipeline Extraction System...\n');

  const enhancedIntent = new EnhancedIntentService();

  // Test cases for enhanced pipeline prompts
  const testCases = [
    {
      name: 'Complex TON Pipeline with Percentage',
      message: 'when TON increases by 15% in 1 hour, buy $1000 worth of DUCK and immediately transfer 1% of my total balance to my cold wallet 0x123abc',
      expectedType: 'pipeline'
    },
    {
      name: 'Advanced SEI Price Drop with Multiple Actions',
      message: 'if SEI drops below $0.45 then swap ALL my USDC for SEI, stake 80% of it, and send me a notification',
      expectedType: 'pipeline'
    },
    {
      name: 'Portfolio Value Trigger with Conditions',
      message: 'when my portfolio reaches $10k, send 10% to my savings wallet and stake the rest in SEI',
      expectedType: 'pipeline'
    },
    {
      name: 'Simple Transfer (not pipeline)',
      message: 'send 100 SEI to Alice',
      expectedType: 'actions'
    },
    {
      name: 'Automation Request',
      message: 'automate buying SEI when it dips below $0.40',
      expectedType: 'pipeline'
    },
    {
      name: 'Multi-Step Conditional Workflow', 
      message: 'whenever HBAR reaches $1, sell 50% and transfer profits to cold wallet, then buy more SAUCE',
      expectedType: 'pipeline'
    },
    {
      name: 'Time-based Pipeline',
      message: 'set up a workflow: monitor ETH price, if it hits $3000, execute my DCA strategy',
      expectedType: 'pipeline'
    },
    {
      name: 'Balance Query (simple action)',
      message: 'check my SEI balance',
      expectedType: 'actions'
    },
    {
      name: 'Strategy Discussion',
      message: 'I want to create a DCA strategy for SEI over 6 months',
      expectedType: 'strategy'
    },
    {
      name: 'Information Request',
      message: 'what is the current price of TON?',
      expectedType: 'information'
    }
  ];

  console.log('Testing pipeline classification and extraction...\n');

  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log(`📨 Message: "${testCase.message}"`);
    console.log(`🎯 Expected Type: ${testCase.expectedType}`);
    
    try {
      const result = await enhancedIntent.parseMessageWithValidation(testCase.message);
      
      console.log(`✅ Classification Type: ${result.classification.type}`);
      console.log(`🎲 Confidence: ${result.classification.confidence}`);
      console.log(`📋 Action Subtype: ${result.classification.actionSubtype}`);
      
      if (result.classification.type === 'pipeline') {
        console.log(`🔧 Pipeline Structure:`);
        if (result.extraction.pipeline) {
          console.log(`   Trigger: ${JSON.stringify(result.extraction.pipeline.trigger, null, 6)}`);
          console.log(`   Actions: ${JSON.stringify(result.extraction.pipeline.actions, null, 6)}`);
          console.log(`   Conditions: ${JSON.stringify(result.extraction.pipeline.conditions, null, 6)}`);
          if (result.extraction.pipeline.metadata) {
            console.log(`   Metadata: ${JSON.stringify(result.extraction.pipeline.metadata, null, 6)}`);
          }
        }
        console.log(`🔍 Advanced Validation: ${result.validation.isValid ? '✅ VALID' : '❌ INVALID'}`);
        if (result.validation.quality !== undefined) {
          console.log(`📊 Pipeline Quality Score: ${result.validation.quality}/100`);
        }
        if (result.validation.errors && result.validation.errors.length > 0) {
          console.log(`❌ Errors: ${result.validation.errors.join(', ')}`);
        }
        if (result.validation.warnings && result.validation.warnings.length > 0) {
          console.log(`⚠️ Warnings: ${result.validation.warnings.join(', ')}`);
        }
        if (!result.validation.isValid && result.validation.missing) {
          console.log(`❌ Missing: ${result.validation.missing.join(', ')}`);
        }
      } else if (result.classification.type === 'actions') {
        console.log(`🔧 Action Args: ${JSON.stringify(result.extraction.args, null, 2)}`);
      }
      
      // Check if classification matches expected
      const isCorrect = result.classification.type === testCase.expectedType;
      console.log(`${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'} classification`);
      
    } catch (error) {
      console.error(`❌ Error testing "${testCase.name}":`, error.message);
    }
    
    console.log('─'.repeat(80));
  }

  console.log('\n🎉 Pipeline extraction tests completed!');
}

// Run the tests
testPipelineExtraction().catch(console.error);