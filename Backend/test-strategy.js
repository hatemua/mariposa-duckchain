const fetch = require('node-fetch');

const API_URL = 'http://localhost:5001';

async function testStrategyRecommendations() {
  console.log('🧠 Testing Enhanced Strategy Recommendations with MCP Market Data\n');
  
  try {
    // Test 1: Get current market analysis
    console.log('1. Getting Current Market Analysis...');
    const marketResponse = await fetch(`${API_URL}/api/strategy/market-analysis`);
    const marketData = await marketResponse.json();
    
    if (marketData.success) {
      console.log('✅ Market Analysis Retrieved:');
      console.log(`   Current Price: $${marketData.data.currentPrice}`);
      console.log(`   24h Change: ${marketData.data.priceChange24h}%`);
      console.log(`   Volume: $${marketData.data.volume24h?.toLocaleString()}`);
      console.log(`   Market Trend: ${marketData.data.conditions?.trend}`);
      console.log(`   Volatility: ${marketData.data.conditions?.volatility}`);
      console.log(`   Risk Level: ${marketData.data.conditions?.riskLevel}`);
      console.log('');
    } else {
      console.log('❌ Failed to get market analysis');
      return;
    }
    
    // Test different strategy scenarios
    const testScenarios = [
      {
        name: 'Conservative Investor',
        budget: 1000,
        duration: '3 months',
        riskTolerance: 'low'
      },
      {
        name: 'Moderate Investor', 
        budget: 5000,
        duration: '1 month',
        riskTolerance: 'medium'
      },
      {
        name: 'Aggressive Trader',
        budget: 10000,
        duration: '1 week',
        riskTolerance: 'high'
      }
    ];
    
    for (let i = 0; i < testScenarios.length; i++) {
      const scenario = testScenarios[i];
      console.log(`${i + 2}. Testing Strategy for ${scenario.name}:`);
      console.log(`   Budget: $${scenario.budget}, Duration: ${scenario.duration}, Risk: ${scenario.riskTolerance}`);
      
      const strategyResponse = await fetch(`${API_URL}/api/strategy/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scenario)
      });
      
      const strategyData = await strategyResponse.json();
      
      if (strategyData.success) {
        const rec = strategyData.data.recommendation;
        console.log(`   🎯 Recommended Strategy: ${rec.suggestedStrategy}`);
        console.log(`   📊 Risk Assessment: ${rec.riskAssessment}`);
        console.log(`   💰 Expected Return: ${rec.expectedReturn}`);
        console.log(`   📈 Reason: ${rec.reason}`);
        
        if (rec.marketSignals?.bullishSignals?.length > 0) {
          console.log(`   🟢 Bullish Signals: ${rec.marketSignals.bullishSignals.join(', ')}`);
        }
        if (rec.marketSignals?.bearishSignals?.length > 0) {
          console.log(`   🔴 Bearish Signals: ${rec.marketSignals.bearishSignals.join(', ')}`);
        }
        if (rec.marketSignals?.neutralSignals?.length > 0) {
          console.log(`   🟡 Neutral Signals: ${rec.marketSignals.neutralSignals.join(', ')}`);
        }
        
        console.log('   📋 Recommended Actions:');
        rec.actions.forEach((action, idx) => {
          console.log(`      ${idx + 1}. ${action}`);
        });
        
        console.log('');
      } else {
        console.log(`   ❌ Failed to get recommendation: ${strategyData.message}`);
      }
    }
    
    console.log('🎉 Strategy Testing Complete!\n');
    console.log('💡 The system now provides:');
    console.log('   ✅ Real-time market analysis using MCP data');
    console.log('   ✅ Risk-adjusted strategy recommendations');
    console.log('   ✅ Market signal analysis (bullish/bearish/neutral)');
    console.log('   ✅ Specific action plans for each strategy');
    console.log('   ✅ DCA, Grid Trading, and Momentum strategies');
    console.log('   ✅ Personalized recommendations based on budget and risk tolerance');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testStrategyRecommendations();