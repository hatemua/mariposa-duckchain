# 3-Layer Strategy Processing System

## 🎯 Overview

Advanced AI-powered investment strategy generation system using multiple Large Language Models for comprehensive strategy development.

## 🏗️ Architecture

### Layer 1: Strategy Detection & Validation
- **Purpose**: Validates if request requires comprehensive strategy processing
- **Model**: `meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo`
- **Functions**:
  - Analyzes strategy complexity (simple|moderate|complex)  
  - Determines analysis depth (basic|intermediate|advanced)
  - Assesses time horizon (short|medium|long)
  - Evaluates risk analysis requirements (low|medium|high)

### Layer 2: Multi-Perspective Strategy Generation
- **Purpose**: Generate 4 different strategy perspectives using specialized LLMs
- **Models Used**:
  1. `meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo` - Conservative Analyst
  2. `meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo` - Advanced Strategist  
  3. `mistralai/Mixtral-8x7B-Instruct-v0.1` - Risk Manager
  4. `NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO` - Growth Optimizer

### Layer 3: Master Consolidation
- **Purpose**: Synthesize all perspectives into optimal final strategy
- **Model**: `meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo` 
- **Functions**:
  - Identifies best elements from each strategy
  - Resolves conflicts between approaches
  - Creates unified, actionable strategy
  - Balances risk vs reward optimally

## 🚀 Usage

### API Endpoint
```
POST /api/enhanced-intent/process
```

### Request Format
```json
{
  "message": "Create a DCA strategy for WTON with $1000 budget over 6 months",
  "userId": "user-123",
  "sessionId": "session-456"
}
```

### Response Format
```json
{
  "success": true,
  "type": "strategy",
  "data": {
    "status": "strategy_generated",
    "strategy": {
      "strategyName": "Conservative DCA Growth Strategy",
      "approach": "conservative",
      "riskPercentage": 25,
      "confidenceScore": 85,
      "timeFrame": "6 months",
      "allocation": {
        "WTON": "40.00",
        "DUCK": "30.00", 
        "TON": "20.00",
        "USDT": "10.00"
      },
      "rebalancingActions": [
        {
          "trigger": "Monthly review",
          "action": "Rebalance if deviation > 10%",
          "frequency": "monthly",
          "threshold": "10%"
        }
      ],
      "immediateActions": [
        {
          "step": 1,
          "action": "Start with 25% of total budget",
          "amount": "$250"
        },
        {
          "step": 2, 
          "action": "Set up weekly DCA of $42",
          "amount": "$42/week"
        }
      ],
      "entryStrategy": "Gradual entry with weekly DCA over 6 months",
      "exitStrategy": "Review performance at 6 months, consider extending",
      "riskManagement": "Stop-loss at -20%, take profit at +50%",
      "expectedReturn": "8-15% over 6 months",
      "keyMetrics": ["Total Return", "Sharpe Ratio", "Max Drawdown"],
      "dataNeeded": ["Historical volatility", "Market sentiment"],
      "marketConditions": "Suitable for stable to bullish markets",
      "reasoning": "Combines conservative DCA approach with growth potential",
      "sourceStrategies": "Consolidated from 4 LLM perspectives"
    },
    "sourceStrategies": 4,
    "processingMetadata": {
      "layer1": {
        "complexity": "moderate",
        "analysisDepth": "intermediate", 
        "timeHorizon": "medium",
        "riskAnalysisLevel": "medium"
      },
      "layer2": "4/4 strategies generated",
      "layer3": "master_consolidation_completed"
    },
    "message": "🎯 Comprehensive strategy generated successfully!"
  },
  "timestamp": "2025-08-31T12:00:00.000Z"
}
```

## 📊 Strategy Components

### Core Fields
- **strategyName**: Descriptive name for the strategy
- **approach**: conservative|balanced|aggressive  
- **riskPercentage**: 0-100 risk level
- **confidenceScore**: 0-100 AI confidence in strategy
- **timeFrame**: Strategy duration
- **allocation**: Token distribution percentages

### Action Plans
- **rebalancingActions**: Automated rebalancing rules
- **immediateActions**: Steps to start implementing
- **entryStrategy**: How to begin
- **exitStrategy**: When/how to exit

### Analysis
- **riskManagement**: Risk controls and limits
- **expectedReturn**: Realistic return expectations  
- **keyMetrics**: Important metrics to track
- **dataNeeded**: Additional data that would help
- **marketConditions**: Ideal market conditions

## 🧪 Testing

### Run Complete Test Suite
```bash
node Backend/test-strategy-system.js
```

### Test Individual Components
```javascript
const strategyService = require('./services/strategyProcessingService');

// Test single strategy
const result = await strategyService.processStrategy(
  "Create a balanced portfolio with WTON and DUCK", 
  "user-123"
);

// Test validation only
const validation = await strategyService.validateStrategyRequest(
  "Build me a conservative strategy", 
  "user-123"
);
```

## 🎛️ Configuration

### Environment Variables
```bash
TOGETHER_API_KEY=your-together-ai-key
```

### Model Configuration
Models can be customized in `strategyProcessingService.js`:

```javascript
this.strategistModels = [
  'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',    // Conservative
  'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',   // Advanced  
  'mistralai/Mixtral-8x7B-Instruct-v0.1',           // Risk Manager
  'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO'     // Growth
];

this.masterModel = 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo';
```

## 📈 Supported Strategy Types

### Investment Strategies
- Dollar-Cost Averaging (DCA)
- Portfolio Rebalancing  
- Growth vs Conservative allocation
- Risk Management frameworks

### Token Support
- **WTON**: Wrapped TON token
- **DUCK**: Duck token  
- **TON**: Native TON
- **USDT**: Stablecoin for stability

### Time Horizons
- **Short**: Days to weeks
- **Medium**: Weeks to months  
- **Long**: Months to years

## ⚡ Performance

### Processing Times
- **Layer 1**: ~1-2 seconds
- **Layer 2**: ~5-8 seconds (parallel processing)
- **Layer 3**: ~3-5 seconds
- **Total**: ~10-15 seconds for complete strategy

### Concurrent Processing
- Supports multiple simultaneous strategy requests
- Each user session processed independently
- Parallel LLM calls for optimal performance

## 🔧 Error Handling

### Fallback Mechanisms
1. If Layer 1 fails → Default to processing
2. If Layer 2 fails → Use available strategies  
3. If Layer 3 fails → Return best individual strategy
4. If all fail → Return basic balanced strategy

### Error Response Format
```json
{
  "success": false,
  "type": "strategy", 
  "data": {
    "status": "processing_failed",
    "error": "Layer 2 failed: No strategies generated",
    "fallback": {
      "strategyName": "Basic Balanced Strategy",
      "approach": "balanced",
      "allocation": {"WTON": 30, "DUCK": 30, "TON": 25, "USDT": 15}
    }
  }
}
```

## 🎯 Integration Examples

### React Native App Integration
```typescript
import { processStrategy } from '../services/ApiCalls';

const handleStrategyRequest = async (message: string) => {
  try {
    const result = await processStrategy(message, userId);
    
    if (result.success && result.data.strategy) {
      setStrategy(result.data.strategy);
      setShowStrategyModal(true);
    }
  } catch (error) {
    console.error('Strategy processing failed:', error);
  }
};
```

### Backend Service Integration  
```javascript
const strategyResult = await strategyProcessingService.processStrategy(
  userMessage,
  userId
);

if (strategyResult.success) {
  // Save strategy to database
  await saveUserStrategy(userId, strategyResult.data.strategy);
  
  // Send to user
  return strategyResult;
}
```

## 📋 Best Practices

### Strategy Requests
- Be specific about goals and constraints
- Mention time horizons and risk tolerance
- Include budget or token amounts when relevant
- Specify preferred tokens or exclusions

### Example Good Requests
```
"Create a conservative DCA strategy for WTON with $1000 over 3 months"
"Build an aggressive growth portfolio with DUCK and TON, high risk acceptable"  
"Design a rebalancing strategy for WTON/DUCK/USDT, moderate risk"
"Develop a long-term holding strategy for TON with monthly contributions"
```

### Implementation Tips
- Start with immediate actions from the strategy
- Set up automated rebalancing if possible
- Monitor key metrics regularly
- Adjust based on market conditions
- Review and update strategy periodically

## 🚀 Future Enhancements

### Planned Features
- Historical backtesting integration
- Real-time market data integration  
- Automated strategy execution
- Performance tracking and analytics
- Social trading strategy sharing
- Machine learning strategy optimization

### Extensibility
- Easy to add new LLM models
- Customizable prompts per model
- Pluggable validation rules
- Configurable risk parameters
- Multi-network token support

The 3-layer strategy system provides comprehensive, AI-powered investment strategy generation with multiple perspectives, risk management, and actionable implementation guidance! 🎯