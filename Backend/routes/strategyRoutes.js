const express = require('express');
const router = express.Router();
const MCPMarketDataService = require('../services/mcpMarketDataService');

// Test strategy recommendation endpoint
router.post('/recommend', async (req, res) => {
  try {
    const { budget, duration, riskTolerance } = req.body;
    
    console.log('Getting strategy recommendation for:', { budget, duration, riskTolerance });
    
    // Initialize MCP service
    const mcpService = new MCPMarketDataService();
    await mcpService.initialize();
    
    // Get market analysis
    const marketAnalysis = await getMarketAnalysis(mcpService);
    const strategyRecommendation = await getStrategyRecommendation(marketAnalysis, {
      budget,
      duration,
      riskTolerance
    });
    
    res.json({
      success: true,
      data: {
        marketAnalysis,
        recommendation: strategyRecommendation,
        timestamp: new Date()
      }
    });
    
  } catch (error) {
    console.error('Strategy recommendation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get strategy recommendation',
      error: error.message
    });
  }
});

// Get current market analysis
router.get('/market-analysis', async (req, res) => {
  try {
    console.log('Getting market analysis...');
    
    // Initialize MCP service
    const mcpService = new MCPMarketDataService();
    await mcpService.initialize();
    
    // Get comprehensive market data
    const analysis = await getMarketAnalysis(mcpService);
    
    res.json({
      success: true,
      data: analysis
    });
    
  } catch (error) {
    console.error('Market analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get market analysis',
      error: error.message
    });
  }
});

// Helper functions (copied from pipelineExecutionService)
async function getMarketAnalysis(mcpService) {
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
    
    console.log('SEI Data:', seiData);
    console.log('Trending:', trending);
    console.log('Market Summary:', marketSummary);
    
    // Analyze market conditions
    const marketConditions = analyzeMarketConditions(seiData, trending, marketSummary);
    
    return {
      currentPrice: seiData?.priceUSD || 0.45, // Fallback price
      priceChange24h: seiData?.priceChange?.h24 || 0,
      volume24h: seiData?.volume?.h24 || 5000000,
      marketCap: seiData?.marketCap || 1500000000,
      trending: trending?.tokens || [],
      conditions: marketConditions,
      rawData: {
        seiData,
        trending,
        marketSummary
      },
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Market analysis error:', error);
    // Return fallback data for testing
    return {
      currentPrice: 0.45,
      priceChange24h: 2.5,
      volume24h: 8500000,
      marketCap: 1500000000,
      trending: [],
      conditions: {
        trend: 'slightly_bullish',
        volatility: 'normal',
        volumeStrength: 'normal',
        riskLevel: 'medium'
      },
      error: 'Using fallback data - ' + error.message,
      timestamp: new Date()
    };
  }
}

function analyzeMarketConditions(priceData, trending, summary) {
  const priceChange = priceData?.priceChange?.h24 || 2.5; // Fallback
  const volume = priceData?.volume?.h24 || 8500000;
  
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

function calculateRiskLevel(trend, volatility) {
  if (volatility === 'high') return 'high';
  if (trend === 'bearish' && volatility === 'normal') return 'medium-high';
  if (trend === 'bullish' && volatility === 'low') return 'low';
  if (trend === 'neutral') return 'medium';
  return 'medium';
}

async function getStrategyRecommendation(marketAnalysis, config) {
  const { conditions } = marketAnalysis;
  const budget = parseFloat(config.budget);
  
  let recommendation = {
    suggestedStrategy: '',
    reason: '',
    riskAssessment: '',
    expectedReturn: '',
    timeframe: config.duration || '1 month',
    actions: [],
    marketSignals: {
      bullishSignals: [],
      bearishSignals: [],
      neutralSignals: []
    }
  };
  
  // Analyze market signals
  if (conditions.trend.includes('bullish')) {
    recommendation.marketSignals.bullishSignals.push(`${conditions.priceChange > 0 ? '+' : ''}${conditions.priceChange}% price change in 24h`);
  }
  if (conditions.trend.includes('bearish')) {
    recommendation.marketSignals.bearishSignals.push(`${conditions.priceChange}% price decline in 24h`);
  }
  if (conditions.volumeStrength === 'high') {
    recommendation.marketSignals.bullishSignals.push('High trading volume indicates strong interest');
  }
  if (conditions.volatility === 'high') {
    recommendation.marketSignals.neutralSignals.push('High volatility creates both opportunities and risks');
  }
  
  // Recommend based on market conditions and risk tolerance
  if (conditions.trend === 'bearish' && conditions.volatility === 'high') {
    recommendation.suggestedStrategy = 'DCA (Dollar Cost Averaging)';
    recommendation.reason = 'High volatility in bearish market favors dollar-cost averaging to reduce timing risk';
    recommendation.riskAssessment = 'Medium Risk - DCA helps mitigate market timing risk';
    recommendation.expectedReturn = '5-15% over ' + config.timeframe;
    recommendation.actions = [
      `Split ${budget} SEI budget into ${getDCAIntervals(config.duration)} equal purchases`,
      'Execute purchases at regular intervals regardless of price movements',
      'Consider increasing purchase amounts during significant dips (>5%)',
      'Monitor for trend reversal signals to adjust strategy'
    ];
  } else if (conditions.trend === 'bullish' && conditions.volatility === 'low') {
    recommendation.suggestedStrategy = 'Momentum Trading';
    recommendation.reason = 'Strong upward trend with low volatility is ideal for momentum strategies';
    recommendation.riskAssessment = 'Medium-Low Risk - Following established upward trend';
    recommendation.expectedReturn = '10-25% over ' + config.timeframe;
    recommendation.actions = [
      `Invest 60% of ${budget} SEI budget immediately to capture momentum`,
      'Keep 40% in reserve for additional opportunities or dip buying',
      'Set stop-loss at -5% to protect against trend reversal',
      'Take partial profits at +15% and +25% levels'
    ];
  } else if (conditions.volatility === 'high') {
    recommendation.suggestedStrategy = 'Grid Trading';
    recommendation.reason = 'High volatility creates multiple profit opportunities through automated grid trading';
    recommendation.riskAssessment = 'Medium-High Risk - Requires active monitoring and adjustment';
    recommendation.expectedReturn = '15-30% over ' + config.timeframe;
    recommendation.actions = [
      `Set up ${getGridLevels(budget)} grid levels with ${budget} SEI budget`,
      'Place buy orders 2-3% below current market price',
      'Place sell orders 2-3% above current market price',
      'Adjust grid spacing based on volatility changes',
      'Rebalance grid weekly or after major price movements'
    ];
  } else {
    recommendation.suggestedStrategy = 'Balanced DCA';
    recommendation.reason = 'Neutral market conditions favor steady accumulation with balanced approach';
    recommendation.riskAssessment = 'Low-Medium Risk - Conservative long-term strategy';
    recommendation.expectedReturn = '5-12% over ' + config.timeframe;
    recommendation.actions = [
      `Invest ${Math.round(budget / 4)} SEI weekly for consistent accumulation`,
      'Maintain disciplined schedule regardless of short-term price moves',
      'Review and adjust monthly based on market condition changes',
      'Consider increasing allocation during major market dips'
    ];
  }
  
  // Add risk-specific adjustments
  if (config.riskTolerance === 'low') {
    recommendation.riskAssessment = recommendation.riskAssessment.replace('Medium-High', 'Medium').replace('High', 'Medium');
    recommendation.actions.push('⚠️ Risk-adjusted: Consider reducing position sizes by 25-50%');
  } else if (config.riskTolerance === 'high') {
    recommendation.actions.push('🚀 Risk-enhanced: Consider increasing leverage or position sizes');
  }
  
  return recommendation;
}

// Helper functions
function getDCAIntervals(duration) {
  switch (duration) {
    case '1 week': return 7;
    case '1 month': return 4; // Weekly purchases
    case '3 months': return 12; // Weekly purchases
    default: return 4;
  }
}

function getGridLevels(budget) {
  if (budget < 100) return 6;
  if (budget < 500) return 8;
  if (budget < 1000) return 10;
  return 12;
}

/**
 * Get strategy processing progress
 * GET /api/strategy/progress/:processingId
 */
router.get('/progress/:processingId', (req, res) => {
  try {
    const { processingId } = req.params;
    
    if (!global.strategyProgress) {
      return res.status(404).json({
        success: false,
        error: 'No progress tracking available'
      });
    }
    
    const progress = global.strategyProgress.get(processingId);
    
    if (!progress) {
      return res.status(404).json({
        success: false,
        error: 'Processing ID not found'
      });
    }
    
    res.json({
      success: true,
      processingId: processingId,
      progress: progress
    });
    
  } catch (error) {
    console.error('Error fetching strategy progress:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get completed strategy result
 * GET /api/strategy/result/:processingId
 */
router.get('/result/:processingId', (req, res) => {
  try {
    const { processingId } = req.params;
    
    if (!global.strategyResults) {
      return res.status(404).json({
        success: false,
        error: 'No results available'
      });
    }
    
    const strategyResult = global.strategyResults.get(processingId);
    
    if (!strategyResult) {
      return res.status(404).json({
        success: false,
        error: 'Result not found - processing may still be in progress'
      });
    }
    
    res.json({
      success: true,
      processingId: processingId,
      completedAt: strategyResult.completedAt,
      status: strategyResult.status,
      result: strategyResult.result
    });
    
  } catch (error) {
    console.error('Error fetching strategy result:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Check if strategy processing is complete
 * GET /api/strategy/status/:processingId
 */
router.get('/status/:processingId', (req, res) => {
  try {
    const { processingId } = req.params;
    
    const hasProgress = global.strategyProgress && global.strategyProgress.has(processingId);
    const hasResult = global.strategyResults && global.strategyResults.has(processingId);
    
    if (!hasProgress && !hasResult) {
      return res.status(404).json({
        success: false,
        error: 'Processing ID not found'
      });
    }
    
    if (hasResult) {
      const result = global.strategyResults.get(processingId);
      return res.json({
        success: true,
        processingId: processingId,
        status: 'completed',
        completedAt: result.completedAt,
        resultStatus: result.status
      });
    }
    
    if (hasProgress) {
      const progress = global.strategyProgress.get(processingId);
      return res.json({
        success: true,
        processingId: processingId,
        status: progress.completed ? 'completed' : 'processing',
        currentStage: progress.stage,
        percentage: progress.percentage
      });
    }
    
  } catch (error) {
    console.error('Error checking strategy status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;