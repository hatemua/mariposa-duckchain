const Agenda = require('agenda');
const mongoose = require('mongoose');
const Pipeline = require('../models/Pipeline');
const User = require('../models/User');
const { SimpleAgent } = require('@mariposa-plus/agent-sdk');
const MCPMarketDataService = require('./mcpMarketDataService');

// Initialize Agenda
const agenda = new Agenda({
  db: {
    address: process.env.MONGODB_URI || 'mongodb://localhost:27017/mariposa',
    collection: 'agendaJobs'
  }
});

// Define pipeline execution job
agenda.define('execute pipeline', async (job) => {
  const { pipelineId, pipeline } = job.attrs.data;
  
  try {
    console.log(`Executing pipeline: ${pipeline.name} (${pipelineId})`);
    
    // Get user details for agent initialization
    const user = await User.findById(pipeline.userId);
    if (!user || !user.walletDetails) {
      throw new Error('User wallet details not found');
    }

    // Initialize SimpleAgent
    const agent = new SimpleAgent({
      privateKey: user.walletDetails.privateKey,
      address: user.walletDetails.address,
      rpcUrl: process.env.SEI_RPC_URL || 'https://rpc.sei-apis.com',
      chainId: 'pacific-1',
      contractAddresses: {
        multicall: process.env.MULTICALL_CONTRACT,
        uniswap: process.env.UNISWAP_CONTRACT
      }
    });

    // Execute pipeline events and actions
    const executionResult = await executePipelineLogic(agent, pipeline);
    
    // Update pipeline execution history
    await Pipeline.findByIdAndUpdate(pipelineId, {
      $push: {
        'metadata.executionHistory': {
          timestamp: new Date(),
          status: 'success',
          result: executionResult
        }
      },
      lastExecuted: new Date(),
      $inc: { executionCount: 1 }
    });

    console.log(`Pipeline executed successfully: ${pipeline.name}`);
    
  } catch (error) {
    console.error(`Error executing pipeline ${pipelineId}:`, error);
    
    // Update pipeline with error
    await Pipeline.findByIdAndUpdate(pipelineId, {
      $push: {
        'metadata.executionHistory': {
          timestamp: new Date(),
          status: 'error',
          error: error.message
        }
      },
      status: 'error'
    });
  }
});

// Execute pipeline logic based on events and actions
async function executePipelineLogic(agent, pipeline) {
  const results = [];

  for (const event of pipeline.events) {
    // Check if event condition is met
    const shouldExecute = await checkEventCondition(agent, event);
    
    if (shouldExecute) {
      console.log(`Event condition met: ${event.name}`);
      
      // Execute connected actions
      const connectedActions = getConnectedActions(pipeline, event.id);
      
      for (const action of connectedActions) {
        try {
          const actionResult = await executeAction(agent, action);
          results.push({
            eventId: event.id,
            actionId: action.id,
            result: actionResult,
            status: 'success'
          });
          
          console.log(`Action executed: ${action.name}`);
        } catch (error) {
          results.push({
            eventId: event.id,
            actionId: action.id,
            error: error.message,
            status: 'error'
          });
        }
      }
    }
  }

  return results;
}

// Check if event condition is met
async function checkEventCondition(agent, event) {
  try {
    switch (event.type) {
      case 'price_change':
        return await checkPriceChange(agent, event.config);
      
      case 'wallet_balance':
        return await checkBalanceThreshold(agent, event.config);
      
      case 'time_schedule':
        return checkTimeSchedule(event.config);
      
      case 'market_condition':
        return await checkMarketCondition(agent, event.config);
      
      default:
        console.log(`Unknown event type: ${event.type}`);
        return false;
    }
  } catch (error) {
    console.error(`Error checking event condition for ${event.name}:`, error);
    return false;
  }
}

// Execute action using agent-sdk
async function executeAction(agent, action) {
  switch (action.type) {
    case 'transfer':
      return await agent.transfer({
        token: action.config.token,
        amount: action.config.amount,
        recipient: action.config.recipient
      });
    
    case 'swap':
      return await agent.swap({
        fromToken: action.config.from_token,
        toToken: action.config.to_token,
        amount: action.config.amount
      });
    
    case 'stake':
      return await agent.stake({
        token: action.config.token,
        amount: action.config.amount,
        validator: action.config.validator
      });
    
    case 'notification':
      return await sendNotification(action.config);
    
    case 'strategy':
      return await executeStrategy(agent, action.config);
    
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

// Helper functions for event conditions
async function checkPriceChange(agent, config) {
  try {
    const currentPrice = await agent.getTokenPrice(config.token);
    const previousPrice = await getPreviousPrice(config.token);
    
    if (!previousPrice) return false;
    
    const changePercent = ((currentPrice - previousPrice) / previousPrice) * 100;
    
    switch (config.change_type) {
      case 'Increase':
        return changePercent >= config.percentage;
      case 'Decrease':
        return changePercent <= -config.percentage;
      case 'Any':
        return Math.abs(changePercent) >= config.percentage;
      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking price change:', error);
    return false;
  }
}

async function checkBalanceThreshold(agent, config) {
  try {
    const balance = await agent.getBalance(config.token);
    const threshold = parseFloat(config.amount);
    
    switch (config.threshold_type) {
      case 'Above':
        return balance > threshold;
      case 'Below':
        return balance < threshold;
      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking balance threshold:', error);
    return false;
  }
}

function checkTimeSchedule(config) {
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  // Simple time matching - in production, use more sophisticated scheduling
  return currentTime === config.time;
}

async function checkMarketCondition(agent, config) {
  // Placeholder for market condition logic
  // This would integrate with market data APIs
  return false;
}

// Helper functions
function getConnectedActions(pipeline, eventId) {
  const connectedActionIds = pipeline.connections
    .filter(conn => conn.from === eventId)
    .map(conn => conn.to);
  
  return pipeline.actions.filter(action => connectedActionIds.includes(action.id));
}

async function getPreviousPrice(token) {
  // This would typically store and retrieve from a database
  // For now, return null to indicate no previous price
  return null;
}

async function sendNotification(config) {
  // Implement notification logic (email, push, etc.)
  console.log(`Sending ${config.type} notification: ${config.message}`);
  return { sent: true, type: config.type, message: config.message };
}

async function executeStrategy(agent, config) {
  try {
    console.log(`Analyzing market for ${config.strategy_type} strategy with budget ${config.budget}`);
    
    // Initialize MCP service for market data
    const mcpService = new MCPMarketDataService();
    await mcpService.initialize();
    
    // Get market analysis
    const marketAnalysis = await getMarketAnalysis(mcpService, config);
    const strategyRecommendation = await getStrategyRecommendation(marketAnalysis, config);
    
    // Execute based on strategy type
    let executionResult;
    
    switch (config.strategy_type.toLowerCase()) {
      case 'dca':
        executionResult = await executeDCAStrategy(agent, config, marketAnalysis);
        break;
        
      case 'grid trading':
        executionResult = await executeGridStrategy(agent, config, marketAnalysis);
        break;
        
      case 'momentum':
        executionResult = await executeMomentumStrategy(agent, config, marketAnalysis);
        break;
        
      default:
        executionResult = await executeAutoStrategy(agent, config, strategyRecommendation);
    }
    
    return {
      strategy: config.strategy_type,
      status: 'executed',
      recommendation: strategyRecommendation,
      marketAnalysis: marketAnalysis,
      execution: executionResult
    };
    
  } catch (error) {
    console.error('Strategy execution error:', error);
    return {
      strategy: config.strategy_type,
      status: 'error',
      error: error.message
    };
  }
}

// Get comprehensive market analysis
async function getMarketAnalysis(mcpService, config) {
  try {
    // Get SEI market data
    const seiData = await mcpService.callTool('get_token_price', {
      network: 'sei-network',
      token_address: 'sei'
    });
    
    // Get trending tokens
    const trending = await mcpService.callTool('get_trending_tokens', {
      network: 'sei-network'
    });
    
    // Get market summary
    const marketSummary = await mcpService.callTool('get_market_summary', {
      network: 'sei-network'
    });
    
    // Analyze market conditions
    const marketConditions = analyzeMarketConditions(seiData, trending, marketSummary);
    
    return {
      currentPrice: seiData?.priceUSD || 0,
      priceChange24h: seiData?.priceChange?.h24 || 0,
      volume24h: seiData?.volume?.h24 || 0,
      marketCap: seiData?.marketCap || 0,
      trending: trending?.tokens || [],
      conditions: marketConditions,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Market analysis error:', error);
    return {
      error: 'Failed to get market data',
      conditions: 'unknown',
      timestamp: new Date()
    };
  }
}

// Analyze market conditions
function analyzeMarketConditions(priceData, trending, summary) {
  const priceChange = priceData?.priceChange?.h24 || 0;
  const volume = priceData?.volume?.h24 || 0;
  
  // Determine market trend
  let trend = 'neutral';
  if (priceChange > 5) trend = 'bullish';
  else if (priceChange > 2) trend = 'slightly_bullish';
  else if (priceChange < -5) trend = 'bearish';
  else if (priceChange < -2) trend = 'slightly_bearish';
  
  // Determine volatility
  let volatility = 'normal';
  if (Math.abs(priceChange) > 10) volatility = 'high';
  else if (Math.abs(priceChange) < 2) volatility = 'low';
  
  // Determine volume strength
  let volumeStrength = 'normal';
  if (volume > 10000000) volumeStrength = 'high';
  else if (volume < 1000000) volumeStrength = 'low';
  
  return {
    trend,
    volatility,
    volumeStrength,
    priceChange,
    volume,
    riskLevel: calculateRiskLevel(trend, volatility)
  };
}

// Calculate risk level based on market conditions
function calculateRiskLevel(trend, volatility) {
  if (volatility === 'high') return 'high';
  if (trend === 'bearish' && volatility === 'normal') return 'medium-high';
  if (trend === 'bullish' && volatility === 'low') return 'low';
  if (trend === 'neutral') return 'medium';
  return 'medium';
}

// Get strategy recommendation based on market analysis
async function getStrategyRecommendation(marketAnalysis, config) {
  const { conditions } = marketAnalysis;
  const budget = parseFloat(config.budget);
  
  let recommendation = {
    suggestedStrategy: '',
    reason: '',
    riskAssessment: '',
    expectedReturn: '',
    timeframe: config.duration || '1 month',
    actions: []
  };
  
  // Recommend based on market conditions
  if (conditions.trend === 'bearish' && conditions.volatility === 'high') {
    recommendation.suggestedStrategy = 'DCA';
    recommendation.reason = 'High volatility in bearish market favors dollar-cost averaging to reduce risk';
    recommendation.riskAssessment = 'Medium - DCA helps mitigate timing risk';
    recommendation.expectedReturn = '5-15% over duration';
    recommendation.actions = [
      `Split ${budget} SEI into ${getDCAIntervals(config.duration)} equal parts`,
      'Buy at regular intervals regardless of price',
      'Consider increasing purchases on significant dips (>5%)'
    ];
  } else if (conditions.trend === 'bullish' && conditions.volatility === 'low') {
    recommendation.suggestedStrategy = 'Momentum';
    recommendation.reason = 'Strong upward trend with low volatility favors momentum trading';
    recommendation.riskAssessment = 'Medium-Low - Following established trend';
    recommendation.expectedReturn = '10-25% over duration';
    recommendation.actions = [
      `Invest 60% of ${budget} SEI immediately`,
      'Reserve 40% for dip buying opportunities',
      'Set stop-loss at -5% from entry'
    ];
  } else if (conditions.volatility === 'high') {
    recommendation.suggestedStrategy = 'Grid Trading';
    recommendation.reason = 'High volatility creates profitable grid trading opportunities';
    recommendation.riskAssessment = 'Medium-High - Requires active management';
    recommendation.expectedReturn = '15-30% over duration';
    recommendation.actions = [
      `Set up ${getGridLevels(budget)} grid levels`,
      'Place buy orders 2-3% below current price',
      'Place sell orders 2-3% above current price',
      'Adjust grid spacing based on volatility'
    ];
  } else {
    recommendation.suggestedStrategy = 'Balanced DCA';
    recommendation.reason = 'Neutral market conditions favor consistent accumulation';
    recommendation.riskAssessment = 'Low-Medium - Conservative approach';
    recommendation.expectedReturn = '5-10% over duration';
    recommendation.actions = [
      `Invest ${budget / 4} SEI weekly`,
      'Maintain consistent schedule',
      'Review and adjust monthly based on performance'
    ];
  }
  
  return recommendation;
}

// Execute DCA Strategy
async function executeDCAStrategy(agent, config, marketAnalysis) {
  const intervals = getDCAIntervals(config.duration);
  const amountPerInterval = parseFloat(config.budget) / intervals;
  
  console.log(`Executing DCA: ${intervals} purchases of ${amountPerInterval} SEI`);
  
  // For immediate execution, make the first purchase
  // Schedule remaining purchases via Agenda
  
  return {
    type: 'DCA',
    intervals,
    amountPerInterval,
    firstPurchase: {
      amount: amountPerInterval,
      price: marketAnalysis.currentPrice,
      timestamp: new Date()
    },
    schedule: `Remaining ${intervals - 1} purchases scheduled`
  };
}

// Execute Grid Trading Strategy
async function executeGridStrategy(agent, config, marketAnalysis) {
  const gridLevels = getGridLevels(parseFloat(config.budget));
  const currentPrice = marketAnalysis.currentPrice;
  const gridSpacing = marketAnalysis.conditions.volatility === 'high' ? 0.03 : 0.02; // 3% or 2%
  
  const buyLevels = [];
  const sellLevels = [];
  
  for (let i = 1; i <= gridLevels / 2; i++) {
    buyLevels.push({
      price: currentPrice * (1 - gridSpacing * i),
      amount: parseFloat(config.budget) / gridLevels
    });
    sellLevels.push({
      price: currentPrice * (1 + gridSpacing * i),
      amount: parseFloat(config.budget) / gridLevels
    });
  }
  
  return {
    type: 'Grid',
    gridLevels,
    currentPrice,
    gridSpacing: `${gridSpacing * 100}%`,
    buyOrders: buyLevels,
    sellOrders: sellLevels
  };
}

// Execute Momentum Strategy
async function executeMomentumStrategy(agent, config, marketAnalysis) {
  const immediateInvestment = parseFloat(config.budget) * 0.6;
  const reserveFunds = parseFloat(config.budget) * 0.4;
  const stopLoss = marketAnalysis.currentPrice * 0.95; // 5% stop loss
  const takeProfit = marketAnalysis.currentPrice * 1.15; // 15% take profit
  
  return {
    type: 'Momentum',
    immediateInvestment,
    reserveFunds,
    entryPrice: marketAnalysis.currentPrice,
    stopLoss,
    takeProfit,
    riskRewardRatio: '1:3'
  };
}

// Execute Auto Strategy based on recommendation
async function executeAutoStrategy(agent, config, recommendation) {
  console.log(`Auto-executing recommended strategy: ${recommendation.suggestedStrategy}`);
  
  // Implement the recommended strategy
  const modifiedConfig = {
    ...config,
    strategy_type: recommendation.suggestedStrategy
  };
  
  switch (recommendation.suggestedStrategy) {
    case 'DCA':
      return await executeDCAStrategy(agent, modifiedConfig, { currentPrice: 0 });
    case 'Grid Trading':
      return await executeGridStrategy(agent, modifiedConfig, { currentPrice: 0, conditions: { volatility: 'normal' } });
    case 'Momentum':
      return await executeMomentumStrategy(agent, modifiedConfig, { currentPrice: 0 });
    default:
      return { type: 'Balanced', status: 'pending_implementation' };
  }
}

// Helper functions
function getDCAIntervals(duration) {
  switch (duration) {
    case '1 week': return 7;
    case '1 month': return 30;
    case '3 months': return 90;
    default: return 30;
  }
}

function getGridLevels(budget) {
  if (budget < 100) return 4;
  if (budget < 500) return 6;
  if (budget < 1000) return 8;
  return 10;
}

// Service methods
const pipelineExecutionService = {
  async schedulePipeline(pipelineId, pipeline) {
    const job = agenda.create('execute pipeline', {
      pipelineId,
      pipeline
    });
    
    // Schedule based on events (for now, run every 5 minutes)
    job.repeatEvery('5 minutes');
    await job.save();
    
    return job.attrs._id.toString();
  },

  async pausePipeline(jobId) {
    await agenda.cancel({ _id: jobId });
  },

  async resumePipeline(jobId) {
    // This would require re-creating the job
    // Implementation depends on specific requirements
  },

  async cancelPipeline(jobId) {
    await agenda.cancel({ _id: jobId });
  },

  async startAgenda() {
    await agenda.start();
    console.log('Pipeline execution service started');
  },

  async stopAgenda() {
    await agenda.stop();
    console.log('Pipeline execution service stopped');
  }
};

module.exports = pipelineExecutionService;