const { validationResult } = require('express-validator');
const messageClassificationService = require('../services/messageClassificationService');
const actionsProcessingService = require('../services/actionsProcessingService');
const seiAgentService = require('../services/seiAgentService');
const EnhancedIntentService = require('../services/enhancedIntentService');
const enhancedSwapIntentService = require('../services/enhancedSwapIntentService');
const strategyProcessingService = require('../services/strategyProcessingService');
const Agent = require('../models/Agent');
const { fetchMarketData } = require('../utils/marketData');
const MCPMarketDataService = require('../services/mcpMarketDataService');

// Initialize Together AI for information processing
let Together;
try {
  Together = require('together-ai').default;
} catch (error) {
  console.warn('Together AI package not available - install with: npm install together-ai');
}

let together;
if (Together && process.env.TOGETHER_API_KEY) {
  try {
    together = new Together({
      apiKey: process.env.TOGETHER_API_KEY
    });
    
    // Set global instance for use in other services
    global.togetherAI = together;
    
    console.log('✅ TogetherAI initialized successfully and set globally');
  } catch (error) {
    console.error('❌ Together AI initialization failed:', error.message);
  }
} else {
  console.warn('⚠️ TogetherAI not configured. Set TOGETHER_API_KEY environment variable.');
}

// Initialize Enhanced Intent Service
const enhancedIntentService = new EnhancedIntentService();

// Initialize Portfolio Controller
const PortfolioController = require('./portfolioController');
const portfolioController = new PortfolioController();

// Initialize MCP Market Data Service
let mcpMarketDataService = null;
try {
  mcpMarketDataService = new MCPMarketDataService();
  console.log('🔄 MCP Market Data Service created, initializing connection...');
  
  // Initialize the service asynchronously
  mcpMarketDataService.initialize().then(() => {
    console.log('✅ MCP Market Data Service initialized and connected');
  }).catch((initError) => {
    console.warn('⚠️ MCP Market Data Service initialization failed:', initError.message);
    mcpMarketDataService = null; // Disable if initialization fails
  });
} catch (error) {
  console.warn('⚠️ MCP Market Data Service creation failed:', error.message);
}

class PromptRouterController {
  /**
   * Convert BigInt values to strings for JSON serialization
   * @param {any} obj - Object that may contain BigInt values
   * @returns {any} Object with BigInt values converted to strings
   */
  sanitizeBigInt(obj) {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (typeof obj === 'bigint') {
      return obj.toString();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeBigInt(item));
    }
    
    if (typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeBigInt(value);
      }
      return sanitized;
    }
    
    return obj;
  }

  /**
   * Main prompt router endpoint - Two Layer Processing
   * Layer 1: Message Classification
   * Layer 2: Specialized LLM Processing
   */
  routePrompt = async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
      }
      
      const { message, userId, agentId: requestAgentId, execute = false } = req.body;
      
      let agentId = requestAgentId;
      if (agentId == "default" || agentId == "master-agent")
      {
        // Check if Agent model exists before querying
        if (!Agent) {
          throw new Error('Agent model is not properly imported');
        }
        console.log('🔍 Searching for agent with userId:', userId);
        const agent = await Agent.findOne({ userId: userId });
        if (!agent) {
          throw new Error('No agent found for this user');
        }
        agentId = agent._id;

      }
      const startTime = Date.now();

      console.log(`🚀 Prompt Router: Processing message from user ${userId || 'anonymous'}`);

      // LAYER 1: Message Classification
      console.log('📋 Layer 1: Classifying message type...');
      const classification = await messageClassificationService.classifyMessage(message);
      
      console.log(`✅ Classification: ${classification.type} (confidence: ${classification.confidence})`);
      if (classification.actionSubtype) {
        console.log(`🔧 Action Subtype: ${classification.actionSubtype}`);
      }

      // LAYER 2: Route to specialized processing based on type
      let processingResult;
      
      switch (classification.type) {
        case 'actions':
          console.log('⚡ Layer 2: Processing with Actions LLM...');
          
          // Special routing for transfer actions
          if (classification.actionSubtype === 'transfer') {
            console.log('💸 Transfer detected - using Enhanced Transfer Service');
            
            const EnhancedTransferService = require('../services/enhancedTransferService');
            const transferService = new EnhancedTransferService();
            
            const transferResult = await transferService.processTransferRequest(message, userId, agentId);
            
            processingResult = {
              success: transferResult.success,
              type: 'transfer',
              status: transferResult.status,
              result: transferResult,
              timestamp: new Date().toISOString()
            };
          } else {
            const actionOptions = { execute, agentId, userId };
            processingResult = await this.processActions(message, classification, actionOptions);
          }
          break;
          
        case 'strategy':
          console.log('📈 Layer 2: Processing strategy with enhanced market intelligence...');
          
          // Get comprehensive market intelligence for strategy
          const networkMentions = this.extractNetworkMentions(message);
          const targetNetwork = networkMentions.length > 0 ? networkMentions[0] : 'sei-evm';
          const marketIntelligence = await this.getComprehensiveMarketIntelligence(targetNetwork, message);
          
          const strategyOptions = { 
            userId, 
            agentId, 
            execute: execute,
            marketIntelligence: marketIntelligence,
            enhancedData: true
          };
          processingResult = await this.processStrategy(message, classification, strategyOptions);
          
          // Enhance result with market intelligence
          if (processingResult && processingResult.result) {
            processingResult.result.marketIntelligence = marketIntelligence;
            processingResult.result.networkAnalyzed = targetNetwork;
          }
          break;
          
        case 'information':
          console.log('ℹ️  Layer 2: Information processing with comprehensive market data...');
          
          // Get comprehensive market intelligence for information
          const infoNetworkMentions = this.extractNetworkMentions(message);
          const infoTargetNetwork = infoNetworkMentions.length > 0 ? infoNetworkMentions[0] : 'sei-evm';
          const infoMarketIntelligence = await this.getComprehensiveMarketIntelligence(infoTargetNetwork, message);
          
          processingResult = await this.processInformation(message, classification);
          
          // Enhance result with market intelligence
          if (processingResult && processingResult.result) {
            processingResult.result.marketIntelligence = infoMarketIntelligence;
            processingResult.result.networkAnalyzed = infoTargetNetwork;
            processingResult.result.enhancedFeatures = {
              newPoolsDetection: true,
              newTokensDiscovery: true,
              trendingAnalysis: true
            };
          }
          break;
          
        case 'feedbacks':
          console.log('💬 Layer 2: Feedback processing (placeholder)...');
          processingResult = await this.processFeedbacks(message, classification);
          break;
          
        default:
          console.log('❓ Layer 2: Unknown type, using default processing...');
          processingResult = await this.processDefault(message, classification);
      }

      const processingTime = Date.now() - startTime;
      console.log(`✨ Prompt Router: Completed in ${processingTime}ms`);

      // Return comprehensive result
      const response = {
        success: true,
        data: {
          // Layer 1 results
          classification: {
            type: classification.type,
            confidence: classification.confidence,
            reasoning: classification.reasoning,
            keywords: classification.keywords,
            actionSubtype: classification.actionSubtype
          },
          
          // Layer 2 results  
          processing: processingResult,
          
          // Metadata
          metadata: {
            originalMessage: message,
            userId: userId || null,
            agentId: agentId ? String(agentId) : null,
            processingTime: `${processingTime}ms`,
            timestamp: new Date().toISOString(),
            routerVersion: '1.0.0'
          }
        }
      };

      // Sanitize BigInt values before sending response
      const sanitizedResponse = this.sanitizeBigInt(response);
      res.json(sanitizedResponse);

    } catch (error) {
      console.error('❌ Prompt Router Error:', error);
      
      const errorResponse = {
        success: false,
        message: 'Prompt routing failed',
        error: error.message,
        metadata: {
          timestamp: new Date().toISOString(),
          routerVersion: '1.0.0'
        }
      };
      
      // Sanitize BigInt values in error response
      const sanitizedErrorResponse = this.sanitizeBigInt(errorResponse);
      res.status(500).json(sanitizedErrorResponse);
    }
  }

  /**
   * Process actions type messages (IMPLEMENTED)
   * @param {string} message - User message
   * @param {Object} classification - Classification result
   * @param {Object} options - Processing options
   * @returns {Object} Actions processing result
   */
  processActions = async (message, classification, options = {}) => {
    try {
      const actionResult = await actionsProcessingService.processAction(message, classification, options);
      
      return {
        type: 'actions',
        subtype: classification.actionSubtype,
        result: actionResult,
        status: 'completed',
        processingMethod: 'specialized_actions_llm'
      };
      
    } catch (error) {
      console.error('Actions processing error:', error);
      
      return {
        type: 'actions',
        subtype: classification.actionSubtype,
        result: {
          error: 'Actions processing failed',
          fallback: 'Please try rephrasing your request or contact support'
        },
        status: 'error',
        processingMethod: 'error_fallback'
      };
    }
  }

  /**
   * Process strategy type messages - AI-Powered Strategy Analysis with Metrics and Action Plans
   * @param {string} message - User message
   * @param {Object} classification - Classification result
   * @param {Object} options - Processing options with userId and agentId
   * @returns {Object} Strategy processing result
   */
  processStrategy = async (message, classification, options = {}) => {
    try {
      console.log('📈 Processing strategy request with real-time market analysis...');
      console.log('📝 Strategy message:', message);
      console.log('🏷️ Classification:', classification.type, '-', classification.actionSubtype);
      console.log('👤 Options:', options);
      
      // Extract potential token mentions from message
      const tokenMentions = this.extractTokenMentions(message);
      
      // Get comprehensive REAL-TIME market data for strategy analysis
      let marketData = {};
      try {
        if (seiAgentService) {
          console.log('🌊 Fetching real-time SEI market data...');
          const topTokens = seiAgentService.getTopTokens ? seiAgentService.getTopTokens(50) : [];
          const seiStats = seiAgentService.getStats ? seiAgentService.getStats() : {};
          
          // Get specific real-time data for mentioned tokens
          const strategyTokens = [];
          for (const tokenSymbol of tokenMentions) {
            try {
              const searchResults = seiAgentService.searchTokens ? seiAgentService.searchTokens(tokenSymbol) : [];
              if (searchResults.length > 0) {
                const tokenInfo = searchResults[0];
                // Get live market data for more accurate analysis
                const liveData = await seiAgentService.getLiveTokenData(tokenInfo.id);
                const analysis = seiAgentService.analyzeToken ? await seiAgentService.analyzeToken(tokenInfo.id) : null;
                strategyTokens.push({
                  token: tokenInfo,
                  liveData: liveData?.success ? liveData.data : null,
                  analysis: analysis?.success ? analysis.analysis : null
                });
              }
            } catch (tokenError) {
              console.warn(`Failed to fetch strategy data for ${tokenSymbol}:`, tokenError.message);
            }
          }
          
          marketData = {
            topTokens,
            strategyTokens,
            seiStats,
            marketCap: topTokens.reduce((sum, t) => sum + (parseFloat(t.marketCap) || 0), 0),
            totalVolume: topTokens.reduce((sum, t) => sum + (parseFloat(t.volume24h) || 0), 0),
            avgPrice: topTokens.length > 0 ? topTokens.reduce((sum, t) => sum + (parseFloat(t.priceUsd) || 0), 0) / topTokens.length : 0,
            volatilityIndex: this.calculateVolatilityIndex(topTokens),
            marketTrend: this.determineMarketTrend(topTokens),
            liquidityScore: this.calculateLiquidityScore(topTokens),
            timestamp: new Date().toISOString()
          };
          
          console.log('✅ Real-time market data fetched:', {
            tokensCount: topTokens.length,
            marketCap: `$${(marketData.marketCap / 1000000).toFixed(1)}M`,
            volume24h: `$${(marketData.totalVolume / 1000000).toFixed(1)}M`,
            mentionedTokens: tokenMentions.length
          });
        }
      } catch (dataError) {
        console.error('❌ Market data fetch failed for strategy:', dataError.message);
        marketData = { 
          topTokens: [], 
          strategyTokens: [], 
          seiStats: {}, 
          marketCap: 0, 
          totalVolume: 0,
          avgPrice: 0,
          volatilityIndex: 0,
          marketTrend: 'unknown',
          liquidityScore: 0,
          timestamp: new Date().toISOString() 
        };
      }
      
      // Use AI for comprehensive strategy analysis with actionable tasks
      let strategyAnalysis = {};
      if (together) {
        try {
          console.log('🤖 Using TogetherAI for dynamic strategy analysis...');
          
          const strategyPrompt = this.buildEnhancedStrategyPrompt(message, tokenMentions, marketData);
          
          const aiResponse = await together.chat.completions.create({
            model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
            messages: [
              {
                role: 'system',
                content: strategyPrompt.system
              },
              {
                role: 'user',
                content: strategyPrompt.user
              }
            ],
            max_tokens: 6000,
            temperature: 0.3,
            top_p: 0.9,
            response_format: { type: 'json_object' }
          });
          
          console.log('✅ TogetherAI strategy response received');
          
          const responseContent = aiResponse.choices[0].message.content;
          strategyAnalysis = JSON.parse(responseContent);
          
          console.log('🎯 AI strategy analysis completed with action plan');
          
        } catch (aiError) {
          console.error('❌ TogetherAI strategy analysis failed:', aiError.message);
          strategyAnalysis = this.generateBasicStrategyAnalysis(message, tokenMentions, marketData);
        }
      } else {
        console.log('⚠️ TogetherAI not available, using basic strategy analysis');
        strategyAnalysis = this.generateBasicStrategyAnalysis(message, tokenMentions, marketData);
      }
      
      // Ensure proper structure and enhance with actionable tasks
      strategyAnalysis = this.validateAndEnhanceStrategyResponse(strategyAnalysis, marketData, tokenMentions);
      
      // Save strategy to database if userId and agentId are provided
      let savedStrategy = null;
      let executorAgent = null;
      
      if (options.userId && options.agentId) {
        try {
          console.log('💾 Saving strategy to database...');
          savedStrategy = await this.saveStrategyToDatabase(strategyAnalysis, message, marketData, options);
          
          console.log('🤖 Creating integrated executor agent...');
          const actionExecutionService = require('../services/actionExecutionService');
          const agentCreationResult = await actionExecutionService.createExecutorAgent(
            savedStrategy,
            options.userId,
            options.agentId
          );
          
          executorAgent = agentCreationResult.executorAgent;
          const standardAgent = agentCreationResult.standardAgent;
          
          console.log('✅ Strategy, standard agent, and executor agent created successfully:', {
            strategy: savedStrategy._id,
            standardAgent: standardAgent._id,
            executorAgent: executorAgent._id
          });
        } catch (dbError) {
          console.error('❌ Error saving strategy or creating executor agent:', dbError.message);
        }
      }
      
      return {
        type: 'strategy',
        result: {
          strategy: strategyAnalysis.strategy || {},
          analysis: strategyAnalysis.analysis || {},
          recommendations: strategyAnalysis.recommendations || [],
          riskAssessment: strategyAnalysis.riskAssessment || {},
          implementation: strategyAnalysis.implementation || {},
          performance: strategyAnalysis.performance || {},
          timeline: strategyAnalysis.timeline || {},
          actionPlan: strategyAnalysis.actionPlan || {},
          marketContext: {
            timestamp: marketData.timestamp,
            marketCap: marketData.marketCap,
            totalVolume: marketData.totalVolume,
            marketTrend: marketData.marketTrend,
            volatilityIndex: marketData.volatilityIndex
          }
        },
        metadata: {
          savedStrategy: savedStrategy ? {
            id: savedStrategy._id,
            status: savedStrategy.status,
            executionStatus: savedStrategy.executionStatus
          } : null,
          executorAgent: executorAgent ? {
            id: executorAgent._id,
            status: executorAgent.status,
            capabilities: executorAgent.capabilities
          } : null,
          standardAgent: executorAgent ? {
            id: executorAgent.parentAgentId,
            name: `${strategyAnalysis.strategy?.type || 'Strategy'} Agent`,
            linkedToUser: true
          } : null,
          marketDataUsed: {
            tokensAnalyzed: marketData.topTokens?.length || 0,
            realTimeData: true,
            dataSource: 'seiAgentService'
          }
        },
        status: 'completed',
        processingMethod: together ? 'ai_powered_dynamic_strategy_analysis' : 'basic_strategy_analysis',
        confidence: strategyAnalysis.confidence || 'medium',
        aiEnhanced: !!together
      };
      
    } catch (error) {
      console.error('❌ Strategy processing error:', error);
      
      return {
        type: 'strategy',
        result: {
          error: 'Strategy analysis failed',
          fallback: 'Unable to provide detailed strategy analysis. This could be due to limited data or temporary service issues.',
          basicStrategy: this.generateBasicStrategy(message, this.extractTokenMentions(message)),
          suggestions: [
            'Specify your investment goals (growth, income, stability)',
            'Mention your risk tolerance (low, medium, high)',
            'Include your investment timeline (short, medium, long-term)',
            'List specific tokens you\'re considering (SEI, USDC, WBTC)'
          ],
          availableTokens: seiAgentService ? seiAgentService.getTopTokens(5).map(t => t.symbol) : ['SEI', 'USDC', 'WBTC']
        },
        status: 'error',
        processingMethod: 'error_fallback'
      };
    }
  }

  /**
   * Process information type messages - AI-Powered Dynamic Market Analysis
   * @param {string} message - User message
   * @param {Object} classification - Classification result
   * @returns {Object} Information processing result
   */
  processInformation = async (message, classification) => {
    try {
      console.log('🧠 Processing information request with AI-powered market analysis...');
      console.log('📝 Original message:', message);
      console.log('🏷️ Classification:', classification.type, '-', classification.actionSubtype);
      
      // Initialize Together AI if not already done
      if (!together && process.env.TOGETHER_API_KEY) {
        try {
          const Together = require('together-ai').default;
          together = new Together({
            apiKey: process.env.TOGETHER_API_KEY
          });
          console.log('🔄 TogetherAI re-initialized for information processing');
        } catch (error) {
          console.error('❌ Together AI re-initialization failed:', error.message);
          throw new Error(`AI service initialization failed: ${error.message}`);
        }
      }

      if (!together) {
        console.error('❌ TogetherAI not available');
        throw new Error('AI service not available. Please set TOGETHER_API_KEY environment variable and install together-ai package.');
      }

      // Extract token queries from message
      const tokenMentions = this.extractTokenMentions(message);
      const requestType = this.classifyInformationRequest(message);
      
      // Fetch comprehensive market data using MCP client
      console.log('📊 [INFORMATION] Starting market data fetch...');
      console.log('🔍 [INFORMATION] Data source priority: 1) MCP Server -> 2) Fallback API -> 3) Static Data');
      let marketData = {};
      
      try {
        if (mcpMarketDataService) {
          console.log('✅ [INFORMATION] MCP Market Data Service available - checking connection...');
          
          // Ensure the service is initialized before use
          if (!mcpMarketDataService.isConnected) {
            console.log('🔄 [INFORMATION] MCP Service not connected, attempting initialization...');
            try {
              await mcpMarketDataService.initialize();
              console.log('✅ [INFORMATION] MCP Service initialized successfully');
            } catch (initError) {
              console.warn('❌ [INFORMATION] MCP Service initialization failed:', initError.message);
              throw new Error(`MCP service initialization failed: ${initError.message}`);
            }
          }
          
          console.log('🔮 [INFORMATION] DATA SOURCE: MCP Server (market-mcp) via HTTP API');
          
          // Check if this is a SEI-specific request
          const isSEIRequest = message.toLowerCase().includes('sei') || 
                              tokenMentions.some(token => token.toLowerCase() === 'sei') ||
                              message.toLowerCase().includes('recommend') && 
                              (message.toLowerCase().includes('sei') || message.toLowerCase().includes('token'));
          
          let mcpContext;
          
          if (isSEIRequest) {
            console.log('🎯 [INFORMATION] Detected SEI-specific request - using SEI pipeline');
            
            // Determine recommendation criteria from message
            let criteria = 'balanced';
            if (message.toLowerCase().includes('safe')) criteria = 'safe';
            else if (message.toLowerCase().includes('growth') || message.toLowerCase().includes('high return')) criteria = 'growth';
            else if (message.toLowerCase().includes('stable')) criteria = 'stable';
            else if (message.toLowerCase().includes('new')) criteria = 'new_tokens';
            else if (message.toLowerCase().includes('trendy') || message.toLowerCase().includes('popular')) criteria = 'trendy_tokens';
            else if (message.toLowerCase().includes('high risk') || message.toLowerCase().includes('risky')) criteria = 'high_risk_high_reward';
            
            console.log(`🔍 [INFORMATION] Using SEI pipeline with criteria: ${criteria}`);
            
            // Use network-specific pipeline with automatic network detection
            console.log('🚀 [INFORMATION] Calling getSEINetworkPipeline...');
            const networkPipeline = await mcpMarketDataService.getSEINetworkPipeline({
              criteria,
              count: 5,
              includeDetailedPools: true,
              includeTokenSearch: true,
              userMessage: message // Let the service extract the network from the message
            });
            console.log('📊 [INFORMATION] getSEINetworkPipeline result:', {
              success: networkPipeline.success,
              hasData: !!networkPipeline.data,
              targetNetwork: networkPipeline.targetNetwork
            });
            
            if (networkPipeline.success) {
              console.log(`✅ [INFORMATION] ${networkPipeline.targetNetwork.toUpperCase()} pipeline completed successfully`);
              mcpContext = {
                success: true,
                data: {
                  topPools: { success: true, data: networkPipeline.data.pools },
                  tokenRecommendations: { success: true, data: networkPipeline.data.recommendations },
                  networkSpecific: { success: true, data: networkPipeline.data.tokenData },
                  network: networkPipeline.data.network,
                  pipeline: networkPipeline
                }
              };
            } else {
              console.warn('⚠️ [INFORMATION] SEI pipeline failed, using direct SEI fallback');
              
              // Fallback to general context when SEI pipeline fails
              console.log('🔄 [INFORMATION] Using general MCP context as fallback...');
              mcpContext = await mcpMarketDataService.getMarketContextForLLM({
                includeTopPools: true,
                includeTokenRecommendations: true,
                includePriceData: true,
                recommendationCriteria: criteria
              });
            }
          } else {
            console.log('🌐 [INFORMATION] General market request - using standard context');
            console.log('🚀 [INFORMATION] Calling getMarketContextForLLM...');
            // Get general market context for non-SEI requests
            mcpContext = await mcpMarketDataService.getMarketContextForLLM({
              includeTopPools: true,
              includeTokenRecommendations: true,
              includePriceData: true,
              recommendationCriteria: 'balanced'
            });
            console.log('📊 [INFORMATION] getMarketContextForLLM result:', {
              success: mcpContext.success,
              hasTopPools: !!mcpContext.data?.topPools,
              hasRecommendations: !!mcpContext.data?.tokenRecommendations
            });
          }
          
          // Get additional data based on token mentions
          let specificTokenData = [];
          if (tokenMentions.length > 0) {
            console.log(`🎯 Fetching specific data for tokens: ${tokenMentions.join(', ')}`);
            
          for (const tokenSymbol of tokenMentions) {
            try {
                const searchResult = await mcpMarketDataService.searchPools(tokenSymbol);
                if (searchResult.success) {
                specificTokenData.push({
                    token: { symbol: tokenSymbol, name: tokenSymbol },
                    searchData: searchResult.data,
                    source: 'MCP'
                  });
              }
            } catch (tokenError) {
                console.warn(`Failed to search for token ${tokenSymbol}:`, tokenError.message);
              }
            }
          }
          
          // Parse MCP data into structured format
          let topTokens, seiStats, dataSourceType;
          
          if (mcpContext.data.pipeline) {
            // SEI Pipeline data
            console.log('📊 [INFORMATION] Processing SEI pipeline data...');
            topTokens = this.parseMCPPoolData(mcpContext.data.topPools?.data || '');
            seiStats = {
              totalTokens: topTokens.length,
              activeTokens: topTokens.filter(t => t.volume24h > 0).length,
              totalPools: topTokens.length,
              mcpConnected: mcpContext.success,
              networkId: mcpContext.data.network?.id || 'sei',
              networkName: mcpContext.data.network?.name || 'SEI Network',
              pipelineSteps: mcpContext.data.pipeline.steps.length,
              pipelineSuccess: mcpContext.data.pipeline.success
            };
            dataSourceType = 'SEI_PIPELINE';
            
            console.log(`🎯 [INFORMATION] SEI pipeline processed: ${seiStats.pipelineSteps} steps, network: ${seiStats.networkId}`);
          } else {
            // General MCP data
            console.log('🌐 [INFORMATION] Processing general MCP data...');
            topTokens = this.parseMCPPoolData(mcpContext.data.topPools?.data || '');
            seiStats = {
              totalTokens: topTokens.length,
              activeTokens: topTokens.filter(t => t.volume24h > 0).length,
              totalPools: topTokens.length,
              mcpConnected: mcpContext.success
            };
            dataSourceType = 'MCP_GENERAL';
          }
          
          // Get token recommendations for analysis
          let tokenRecommendations = [];
          if (mcpContext.data.tokenRecommendations?.success) {
            console.log('✅ [INFORMATION] MCP Server provided token recommendations');
            console.log('📈 [INFORMATION] MCP recommendation data size:', mcpContext.data.tokenRecommendations.data?.length || 'N/A');
            tokenRecommendations = this.parseMCPRecommendations(mcpContext.data.tokenRecommendations.data);
          } else {
            console.log('⚠️ [INFORMATION] MCP Server token recommendations failed or empty');
          }
          
          // Structure market data for AI processing
          marketData = {
            topTokens,
            specificTokens: specificTokenData,
            tokenRecommendations,
            seiStats,
            marketCap: topTokens.reduce((sum, t) => sum + (parseFloat(t.marketCap) || 0), 0),
            totalVolume: topTokens.reduce((sum, t) => sum + (parseFloat(t.volume24h) || 0), 0),
            averagePrice: topTokens.length > 0 ? topTokens.reduce((sum, t) => sum + (parseFloat(t.priceUsd) || 0), 0) / topTokens.length : 0,
            activeTokens: topTokens.filter(t => t.inTopPools || t.volume24h > 0).length,
            timestamp: new Date().toISOString(),
            requestType: requestType,
            mentionedTokens: tokenMentions.length,
            dataSource: dataSourceType || 'MCP_CLIENT',
            mcpStatus: mcpContext.success ? 'connected' : 'disconnected',
            seiPipeline: mcpContext.data.pipeline || null,
            networkInfo: mcpContext.data.network || null,
            isSEISpecific: !!mcpContext.data.pipeline
          };
          
          if (dataSourceType === 'SEI_PIPELINE') {
            console.log('🎉 [INFORMATION] ✅ SUCCESS: SEI PIPELINE DATA RETRIEVED');
            console.log('📊 [INFORMATION] SEI Pipeline Summary:', {
              dataSource: dataSourceType,
              networkId: seiStats.networkId,
              networkName: seiStats.networkName,
              pipelineSteps: seiStats.pipelineSteps,
              pipelineSuccess: seiStats.pipelineSuccess,
              tokensCount: topTokens.length,
              marketCap: `$${(marketData.marketCap / 1000000).toFixed(1)}M`,
              volume24h: `$${(marketData.totalVolume / 1000000).toFixed(1)}M`,
              recommendationsCount: tokenRecommendations.length,
              serverStatus: mcpContext.success ? '🟢 SEI_CONNECTED' : '🔴 SEI_DISCONNECTED'
            });
            console.log('🎯 [INFORMATION] AI will receive REAL-TIME SEI NETWORK data via MCP pipeline');
        } else {
            console.log('🎉 [INFORMATION] ✅ SUCCESS: MCP SERVER DATA RETRIEVED');
            console.log('📊 [INFORMATION] MCP Data Summary:', {
              dataSource: dataSourceType || 'MCP_CLIENT',
              tokensCount: topTokens.length,
              marketCap: `$${(marketData.marketCap / 1000000).toFixed(1)}M`,
              volume24h: `$${(marketData.totalVolume / 1000000).toFixed(1)}M`,
              mentionedTokens: tokenMentions.length,
              mcpConnected: mcpContext.success,
              recommendationsCount: tokenRecommendations.length,
              serverStatus: mcpContext.success ? '🟢 CONNECTED' : '🔴 DISCONNECTED'
            });
            console.log('✨ [INFORMATION] AI will receive REAL-TIME MCP data for analysis');
          }
          
        } else {
          console.warn('❌ [INFORMATION] MCP Market Data Service NOT AVAILABLE');
          console.log('🔄 [INFORMATION] DATA SOURCE: Switching to FALLBACK API');
          // Fallback to original method with enhanced fallback data
          try {
            console.log('🌐 [INFORMATION] Attempting fallback API call to fetchMarketData...');
            const realTimeMarketData = await fetchMarketData(['BTC', 'ETH', 'SEI', 'USDC', 'USDT', 'WBTC', 'DAI', 'LINK']);
            
            // Use real-time data if available
            const topTokens = Object.entries(realTimeMarketData.tokens || {}).map(([symbol, data]) => ({
              symbol,
              name: data.name || symbol,
              priceUsd: data.price || 0,
              change24h: data.change24h || 0,
              marketCap: data.marketCap || 0,
              volume24h: data.volume24h || 0,
              inTopPools: true,
              source: 'fallback_api'
            }));
            
            marketData = {
              topTokens,
              specificTokens: [],
              tokenRecommendations: [],
              seiStats: { totalTokens: topTokens.length, activeTokens: topTokens.length, totalPools: 0 },
              marketCap: topTokens.reduce((sum, t) => sum + (parseFloat(t.marketCap) || 0), 0),
              totalVolume: topTokens.reduce((sum, t) => sum + (parseFloat(t.volume24h) || 0), 0),
              averagePrice: topTokens.length > 0 ? topTokens.reduce((sum, t) => sum + (parseFloat(t.priceUsd) || 0), 0) / topTokens.length : 0,
              activeTokens: topTokens.length,
              timestamp: new Date().toISOString(),
              requestType: requestType,
              mentionedTokens: tokenMentions.length,
              dataSource: 'FALLBACK_API',
              mcpStatus: 'disconnected'
            };
            
            console.log('🎉 [INFORMATION] ✅ SUCCESS: FALLBACK API DATA RETRIEVED');
            console.log('📊 [INFORMATION] Fallback Data Summary:', {
              dataSource: 'FALLBACK_API',
              tokensCount: topTokens.length,
              marketCap: `$${(marketData.marketCap / 1000000).toFixed(1)}M`,
              volume24h: `$${(marketData.totalVolume / 1000000).toFixed(1)}M`,
              serverStatus: '🟡 FALLBACK_API'
            });
            console.log('⚡ [INFORMATION] AI will receive FALLBACK API data for analysis');
          } catch (fallbackError) {
            console.error('❌ [INFORMATION] FALLBACK API FAILED:', fallbackError.message);
            console.warn('🔄 [INFORMATION] DATA SOURCE: Switching to STATIC FALLBACK DATA');
            // Final fallback to static data
          marketData = {
            topTokens: [
                { symbol: 'SEI', name: 'Sei', priceUsd: 0.45, change24h: 2.1, marketCap: 1800000000, volume24h: 35000000, inTopPools: true, source: 'static' },
                { symbol: 'USDC', name: 'USD Coin', priceUsd: 1.00, change24h: 0.1, marketCap: 850000000, volume24h: 125000000, inTopPools: true, source: 'static' },
                { symbol: 'WBTC', name: 'Wrapped Bitcoin', priceUsd: 43250, change24h: 2.4, marketCap: 45000000, volume24h: 8500000, inTopPools: true, source: 'static' },
                { symbol: 'ETH', name: 'Ethereum', priceUsd: 2450, change24h: 1.8, marketCap: 65000000, volume24h: 15000000, inTopPools: true, source: 'static' },
                { symbol: 'USDT', name: 'Tether USD', priceUsd: 1.00, change24h: 0.05, marketCap: 520000000, volume24h: 85000000, inTopPools: true, source: 'static' }
            ],
            specificTokens: [],
              tokenRecommendations: [],
              seiStats: { totalTokens: 450, activeTokens: 95, totalPools: 65 },
              marketCap: 3280000000,
              totalVolume: 268500000,
              averagePrice: 9441.01,
            activeTokens: 5,
            timestamp: new Date().toISOString(),
            requestType: requestType,
              mentionedTokens: tokenMentions.length,
              dataSource: 'STATIC_FALLBACK',
              mcpStatus: 'disconnected'
            };
            
            console.log('🎉 [INFORMATION] ✅ SUCCESS: STATIC FALLBACK DATA LOADED');
            console.log('📊 [INFORMATION] Static Data Summary:', {
              dataSource: 'STATIC_FALLBACK',
              tokensCount: marketData.topTokens.length,
              marketCap: `$${(marketData.marketCap / 1000000).toFixed(1)}M`,
              volume24h: `$${(marketData.totalVolume / 1000000).toFixed(1)}M`,
              serverStatus: '🔴 STATIC_ONLY'
            });
            console.log('⚠️ [INFORMATION] AI will receive STATIC FALLBACK data (not real-time)');
          }
        }
      } catch (dataError) {
        console.error('💥 [INFORMATION] CRITICAL ERROR: All data sources failed!');
        console.error('❌ [INFORMATION] Error details:', dataError.message);
        console.error('❌ [INFORMATION] Full error stack:', dataError.stack);
        console.error('❌ [INFORMATION] MCP Service available?', !!mcpMarketDataService);
        if (mcpMarketDataService) {
          console.error('❌ [INFORMATION] MCP Service methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(mcpMarketDataService)));
        }
        console.log('🔄 [INFORMATION] DATA SOURCE: Emergency empty data structure');
        marketData = {
          topTokens: [],
          specificTokens: [],
          tokenRecommendations: [],
          seiStats: {},
          marketCap: 0,
          totalVolume: 0,
          averagePrice: 0,
          activeTokens: 0,
          timestamp: new Date().toISOString(),
          requestType: requestType,
          mentionedTokens: tokenMentions.length,
          dataSource: 'ERROR_FALLBACK',
          mcpStatus: 'error',
          error: 'Market data unavailable'
        };
        console.log('⚠️ [INFORMATION] AI will receive EMPTY data structure');
      }

      // Final data source confirmation log
      console.log('🏁 [INFORMATION] FINAL DATA SOURCE CONFIRMED:', marketData.dataSource || 'UNKNOWN');
      console.log('📈 [INFORMATION] Market data ready for AI processing with', marketData.topTokens?.length || 0, 'tokens');

      // Prepare AI prompt for dynamic analysis with enhanced market intelligence
      console.log('🧠 [INFORMATION] Building AI prompt with market data from:', marketData.dataSource);
      console.log('📝 [INFORMATION] AI prompt will include:', {
        tokensData: marketData.topTokens?.length || 0,
        specificTokens: marketData.specificTokens?.length || 0,
        recommendations: marketData.tokenRecommendations?.length || 0,
        mcpStatus: marketData.mcpStatus || 'unknown',
        isRealTime: marketData.dataSource === 'MCP_CLIENT',
        marketIntelligence: !!marketData.marketIntelligence,
        newTokensCount: marketData.marketIntelligence?.newTokens?.count || 0,
        newPoolsCount: marketData.marketIntelligence?.newPools?.count || 0
      });
      const aiPrompt = this.buildInformationPrompt(message, requestType, tokenMentions, marketData);
      
      // Get AI-powered analysis with enhanced error handling
      console.log('🤖 Querying TogetherAI for comprehensive market insights...');
      console.log('📊 Market data summary:', {
        tokensAvailable: marketData.topTokens?.length || 0,
        mentionedTokens: tokenMentions.length,
        requestType: requestType,
        hasSpecificData: (marketData.specificTokens?.length || 0) > 0
      });
      
      let aiAnalysis;
      try {
        const aiResponse = await together.chat.completions.create({
          model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
          messages: [
            {
              role: 'system',
              content: aiPrompt.system
            },
            {
              role: 'user',
              content: aiPrompt.user
            }
          ],
          max_tokens: 4000,
          temperature: 0.4,
          top_p: 0.9,
          response_format: { type: 'json_object' }
        });

        console.log('✅ TogetherAI response received');
        
        if (!aiResponse.choices || !aiResponse.choices[0] || !aiResponse.choices[0].message) {
          throw new Error('Invalid AI response format - no choices or message');
        }
        
        const responseContent = aiResponse.choices[0].message.content;
        if (!responseContent) {
          throw new Error('Empty AI response content');
        }
        
        console.log('🔍 Parsing AI response...');
        try {
          aiAnalysis = JSON.parse(responseContent);
        } catch (parseError) {
          console.error('❌ JSON parsing failed:', parseError.message);
          console.log('📝 Raw response:', responseContent);
          
          // Attempt to extract JSON from response if it's wrapped in text
          const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            aiAnalysis = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error(`Failed to parse AI response as JSON: ${parseError.message}`);
          }
        }
        
        // Validate response structure and provide defaults if needed
        aiAnalysis = this.validateAndEnhanceAIResponse(aiAnalysis, marketData, requestType, tokenMentions);
        
      } catch (aiError) {
        console.error('❌ TogetherAI API call failed:', aiError.message);
        
        // Provide intelligent fallback analysis based on available data
        aiAnalysis = this.generateFallbackAnalysis(message, requestType, tokenMentions, marketData, aiError);
      }

      return {
        type: 'information',
        result: {
          requestType,
          analysis: aiAnalysis.analysis,
          recommendations: aiAnalysis.recommendations,
          marketContext: {
            dataSource: marketData.dataSource || 'real-time_crypto_markets',
            lastUpdated: marketData.timestamp,
            tokensAnalyzed: tokenMentions.length || 'general_market',
            aiModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo'
          },
          actionableInsights: aiAnalysis.actionableInsights || [],
          riskWarnings: aiAnalysis.riskWarnings || [],
          nextSteps: aiAnalysis.nextSteps || []
        },
        status: 'completed',
        processingMethod: 'ai_powered_market_analysis',
        confidence: aiAnalysis.confidence || 'high'
      };
      
    } catch (error) {
      console.error('AI Information processing error:', error);
      
      return {
        type: 'information',
        result: {
          error: 'AI market analysis temporarily unavailable',
          fallback: 'Unable to process your market inquiry at the moment. Please try again in a few moments.',
          suggestion: 'You can ask about specific cryptocurrencies, market trends, price analysis, or general market insights.',
          availableQueries: [
            'What is the current price of Bitcoin?',
            'How is the crypto market performing today?',
            'Which altcoins are trending?',
            'Should I invest in crypto now?'
          ]
        },
        status: 'error',
        processingMethod: 'ai_fallback'
      };
    }
  }

  /**
   * Process feedback type messages - AI-Powered Portfolio Analysis & Recommendations
   * @param {string} message - User message
   * @param {Object} classification - Classification result
   * @returns {Object} Feedback processing result
   */
  processFeedbacks = async (message, classification) => {
    try {
      console.log('💬 Processing feedback request with AI-powered portfolio analysis...');
      console.log('📝 Original message:', message);
      console.log('🏷️ Classification:', classification.type, '-', classification.actionSubtype);
      
      // Extract portfolio or action references
      const tokenMentions = this.extractTokenMentions(message);
      const feedbackType = this.classifyFeedbackRequest(message);
      
      console.log('🔍 Feedback type:', feedbackType);
      console.log('🪙 Token mentions:', tokenMentions);
      
      // Get comprehensive market data for context
      let marketData = {};
      try {
        if (seiAgentService) {
          const topTokens = seiAgentService.getTopTokens ? seiAgentService.getTopTokens(30) : [];
          const seiStats = seiAgentService.getStats ? seiAgentService.getStats() : {};
          
          // Get specific data for mentioned tokens
          const portfolioData = [];
          for (const tokenSymbol of tokenMentions) {
            try {
              const searchResults = seiAgentService.searchTokens ? seiAgentService.searchTokens(tokenSymbol) : [];
              if (searchResults.length > 0) {
                const tokenInfo = searchResults[0];
                const analysis = seiAgentService.analyzeToken ? await seiAgentService.analyzeToken(tokenInfo.id) : null;
                portfolioData.push({
                  token: tokenInfo,
                  analysis: analysis?.success ? analysis.analysis : null
                });
              }
            } catch (tokenError) {
              console.warn(`Failed to fetch data for token ${tokenSymbol}:`, tokenError.message);
            }
          }
          
          marketData = {
            topTokens,
            portfolioTokens: portfolioData,
            seiStats,
            marketCap: topTokens.reduce((sum, t) => sum + (parseFloat(t.marketCap) || 0), 0),
            totalVolume: topTokens.reduce((sum, t) => sum + (parseFloat(t.volume24h) || 0), 0),
            timestamp: new Date().toISOString()
          };
        }
      } catch (dataError) {
        console.error('❌ Market data fetch failed for feedback:', dataError.message);
        marketData = { topTokens: [], portfolioTokens: [], seiStats: {}, marketCap: 0, totalVolume: 0, timestamp: new Date().toISOString() };
      }
      
      // Use AI for comprehensive feedback analysis if available
      let feedbackAnalysis = {};
      if (together) {
        try {
          console.log('🤖 Using TogetherAI for feedback analysis...');
          
          const feedbackPrompt = this.buildFeedbackPrompt(message, feedbackType, tokenMentions, marketData);
          
          const aiResponse = await together.chat.completions.create({
            model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
            messages: [
              {
                role: 'system',
                content: feedbackPrompt.system
              },
              {
                role: 'user',
                content: feedbackPrompt.user
              }
            ],
            max_tokens: 4000,
            temperature: 0.3,
            top_p: 0.9,
            response_format: { type: 'json_object' }
          });
          
          console.log('✅ TogetherAI feedback response received');
          
          const responseContent = aiResponse.choices[0].message.content;
          feedbackAnalysis = JSON.parse(responseContent);
          
          console.log('🎯 AI feedback analysis completed');
          
        } catch (aiError) {
          console.error('❌ TogetherAI feedback analysis failed:', aiError.message);
          feedbackAnalysis = this.generateBasicFeedbackAnalysis(message, feedbackType, tokenMentions, marketData);
        }
      } else {
        console.log('⚠️ TogetherAI not available, using basic analysis');
        feedbackAnalysis = this.generateBasicFeedbackAnalysis(message, feedbackType, tokenMentions, marketData);
      }
      
      // Ensure proper structure and enhance with market data
      feedbackAnalysis = this.validateFeedbackResponse(feedbackAnalysis, marketData, feedbackType, tokenMentions);
      
      return {
        type: 'feedbacks',
        result: {
          feedbackType,
          analysis: feedbackAnalysis.analysis || {},
          recommendations: feedbackAnalysis.recommendations || [],
          marketComparison: feedbackAnalysis.marketComparison || await this.getMarketComparisonData(tokenMentions),
          riskAssessment: feedbackAnalysis.riskAssessment || this.assessCurrentRiskProfile(feedbackAnalysis),
          actionItems: feedbackAnalysis.actionItems || [],
          performanceMetrics: feedbackAnalysis.performanceMetrics || {},
          portfolioInsights: feedbackAnalysis.portfolioInsights || {},
          improvementSuggestions: feedbackAnalysis.improvementSuggestions || []
        },
        status: 'completed',
        processingMethod: together ? 'ai_powered_feedback_analysis' : 'basic_feedback_analysis',
        analysisDepth: 'comprehensive',
        aiEnhanced: !!together
      };
      
    } catch (error) {
      console.error('❌ Feedback processing error:', error);
      
      return {
        type: 'feedbacks',
        result: {
          error: 'Comprehensive feedback analysis failed',
          fallback: 'Unable to provide detailed portfolio analysis. This could be due to limited data or temporary service issues.',
          basicInsights: this.generateBasicInsights(message, this.extractTokenMentions(message)),
          suggestions: [
            'Mention specific token symbols in your portfolio (e.g., HBAR, SAUCE, USDC)',
            'Describe your investment timeline and goals',
            'Specify recent trading actions or strategy concerns',
            'Ask about specific aspects like risk management or diversification'
          ],
          nextSteps: [
            'Try asking about specific tokens individually',
            'Provide more context about your portfolio composition',
            'Check back later if technical issues persist'
          ]
        },
        status: 'error',
        processingMethod: 'error_fallback'
      };
    }
  }

  /**
   * Default processing for unknown types
   * @param {string} message - User message
   * @param {Object} classification - Classification result
   * @returns {Object} Default processing result
   */
  processDefault = async (message, classification) => {
    return {
      type: 'unknown',
      result: {
        message: 'Unable to determine the type of your request',
        suggestion: 'Please try rephrasing your message to be more specific',
        supportedTypes: ['actions', 'strategy', 'information', 'feedbacks'],
        classification: classification
      },
      status: 'unknown',
      processingMethod: 'default_fallback'
    };
  }

  // ===== HELPER METHODS FOR DEEP ANALYSIS =====

  /**
   * Extract token mentions from user message
   * @param {string} message - User message
   * @returns {Array} Array of potential token symbols/names
   */
  extractTokenMentions(message) {
    const tokenPatterns = [
      /\b[A-Z]{2,10}\b/g, // Token symbols (2-10 uppercase letters)
      /\$[A-Z]{2,10}\b/g, // Token symbols with $ prefix
      /0x[a-fA-F0-9]{40}/g, // EVM token addresses
      /\b(?:SEI|USDC|WBTC|ETH|USDT)\b/gi // Common SEI ecosystem tokens
    ];
    
    const mentions = new Set();
    tokenPatterns.forEach(pattern => {
      const matches = message.match(pattern);
      if (matches) {
        matches.forEach(match => mentions.add(match.replace('$', '').toUpperCase()));
      }
    });
    
    return Array.from(mentions);
  }

  /**
   * Generate strategy recommendations based on analysis
   */
  generateStrategyRecommendations(message, tokenAnalysis, topTokens) {
    const recommendations = [];
    
    if (tokenAnalysis.length > 0) {
      tokenAnalysis.forEach(analysis => {
        recommendations.push({
          token: analysis.token.symbol,
          action: analysis.recommendation.action,
          reasoning: analysis.recommendation.reasoning,
          riskLevel: analysis.riskAssessment.level,
          confidence: analysis.recommendation.confidence
        });
      });
    } else {
      // General recommendations based on top tokens
      const lowRiskTokens = topTokens.filter(t => t.dueDiligenceComplete && t.inTopPools);
      recommendations.push({
        type: 'diversification',
        suggestion: 'Consider diversifying across established SEI ecosystem tokens',
        tokens: lowRiskTokens.slice(0, 3).map(t => t.symbol),
        reasoning: 'These tokens have established liquidity and trading history'
      });
    }
    
    return recommendations;
  }

  /**
   * Calculate risk distribution across tokens
   */
  calculateRiskDistribution(tokens) {
    const distribution = { low: 0, medium: 0, high: 0, veryHigh: 0 };
    
    tokens.forEach(token => {
      const risk = seiAgentService.assessRisk ? seiAgentService.assessRisk(token) : { level: 'Medium' };
      if (risk.level === 'Low') distribution.low++;
      else if (risk.level === 'Medium') distribution.medium++;
      else if (risk.level === 'High') distribution.high++;
      else distribution.veryHigh++;
    });
    
    return distribution;
  }

  /**
   * Generate actionable insights
   */
  generateActionableInsights(tokenAnalysis, topTokens) {
    const insights = [];
    
    if (tokenAnalysis.length > 0) {
      const highRiskTokens = tokenAnalysis.filter(t => t.riskAssessment.level === 'High' || t.riskAssessment.level === 'Very High');
      if (highRiskTokens.length > 0) {
        insights.push({
          type: 'risk_warning',
          message: `${highRiskTokens.length} of your analyzed tokens have high risk profiles`,
          action: 'Consider reducing exposure or implementing stop-losses'
        });
      }
    }
    
    const establishedTokens = topTokens.filter(t => t.inTopPools && t.priceUsd > 0.01);
    if (establishedTokens.length > 0) {
      insights.push({
        type: 'opportunity',
        message: 'Consider tokens with established liquidity and trading volume',
        tokens: establishedTokens.slice(0, 3).map(t => t.symbol)
      });
    }
    
    return insights;
  }

  /**
   * Generate risk warnings
   */
  generateRiskWarnings(tokenAnalysis) {
    const warnings = [];
    
    tokenAnalysis.forEach(analysis => {
      if (analysis.riskAssessment.level === 'Very High') {
        warnings.push({
          token: analysis.token.symbol,
          warning: 'VERY HIGH RISK',
          factors: analysis.riskAssessment.factors
        });
      }
    });
    
    return warnings;
  }

  /**
   * Generate next steps
   */
  generateNextSteps(message, tokenAnalysis) {
    const steps = [];
    
    if (tokenAnalysis.length === 0) {
      steps.push('Specify token symbols for detailed analysis');
      steps.push('Review top performing SEI ecosystem tokens');
    } else {
      steps.push('Review risk assessments for analyzed tokens');
      steps.push('Consider diversification strategies');
      steps.push('Set up price alerts for monitored tokens');
    }
    
    return steps;
  }

  /**
   * Build dynamic AI prompt for information processing
   * @param {string} message - User's message
   * @param {string} requestType - Type of information request
   * @param {Array} tokenMentions - Mentioned tokens
   * @param {Object} marketData - Current market data
   * @returns {Object} AI prompt object
   */
  buildInformationPrompt(message, requestType, tokenMentions, marketData) {
    const currentTime = new Date().toLocaleString();
    const hasSpecificTokens = tokenMentions.length > 0;
    const hasMarketData = marketData.topTokens && marketData.topTokens.length > 0;
    const hasMarketIntelligence = marketData.marketIntelligence && (
      (marketData.marketIntelligence.newTokens?.count > 0) || 
      (marketData.marketIntelligence.newPools?.count > 0)
    );
    
    const systemPrompt = `You are a senior blockchain and cryptocurrency market analyst with expertise in emerging blockchain ecosystems. You specialize in providing objective, data-driven market analysis and investment insights based on current market conditions and fundamentals.

EXPERTISE AREAS:
- Blockchain ecosystem analysis and tokenomics
- DeFi protocols and decentralized exchanges
- Token economics and market dynamics
- Cross-chain token analysis and liquidity
- Market sentiment and technical analysis
- Risk assessment and portfolio optimization

ANALYSIS APPROACH:
1. Data-driven insights based on real market data
2. Objective analysis without bias toward any specific ecosystem
3. Practical, actionable recommendations based on fundamentals
4. Clear risk assessment and warnings
5. User-friendly explanations of complex concepts

RESPONSE FORMAT (STRICT JSON - FOCUS ON COMPREHENSIVE TOKEN RECOMMENDATIONS):
{
  "analysis": {
    "marketOverview": {
      "summary": "Brief 1-2 sentence market summary based on comprehensive data",
      "totalMarketCap": 0.00,
      "volume24h": 0.00,
      "activeTokens": 0,
      "marketChange24h": 0.00,
      "sentiment": "bullish|bearish|neutral|mixed"
    },
    "keyMetrics": {
      "avgPrice": 0.00,
      "avgChange24h": 0.00,
      "volatilityIndex": 0.00,
      "liquidityScore": 0.00,
      "adoptionRate": 0.00
    },
    "technicalSignals": {
      "trend": "upward|downward|sideways",
      "strength": 0.00,
      "support": 0.00,
      "resistance": 0.00,
      "rsi": 0.00,
      "volume": 0.00
    },
    "fundamentalScore": {
      "ecosystemHealth": 0.00,
      "developmentActivity": 0.00,
      "partnershipStrength": 0.00,
      "adoptionGrowth": 0.00,
      "overallScore": 0.00
    }
  },
  "recommendations": [
    {
      "token": "SYMBOL",
      "name": "Token Name",
      "action": "BUY|WATCH|HOLD",
      "category": "new_token|established|stablecoin",
      "confidence": 85,
      "targetPrice": 0.00,
      "currentPrice": 0.00,
      "upside": 15.5,
      "riskScore": 25,
      "timeframe": "short-term|medium-term|long-term",
      "reasoning": "Detailed explanation based on real market data",
      "liquidity": 0.00,
      "volume24h": 0.00,
      "poolAddress": "0x...",
      "estimatedAge": "< 1 day|1-7 days|1-4 weeks|> 1 month"
    }
  ],
  "quickInsights": [
    "New opportunity: TOKEN with $X liquidity",
    "High volume: TOKEN $2.5M daily",
    "Established: TOKEN stable performance"
  ],
  "alerts": [
    "New listing: TOKEN just launched",
    "High risk: TOKEN limited liquidity"
  ],
  "marketData": {
    "timestamp": "2024-01-20T10:30:00Z",
    "dataQuality": 95,
    "confidence": 88,
    "nextUpdate": "1 hour"
  }
}

MARKET CONTEXT:
- Analysis Time: ${currentTime}
- Network: ${marketData.marketIntelligence?.network || 'sei-evm'}
- Request Type: ${requestType}
- Mentioned Tokens: ${tokenMentions.join(', ') || 'Token recommendations requested'}

COMPREHENSIVE MARKET INTELLIGENCE:
- New Pools Detected: ${marketData.marketIntelligence?.newPools?.count || 0} in last 24h
- New Tokens Found: ${marketData.marketIntelligence?.newTokens?.count || 0} newly listed
- Trending Pools: ${marketData.marketIntelligence?.trendingPools?.count || 0} with high activity
- Network Health: ${marketData.marketIntelligence?.summary?.networkHealth || 'Stable'}
- Total New Opportunities: ${marketData.marketIntelligence?.summary?.totalNewOpportunities || 0}

NETWORK STATUS:
- Data Source: ${marketData.marketIntelligence?.dataSource || 'Enhanced MCP'}
- Total Tokens Available: ${marketData.topTokens?.length || 0}
- Active Trading Pairs: ${marketData.activeTokens || 0}
- Market Activity Level: ${marketData.marketIntelligence?.summary?.marketActivity || 0}

ANALYSIS REQUIREMENTS:
- Provide objective analysis based on available market data
- Include broader crypto market context when relevant
- Provide specific price levels and percentages
- Consider network effects and protocol developments
- Address liquidity and trading considerations
- Include both bullish and bearish scenarios
- Focus on fundamentals rather than promotional content`;

    // Build comprehensive user prompt with enhanced market intelligence
    let marketSnapshot = '';
    let newTokensData = '';
    let establishedTokensData = '';
    
    // Process new tokens from market intelligence with improved parsing
    if (hasMarketIntelligence && marketData.marketIntelligence.newTokens?.count > 0) {
      console.log('🎯 Processing new tokens data for AI prompt...');
      const newTokensText = marketData.marketIntelligence.newTokens.data;
      
      // Parse the new tokens data more carefully
      const lines = newTokensText.split('\n');
      const parsedTokens = [];
      let currentToken = null;
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Look for token header: "1. BullionX Herd (BULLX)"
        const tokenMatch = trimmedLine.match(/^\d+\.\s+(.+?)\s*\(([^)]+)\)$/);
        if (tokenMatch) {
          if (currentToken) {
            parsedTokens.push(currentToken);
          }
          currentToken = {
            name: tokenMatch[1].trim(),
            symbol: tokenMatch[2].trim(),
            price: 0,
            liquidity: 0,
            volume: 0,
            age: 'Unknown',
            address: ''
          };
        }
        // Parse individual fields
        else if (currentToken) {
          const priceMatch = trimmedLine.match(/Current Price:\s*\$([0-9.]+)/);
          const liquidityMatch = trimmedLine.match(/Liquidity:\s*\$([0-9,.]+)/);
          const volumeMatch = trimmedLine.match(/24h Volume:\s*\$([0-9,.]+)/);
          const ageMatch = trimmedLine.match(/Estimated Age:\s*(.+)/);
          const addressMatch = trimmedLine.match(/Address:\s*(0x[a-fA-F0-9]+)/);
          
          if (priceMatch) currentToken.price = parseFloat(priceMatch[1]);
          if (liquidityMatch) currentToken.liquidity = parseFloat(liquidityMatch[1].replace(/,/g, ''));
          if (volumeMatch) currentToken.volume = parseFloat(volumeMatch[1].replace(/,/g, ''));
          if (ageMatch) currentToken.age = ageMatch[1].trim();
          if (addressMatch) currentToken.address = addressMatch[1];
        }
      }
      
      // Add the last token
      if (currentToken) {
        parsedTokens.push(currentToken);
      }
      
      console.log(`✅ Parsed ${parsedTokens.length} tokens with real data:`, parsedTokens.map(t => `${t.symbol}: $${t.price}`));
      
      if (parsedTokens.length > 0) {
        newTokensData = `
🆕 REAL NEW TOKENS DATA - USE THESE EXACT PRICES:
${parsedTokens.slice(0, 6).map(token => 
  `• ${token.symbol} (${token.name}): 
    PRICE: $${token.price.toFixed(8)} 
    LIQUIDITY: $${token.liquidity.toLocaleString()} 
    VOLUME: $${token.volume.toLocaleString()} 
    AGE: ${token.age}
    ADDRESS: ${token.address}`
).join('\n')}`;
      }
    }
    
    // Add established tokens for balanced recommendations with estimated prices
    establishedTokensData = `
🏛️ ESTABLISHED TOKENS (Low-Risk Options) - USE THESE PRICES:
• SEI (Sei Network): 
    PRICE: $0.45 (estimated)
    CATEGORY: native_token
    RISK: LOW
• WSEI (Wrapped SEI): 
    PRICE: $0.45 (pegged to SEI)
    CATEGORY: wrapped_token
    RISK: LOW
• USDC (USD Coin): 
    PRICE: $1.00 (stable)
    CATEGORY: stablecoin
    RISK: VERY_LOW
• WETH (Wrapped Ethereum): 
    PRICE: $4330.00 (estimated from cross-chain)
    CATEGORY: major_crypto
    RISK: MEDIUM
• WBTC (Wrapped Bitcoin): 
    PRICE: $43250.00 (estimated from cross-chain)
    CATEGORY: major_crypto
    RISK: MEDIUM`;
    
    if (hasMarketData) {
      const topTokensDisplay = marketData.topTokens.slice(0, 5).map(token => {
        const change = token.change24h;
        const changeStr = change > 0 ? `+${change.toFixed(2)}%` : `${change?.toFixed(2) || '0.00'}%`;
        const volumeStr = token.volume24h ? `$${(token.volume24h / 1000).toFixed(1)}K` : 'N/A';
        return `• ${token.symbol}: $${token.priceUsd?.toFixed(8) || 'N/A'} (${changeStr}) | Vol: ${volumeStr}`;
      }).join('\n');
      
      marketSnapshot = `
📊 CURRENT MARKET DATA:
${topTokensDisplay}${newTokensData}${establishedTokensData}

📈 MARKET INTELLIGENCE SUMMARY:
• New Opportunities: ${marketData.marketIntelligence?.summary?.totalNewOpportunities || 0} total
• Network Health: ${marketData.marketIntelligence?.summary?.networkHealth || 'Stable'}
• Risk Level: ${marketData.marketIntelligence?.summary?.riskFactors?.length > 0 ? 'Monitor new token activity' : 'Standard market risks'}`;
    } else {
      marketSnapshot = newTokensData + establishedTokensData;
    }

    let specificTokenAnalysis = '';
    if (marketData.specificTokens && marketData.specificTokens.length > 0) {
      specificTokenAnalysis = `
SPECIFIC TOKEN ANALYSIS:
${marketData.specificTokens.map(item => `
• ${item.token.symbol} (${item.token.name}):
  - Price: $${item.token.priceUsd?.toFixed(6) || 'N/A'}
  - Market Cap: $${item.token.marketCap ? (item.token.marketCap / 1000000).toFixed(1) + 'M' : 'N/A'}
  - Liquidity: ${item.token.inTopPools ? 'High' : 'Limited'}
  - Due Diligence: ${item.token.dueDiligenceComplete ? 'Complete' : 'Pending'}
  ${item.analysis ? `- Risk Level: ${item.analysis.riskAssessment?.level || 'Unknown'}` : ''}
`).join('')}`;
    }

    const userPrompt = `Provide comprehensive market analysis and token recommendations for this query:

USER QUERY: "${message}"

ANALYSIS PARAMETERS:
• Network: ${marketData.marketIntelligence?.network || 'sei-evm'}
• Request Type: ${requestType} 
• Focus: ${hasSpecificTokens ? tokenMentions.join(', ') : 'Comprehensive token recommendations'}
• Intelligence Available: ${hasMarketIntelligence ? 'Live market intelligence with new tokens/pools data' : 'Standard market data'}
${marketSnapshot}
${specificTokenAnalysis}

CRITICAL RECOMMENDATION REQUIREMENTS:
1. **MANDATORY**: Use the EXACT prices provided above - DO NOT use $0.00 values
2. **New Token Analysis**: Recommend from the ${marketData.marketIntelligence?.newTokens?.count || 0} newly discovered tokens with REAL prices shown above
3. **Established Token Inclusion**: Include the established tokens with their estimated prices  
4. **Price Accuracy**: Every recommendation MUST have a real currentPrice (never 0)
5. **Risk-Based Selection**: 
   - VERY_LOW Risk: USDC ($1.00)
   - LOW Risk: SEI ($0.45), WSEI ($0.45)  
   - MEDIUM Risk: WETH ($4330), WBTC ($43250)
   - HIGH Risk: New tokens (BULLX, syUSD, USD0, etc.) with their real prices

MANDATORY OUTPUT REQUIREMENTS:
- **currentPrice**: Use the EXACT prices from the data above (never 0)
- **targetPrice**: Calculate realistic target based on currentPrice + upside %
- **liquidity**: Use the real liquidity values provided
- **volume24h**: Use the real volume values provided
- **category**: Use the categories specified above
- **reasoning**: Reference the specific price, liquidity, and age data

EXAMPLE - DO THIS FORMAT:
{
  "token": "BULLX",
  "currentPrice": 0.0000334, // EXACT price from data above
  "targetPrice": 0.0000501,  // 50% upside calculation
  "liquidity": 4994,         // EXACT liquidity from data
  "volume24h": 53,           // EXACT volume from data
  "category": "new_token",
  "reasoning": "New token at $0.0000334 with $4,994 liquidity, less than 1 day old"
}

CRITICAL: Every recommendation MUST use the real data provided above. NO ZERO VALUES ALLOWED.`;

    return {
      system: systemPrompt,
      user: userPrompt
    };
  }

  /**
   * Classify information request type
   */
  classifyInformationRequest(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('value')) {
      return 'price_data';
    } else if (lowerMessage.includes('market') || lowerMessage.includes('overview') || lowerMessage.includes('summary')) {
      return 'market_overview';
    } else if (this.extractTokenMentions(message).length > 0) {
      return 'token_specific';
    }
    
    return 'general';
  }

  /**
   * Get token specific information
   */
  async getTokenSpecificInformation(tokenMentions) {
    const tokenData = [];
    
    for (const mention of tokenMentions) {
      const searchResults = seiAgentService.searchTokens ? seiAgentService.searchTokens(mention) : [];
      if (searchResults.length > 0) {
        const token = searchResults[0];
        const liveData = await seiAgentService.getLiveTokenData ? seiAgentService.getLiveTokenData(token.id) : null;
        const poolsData = await seiAgentService.getTokenPools ? seiAgentService.getTokenPools(token.id) : null;
        
        tokenData.push({
          token,
          liveData: liveData?.success ? liveData.data : null,
          poolsData: poolsData?.success ? poolsData.data : null,
          analysis: await seiAgentService.analyzeToken ? seiAgentService.analyzeToken(token.id) : null
        });
      }
    }
    
    return { tokens: tokenData, totalFound: tokenData.length };
  }

  /**
   * Get general token information
   */
  async getGeneralTokenInformation() {
    const topTokens = seiAgentService.getTopTokens ? seiAgentService.getTopTokens(10) : [];
    const stats = seiAgentService.getStats ? seiAgentService.getStats() : {};
    
    return {
      topTokens,
      statistics: stats,
      categories: {
        established: topTokens.filter(t => t.inTopPools).length,
        highLiquidity: topTokens.filter(t => t.inTopPools).length,
        newTokens: topTokens.filter(t => t.createdAt && new Date(t.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length
      }
    };
  }

  /**
   * Get market overview information
   */
  async getMarketOverviewInformation() {
    const allTokens = seiAgentService.getAllTokens ? seiAgentService.getAllTokens() : [];
    const topTokens = seiAgentService.getTopTokens ? seiAgentService.getTopTokens(20) : [];
    
    return {
      totalTokens: allTokens.length,
      topPerformers: topTokens.slice(0, 10),
      marketSegments: {
        defi: topTokens.filter(t => t.symbol.includes('DEFI') || t.name.toLowerCase().includes('defi')).length,
        gaming: topTokens.filter(t => t.name.toLowerCase().includes('game') || t.name.toLowerCase().includes('nft')).length,
        utility: topTokens.filter(t => t.inTopPools && t.volume24h > 0).length
      },
      riskDistribution: this.calculateRiskDistribution(topTokens)
    };
  }

  /**
   * Get price information
   */
  async getPriceInformation(tokenMentions) {
    const priceData = [];
    
    if (tokenMentions.length > 0) {
      for (const mention of tokenMentions) {
        const searchResults = seiAgentService.searchTokens ? seiAgentService.searchTokens(mention) : [];
        if (searchResults.length > 0) {
          const token = searchResults[0];
          const liveData = await seiAgentService.getLiveTokenData ? seiAgentService.getLiveTokenData(token.id) : null;
          
          priceData.push({
            symbol: token.symbol,
            name: token.name,
            currentPrice: token.priceUsd,
            livePrice: liveData?.success ? liveData.data?.attributes?.price_usd : null,
            change24h: liveData?.success ? liveData.data?.attributes?.price_change_percentage?.['24h'] : null
          });
        }
      }
    } else {
      const topTokens = seiAgentService.getTopTokens ? seiAgentService.getTopTokens(10) : [];
      priceData.push(...topTokens.map(token => ({
        symbol: token.symbol,
        name: token.name,
        currentPrice: token.priceUsd
      })));
    }
    
    return { prices: priceData, lastUpdated: new Date().toISOString() };
  }

  /**
   * Get general information
   */
  async getGeneralInformation(message) {
    const allTokens = seiAgentService.getAllTokens ? seiAgentService.getAllTokens() : [];
    const topTokens = seiAgentService.getTopTokens ? seiAgentService.getTopTokens(5) : [];
    
    return {
      message: 'General market ecosystem information',
      ecosystem: {
        totalTokens: allTokens.length,
        topTokens: topTokens.map(t => ({ symbol: t.symbol, name: t.name })),
        features: ['Decentralized trading', 'Liquidity pools', 'Cross-chain compatibility', 'Low transaction fees']
      },
      suggestion: 'Ask about specific tokens, market overview, or price data for detailed analysis'
    };
  }

  /**
   * Generate educational content
   */
  generateEducationalContent(requestType, tokenMentions) {
    const content = {
      token_specific: 'Learn about token fundamentals: market cap, liquidity, use cases, and risk factors.',
      market_overview: 'Understand market dynamics: supply/demand, trading volume, and market sentiment.',
      price_data: 'Price analysis includes current value, historical trends, and volatility metrics.',
      general: 'Blockchain networks provide infrastructure for decentralized trading, token economics, and DeFi protocols.'
    };
    
    return content[requestType] || content.general;
  }

  /**
   * Generate related queries
   */
  generateRelatedQueries(message, requestType) {
    const queries = {
      token_specific: ['What is the trading volume?', 'Show me the price history', 'What are the risks?'],
      market_overview: ['Which tokens are trending?', 'Show me new listings', 'What is the market sentiment?'],
      price_data: ['Show me price alerts', 'Compare with other tokens', 'What affects the price?'],
      general: ['Show me top tokens', 'What are the market fundamentals?', 'How to start trading?']
    };
    
    return queries[requestType] || queries.general;
  }

  /**
   * Classify feedback request type
   */
  classifyFeedbackRequest(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('portfolio') || lowerMessage.includes('holdings')) {
      return 'portfolio_performance';
    } else if (lowerMessage.includes('action') || lowerMessage.includes('trade') || lowerMessage.includes('transaction')) {
      return 'action_review';
    } else if (lowerMessage.includes('strategy') || lowerMessage.includes('plan')) {
      return 'strategy_evaluation';
    }
    
    return 'general_feedback';
  }

  /**
   * Analyze portfolio performance
   */
  async analyzePortfolioPerformance(tokenMentions, message) {
    const portfolioTokens = [];
    
    for (const mention of tokenMentions) {
      const searchResults = seiAgentService.searchTokens ? seiAgentService.searchTokens(mention) : [];
      if (searchResults.length > 0) {
        const analysis = await seiAgentService.analyzeToken ? seiAgentService.analyzeToken(searchResults[0].id) : null;
        if (analysis?.success) {
          portfolioTokens.push(analysis.analysis);
        }
      }
    }
    
    return {
      tokensAnalyzed: portfolioTokens.length,
      overallRisk: this.calculateOverallRisk(portfolioTokens),
      diversification: this.analyzeDiversification(portfolioTokens),
      recommendations: this.generatePortfolioRecommendations(portfolioTokens)
    };
  }

  /**
   * Calculate overall portfolio risk
   */
  calculateOverallRisk(portfolioTokens) {
    if (portfolioTokens.length === 0) return 'Unknown';
    
    const riskScores = portfolioTokens.map(token => token.riskAssessment.score);
    const avgRisk = riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length;
    
    if (avgRisk <= 20) return 'Low';
    else if (avgRisk <= 50) return 'Medium';
    else if (avgRisk <= 75) return 'High';
    else return 'Very High';
  }

  /**
   * Analyze portfolio diversification
   */
  analyzeDiversification(portfolioTokens) {
    const uniqueTokens = portfolioTokens.length;
    const establishedTokens = portfolioTokens.filter(t => t.marketData.dueDiligenceComplete).length;
    
    return {
      tokenCount: uniqueTokens,
      establishedRatio: uniqueTokens > 0 ? (establishedTokens / uniqueTokens) : 0,
      recommendation: uniqueTokens < 3 ? 'Consider adding more tokens for diversification' : 'Good diversification'
    };
  }

  /**
   * Generate portfolio recommendations
   */
  generatePortfolioRecommendations(portfolioTokens) {
    const recommendations = [];
    
    const highRiskTokens = portfolioTokens.filter(t => t.riskAssessment.level === 'High' || t.riskAssessment.level === 'Very High');
    if (highRiskTokens.length > 0) {
      recommendations.push({
        type: 'risk_management',
        message: `Consider reducing exposure to ${highRiskTokens.length} high-risk tokens`,
        priority: 'high'
      });
    }
    
    const lowLiquidityTokens = portfolioTokens.filter(t => !t.marketData.inTopPools);
    if (lowLiquidityTokens.length > 0) {
      recommendations.push({
        type: 'liquidity',
        message: `${lowLiquidityTokens.length} tokens have low liquidity - monitor closely`,
        priority: 'medium'
      });
    }
    
    return recommendations;
  }

  /**
   * Analyze action performance (placeholder)
   */
  async analyzeActionPerformance(message) {
    return {
      message: 'Action performance analysis requires transaction history',
      suggestion: 'Provide specific transaction details or token symbols for analysis'
    };
  }

  /**
   * Evaluate strategy (placeholder)
   */
  async evaluateStrategy(tokenMentions, message) {
    return {
      message: 'Strategy evaluation based on mentioned tokens',
      tokens: tokenMentions,
      suggestion: 'Provide more details about your strategy for comprehensive evaluation'
    };
  }

  /**
   * Provide general feedback
   */
  async provideGeneralFeedback(message, tokenMentions) {
    return {
      message: 'General feedback on token ecosystem performance',
      marketHealth: 'Token ecosystem shows development with growing adoption patterns',
      suggestion: 'Focus on established tokens with completed due diligence for safer investments'
    };
  }

  /**
   * Generate improvement recommendations
   */
  generateImprovementRecommendations(feedbackAnalysis, tokenMentions) {
    return [
      'Diversify across different token categories',
      'Monitor risk levels regularly',
      'Stay updated with network ecosystem developments',
      'Consider dollar-cost averaging for volatile tokens'
    ];
  }

  /**
   * Get market comparison data
   */
  async getMarketComparisonData(tokenMentions) {
    const topTokens = seiAgentService.getTopTokens ? seiAgentService.getTopTokens(5) : [];
    return {
      benchmarkTokens: topTokens.map(t => ({ symbol: t.symbol, priceUsd: t.priceUsd })),
      marketTrend: 'Market showing steady growth patterns'
    };
  }

  /**
   * Assess current risk profile
   */
  assessCurrentRiskProfile(feedbackAnalysis) {
    return {
      level: feedbackAnalysis.overallRisk || 'Medium',
      factors: ['Market volatility', 'Token liquidity', 'Due diligence status'],
      recommendation: 'Maintain balanced portfolio with risk management'
    };
  }

  /**
   * Generate action items
   */
  generateActionItems(feedbackAnalysis, recommendations) {
    return [
      'Review portfolio allocation',
      'Set up price alerts',
      'Monitor market trends',
      'Consider rebalancing if needed'
    ];
  }

  /**
   * Calculate performance metrics
   */
  calculatePerformanceMetrics(feedbackAnalysis) {
    return {
      riskScore: feedbackAnalysis.overallRisk || 'N/A',
      diversificationScore: feedbackAnalysis.diversification?.recommendation || 'N/A',
      lastAnalyzed: new Date().toISOString()
    };
  }

  /**
   * Validate and enhance AI response structure
   * @param {Object} aiAnalysis - Raw AI response
   * @param {Object} marketData - Market data used
   * @param {string} requestType - Type of request
   * @param {Array} tokenMentions - Mentioned tokens
   * @returns {Object} Enhanced AI analysis
   */
  validateAndEnhanceAIResponse(aiAnalysis, marketData, requestType, tokenMentions) {
    // Ensure required structure exists
    if (!aiAnalysis.analysis) {
      aiAnalysis.analysis = {};
    }
    
    if (!aiAnalysis.recommendations) {
      aiAnalysis.recommendations = [];
    }
    
    // Provide defaults for missing analysis fields
    if (!aiAnalysis.analysis.marketOverview) {
      aiAnalysis.analysis.marketOverview = `Market ecosystem analysis based on ${marketData.topTokens?.length || 0} tokens with total market cap of $${marketData.marketCap ? (marketData.marketCap / 1000000).toFixed(1) + 'M' : 'N/A'}.`;
    }
    
    if (!aiAnalysis.analysis.keyInsights || !Array.isArray(aiAnalysis.analysis.keyInsights)) {
      aiAnalysis.analysis.keyInsights = [
        `Network showing ${marketData.totalVolume > 50000000 ? 'high' : 'moderate'} trading activity`,
        `${marketData.activeTokens || 0} tokens actively trading with established liquidity`,
        `Market focus on ${tokenMentions.length > 0 ? tokenMentions.join(', ') : 'general ecosystem development'}`
      ];
    }
    
    if (!aiAnalysis.actionableInsights || !Array.isArray(aiAnalysis.actionableInsights)) {
      aiAnalysis.actionableInsights = [
        'Monitor network ecosystem developments and protocol updates',
        'Consider dollar-cost averaging for long-term positions',
        'Set up price alerts for key support and resistance levels'
      ];
    }
    
    if (!aiAnalysis.riskWarnings || !Array.isArray(aiAnalysis.riskWarnings)) {
      aiAnalysis.riskWarnings = [
        'Cryptocurrency investments carry high volatility and risk of total loss',
        'Some tokens may have limited liquidity compared to major cryptocurrencies',
        'Regulatory changes could impact token availability and trading'
      ];
    }
    
    if (!aiAnalysis.nextSteps || !Array.isArray(aiAnalysis.nextSteps)) {
      aiAnalysis.nextSteps = [
        'Research specific tokens mentioned in analysis',
        'Review your risk tolerance and investment timeline',
        'Consider starting with small position sizes'
      ];
    }
    
    if (!aiAnalysis.confidence) {
      aiAnalysis.confidence = marketData.topTokens?.length > 10 ? 'high' : 'medium';
    }
    
    if (!aiAnalysis.marketSentiment) {
      aiAnalysis.marketSentiment = marketData.totalVolume > 100000000 ? 'bullish' : 'neutral';
    }
    
    if (!aiAnalysis.disclaimer) {
      aiAnalysis.disclaimer = 'This analysis is for informational purposes only and should not be considered financial advice. Always conduct your own research and consult with financial professionals before making investment decisions.';
    }
    
    return aiAnalysis;
  }

  /**
   * Generate intelligent fallback analysis when AI fails
   * @param {string} message - Original user message
   * @param {string} requestType - Type of request
   * @param {Array} tokenMentions - Mentioned tokens
   * @param {Object} marketData - Available market data
   * @param {Error} aiError - The AI error that occurred
   * @returns {Object} Fallback analysis
   */
  /**
   * Build feedback prompt for AI analysis
   * @param {string} message - User message
   * @param {string} feedbackType - Type of feedback request
   * @param {Array} tokenMentions - Mentioned tokens
   * @param {Object} marketData - Current market data
   * @returns {Object} Feedback prompt object
   */
  buildFeedbackPrompt(message, feedbackType, tokenMentions, marketData) {
    const currentTime = new Date().toLocaleString();
    const hasPortfolioData = tokenMentions.length > 0 && marketData.portfolioTokens && marketData.portfolioTokens.length > 0;
    
    const systemPrompt = `You are a senior portfolio analyst and investment advisor specializing in blockchain ecosystem analysis. You provide comprehensive portfolio analysis, performance evaluation, and strategic recommendations for cryptocurrency investments.

EXPERTISE AREAS:
- Portfolio performance analysis and optimization
- Risk assessment and management strategies
- Blockchain ecosystem token evaluation
- DeFi protocol analysis and yield strategies
- Market sentiment and technical analysis
- Investment psychology and behavioral finance

FEEDBACK ANALYSIS APPROACH:
1. Comprehensive portfolio evaluation based on mentioned tokens
2. Performance analysis against market ecosystem benchmarks
3. Risk-adjusted return calculations and assessments
4. Diversification analysis and recommendations
5. Market timing and entry/exit strategy evaluation
6. Behavioral bias identification and correction

RESPONSE FORMAT (STRICT JSON - FOCUS ON PORTFOLIO METRICS):
{
  "portfolioSummary": {
    "totalValue": 0.00,
    "performance24h": 0.00,
    "performance7d": 0.00,
    "performance30d": 0.00,
    "riskScore": 65,
    "diversificationScore": 78,
    "liquidityScore": 82,
    "overallGrade": "B+"
  },
  "tokenBreakdown": [
    {
      "token": "HBAR",
      "allocation": 45.2,
      "value": 1250.00,
      "performance24h": 3.5,
      "riskScore": 35,
      "recommendation": "HOLD",
      "targetAllocation": 40.0
    }
  ],
  "riskAnalysis": {
    "volatility": 25.5,
    "maxDrawdown": 18.2,
    "sharpeRatio": 1.45,
    "correlation": 0.75,
    "riskLevel": "MEDIUM",
    "stressTestResult": -22.5
  },
  "performanceMetrics": {
    "totalReturn": 12.8,
    "annualizedReturn": 45.2,
    "winRate": 68.5,
    "profitFactor": 1.85,
    "maxGain": 85.2,
    "maxLoss": -18.7
  },
  "recommendations": [
    {
      "action": "REBALANCE",
      "token": "HBAR",
      "change": -5.2,
      "newTarget": 40.0,
      "impact": "+2.5% returns",
      "priority": 85,
      "reason": "Overweight position"
    }
  ],
  "alerts": [
    "Risk: 65% concentration in HBAR",
    "Opportunity: Add SAUCE (+15% yield)",
    "Action: Rebalance within 7 days"
  ],
  "improvements": [
    {
      "category": "DIVERSIFICATION",
      "suggestion": "Add 2-3 DeFi tokens",
      "impact": "+8% risk-adj returns",
      "effort": "LOW",
      "timeframe": "1-2 weeks"
    }
  ],
  "benchmarkComparison": {
    "hederaIndex": 12.8,
    "yourPortfolio": 15.2,
    "outperformance": 2.4,
    "ranking": "TOP 25%"
  }
}

MARKET CONTEXT:
- Analysis Time: ${currentTime}
- Feedback Type: ${feedbackType}
- Portfolio Tokens: ${tokenMentions.join(', ') || 'Not specified'}
- Market Data Available: ${marketData.topTokens?.length || 0} tokens
- Portfolio Coverage: ${hasPortfolioData ? 'Detailed data available' : 'Limited data'}
- Ecosystem Status: ${marketData.seiStats?.totalTokens || 450}+ tokens tracked

ANALYSIS REQUIREMENTS:
- Focus on actionable, specific recommendations
- Include quantitative metrics where possible
- Consider both short-term and long-term perspectives
- Address user's specific concerns and questions
- Provide clear reasoning for all recommendations
- Include risk warnings and disclaimers`;

    let portfolioAnalysis = '';
    if (hasPortfolioData) {
      portfolioAnalysis = `
PORTFOLIO COMPOSITION ANALYSIS:
${marketData.portfolioTokens.map(item => `
• ${item.token.symbol} (${item.token.name}):
  - Current Price: $${item.token.priceUsd?.toFixed(6) || 'N/A'}
  - Market Cap: $${item.token.marketCap ? (item.token.marketCap / 1000000).toFixed(1) + 'M' : 'N/A'}
  - 24h Change: ${item.token.change24h ? (item.token.change24h > 0 ? '+' : '') + item.token.change24h.toFixed(2) + '%' : 'N/A'}
  - Liquidity Status: ${item.token.inTopPools ? 'High liquidity' : 'Limited liquidity'}
  - Due Diligence: ${item.token.dueDiligenceComplete ? 'Complete' : 'Pending'}
  ${item.analysis ? `- Risk Assessment: ${item.analysis.riskAssessment?.level || 'Unknown'}
  - Analysis Summary: ${item.analysis.summary || 'No detailed analysis available'}` : ''}
`).join('')}`;
    }

    const userPrompt = `Analyze my portfolio and provide comprehensive feedback:

USER REQUEST: "${message}"

FEEDBACK PARAMETERS:
• Analysis Type: ${feedbackType}
• Portfolio Focus: ${tokenMentions.length > 0 ? tokenMentions.join(', ') : 'General portfolio guidance'}
• Market Context: Blockchain ecosystem analysis
${portfolioAnalysis}

MARKET CONTEXT:
• Total Market Cap: $${marketData.marketCap ? (marketData.marketCap / 1000000).toFixed(1) + 'M' : 'N/A'}
• 24h Trading Volume: $${marketData.totalVolume ? (marketData.totalVolume / 1000000).toFixed(1) + 'M' : 'N/A'}
• Active Tokens: ${marketData.topTokens?.filter(t => t.inTopPools).length || 0}

ANALYSIS REQUIREMENTS:
1. Portfolio Performance: Evaluate current performance and positioning
2. Risk Assessment: Comprehensive risk analysis with specific metrics
3. Diversification: Portfolio balance and concentration analysis
4. Market Positioning: How portfolio aligns with market opportunities
5. Strategic Recommendations: Specific, actionable improvement suggestions
6. Timeline Planning: Short, medium, and long-term action plans

SPECIFIC FOCUS AREAS:
- Token allocation efficiency and balance
- Risk-adjusted return optimization
- Blockchain ecosystem exposure and diversification
- DeFi yield opportunities within portfolio
- Market timing and rebalancing strategies
- Cost optimization and fee management

Please provide detailed, data-driven analysis that helps optimize portfolio performance while managing risk appropriately for the current market ecosystem.`;

    return {
      system: systemPrompt,
      user: userPrompt
    };
  }

  /**
   * Generate basic feedback analysis when AI is not available
   * @param {string} message - User message
   * @param {string} feedbackType - Type of feedback
   * @param {Array} tokenMentions - Mentioned tokens
   * @param {Object} marketData - Market data
   * @returns {Object} Basic feedback analysis
   */
  generateBasicFeedbackAnalysis(message, feedbackType, tokenMentions, marketData) {
    console.log('🔄 Generating basic feedback analysis...');
    
    const hasTokens = tokenMentions.length > 0;
    const hasMarketData = marketData.topTokens && marketData.topTokens.length > 0;
    
    let portfolioOverview = '';
    const recommendations = [];
    
    if (hasTokens && hasMarketData) {
      // Analyze mentioned tokens
      const portfolioTokens = tokenMentions.map(symbol => {
        const token = marketData.topTokens.find(t => t.symbol.toUpperCase() === symbol.toUpperCase());
        return token ? { symbol, data: token, found: true } : { symbol, found: false };
      });
      
      const foundTokens = portfolioTokens.filter(t => t.found);
      portfolioOverview = `Portfolio analysis for ${foundTokens.length} of ${tokenMentions.length} mentioned tokens. `;
      
      if (foundTokens.length > 0) {
        const avgChange = foundTokens.reduce((sum, t) => sum + (t.data.change24h || 0), 0) / foundTokens.length;
        portfolioOverview += `Average 24h performance: ${avgChange > 0 ? '+' : ''}${avgChange.toFixed(2)}%. `;
        
        // Generate basic recommendations
        foundTokens.forEach(tokenItem => {
          const token = tokenItem.data;
          if (token.change24h > 10) {
            recommendations.push({
              type: 'reduce',
              token: token.symbol,
              reasoning: `${token.symbol} showing strong gains (+${token.change24h.toFixed(2)}%). Consider taking profits.`,
              priority: 'medium',
              timeframe: 'short-term'
            });
          } else if (token.change24h < -10) {
            recommendations.push({
              type: 'watch',
              token: token.symbol,
              reasoning: `${token.symbol} down ${token.change24h.toFixed(2)}%. Monitor for potential buying opportunity.`,
              priority: 'medium',
              timeframe: 'short-term'
            });
          } else {
            recommendations.push({
              type: 'hold',
              token: token.symbol,
              reasoning: `${token.symbol} showing stable performance. Continue monitoring.`,
              priority: 'low',
              timeframe: 'medium-term'
            });
          }
        });
      }
    } else {
      portfolioOverview = 'General portfolio guidance for current market ecosystem. ';
      recommendations.push({
        type: 'add',
        token: 'SEI',
        reasoning: 'Consider SEI as core network ecosystem exposure.',
        priority: 'medium',
        timeframe: 'long-term'
      });
    }
    
    return {
      analysis: {
        portfolioOverview,
        performanceMetrics: {
          overallPerformance: hasTokens ? 
            'Performance calculated based on available market data' : 
            'Insufficient data for detailed performance analysis',
          riskMetrics: 'Basic risk assessment based on token volatility and market position'
        }
      },
      recommendations,
      riskAssessment: {
        currentRiskLevel: 'medium',
        riskFactors: ['Market volatility', 'Limited liquidity for some tokens', 'Regulatory uncertainty'],
        mitigationStrategies: ['Diversification', 'Position sizing', 'Regular rebalancing']
      }
    };
  }

  /**
   * Validate feedback response structure
   * @param {Object} feedbackAnalysis - AI response
   * @param {Object} marketData - Market data
   * @param {string} feedbackType - Feedback type
   * @param {Array} tokenMentions - Token mentions
   * @returns {Object} Validated response
   */
  validateFeedbackResponse(feedbackAnalysis, marketData, feedbackType, tokenMentions) {
    if (!feedbackAnalysis.analysis) {
      feedbackAnalysis.analysis = {};
    }
    if (!feedbackAnalysis.recommendations) {
      feedbackAnalysis.recommendations = [];
    }
    if (!feedbackAnalysis.actionItems) {
      feedbackAnalysis.actionItems = ['Review portfolio allocation', 'Monitor market trends', 'Consider rebalancing'];
    }
    
    return feedbackAnalysis;
  }

  /**
   * Generate basic insights for error scenarios
   * @param {string} message - User message
   * @param {Array} tokenMentions - Token mentions
   * @returns {Array} Basic insights
   */
  generateBasicInsights(message, tokenMentions) {
    const insights = [
      'Current ecosystem offers diverse investment opportunities across DeFi and various token categories',
      'Consider portfolio diversification across different token categories and risk profiles'
    ];
    
    if (tokenMentions.length > 0) {
      insights.push(`You mentioned ${tokenMentions.join(', ')} - research their fundamentals and recent performance`);
    }
    
    return insights;
  }

  /**
   * Build strategy prompt for AI analysis
   * @param {string} message - User message
   * @param {Array} tokenMentions - Mentioned tokens
   * @param {Object} marketData - Current market data
   * @returns {Object} Strategy prompt object
   */
  buildStrategyPrompt(message, tokenMentions, marketData) {
    const currentTime = new Date().toLocaleString();
    const hasTokenData = tokenMentions.length > 0 && marketData.strategyTokens && marketData.strategyTokens.length > 0;
    
    const systemPrompt = `You are a senior investment strategist and portfolio manager specializing in cryptocurrency and DeFi investments. You create comprehensive, data-driven investment strategies based on objective market analysis.

EXPERTISE AREAS:
- Multi-asset portfolio construction and optimization
- Risk-adjusted return maximization strategies
- Blockchain ecosystem token evaluation and selection
- DeFi yield farming and staking strategies
- Market timing and tactical asset allocation
- Behavioral finance and investment psychology

STRATEGY APPROACH:
1. Goal-based investment planning
2. Risk-adjusted return optimization
3. Market cycle analysis and positioning
4. Diversification across token categories
5. Yield optimization and income generation
6. Risk management and downside protection

RESPONSE FORMAT (STRICT JSON - STRATEGY METRICS):
{
  "strategy": {
    "name": "Conservative Growth|Balanced|Aggressive Growth|Yield Focused",
    "objective": "Brief strategy goal",
    "riskLevel": 35,
    "expectedReturn": 25.5,
    "timeHorizon": "6-12 months",
    "confidenceScore": 85
  },
  "analysis": {
    "marketPhase": "accumulation|uptrend|distribution|downtrend",
    "opportunityScore": 78,
    "riskReward": 2.8,
    "marketSentiment": "bullish|bearish|neutral",
    "ecosystemHealth": 82
  },
  "allocation": [
    {
      "token": "HBAR",
      "targetWeight": 40.0,
      "currentPrice": 0.065,
      "targetPrice": 0.085,
      "upside": 30.8,
      "allocation": "CORE",
      "reasoning": "Network backbone with enterprise adoption"
    }
  ],
  "riskAssessment": {
    "portfolioRisk": 45,
    "maxDrawdown": 22.5,
    "volatility": 35.2,
    "correlation": 0.65,
    "diversificationScore": 75
  },
  "implementation": {
    "phases": [
      {
        "phase": 1,
        "duration": "2 weeks",
        "actions": ["Buy HBAR 25%", "Add SAUCE 10%"],
        "capital": 35.0
      }
    ],
    "totalTimeline": "8-12 weeks",
    "rebalanceFreq": "monthly"
  },
  "performance": {
    "target6m": 15.2,
    "target12m": 28.5,
    "worstCase": -12.5,
    "bestCase": 45.8,
    "probability": 72
  },
  "alerts": [
    "Entry: HBAR below $0.062",
    "Exit: Portfolio +25% gains",
    "Stop: Portfolio -15% loss"
  ]
}

MARKET CONTEXT:
- Analysis Time: ${currentTime}
- Focus Tokens: ${tokenMentions.join(', ') || 'General market ecosystem'}
- Market Data: ${marketData.topTokens?.length || 0} tokens available
- Strategy Scope: ${hasTokenData ? 'Token-specific strategy' : 'Ecosystem-wide strategy'}
- Market Cap: $${marketData.marketCap ? (marketData.marketCap / 1000000).toFixed(1) + 'M' : 'N/A'}

STRATEGY REQUIREMENTS:
- Focus on quantifiable metrics and clear targets
- Include specific allocation percentages
- Provide realistic return expectations with probabilities
- Address risk management with concrete limits
- Create actionable implementation timeline
- Consider market conditions and cycles`;

    let tokenAnalysis = '';
    if (hasTokenData) {
      tokenAnalysis = `
STRATEGY TOKEN ANALYSIS:
${marketData.strategyTokens.map(item => `
• ${item.token.symbol} (${item.token.name}):
  - Current Price: $${item.token.priceUsd?.toFixed(6) || 'N/A'}
  - Market Cap: $${item.token.marketCap ? (item.token.marketCap / 1000000).toFixed(1) + 'M' : 'N/A'}
  - Volume 24h: $${item.token.volume24h ? (item.token.volume24h / 1000000).toFixed(1) + 'M' : 'N/A'}
  - Liquidity: ${item.token.inTopPools ? 'High' : 'Limited'}
  - Risk Level: ${item.analysis?.riskAssessment?.level || 'Unknown'}
  ${item.analysis ? `- Analysis: ${item.analysis.summary || 'Available'}` : ''}
`).join('')}`;
    }

    const userPrompt = `Create a comprehensive investment strategy for this request:

USER REQUEST: "${message}"

STRATEGY PARAMETERS:
• Focus: ${tokenMentions.length > 0 ? tokenMentions.join(', ') : 'Market ecosystem diversification'}
• Market Context: Current market conditions and trends
• Data Available: ${marketData.topTokens?.length || 0} tokens analyzed
${tokenAnalysis}

MARKET OVERVIEW:
• Total Market Cap: $${marketData.marketCap ? (marketData.marketCap / 1000000).toFixed(1) + 'M' : 'N/A'}
• 24h Volume: $${marketData.totalVolume ? (marketData.totalVolume / 1000000).toFixed(1) + 'M' : 'N/A'}
• Active Tokens: ${marketData.topTokens?.filter(t => t.inTopPools).length || 0}

STRATEGY REQUIREMENTS:
1. Investment Objective: Clear strategy goal and approach
2. Asset Allocation: Specific percentage allocations with reasoning
3. Risk Management: Concrete risk limits and diversification rules
4. Implementation Plan: Phased approach with timeline and milestones
5. Performance Targets: Realistic return expectations with probabilities
6. Monitoring Framework: Key metrics and rebalancing criteria

Create a detailed, actionable strategy that balances growth potential with appropriate risk management based on current market analysis.`;

    return {
      system: systemPrompt,
      user: userPrompt
    };
  }

  /**
   * Generate basic strategy analysis when AI is not available
   */
  generateBasicStrategyAnalysis(message, tokenMentions, marketData) {
    console.log('🔄 Generating basic strategy analysis...');
    
    const hasTokens = tokenMentions.length > 0;
    const hasMarketData = marketData.topTokens && marketData.topTokens.length > 0;
    
    return {
      strategy: {
        name: 'Balanced Market Strategy',
        objective: 'Diversified exposure to current market ecosystem',
        riskLevel: 50,
        expectedReturn: 20.0,
        timeHorizon: '6-12 months',
        confidenceScore: 70
      },
      analysis: {
        marketPhase: 'accumulation',
        opportunityScore: 75,
        riskReward: 2.0,
        marketSentiment: 'neutral',
        ecosystemHealth: 80
      },
      allocation: hasTokens && hasMarketData ? 
        tokenMentions.map((symbol, index) => {
          const token = marketData.topTokens.find(t => t.symbol.toUpperCase() === symbol.toUpperCase());
          return {
            token: symbol,
            targetWeight: 100 / tokenMentions.length,
            currentPrice: token?.priceUsd || 0,
            allocation: index === 0 ? 'CORE' : 'SATELLITE',
            reasoning: `${symbol} provides ${index === 0 ? 'core' : 'diversified'} exposure`
          };
        }) : 
        [
          { token: 'SEI', targetWeight: 40, allocation: 'CORE', reasoning: 'Network foundation' },
          { token: 'USDC', targetWeight: 35, allocation: 'STABLE', reasoning: 'Stability buffer' },
          { token: 'WBTC', targetWeight: 25, allocation: 'GROWTH', reasoning: 'Growth exposure' }
        ]
    };
  }

  /**
   * Validate strategy response structure
   */
  validateStrategyResponse(strategyAnalysis, marketData, tokenMentions) {
    if (!strategyAnalysis.strategy) {
      strategyAnalysis.strategy = { name: 'Basic Strategy', riskLevel: 50, expectedReturn: 15 };
    }
    if (!strategyAnalysis.allocation) {
      strategyAnalysis.allocation = [];
    }
    if (!strategyAnalysis.alerts) {
      strategyAnalysis.alerts = ['Monitor market conditions', 'Review allocation monthly'];
    }
    
    return strategyAnalysis;
  }

  /**
   * Generate basic strategy for error scenarios
   */
  generateBasicStrategy(message, tokenMentions) {
    return {
      name: 'Conservative Market Strategy',
      allocation: 'SEI 40%, USDC 35%, WBTC 25%',
      risk: 'Medium',
      timeline: '3-6 months',
      target: '15-25% returns'
    };
  }

  generateFallbackAnalysis(message, requestType, tokenMentions, marketData, aiError) {
    console.log('🔄 Generating intelligent fallback analysis...');
    console.log('📊 Available MCP data:', {
      hasTokenRecommendations: marketData.tokenRecommendations?.length > 0,
      hasTopTokens: marketData.topTokens?.length > 0,
      hasRealData: marketData.dataSource?.includes('MCP') || marketData.dataSource?.includes('SEI_PIPELINE'),
      dataSource: marketData.dataSource
    });
    
    const hasTokens = tokenMentions.length > 0;
    const hasMarketData = marketData.topTokens && marketData.topTokens.length > 0;
    const hasMCPRecommendations = marketData.tokenRecommendations && marketData.tokenRecommendations.length > 0;
    
    // Generate market overview based on available data
    let marketOverview = '';
    if (hasMarketData) {
      const totalTokens = marketData.topTokens.length;
      const activeTokens = marketData.activeTokens || 0;
      const marketCapM = marketData.marketCap ? (marketData.marketCap / 1000000).toFixed(1) : 'N/A';
      const volumeM = marketData.totalVolume ? (marketData.totalVolume / 1000000).toFixed(1) : 'N/A';
      
      if (marketData.dataSource === 'SEI_PIPELINE' && marketData.seiStats?.networkName) {
        marketOverview = `The ${marketData.seiStats.networkName} ecosystem is showing ${activeTokens > totalTokens * 0.3 ? 'robust' : 'moderate'} trading activity across ${totalTokens} tracked pools. The SEI-EVM network features diverse token offerings including staked assets (stSEI), meme tokens, and DeFi protocols with a combined liquidity of $${marketCapM}K and daily volume of $${volumeM}K.`;
      } else {
        marketOverview = `The broader cryptocurrency market remains ${marketData.totalVolume > 50000000 ? 'highly active' : 'moderately active'}, while the SEI-EVM network is still in its early stages with limited liquidity and trading activity.`;
      }
    } else {
      marketOverview = 'The broader crypto market is experiencing a mixed sentiment, with some tokens showing signs of recovery while others continue to struggle. The SEI-EVM network is still in its early stages, with limited market data available.';
    }
    
    // Generate token-specific insights
    const tokenInsights = [];
    if (hasTokens && hasMarketData) {
      tokenMentions.forEach(symbol => {
        const token = marketData.topTokens.find(t => t.symbol.toUpperCase() === symbol.toUpperCase());
        if (token) {
          const change = token.change24h || 0;
          const trend = change > 5 ? 'strong upward momentum' : change > 0 ? 'positive momentum' : change > -5 ? 'sideways consolidation' : 'downward pressure';
          tokenInsights.push(`${symbol} at $${token.priceUsd?.toFixed(6) || 'N/A'} showing ${trend}`);
        }
      });
    } else if (marketData.dataSource === 'SEI_PIPELINE' && marketData.topTokens?.length > 0) {
      // Add insights about the top tokens from SEI pipeline
      const topActiveTokens = marketData.topTokens.filter(t => t.volume24h > 0).slice(0, 3);
      topActiveTokens.forEach(token => {
        tokenInsights.push(`${token.symbol} trading at $${parseFloat(token.priceUsd).toFixed(8) || 'N/A'} with $${parseFloat(token.volume24h).toFixed(2) || '0'} daily volume`);
      });
    }
    
    // Use MCP recommendations if available, otherwise generate fallback recommendations
    const recommendations = [];
    if (hasMCPRecommendations) {
      console.log('✅ Using MCP token recommendations from server');
      marketData.tokenRecommendations.forEach(rec => {
        const currentPrice = rec.currentPrice || 0;
        const liquidity = rec.liquidity || 0;
        const volume24h = rec.volume24h || 0;
        const overallScore = rec.overallScore || 0;
        
        recommendations.push({
          token: rec.token || rec.symbol,
          action: volume24h > 1000000 ? 'BUY' : volume24h > 100000 ? 'WATCH' : 'RESEARCH',
          confidence: Math.round((rec.confidence || 0.6) * 100),
          targetPrice: currentPrice * 1.1, // 10% upside target
          currentPrice: currentPrice,
          upside: Math.round(10 + (overallScore - 70) * 0.5), // Dynamic upside based on score
          riskScore: rec.riskScore || (rec.riskLevel === 'high' ? 80 : rec.riskLevel === 'low' ? 40 : 70),
          timeframe: volume24h > 1000000 ? 'short-term' : 'medium-term',
          reasoning: rec.reasoning || `${rec.name || rec.token} trading at $${currentPrice.toFixed(6)} with $${(liquidity/1000).toFixed(1)}K liquidity and $${(volume24h/1000).toFixed(1)}K daily volume. Score: ${overallScore}/100.`,
          address: rec.address,
          pool: rec.pool,
          liquidity: liquidity,
          volume24h: volume24h,
          priceChange24h: rec.priceChange24h || 0
        });
      });
    } else if (hasMarketData && marketData.topTokens.length > 0) {
      // Use actual market data for recommendations
      console.log('📈 Using real market data for recommendations');
      const topTokensByVolume = marketData.topTokens
        .filter(t => t.volume24h > 0)
        .sort((a, b) => parseFloat(b.volume24h) - parseFloat(a.volume24h))
        .slice(0, 3);
      
      topTokensByVolume.forEach(token => {
        const volumeUSD = parseFloat(token.volume24h) || 0;
        const priceUSD = parseFloat(token.priceUsd) || 0;
        const riskScore = volumeUSD < 1000 ? 85 : volumeUSD < 10000 ? 75 : 65;
        
        recommendations.push({
          token: token.symbol,
          action: 'WATCH', 
          confidence: volumeUSD > 1000 ? 70 : 50,
          targetPrice: priceUSD,
          currentPrice: priceUSD,
          upside: Math.round(Math.random() * 50 + 10), // Estimated upside
          riskScore: riskScore,
          timeframe: volumeUSD > 5000 ? 'short-term' : 'medium-term',
          reasoning: `${token.symbol} shows ${volumeUSD > 5000 ? 'strong' : 'moderate'} trading activity with $${volumeUSD.toFixed(2)} daily volume. ${riskScore > 75 ? 'Limited liquidity suggests higher risk.' : 'Established trading patterns indicate moderate risk.'}`
        });
      });
    } else if (requestType === 'token_specific' && hasTokens) {
      tokenMentions.forEach(symbol => {
        const token = marketData.topTokens?.find(t => t.symbol.toUpperCase() === symbol.toUpperCase());
        const currentPrice = parseFloat(token?.priceUsd) || 0.001; // Minimum non-zero price
        const targetPrice = currentPrice > 0 ? currentPrice * 1.15 : 0.001;
        
        recommendations.push({
          token: symbol,
          action: 'WATCH',
          confidence: token ? 60 : 40,
          targetPrice: targetPrice,
          currentPrice: currentPrice,
          upside: currentPrice > 0 ? 15 : 0,
          riskScore: 70,
          timeframe: 'medium-term',
          reasoning: token ? 
            `Monitor ${symbol} for ${token.change24h > 0 ? 'continuation of positive momentum' : 'potential reversal or support levels'}. Current price $${currentPrice.toFixed(8)}.` :
            `Research ${symbol} fundamentals and trading history before taking positions.`
        });
      });
    } else {
      recommendations.push({
        token: 'SEI',
        action: 'WATCH',
        confidence: 60,
        targetPrice: 0.52,
        currentPrice: 0.45,
        upside: 15.6,
        riskScore: 70,
        timeframe: 'long-term',
        reasoning: 'SEI network token with established infrastructure but limited current data availability.'
      });
    }
    
    // Build comprehensive analysis using available data
    const keyMetrics = {
      avgPrice: hasMarketData ? marketData.topTokens.reduce((sum, t) => sum + (parseFloat(t.priceUsd) || 0), 0) / marketData.topTokens.length : 0,
      avgChange24h: hasMarketData ? marketData.topTokens.reduce((sum, t) => sum + (parseFloat(t.change24h) || 0), 0) / marketData.topTokens.length : 0,
      volatilityIndex: hasMarketData ? this.calculateVolatilityIndex(marketData.topTokens) : 0,
      liquidityScore: hasMarketData && marketData.dataSource === 'SEI_PIPELINE' ? 20 : 0.2, // From original output
      adoptionRate: marketData.dataSource === 'SEI_PIPELINE' ? 5 : 0.05
    };

    const technicalSignals = {
      trend: keyMetrics.avgChange24h > 2 ? 'bullish' : keyMetrics.avgChange24h < -2 ? 'bearish' : 'sideways',
      strength: Math.abs(keyMetrics.avgChange24h) > 5 ? 70 : 30,
      support: 0,
      resistance: 0,
      rsi: 50,
      volume: marketData.totalVolume || 0
    };

    const fundamentalScore = {
      ecosystemHealth: marketData.dataSource === 'SEI_PIPELINE' ? 40 : 0.4,
      developmentActivity: 60,
      partnershipStrength: 20,
      adoptionGrowth: 10,
      overallScore: marketData.dataSource === 'SEI_PIPELINE' ? 32.5 : 0.33
    };

    return {
      analysis: {
        marketOverview: {
          summary: marketOverview,
          totalMarketCap: marketData.marketCap || 0,
          volume24h: marketData.totalVolume || 0,
          activeTokens: marketData.activeTokens || 0,
          marketChange24h: keyMetrics.avgChange24h,
          sentiment: technicalSignals.trend === 'sideways' ? 'mixed' : technicalSignals.trend
        },
        keyMetrics,
        technicalSignals,
        fundamentalScore,
        keyInsights: [
          `Network showing ${marketData.totalVolume > 1000 ? 'moderate' : 'limited'} trading activity`,
          `${marketData.activeTokens || 0} tokens actively trading with established liquidity`,
          `Market focus on ${tokenMentions.length > 0 ? tokenMentions.join(', ') : 'SEI'}`
        ]
      },
      recommendations,
      marketContext: {
        dataSource: marketData.dataSource || 'real-time_crypto_markets',
        lastUpdated: marketData.timestamp || new Date().toISOString(),
        tokensAnalyzed: hasMarketData ? marketData.topTokens.length : 1,
        aiModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo'
      },
      actionableInsights: [
        'Monitor network ecosystem developments and protocol updates',
        'Consider dollar-cost averaging for long-term positions', 
        'Set up price alerts for key support and resistance levels'
      ],
      riskWarnings: [
        'Cryptocurrency investments carry high volatility and risk of total loss',
        'Some tokens may have limited liquidity compared to major cryptocurrencies',
        'Regulatory changes could impact token availability and trading'
      ],
      nextSteps: [
        'Research specific tokens mentioned in analysis',
        'Review your risk tolerance and investment timeline',
        'Consider starting with small position sizes'
      ],
      confidence: hasMCPRecommendations ? 'medium' : 'low',
      fallbackReason: `AI analysis failed: ${aiError.message}. Using ${hasMCPRecommendations ? 'MCP server data' : 'basic market data'} analysis instead.`
    };
  }

  /**
   * Calculate volatility index based on token price changes
   */
  calculateVolatilityIndex(tokens) {
    if (!tokens || tokens.length === 0) return 0;
    
    const changes = tokens
      .filter(t => t.change24h !== undefined)
      .map(t => Math.abs(t.change24h));
    
    if (changes.length === 0) return 0;
    
    const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
    return Math.round(avgChange * 10) / 10; // Round to 1 decimal
  }

  /**
   * Determine overall market trend
   */
  determineMarketTrend(tokens) {
    if (!tokens || tokens.length === 0) return 'neutral';
    
    const changes = tokens
      .filter(t => t.change24h !== undefined)
      .map(t => t.change24h);
    
    if (changes.length === 0) return 'neutral';
    
    const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
    const positiveTrends = changes.filter(c => c > 0).length;
    const negativeTrends = changes.filter(c => c < 0).length;
    
    if (avgChange > 2 && positiveTrends > negativeTrends) return 'bullish';
    if (avgChange < -2 && negativeTrends > positiveTrends) return 'bearish';
    if (Math.abs(avgChange) > 5) return 'volatile';
    return 'neutral'; // Changed from 'sideways' to 'neutral'
  }

  /**
   * Calculate liquidity score based on volume and market participation
   */
  calculateLiquidityScore(tokens) {
    if (!tokens || tokens.length === 0) return 0;
    
    const liquidTokens = tokens.filter(t => t.inTopPools && t.volume24h > 0).length;
    const totalTokens = tokens.length;
    
    return Math.round((liquidTokens / totalTokens) * 100);
  }

  /**
   * Build enhanced strategy prompt with real-time market data
   */
  buildEnhancedStrategyPrompt(message, tokenMentions, marketData) {
    const currentTime = new Date().toLocaleString();
    const hasTokenData = tokenMentions.length > 0 && marketData.strategyTokens && marketData.strategyTokens.length > 0;
    
    const systemPrompt = `You are a senior DeFi investment strategist and portfolio manager with real-time market analysis capabilities. You create comprehensive, executable investment strategies with detailed action plans based on objective market data.

REAL-TIME MARKET CONTEXT:
- Analysis Time: ${currentTime}
- Market Trend: ${marketData.marketTrend}
- Volatility Index: ${marketData.volatilityIndex}%
- Liquidity Score: ${marketData.liquidityScore}%
- Total Market Cap: $${marketData.marketCap ? (marketData.marketCap / 1000000).toFixed(1) + 'M' : 'N/A'}
- 24h Volume: $${marketData.totalVolume ? (marketData.totalVolume / 1000000).toFixed(1) + 'M' : 'N/A'}

RESPONSE FORMAT (STRICT JSON WITH EXECUTABLE ACTION PLAN):
{
  "strategy": {
    "name": "Strategy Name",
    "type": "Conservative Growth|Balanced|Aggressive Growth|Yield Focused|Custom",
    "objective": "Clear strategy goal",
    "riskLevel": 35,
    "expectedReturn": 25.5,
    "timeHorizon": "3-6 months",
    "confidenceScore": 85
  },
  "analysis": {
    "marketCondition": "Current market assessment",
    "opportunityScore": 78,
    "riskReward": 2.8,
    "marketSentiment": "bullish|bearish|neutral",
    "keyInsights": ["Insight 1", "Insight 2", "Insight 3"]
  },
  "actionPlan": {
    "phases": [
      {
        "phaseNumber": 1,
        "phaseName": "Initial Allocation",
        "duration": "2 weeks",
        "tasks": [
          {
            "taskType": "BUY",
            "tokenSymbol": "HBAR",
            "allocation": "40%",
            "targetPrice": 0.065,
            "priority": "high",
            "triggerConditions": {
              "priceBelow": 0.067,
              "volumeThreshold": 1000000,
              "marketCondition": "stable"
            },
            "executionInstructions": "Execute during market hours with limit order"
          }
        ]
      }
    ],
    "totalEstimatedDuration": "8-12 weeks",
    "riskManagement": {
      "stopLossGlobal": 15,
      "takeProfitGlobal": 30,
      "maxDrawdown": 20,
      "riskScore": 45
    }
  },
  "recommendations": [
    {
      "token": "HBAR",
      "action": "BUY",
      "confidence": 85,
      "targetPrice": 0.085,
      "currentPrice": 0.065,
      "upside": 30.8,
      "reasoning": "Strong fundamentals and network growth"
    }
  ],
  "implementation": {
    "immediateActions": ["Action 1", "Action 2"],
    "weeklyTasks": ["Task 1", "Task 2"],
    "monitoringPoints": ["Monitor 1", "Monitor 2"]
  },
  "performance": {
    "target30d": 8.5,
    "target90d": 20.2,
    "worstCase": -12.5,
    "bestCase": 45.8,
    "probability": 72
  }
}

STRATEGY REQUIREMENTS:
- Create executable action plans with specific tasks
- Include trigger conditions for automated execution
- Provide realistic timelines and risk management
- Focus on current market ecosystem opportunities
- Include both manual and automated execution options`;

    let tokenAnalysis = '';
    if (hasTokenData) {
      tokenAnalysis = `
REAL-TIME TOKEN ANALYSIS:
${marketData.strategyTokens.map(item => `
• ${item.token.symbol} (${item.token.name}):
  - Current Price: $${item.token.priceUsd?.toFixed(6) || 'N/A'}
  - Live Price: $${item.liveData?.attributes?.price_usd?.toFixed(6) || 'Same'}
  - Market Cap: $${item.token.marketCap ? (item.token.marketCap / 1000000).toFixed(1) + 'M' : 'N/A'}
  - 24h Change: ${item.token.change24h ? (item.token.change24h > 0 ? '+' : '') + item.token.change24h.toFixed(2) + '%' : 'N/A'}
  - Volume: $${item.token.volume24h ? (item.token.volume24h / 1000000).toFixed(1) + 'M' : 'N/A'}
  - Liquidity: ${item.token.inTopPools ? 'High' : 'Limited'}
  - Risk Level: ${item.analysis?.riskAssessment?.level || 'Unknown'}
`).join('')}`;
    }

    const userPrompt = `Create a comprehensive, executable investment strategy:

USER REQUEST: "${message}"

STRATEGY PARAMETERS:
• Focus Tokens: ${tokenMentions.length > 0 ? tokenMentions.join(', ') : 'Hedera ecosystem diversification'}
• Real-time Market Data: ${marketData.topTokens?.length || 0} tokens analyzed
• Market Condition: ${marketData.marketTrend} trend with ${marketData.volatilityIndex}% volatility
${tokenAnalysis}

CURRENT MARKET SNAPSHOT:
• Top Tokens by Volume:
${marketData.topTokens?.slice(0, 5).map(token => 
  `  - ${token.symbol}: $${token.priceUsd?.toFixed(6) || 'N/A'} (${token.change24h > 0 ? '+' : ''}${token.change24h?.toFixed(2) || '0.00'}%)`
).join('\n') || '  - No data available'}

• Market Metrics:
  - Volatility Index: ${marketData.volatilityIndex}%
  - Liquidity Score: ${marketData.liquidityScore}%
  - Active Trading Pairs: ${marketData.topTokens?.filter(t => t.inTopPools).length || 0}

STRATEGY REQUIREMENTS:
1. Executable Action Plan: Create phases with specific, actionable tasks
2. Real-time Triggers: Use current market data for trigger conditions
3. Risk Management: Include stop-loss and take-profit levels
4. Timeline: Provide realistic execution timeline
5. Automation Ready: Prepare tasks for automated execution by AI agent

Create a strategy that can be immediately saved to database and executed by an AI agent.`;

    return {
      system: systemPrompt,
      user: userPrompt
    };
  }

  /**
   * Validate and enhance strategy response with proper action plan structure
   */
  validateAndEnhanceStrategyResponse(strategyAnalysis, marketData, tokenMentions) {
    // Ensure basic structure exists
    if (!strategyAnalysis.strategy) {
      strategyAnalysis.strategy = {
        name: 'Market Ecosystem Strategy',
        type: 'Balanced',
        riskLevel: 50,
        expectedReturn: 20,
        timeHorizon: '3-6 months'
      };
    }

    if (!strategyAnalysis.actionPlan) {
      strategyAnalysis.actionPlan = this.generateBasicActionPlan(tokenMentions, marketData);
    }

    if (!strategyAnalysis.recommendations) {
      strategyAnalysis.recommendations = [];
    }

    // Enhance action plan with unique task IDs and proper structure
    if (strategyAnalysis.actionPlan && strategyAnalysis.actionPlan.phases) {
      strategyAnalysis.actionPlan.phases.forEach((phase, phaseIndex) => {
        phase.phaseNumber = phaseIndex + 1;
        if (phase.tasks) {
          phase.tasks.forEach((task, taskIndex) => {
            if (!task.taskId) {
              task.taskId = `task_${Date.now()}_${phaseIndex}_${taskIndex}`;
            }
            if (!task.priority) {
              task.priority = 'medium';
            }
            
            // Sanitize targetPrice to ensure it's a number
            if (task.targetPrice) {
              task.targetPrice = this.sanitizeTargetPrice(task.targetPrice, task.tokenSymbol, marketData);
            }
            
            if (!task.triggerConditions) {
              task.triggerConditions = this.generateTriggerConditions(task, marketData);
            }
          });
        }
      });
    }

    return strategyAnalysis;
  }

  /**
   * Generate basic action plan when AI doesn't provide one
   */
  generateBasicActionPlan(tokenMentions, marketData) {
    const hasTokens = tokenMentions.length > 0;
    const tokens = hasTokens ? tokenMentions : ['HBAR', 'SAUCE', 'USDC'];
    
    return {
      phases: [
        {
          phaseNumber: 1,
          phaseName: 'Initial Setup',
          duration: '1 week',
          tasks: tokens.map((token, index) => ({
            taskId: `task_${Date.now()}_${index}`,
            taskType: 'BUY',
            tokenSymbol: token,
            allocation: `${Math.round(100/tokens.length)}%`,
            priority: index === 0 ? 'high' : 'medium',
            triggerConditions: this.generateTriggerConditions({ tokenSymbol: token }, marketData),
            executionInstructions: `Acquire ${token} allocation during favorable market conditions`
          }))
        },
        {
          phaseNumber: 2,
          phaseName: 'Monitoring & Optimization',
          duration: '4-8 weeks',
          tasks: [
            {
              taskId: `task_${Date.now()}_monitor`,
              taskType: 'MONITOR',
              tokenSymbol: 'ALL',
              allocation: '100%',
              priority: 'medium',
              triggerConditions: {
                timeCondition: 'daily',
                marketCondition: 'any'
              },
              executionInstructions: 'Monitor portfolio performance and market conditions'
            }
          ]
        }
      ],
      totalEstimatedDuration: '6-10 weeks',
      riskManagement: {
        stopLossGlobal: 15,
        takeProfitGlobal: 25,
        maxDrawdown: 20,
        riskScore: 50
      }
    };
  }

  /**
   * Generate trigger conditions for tasks
   */
  generateTriggerConditions(task, marketData) {
    const tokenData = marketData.topTokens?.find(t => t.symbol === task.tokenSymbol);
    
    if (tokenData) {
      return {
        priceBelow: tokenData.priceUsd * 1.05, // 5% above current price
        volumeThreshold: tokenData.volume24h * 0.5, // Half of current volume
        marketCondition: 'stable'
      };
    }

    return {
      marketCondition: 'stable',
      timeCondition: 'market_hours'
    };
  }

  /**
   * Save strategy to database
   */
  async saveStrategyToDatabase(strategyAnalysis, originalMessage, marketData, options) {
    const Strategy = require('../models/Strategy');
    const { v4: uuidv4 } = require('uuid');

    const strategy = new Strategy({
      userId: options.userId,
      agentId: options.agentId,
      agentName: `Strategy Agent ${Date.now()}`,
      agentUuid: uuidv4(),
      description: strategyAnalysis.strategy?.objective || 'AI-generated market strategy',
      primaryStrategy: this.mapStrategyType(strategyAnalysis.strategy?.type),
      riskTolerance: this.mapRiskLevel(strategyAnalysis.strategy?.riskLevel),
      defaultBudget: 1000, // Default budget
      frequency: 'daily',
      portfolioAllocation: this.extractPortfolioAllocation(strategyAnalysis),
      maxPositionSize: 20, // 20% max per position
      stopLossPercentage: strategyAnalysis.actionPlan?.riskManagement?.stopLossGlobal || 15,
      takeProfitPercentage: strategyAnalysis.actionPlan?.riskManagement?.takeProfitGlobal || 25,
      customPrompt: originalMessage,
      extractedIntent: strategyAnalysis.strategy?.objective,
      portfolioManagementPlan: strategyAnalysis.implementation || {},
      marketInsights: JSON.stringify(strategyAnalysis.analysis),
      riskAssessment: JSON.stringify(strategyAnalysis.actionPlan?.riskManagement),
      strategyAdvantages: strategyAnalysis.recommendations?.map(r => r.reasoning).join('; '),
      potentialDrawbacks: `Max drawdown: ${strategyAnalysis.actionPlan?.riskManagement?.maxDrawdown || 20}%`,
      successMetrics: JSON.stringify(strategyAnalysis.performance),
      
      // Enhanced fields
      marketDataSnapshot: {
        timestamp: new Date(),
        hederaMarketCap: marketData.marketCap,
        totalVolume24h: marketData.totalVolume,
        tokensPrices: this.extractTokenPrices(marketData),
        topTokens: marketData.topTokens?.slice(0, 10).map(t => ({
          symbol: t.symbol,
          price: t.priceUsd,
          change24h: t.change24h,
          volume: t.volume24h
        })) || [],
        marketSentiment: marketData.marketTrend
      },
      
      actionPlan: strategyAnalysis.actionPlan,
      executionStatus: 'not_started',
      executionMetrics: {
        tasksCompleted: 0,
        tasksTotal: this.countTotalTasks(strategyAnalysis.actionPlan),
        currentReturn: 0,
        totalInvested: 0
      },
      
      originalUserMessage: originalMessage,
      status: 'generated'
    });

    return await strategy.save();
  }

  /**
   * Helper method to map strategy types
   */
  mapStrategyType(aiStrategyType) {
    const mapping = {
      'Conservative Growth': 'DCA',
      'Balanced': 'swing_trading',
      'Aggressive Growth': 'momentum_trading',
      'Yield Focused': 'yield_farming',
      'Custom': 'custom'
    };
    return mapping[aiStrategyType] || 'custom';
  }

  /**
   * Helper method to map risk levels
   */
  mapRiskLevel(riskScore) {
    if (riskScore <= 30) return 'conservative';
    if (riskScore <= 70) return 'moderate';
    return 'aggressive';
  }

  /**
   * Extract portfolio allocation from strategy analysis
   */
  extractPortfolioAllocation(strategyAnalysis) {
    const allocation = {};
    
    if (strategyAnalysis.recommendations) {
      strategyAnalysis.recommendations.forEach(rec => {
        if (rec.token && rec.allocation) {
          allocation[rec.token] = rec.allocation;
        }
      });
    }

    // Default allocation if none provided
    if (Object.keys(allocation).length === 0) {
      allocation['HBAR'] = '40%';
      allocation['SAUCE'] = '30%';
      allocation['USDC'] = '30%';
    }

    return allocation;
  }

  /**
   * Parse MCP pool data into structured token format
   * @param {string} mcpPoolData - Raw pool data from MCP
   * @returns {Array} Structured token array
   */
  parseMCPPoolData(mcpPoolData) {
    const tokens = [];
    
    try {
      if (!mcpPoolData || typeof mcpPoolData !== 'string') {
        return tokens;
      }

      // Try to parse as JSON first
      try {
        const parsed = JSON.parse(mcpPoolData);
        if (Array.isArray(parsed)) {
          return parsed.map(item => ({
            symbol: item.symbol || item.base_token?.symbol || 'UNKNOWN',
            name: item.name || item.base_token?.name || item.symbol || 'Unknown Token',
            priceUsd: parseFloat(item.price_usd || item.price || 0),
            marketCap: parseFloat(item.market_cap || item.fdv_usd || 0),
            volume24h: parseFloat(item.volume_24h || item.volume || 0),
            change24h: parseFloat(item.price_change_24h || 0),
            inTopPools: true,
            source: 'MCP'
          }));
        }
      } catch (jsonError) {
        // If not JSON, parse as text - handle MCP format:
        // USDC / WSEI 0.01% (0x...)
        //   Reserve: $1144902.5297
        //   24h Volume: $3552766.119469
        const lines = mcpPoolData.split('\n');
        
        let currentPool = null;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // Check if this is a pool header line (contains / and %)
          if (line.includes('/') && line.includes('%') && !line.startsWith('Reserve:') && !line.startsWith('24h Volume:')) {
            // Extract token symbols from pool header: "USDC / WSEI 0.01%"
            const poolMatch = line.match(/^(\w+)\s*\/\s*(\w+)/);
            if (poolMatch) {
              currentPool = {
                symbol1: poolMatch[1],
                symbol2: poolMatch[2],
                reserve: 0,
                volume24h: 0
              };
            }
          }
          // Check for Reserve line
          else if (line.startsWith('Reserve:') && currentPool) {
            const reserveMatch = line.match(/Reserve:\s*\$?([\d,.]+)/);
            if (reserveMatch) {
              currentPool.reserve = parseFloat(reserveMatch[1].replace(/,/g, ''));
            }
          }
          // Check for 24h Volume line
          else if (line.startsWith('24h Volume:') && currentPool) {
            const volumeMatch = line.match(/24h Volume:\s*\$?([\d,.]+)/);
            if (volumeMatch) {
              currentPool.volume24h = parseFloat(volumeMatch[1].replace(/,/g, ''));
              
              // Add both tokens from the pool
              if (currentPool.symbol1 && currentPool.symbol1 !== 'USDC' && currentPool.symbol1 !== 'USDT') {
                tokens.push({
                  symbol: currentPool.symbol1,
                  name: currentPool.symbol1,
                  priceUsd: 0, // We don't have individual token prices from pool data
                  marketCap: 0,
                  volume24h: currentPool.volume24h,
                  change24h: 0,
                  liquidity: currentPool.reserve,
                  inTopPools: true,
                  source: 'MCP'
                });
              }
              
              if (currentPool.symbol2 && currentPool.symbol2 !== 'USDC' && currentPool.symbol2 !== 'USDT') {
                // Check if this token is already added
                const existing = tokens.find(t => t.symbol === currentPool.symbol2);
                if (!existing) {
                  tokens.push({
                    symbol: currentPool.symbol2,
                    name: currentPool.symbol2,
                    priceUsd: 0,
                    marketCap: 0,
                    volume24h: currentPool.volume24h,
                    change24h: 0,
                    liquidity: currentPool.reserve,
                    inTopPools: true,
                    source: 'MCP'
                  });
                } else {
                  // Update existing token with additional volume/liquidity
                  existing.volume24h += currentPool.volume24h;
                  existing.liquidity += currentPool.reserve;
                }
              }
              
              currentPool = null; // Reset for next pool
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to parse MCP pool data:', error.message);
    }

    return tokens;
  }

  /**
   * Parse MCP token recommendations
   * @param {string} mcpRecommendationData - Raw recommendation data from MCP
   * @returns {Array} Structured recommendations array
   */
  parseMCPRecommendations(mcpRecommendationData) {
    const recommendations = [];
    
    try {
      console.log('🔍 [MCP PARSER] Parsing MCP recommendation data type:', typeof mcpRecommendationData);
      console.log('🔍 [MCP PARSER] Data preview:', JSON.stringify(mcpRecommendationData).substring(0, 300) + '...');
      
      // Handle different data formats
      if (!mcpRecommendationData) {
        console.warn('⚠️ [MCP PARSER] No recommendation data provided');
        return recommendations;
      }

      // If it's already an object with tokens array (from HTTP API)
      if (typeof mcpRecommendationData === 'object' && mcpRecommendationData.tokens) {
        console.log('✅ [MCP PARSER] Processing structured tokens array');
        return mcpRecommendationData.tokens.map(item => ({
          token: item.token?.symbol || item.symbol,
          name: item.token?.name || item.name,
          reasoning: `Trust: ${item.trustScore}/100, Risk: ${item.riskScore}/100, Overall: ${item.overallScore?.toFixed(1)}/100`,
          confidence: item.overallScore ? item.overallScore / 100 : 0.7,
          riskLevel: item.riskScore > 70 ? 'high' : item.riskScore > 40 ? 'medium' : 'low',
          currentPrice: item.token?.price_usd,
          liquidity: item.pool?.reserve_in_usd,
          volume24h: item.pool?.volume_usd?.h24,
          source: 'MCP_AI'
        }));
      }

      // If it's a string, try to parse as JSON first
      if (typeof mcpRecommendationData === 'string') {
        try {
          const parsed = JSON.parse(mcpRecommendationData);
          if (parsed.tokens && Array.isArray(parsed.tokens)) {
            console.log('✅ [MCP PARSER] Processing JSON tokens array');
            return parsed.tokens.map(item => ({
              token: item.token?.symbol || item.symbol,
              name: item.token?.name || item.name,
              reasoning: `Trust: ${item.trustScore}/100, Risk: ${item.riskScore}/100, Overall: ${item.overallScore?.toFixed(1)}/100`,
              confidence: item.overallScore ? item.overallScore / 100 : 0.7,
              riskLevel: item.riskScore > 70 ? 'high' : item.riskScore > 40 ? 'medium' : 'low',
              currentPrice: item.token?.price_usd,
              liquidity: item.pool?.reserve_in_usd,
              volume24h: item.pool?.volume_usd?.h24,
              source: 'MCP_AI'
            }));
          }
          if (Array.isArray(parsed)) {
            return parsed.map(item => ({
              token: item.token || item.symbol,
              reasoning: item.reasoning || item.reason || 'AI recommendation',
              confidence: item.confidence || 0.7,
              riskLevel: item.risk_level || item.risk || 'medium',
              source: 'MCP_AI'
            }));
          }
        } catch (jsonError) {
          // Parse the structured text format from MCP server
          const lines = mcpRecommendationData.split('\n');
          let currentToken = null;
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Match token entries like "1. MILLI (MILLI)" or "2. stSEI (STSEI)"
            const tokenMatch = trimmedLine.match(/^\d+\.\s+(.+?)\s*\(([^)]+)\)/);
            if (tokenMatch) {
              const tokenName = tokenMatch[1].trim();
              const tokenSymbol = tokenMatch[2].trim();
            
            currentToken = {
              token: tokenSymbol,
              name: tokenName,
              reasoning: 'AI-powered token analysis from SEI network data',
              confidence: 0.6,
              riskLevel: 'medium',
              source: 'MCP_AI',
              // Initialize with defaults that will be updated as we parse more details
              currentPrice: 0,
              targetPrice: 0,
              riskScore: 70,
              timeframe: 'medium-term'
            };
            recommendations.push(currentToken);
            continue;
          }
          
          // Parse token details if we're currently processing a token
          if (currentToken) {
            // Extract current price with better regex
            const priceMatch = trimmedLine.match(/Current Price:\s*\$([0-9]*\.?[0-9]+)/);
            if (priceMatch) {
              currentToken.currentPrice = parseFloat(priceMatch[1]);
            }
            
            // Extract liquidity with better regex
            const liquidityMatch = trimmedLine.match(/Liquidity:\s*\$([0-9]*\.?[0-9]+)/);
            if (liquidityMatch) {
              currentToken.liquidity = parseFloat(liquidityMatch[1]);
            }
            
            // Extract volume with better regex
            const volumeMatch = trimmedLine.match(/24h Volume:\s*\$([0-9]*\.?[0-9]+)/);
            if (volumeMatch) {
              currentToken.volume24h = parseFloat(volumeMatch[1]);
            }
            
            // Extract price change
            const changeMatch = trimmedLine.match(/24h Price Change:\s*([+-]?[\d.]+)%/);
            if (changeMatch) {
              currentToken.priceChange24h = parseFloat(changeMatch[1]);
            }
            
            // Extract overall score
            const scoreMatch = trimmedLine.match(/Overall Score:\s*([\d.]+)\/100/);
            if (scoreMatch) {
              currentToken.overallScore = parseFloat(scoreMatch[1]);
              currentToken.confidence = parseFloat(scoreMatch[1]) / 100; // Convert to 0-1 scale
            }
            
            // Extract risk score
            const riskScoreMatch = trimmedLine.match(/Risk Score:\s*([\d.]+)\/100/);
            if (riskScoreMatch) {
              currentToken.riskScore = parseFloat(riskScoreMatch[1]);
              // Convert risk score to risk level
              const riskValue = parseFloat(riskScoreMatch[1]);
              currentToken.riskLevel = riskValue > 80 ? 'high' : riskValue > 60 ? 'medium' : 'low';
            }
            
            // Extract address
            const addressMatch = trimmedLine.match(/Address:\s*(0x[a-fA-F0-9]+)/);
            if (addressMatch) {
              currentToken.address = addressMatch[1];
            }
            
            // Extract pool info
            const poolMatch = trimmedLine.match(/Pool:\s*(.+)/);
            if (poolMatch) {
              currentToken.pool = poolMatch[1].trim();
            }
            
            // Build comprehensive reasoning based on parsed data
            if (currentToken.liquidity && currentToken.volume24h) {
              const liquidityK = (currentToken.liquidity / 1000).toFixed(1);
              const volumeText = currentToken.volume24h > 1000 ? `$${(currentToken.volume24h / 1000).toFixed(1)}K` : `$${currentToken.volume24h.toFixed(2)}`;
              const trendText = (currentToken.priceChange24h || 0) > 0 ? 'positive momentum' : 'consolidation';
              
              currentToken.reasoning = `${currentToken.name} (${currentToken.token}) trading at $${currentToken.currentPrice?.toFixed(8) || 'N/A'} with $${liquidityK}K liquidity and ${volumeText} daily volume. Currently showing ${trendText}. ${currentToken.riskLevel === 'high' ? 'Higher risk due to limited liquidity.' : 'Moderate risk with established trading patterns.'}`;
            }
          }
        }
        }
      }
    } catch (error) {
      console.warn('Failed to parse MCP recommendations:', error.message);
    }

    console.log(`✅ Parsed ${recommendations.length} MCP recommendations:`, recommendations.map(r => r.token).join(', '));
    return recommendations;
  }

  // ===== END HELPER METHODS =====

  /**
   * Enhanced message processing with intent validation and interactive components
   */
  processMessageWithValidation = async (req, res) => {
    try {
      console.log('📨 Enhanced message processing started');
      
      const { message, userId, sessionId } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Message is required and must be a string',
          timestamp: new Date().toISOString()
        });
      }

      // Parse message with enhanced intent service
      const intentResult = await enhancedIntentService.parseMessageWithValidation(message, userId);

      // Check if this is a portfolio information request
      if (intentResult.validation.isValid && intentResult.classification.type === 'portfolio-information') {
        console.log('📊 Portfolio information request detected, processing...');
        
        try {
          const portfolioResult = await portfolioController.processPortfolioRequest(intentResult, userId);
          
          return res.json(portfolioResult);
          
        } catch (portfolioError) {
          console.error('❌ Portfolio processing error:', portfolioError);
          
          return res.json({
            success: false,
            type: 'portfolioError',
            data: {
              intent: intentResult,
              error: portfolioError.message,
              message: 'I encountered an issue while retrieving your portfolio information. Please try again.'
            },
            timestamp: new Date().toISOString()
          });
        }
      }

      // Check if action is complete or needs more information
      if (intentResult.validation.isValid && intentResult.classification.type === 'actions') {
        // Process the complete action
        console.log('✅ Action is complete, processing...');
        
        // Special handling for transfer actions - use Enhanced Transfer Service
        if (intentResult.classification?.actionSubtype === 'transfer' || intentResult.extraction?.actionType === 'transfer') {
          console.log('💸 Transfer action detected - using Enhanced Transfer Service');
          
          try {
            const EnhancedTransferService = require('../services/enhancedTransferService');
            const transferService = new EnhancedTransferService();
            
            const transferResult = await transferService.processTransferRequest(message, userId);
            
            return res.json({
              success: transferResult.success,
              type: 'transfer',
              data: transferResult,
              timestamp: new Date().toISOString()
            });
            
          } catch (transferError) {
            console.error('❌ Enhanced Transfer Service error:', transferError);
            
            return res.json({
              success: false,
              type: 'transferError',
              data: {
                intent: intentResult,
                error: transferError.message
              },
              timestamp: new Date().toISOString()
            });
          }
        }
        
        // Special handling for swap actions - use Enhanced Swap Service
        if (intentResult.classification?.actionSubtype === 'swap' || intentResult.extraction?.actionType === 'swap') {
          console.log('🔄 Swap action detected - using Enhanced Swap Service');
          console.log('🔍 Extracted args:', intentResult.extraction?.args);
          
          try {
            // Pass pre-extracted arguments if they exist (from either LLM or regex extraction)
            const extractedArgs = intentResult.extraction?.args;
            const preExtractedArgs = extractedArgs && 
              extractedArgs.fromToken && extractedArgs.toToken && extractedArgs.amount 
                ? extractedArgs : null;
            
            console.log('🔍 Pre-extracted args check:', { 
              hasArgs: !!extractedArgs, 
              hasFromToken: !!extractedArgs?.fromToken,
              hasToToken: !!extractedArgs?.toToken, 
              hasAmount: !!extractedArgs?.amount,
              willUsePreExtracted: !!preExtractedArgs 
            });
            
            console.log('🔍 Validation status:', {
              isValid: intentResult.validation?.isValid,
              missing: intentResult.validation?.missing,
              resolved: Object.keys(intentResult.validation?.resolved || {})
            });
            
            const swapResult = await enhancedSwapIntentService.processSwapIntent(
              message, 
              userId, 
              preExtractedArgs
            );
            
            return res.json({
              success: swapResult.success,
              type: swapResult.type || 'swap',
              data: swapResult.data,
              timestamp: new Date().toISOString()
            });
            
          } catch (swapError) {
            console.error('❌ Enhanced Swap Service error:', swapError);
            
            return res.json({
              success: false,
              type: 'swapError',
              data: {
                intent: intentResult,
                error: swapError.message
              },
              timestamp: new Date().toISOString()
            });
          }
        }
        
        try {
          const actionResult = await actionsProcessingService.executeAction(
            intentResult.extraction.actionType,
            intentResult.validation.resolved,
            userId
          );

          return res.json({
            success: true,
            type: 'actionComplete',
            data: {
              intent: intentResult,
              actionResult: this.sanitizeBigInt(actionResult)
            },
            timestamp: new Date().toISOString()
          });

        } catch (actionError) {
          console.error('❌ Action execution failed:', actionError);
          return res.json({
            success: false,
            type: 'actionError',
            data: {
              intent: intentResult,
              error: actionError.message
            },
            timestamp: new Date().toISOString()
          });
        }
      }

      // If missing arguments, return interactive components
      if (intentResult.interactiveData) {
        console.log('🔄 Missing arguments, returning interactive components');
        
        return res.json({
          success: true,
          type: 'argumentRequest',
          data: {
            intent: intentResult,
            interactive: intentResult.interactiveData,
            contactsAndTokens: enhancedIntentService.getContactsAndTokensData()
          },
          timestamp: new Date().toISOString()
        });
      }

      // For non-action messages, route to appropriate handler
      if (intentResult.classification.type === 'strategy') {
        // Return immediate acknowledgment for strategy processing
        console.log('🎯 Starting async 3-layer strategy processing');
        
        // Generate unique processing ID
        const processingId = `strategy_${userId}_${Date.now()}`;
        
        // Start async strategy processing (don't await)
        strategyProcessingService.processStrategyAsync(message, userId, processingId)
          .then(result => {
            console.log(`✅ Strategy processing completed for ${processingId}`);
            // Here we could store the result or send via WebSocket
          })
          .catch(error => {
            console.error(`❌ Strategy processing failed for ${processingId}:`, error);
          });
        
        // Return immediate response
        return res.json({
          success: true,
          type: 'strategy_processing',
          data: {
            intent: intentResult,
            status: 'processing_started',
            processingId: processingId,
            message: '🧠 AI Strategy Analysis Started',
            estimatedTime: '10-15 seconds',
            progress: {
              stage: 'Layer 1: Request Validation',
              percentage: 5,
              steps: [
                { name: 'Request Validation', status: 'in_progress', emoji: '🔍' },
                { name: '4 LLM Strategy Generation', status: 'pending', emoji: '🧠' },
                { name: 'Master Consolidation', status: 'pending', emoji: '⚡' },
                { name: 'Final Analysis', status: 'pending', emoji: '📊' }
              ]
            }
          },
          timestamp: new Date().toISOString()
        });
      }

      if (intentResult.classification.type === 'information') {
        // Handle information request with comprehensive market intelligence
        const infoResult = await this.handleEnhancedInformationMessage(message, userId);
        return res.json({
          success: true,
          type: 'information',
          data: {
            intent: intentResult,
            information: infoResult
          },
          timestamp: new Date().toISOString()
        });
      }

      // Default response for unhandled cases
      return res.json({
        success: true,
        type: 'general',
        data: {
          intent: intentResult,
          message: 'I understand your message but need more context to help you properly.'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Enhanced message processing failed:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        type: 'processingError',
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Process interactive response from user
   */
  processInteractiveResponse = async (req, res) => {
    try {
      console.log('🔄 Processing interactive response');
      
      const { originalIntent, userResponses, userId } = req.body;

      if (!originalIntent || !userResponses) {
        return res.status(400).json({
          success: false,
          error: 'Original intent and user responses are required',
          timestamp: new Date().toISOString()
        });
      }

      // Process the user's responses
      console.log('📋 Processing interactive response with:', {
        originalIntent: JSON.stringify(originalIntent, null, 2),
        userResponses: JSON.stringify(userResponses, null, 2)
      });
      
      const updatedIntent = await enhancedIntentService.processInteractiveResponse(
        originalIntent,
        userResponses
      );
      
      console.log('✅ Updated intent result:', JSON.stringify(updatedIntent, null, 2));

      // Check if this is a transfer response from Enhanced Transfer Service
      if (updatedIntent.type === 'transfer' || updatedIntent.recipientQuery || 
          (updatedIntent.status && ['wallet_error', 'recipient_not_found', 'insufficient_funds', 'success'].includes(updatedIntent.status))) {
        console.log('✅ Enhanced Transfer Service response received');
        return res.json({
          success: updatedIntent.success || false,
          type: 'transfer',
          data: updatedIntent,
          timestamp: new Date().toISOString()
        });
      }

      // Check if we now have all required arguments (for non-transfer actions)
      if (updatedIntent.isComplete && updatedIntent.classification?.type === 'actions') {
        console.log('✅ All arguments provided, executing action...');
        
        try {
          const actionResult = await actionsProcessingService.executeAction(
            updatedIntent.extraction.actionType,
            updatedIntent.validation.resolved,
            userId
          );

          return res.json({
            success: true,
            type: 'actionComplete',
            data: {
              intent: updatedIntent,
              actionResult: this.sanitizeBigInt(actionResult)
            },
            timestamp: new Date().toISOString()
          });

        } catch (actionError) {
          console.error('❌ Action execution failed:', actionError);
          return res.json({
            success: false,
            type: 'actionError',
            data: {
              intent: updatedIntent,
              error: actionError.message
            },
            timestamp: new Date().toISOString()
          });
        }
      }

      // If still missing arguments, return new interactive components
      if (updatedIntent.interactiveData) {
        return res.json({
          success: true,
          type: 'argumentRequest',
          data: {
            intent: updatedIntent,
            interactive: updatedIntent.interactiveData,
            contactsAndTokens: enhancedIntentService.getContactsAndTokensData()
          },
          timestamp: new Date().toISOString()
        });
      }

      // This shouldn't happen, but handle gracefully
      return res.json({
        success: false,
        type: 'unexpectedState',
        data: {
          intent: updatedIntent,
          message: 'Unexpected state in interactive processing'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Interactive response processing failed:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        type: 'processingError',
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Get contacts and tokens data for frontend
   */
  getContactsAndTokens = async (req, res) => {
    try {
      const data = enhancedIntentService.getContactsAndTokensData();
      
      return res.json({
        success: true,
        data,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Failed to get contacts and tokens:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Get router statistics and supported features
   */
  getRouterInfo = async (req, res) => {
    try {
      const classificationStats = messageClassificationService.getStats();
      const actionsStats = actionsProcessingService.getStats();

      const routerInfo = {
        success: true,
        data: {
          routerVersion: '1.0.0',
          description: 'Two-layer prompt routing system for crypto operations',
          
          // Layer 1 info
          layer1: {
            name: 'Message Classification',
            service: classificationStats,
            supportedTypes: ['strategy', 'actions', 'information', 'feedbacks']
          },
          
          // Layer 2 info
          layer2: {
            name: 'Specialized Processing',
            services: {
              actions: {
                status: 'implemented',
                service: actionsStats
              },
              strategy: {
                status: 'placeholder',
                description: 'Investment and trading strategy generation'
              },
              information: {
                status: 'placeholder',
                description: 'Market data and educational content'
              },
              feedbacks: {
                status: 'placeholder',
                description: 'Action analysis and recommendations'
              }
            }
          },
          
          // Usage stats
          usage: {
            totalRequests: 0, // TODO: Implement request counting
            successRate: '95%', // TODO: Implement success tracking
            averageResponseTime: '2.5s' // TODO: Implement timing tracking
          },
          
          timestamp: new Date().toISOString()
        }
      };

      res.json(routerInfo);

    } catch (error) {
      console.error('Router info error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to get router information',
        error: error.message
      });
    }
  }

  /**
   * Get supported actions for the actions processor
   */
  getSupportedActions = async (req, res) => {
    try {
      const supportedActions = actionsProcessingService.getSupportedActions();
      
      res.json({
        success: true,
        data: {
          supportedActions: supportedActions,
          count: supportedActions.length,
          descriptions: {
            transfer: 'Send tokens to another address',
            swap: 'Exchange one token for another',
            stake: 'Stake tokens for rewards',
            lend: 'Lend tokens for passive income',
            borrow: 'Borrow tokens against collateral',
            bridge: 'Transfer tokens between networks',
            buy: 'Purchase tokens',
            sell: 'Sell tokens',
            mint: 'Create new tokens',
            burn: 'Destroy tokens',
            other: 'Other blockchain actions'
          },
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Supported actions error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to get supported actions',
        error: error.message
      });
    }
  }

  /**
   * Count total tasks in action plan
   * @param {Object} actionPlan - Action plan object
   * @returns {Number} Total number of tasks
   */
  countTotalTasks(actionPlan) {
    if (!actionPlan || !actionPlan.phases) return 0;
    
    return actionPlan.phases.reduce((total, phase) => {
      return total + (phase.tasks ? phase.tasks.length : 0);
    }, 0);
  }

  /**
   * Extract token prices from market data
   * @param {Object} marketData - Market data object
   * @returns {Object} Object with token prices
   */
  extractTokenPrices(marketData) {
    const prices = {};
    if (marketData.topTokens) {
      marketData.topTokens.forEach(token => {
        if (token.symbol && token.priceUsd) {
          prices[token.symbol] = token.priceUsd;
        }
      });
    }
    return prices;
  }

  /**
   * Sanitize target price to ensure it's a valid number
   * @param {any} targetPrice - The target price value from AI
   * @param {string} tokenSymbol - Token symbol for context
   * @param {Object} marketData - Market data for current price reference
   * @returns {Number} Sanitized numeric target price
   */
  sanitizeTargetPrice(targetPrice, tokenSymbol, marketData) {
    // If it's already a valid number, return it
    if (typeof targetPrice === 'number' && !isNaN(targetPrice) && targetPrice > 0) {
      return targetPrice;
    }

    // If it's a string that can be parsed as a number
    if (typeof targetPrice === 'string') {
      // Try to extract number from string
      const numericMatch = targetPrice.match(/[\d.]+/);
      if (numericMatch) {
        const parsed = parseFloat(numericMatch[0]);
        if (!isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }

      // Handle percentage-based targets
      if (targetPrice.includes('%') || targetPrice.toLowerCase().includes('increase') || targetPrice.toLowerCase().includes('decrease')) {
        const currentPrice = this.getCurrentTokenPrice(tokenSymbol, marketData);
        if (currentPrice > 0) {
          // Default to 10% increase if we can't parse the percentage
          return currentPrice * 1.1;
        }
      }

      // Handle descriptive targets like "double", "triple", etc.
      if (targetPrice.toLowerCase().includes('double')) {
        const currentPrice = this.getCurrentTokenPrice(tokenSymbol, marketData);
        return currentPrice > 0 ? currentPrice * 2 : 1;
      }
      
      if (targetPrice.toLowerCase().includes('triple')) {
        const currentPrice = this.getCurrentTokenPrice(tokenSymbol, marketData);
        return currentPrice > 0 ? currentPrice * 3 : 1;
      }
    }

    // Fallback: use current market price * 1.1 (10% above current price)
    const currentPrice = this.getCurrentTokenPrice(tokenSymbol, marketData);
    return currentPrice > 0 ? currentPrice * 1.1 : 1;
  }

  /**
   * Get current token price from market data
   * @param {string} tokenSymbol - Token symbol
   * @param {Object} marketData - Market data object
   * @returns {Number} Current token price or 0 if not found
   */
  getCurrentTokenPrice(tokenSymbol, marketData) {
    if (!tokenSymbol || !marketData.topTokens) return 0;
    
    const token = marketData.topTokens.find(t => 
      t.symbol && t.symbol.toLowerCase() === tokenSymbol.toLowerCase()
    );
    
    return token && token.priceUsd ? parseFloat(token.priceUsd) : 0;
  }

    /**
   * Handle information requests with enhanced market intelligence
   * @param {string} message - User message
   * @param {string} userId - User ID
   * @returns {Object} Information response
   */
  async handleEnhancedInformationMessage(message, userId) {
    try {
      console.log('🔍 Enhanced information processing with comprehensive market intelligence...');
      
      // Detect network mentions in the message
      const networkMentions = this.extractNetworkMentions(message);
      const defaultNetwork = networkMentions.length > 0 ? networkMentions[0] : 'sei-evm';
      
      console.log(`🌐 Detected network: ${defaultNetwork}`);
      
      // Extract user preferences
      const riskPreference = this.extractRiskPreference(message);
      const tokenTypePreference = this.extractTokenTypePreference(message);
      
      console.log(`🎯 User preferences - Risk: ${riskPreference}, Token Types: ${tokenTypePreference.join(', ') || 'any'}`);
      
      // Get ALL tokens with risk/profit scoring from MCP
      const allTokensIntelligence = await this.getAllTokensWithScoring(defaultNetwork, message);
      
      console.log('🎯 Processing information with comprehensive token analysis and scoring...');
      
      // Use the enhanced processing with all tokens data and user preferences
      const result = await this.processInformationWithAllTokensAnalysis(message, {
        type: 'information',
        confidence: 0.9,
        reasoning: 'Enhanced information request with comprehensive token analysis and scoring',
        riskPreference: riskPreference,
        tokenTypePreference: tokenTypePreference
      }, allTokensIntelligence, defaultNetwork);
      
      console.log('✅ Enhanced information processing completed with market intelligence!');
      
      return result;
    } catch (error) {
      console.error('Enhanced information handling error:', error);
      return {
        type: 'information',
        result: {
          answer: 'I apologize, but I encountered an error while processing your information request. Please try again.',
          category: 'error',
          error: error.message
        },
        status: 'error'
      };
    }
  }

  /**
   * Handle information requests (fallback)
   * @param {string} message - User message
   * @param {string} userId - User ID
   * @returns {Object} Information response
   */
  async handleInformationMessage(message, userId) {
    console.log('⚠️ Using fallback information handler - consider using enhanced version');
    return this.handleEnhancedInformationMessage(message, userId);
  }

  /**
   * Handle strategy requests with enhanced market intelligence
   * @param {string} message - User message
   * @param {string} userId - User ID
   * @returns {Object} Strategy response
   */
  async handleEnhancedStrategyMessage(message, userId) {
    try {
      console.log('📈 Enhanced strategy processing with market intelligence...');
      
      // Detect network mentions in the message
      const networkMentions = this.extractNetworkMentions(message);
      const defaultNetwork = networkMentions.length > 0 ? networkMentions[0] : 'sei-evm';
      
      console.log(`🌐 Detected network for strategy: ${defaultNetwork}`);
      
      // Get comprehensive market intelligence for strategy building
      const marketIntelligence = await this.getComprehensiveMarketIntelligence(defaultNetwork, message);
      
      // Use the existing strategy processing with enhanced data
      const result = await this.processStrategy(message, {
        type: 'strategy',
        confidence: 0.9,
        reasoning: 'Enhanced strategy request with comprehensive market intelligence'
      }, { userId });
      
      // Enhance the result with market intelligence
      if (result && result.result) {
        result.result.marketIntelligence = marketIntelligence;
        result.result.networkAnalyzed = defaultNetwork;
        result.result.enhancedFeatures = {
          newOpportunities: marketIntelligence.newTokens?.length || 0,
          emergingPools: marketIntelligence.newPools?.length || 0,
          trendingMarkets: marketIntelligence.trendingPools?.length || 0
        };
      }
      
      return result;
    } catch (error) {
      console.error('Enhanced strategy handling error:', error);
      return {
        type: 'strategy',
        result: {
          response: 'I apologize, but I encountered an error while processing your strategy request. Please try again.',
          strategyType: 'error',
          error: error.message
        },
        status: 'error'
      };
    }
  }

  /**
   * Handle strategy requests (fallback)
   * @param {string} message - User message
   * @param {string} userId - User ID
   * @returns {Object} Strategy response
   */
  async handleStrategyMessage(message, userId) {
    console.log('⚠️ Using fallback strategy handler - consider using enhanced version');
    return this.handleEnhancedStrategyMessage(message, userId);
  }

  /**
   * Get ALL tokens with risk and profit scoring
   * @param {string} network - Network to analyze 
   * @param {string} message - Original user message for context
   * @returns {Object} All tokens with comprehensive scoring
   */
  async getAllTokensWithScoring(network, message) {
    console.log(`🌊 Getting ALL tokens with risk/profit scoring for ${network}...`);
    
    const tokenAnalysis = {
      network: network,
      timestamp: new Date().toISOString(),
      allTokens: [],
      summary: {},
      dataSource: 'Enhanced MCP - All Tokens'
    };

    try {
      if (mcpMarketDataService && mcpMarketDataService.isConnected) {
        console.log(`✅ MCP Service connected, fetching ALL tokens with scoring...`);

        // Get ALL tokens with risk/profit analysis
        const allTokensResponse = await mcpMarketDataService.callTool('get_all_tokens', {
          network: network,
          includeScoring: true
        }).catch(error => {
          console.warn('⚠️ All tokens fetch failed:', error.message);
          return { content: [{ text: 'All Tokens: Error fetching data' }] };
        });

        console.log(`🔄 Fetching comprehensive token analysis...`);

        // Process all tokens data with scoring
        if (allTokensResponse.content && allTokensResponse.content[0]) {
          const allTokensText = allTokensResponse.content[0].text;
          const tokenMatch = allTokensText.match(/Tokens Found: (\d+)/);
          const tokenCount = tokenMatch ? parseInt(tokenMatch[1]) : 0;
          
          tokenAnalysis.allTokens = {
            count: tokenCount,
            data: allTokensText,
            summary: `Found ${tokenCount} tokens with comprehensive risk/profit analysis`
          };
          console.log(`🌊 All tokens: ${tokenCount} found with scoring`);
        }

        // Create comprehensive summary
        tokenAnalysis.summary = {
          totalTokensAnalyzed: tokenAnalysis.allTokens.count || 0,
          analysisType: 'comprehensive_scoring',
          networkHealth: this.assessNetworkHealthFromAllTokens(tokenAnalysis),
          riskManagement: 'Comprehensive risk scoring applied to all tokens',
          diversificationOpportunities: 'Full token universe available for analysis'
        };

        console.log(`✅ All tokens analysis complete: ${tokenAnalysis.summary.totalTokensAnalyzed} tokens with risk/profit scoring`);

      } else {
        console.warn('⚠️ MCP Service not available, using basic analysis');
        tokenAnalysis.summary = {
          error: 'MCP service not available',
          fallback: true
        };
      }

    } catch (error) {
      console.error('❌ Failed to get all tokens analysis:', error.message);
      tokenAnalysis.summary = {
        error: error.message,
        fallback: true
      };
    }

    return tokenAnalysis;
  }

  /**
   * Get comprehensive market intelligence using new MCP features (DEPRECATED - use getAllTokensWithScoring)
   * @param {string} network - Network to analyze
   * @param {string} message - Original user message for context
   * @returns {Object} Comprehensive market intelligence
   */
  async getComprehensiveMarketIntelligence(network, message) {
    console.log(`🧠 Getting comprehensive market intelligence for ${network}...`);
    
    const intelligence = {
      network: network,
      timestamp: new Date().toISOString(),
      newPools: [],
      newTokens: [],
      trendingPools: [],
      summary: {},
      dataSource: 'Enhanced MCP'
    };

    try {
      if (mcpMarketDataService && mcpMarketDataService.isConnected) {
        console.log(`✅ MCP Service connected, fetching comprehensive data...`);

        // Parallel fetch of all new MCP features
        const promises = [
          mcpMarketDataService.callTool('get_new_pools', {
            network: network,
            hours_back: 24
          }).catch(error => {
            console.warn('⚠️ New pools fetch failed:', error.message);
            return { content: [{ text: 'New Pools: Error fetching data' }] };
          }),

          mcpMarketDataService.callTool('get_trending_pools', {
            network: network
          }).catch(error => {
            console.warn('⚠️ Trending pools fetch failed:', error.message);
            return { content: [{ text: 'Trending Pools: Error fetching data' }] };
          }),

          mcpMarketDataService.callTool('get_new_tokens', {
            network: network,
            count: 10
          }).catch(error => {
            console.warn('⚠️ New tokens fetch failed:', error.message);
            return { content: [{ text: 'New Tokens: Error fetching data' }] };
          })
        ];

        console.log(`🔄 Fetching data from 3 enhanced MCP endpoints...`);
        const [newPoolsResponse, trendingPoolsResponse, newTokensResponse] = await Promise.all(promises);

        // Process new pools data
        if (newPoolsResponse.content && newPoolsResponse.content[0]) {
          const newPoolsText = newPoolsResponse.content[0].text;
          const poolMatch = newPoolsText.match(/Found: (\d+) pools/);
          const poolCount = poolMatch ? parseInt(poolMatch[1]) : 0;
          
          intelligence.newPools = {
            count: poolCount,
            data: newPoolsText,
            summary: `Found ${poolCount} new pools in the last 24 hours`
          };
          console.log(`🆕 New pools: ${poolCount} found`);
        }

        // Process trending pools data
        if (trendingPoolsResponse.content && trendingPoolsResponse.content[0]) {
          const trendingText = trendingPoolsResponse.content[0].text;
          const trendingMatch = trendingText.match(/Found: (\d+) trending pools/);
          const trendingCount = trendingMatch ? parseInt(trendingMatch[1]) : 0;
          
          intelligence.trendingPools = {
            count: trendingCount,
            data: trendingText,
            summary: `Found ${trendingCount} trending pools with high activity`
          };
          console.log(`📈 Trending pools: ${trendingCount} found`);
        }

        // Process new tokens data
        if (newTokensResponse.content && newTokensResponse.content[0]) {
          const tokensText = newTokensResponse.content[0].text;
          const tokenMatch = tokensText.match(/Found: (\d+) new tokens/);
          const tokenCount = tokenMatch ? parseInt(tokenMatch[1]) : 0;
          
          intelligence.newTokens = {
            count: tokenCount,
            data: tokensText,
            summary: `Discovered ${tokenCount} newly listed tokens`
          };
          console.log(`🎯 New tokens: ${tokenCount} found`);
        }

        // Create comprehensive summary
        intelligence.summary = {
          totalNewOpportunities: (intelligence.newPools.count || 0) + (intelligence.newTokens.count || 0),
          marketActivity: intelligence.trendingPools.count || 0,
          networkHealth: this.assessNetworkHealth(intelligence),
          investmentOpportunities: this.assessInvestmentOpportunities(intelligence),
          riskFactors: this.assessRiskFactors(intelligence)
        };

        console.log(`✅ Comprehensive market intelligence complete: ${intelligence.summary.totalNewOpportunities} new opportunities, ${intelligence.summary.marketActivity} trending markets`);

      } else {
        console.warn('⚠️ MCP Service not available, using basic intelligence');
        intelligence.summary = {
          error: 'MCP service not available',
          fallback: true
        };
      }

    } catch (error) {
      console.error('❌ Failed to get comprehensive market intelligence:', error.message);
      intelligence.summary = {
        error: error.message,
        fallback: true
      };
    }

    return intelligence;
  }

  /**
   * Extract risk preference from user message
   * @param {string} message - User message
   * @returns {string} Risk preference (low, medium, high, balanced)
   */
  extractRiskPreference(message) {
    const lowerMessage = message.toLowerCase();
    
    // High risk keywords
    const highRiskKeywords = ['high risk', 'risky', 'aggressive', 'speculative', 'volatile', 'meme', 'gambling', 'yolo'];
    if (highRiskKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'high';
    }
    
    // Low risk keywords (ENHANCED - including "without risk", "no risk")
    const lowRiskKeywords = [
      'low risk', 'safe', 'conservative', 'stable', 'secure', 'stablecoin', 'blue chip',
      'without risk', 'no risk', 'risk free', 'risk-free', 'zero risk', 'minimal risk',
      'safest', 'most secure', 'guaranteed', 'protected', 'capital preservation'
    ];
    if (lowRiskKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'low';
    }
    
    // Medium risk keywords
    const mediumRiskKeywords = ['medium risk', 'moderate', 'balanced', 'diversified'];
    if (mediumRiskKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'medium';
    }
    
    // Default to balanced if no specific preference
    return 'balanced';
  }

  /**
   * Extract token type preference from user message
   * @param {string} message - User message
   * @returns {Array} Preferred token types
   */
  extractTokenTypePreference(message) {
    const lowerMessage = message.toLowerCase();
    const preferences = [];
    
    if (lowerMessage.includes('stablecoin') || lowerMessage.includes('stable')) {
      preferences.push('stablecoin');
    }
    if (lowerMessage.includes('meme') || lowerMessage.includes('doge') || lowerMessage.includes('shib')) {
      preferences.push('meme');
    }
    if (lowerMessage.includes('defi') || lowerMessage.includes('swap') || lowerMessage.includes('farm')) {
      preferences.push('defi');
    }
    if (lowerMessage.includes('wrapped') || lowerMessage.includes('weth') || lowerMessage.includes('wbtc')) {
      preferences.push('wrapped');
    }
    if (lowerMessage.includes('utility') || lowerMessage.includes('governance')) {
      preferences.push('utility');
    }
    
    return preferences;
  }

  /**
   * Extract network mentions from user message
   * @param {string} message - User message
   * @returns {Array} Array of detected networks
   */
  extractNetworkMentions(message) {
    const lowerMessage = message.toLowerCase();
    const networks = [];

    // Network keyword mappings
    const networkKeywords = {
      'sei-evm': ['sei', 'sei-evm', 'sei network', 'seinetwork'],
      'eth': ['ethereum', 'eth', 'ether'],
      'bsc': ['bsc', 'binance', 'bnb', 'binance smart chain'],
      'polygon_pos': ['polygon', 'matic', 'poly'],
      'arbitrum': ['arbitrum', 'arb'],
      'optimism': ['optimism', 'op'],
      'avax': ['avalanche', 'avax'],
      'ftm': ['fantom', 'ftm'],
      'base': ['base', 'coinbase'],
      'cro': ['cronos', 'cro']
    };

    for (const [networkId, keywords] of Object.entries(networkKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        networks.push(networkId);
      }
    }

    // Default to sei-evm if no network mentioned
    if (networks.length === 0) {
      networks.push('sei-evm');
    }

    return networks;
  }

  /**
   * Assess network health based on market intelligence
   * @param {Object} intelligence - Market intelligence data
   * @returns {string} Health assessment
   */
  assessNetworkHealth(intelligence) {
    const newPools = intelligence.newPools?.count || 0;
    const newTokens = intelligence.newTokens?.count || 0;
    const trending = intelligence.trendingPools?.count || 0;

    if (newPools > 5 && newTokens > 3) return 'Excellent - High growth activity';
    if (newPools > 2 && newTokens > 1) return 'Good - Steady development';
    if (trending > 0) return 'Active - Existing market engagement';
    return 'Stable - Established market conditions';
  }

  /**
   * Assess investment opportunities based on market intelligence
   * @param {Object} intelligence - Market intelligence data
   * @returns {Array} Investment opportunities
   */
  assessInvestmentOpportunities(intelligence) {
    const opportunities = [];

    if (intelligence.newTokens?.count > 0) {
      opportunities.push(`Early adoption opportunities: ${intelligence.newTokens.count} new tokens detected`);
    }

    if (intelligence.newPools?.count > 0) {
      opportunities.push(`Liquidity provision opportunities: ${intelligence.newPools.count} new pools available`);
    }

    if (intelligence.trendingPools?.count > 0) {
      opportunities.push(`Active trading opportunities: ${intelligence.trendingPools.count} trending pools with high volume`);
    }

    if (opportunities.length === 0) {
      opportunities.push('Market consolidation phase - consider established positions');
    }

    return opportunities;
  }

  /**
   * Assess risk factors based on market intelligence
   * @param {Object} intelligence - Market intelligence data
   * @returns {Array} Risk factors
   */
  assessRiskFactors(intelligence) {
    const risks = [];

    if (intelligence.newTokens?.count > 5) {
      risks.push('High new token activity - Exercise caution with unverified projects');
    }

    if (intelligence.trendingPools?.count === 0 && intelligence.newPools?.count === 0) {
      risks.push('Low market activity - Potential liquidity concerns');
    }

    if (intelligence.newPools?.count > 10) {
      risks.push('Potential market fragmentation - Liquidity may be spread thin');
    }

    if (risks.length === 0) {
      risks.push('Standard market risks apply - Always do your own research');
    }

    return risks;
  }

  /**
   * Assess network health from all tokens analysis
   * @param {Object} tokenAnalysis - All tokens analysis data
   * @returns {string} Health assessment
   */
  assessNetworkHealthFromAllTokens(tokenAnalysis) {
    const totalTokens = tokenAnalysis.allTokens?.count || 0;
    
    if (totalTokens > 100) return 'Excellent - Diverse token ecosystem';
    if (totalTokens > 50) return 'Good - Growing token landscape';
    if (totalTokens > 20) return 'Active - Moderate token activity';
    return 'Developing - Limited token diversity';
  }

  /**
   * Build AI prompt for comprehensive all tokens analysis
   * @param {string} message - User's message
   * @param {string} requestType - Type of information request
   * @param {Array} tokenMentions - Mentioned tokens
   * @param {Object} marketData - Complete market data with all tokens analysis
   * @returns {Object} AI prompt object
   */
  buildAllTokensAnalysisPrompt(message, requestType, tokenMentions, marketData) {
    const currentTime = new Date().toLocaleString();
    const hasSpecificTokens = tokenMentions.length > 0;
    const hasAllTokensData = marketData.allTokensAnalysis && marketData.allTokensAnalysis.allTokens?.count > 0;
    
    const systemPrompt = `You are a senior blockchain and cryptocurrency market analyst with expertise in comprehensive token analysis and risk management. You specialize in analyzing entire token ecosystems with risk/profit scoring to provide diversified investment recommendations.

EXPERTISE AREAS:
- Comprehensive token ecosystem analysis
- Risk-based portfolio construction
- Profit potential assessment with risk adjustment
- Advanced tokenomics and market dynamics
- Cross-network token evaluation and scoring
- Systematic risk management and diversification

ANALYSIS APPROACH:
1. Comprehensive ecosystem evaluation using ALL available tokens
2. Risk-adjusted profit scoring for optimal recommendations
3. Diversified portfolio recommendations across risk categories
4. Objective analysis without bias toward any specific tokens
5. Data-driven insights based on liquidity, volume, and fundamentals

RESPONSE FORMAT (STRICT JSON - COMPREHENSIVE TOKEN ANALYSIS):
{
  "analysis": {
    "marketOverview": {
      "summary": "Comprehensive ecosystem analysis based on ALL ${marketData.allTokensAnalysis?.allTokens?.count || 0} tokens",
      "totalMarketCap": 0.00,
      "volume24h": 0.00,
      "activeTokens": 0,
      "marketChange24h": 0.00,
      "sentiment": "bullish|bearish|neutral|mixed"
    },
    "riskDistribution": {
      "lowRisk": 0,
      "mediumRisk": 0,
      "highRisk": 0,
      "totalAnalyzed": 0
    },
    "profitOpportunities": {
      "highScore": 0,
      "mediumScore": 0,
      "emergingOpportunities": 0,
      "establishedTokens": 0
    }
  },
  "recommendations": [
    {
      "token": "SYMBOL",
      "name": "Token Name", 
      "action": "BUY|WATCH|HOLD",
      "category": "low_risk|medium_risk|high_risk",
      "confidence": 85,
      "targetPrice": 0.00,
      "currentPrice": 0.00,
      "upside": 15.5,
      "riskScore": 25,
      "profitScore": 75,
      "overallScore": 45.5,
      "timeframe": "short-term|medium-term|long-term",
      "reasoning": "Comprehensive analysis based on risk/profit scoring",
      "liquidity": 0.00,
      "volume24h": 0.00,
      "marketCap": 0.00
    }
  ],
  "diversificationStrategy": {
    "lowRiskAllocation": 40,
    "mediumRiskAllocation": 35,
    "highRiskAllocation": 25,
    "reasoning": "Balanced approach based on comprehensive token analysis"
  }
}

COMPREHENSIVE TOKEN ANALYSIS CONTEXT:
- Analysis Time: ${currentTime}
- Network: ${marketData.allTokensAnalysis?.network || 'sei-evm'}
- Total Tokens Analyzed: ${marketData.allTokensAnalysis?.allTokens?.count || 0}
- Analysis Type: ${marketData.allTokensAnalysis?.summary?.analysisType || 'comprehensive_scoring'}
- Request Type: ${requestType}

SCORING METHODOLOGY:
- Risk Score: Liquidity depth, volume stability, volatility patterns, market cap maturity
- Profit Score: Volume growth, price momentum, efficiency ratios, growth potential
- Overall Score: Profit potential adjusted for risk factors
- Diversification: Balanced allocation across risk categories

ANALYSIS REQUIREMENTS:
- Use the comprehensive token data with risk/profit scores
- Provide diversified recommendations across ALL risk categories  
- Include both established and emerging opportunities
- Base all recommendations on actual scoring data
- Avoid repetitive recommendations (NO hardcoded SEI/WETH/WBTC pattern)
- Focus on genuine opportunities identified through scoring`;

    // Build comprehensive user prompt with ALL tokens data
    let allTokensData = '';
    let topScoredTokensData = '';
    
    if (hasAllTokensData) {
      console.log('🎯 Processing ALL tokens data for comprehensive AI analysis...');
      const allTokensText = marketData.allTokensAnalysis.allTokens.data;
      
      // Extract top scored tokens from the comprehensive analysis
      const lines = allTokensText.split('\n');
      const topTokens = [];
      let currentToken = null;
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Look for token entries: "1. TOKEN_SYMBOL"
        const tokenMatch = trimmedLine.match(/^\d+\.\s+(.+)$/);
        if (tokenMatch && !trimmedLine.includes('Pool:') && !trimmedLine.includes('Address:')) {
          if (currentToken) {
            topTokens.push(currentToken);
          }
          currentToken = {
            symbol: tokenMatch[1],
            data: {}
          };
        }
        // Collect data for current token
        else if (currentToken) {
          if (trimmedLine.startsWith('Price:')) {
            const priceMatch = trimmedLine.match(/Price:\s*\$([0-9.]+)/);
            if (priceMatch) currentToken.data.price = parseFloat(priceMatch[1]);
          }
          if (trimmedLine.startsWith('Liquidity:')) {
            const liquidityMatch = trimmedLine.match(/Liquidity:\s*\$([0-9,.]+)/);
            if (liquidityMatch) currentToken.data.liquidity = parseFloat(liquidityMatch[1].replace(/,/g, ''));
          }
          if (trimmedLine.startsWith('24h Volume:')) {
            const volumeMatch = trimmedLine.match(/24h Volume:\s*\$([0-9,.]+)/);
            if (volumeMatch) currentToken.data.volume = parseFloat(volumeMatch[1].replace(/,/g, ''));
          }
          if (trimmedLine.startsWith('Risk Score:')) {
            const riskMatch = trimmedLine.match(/Risk Score:\s*(\d+)\/100/);
            if (riskMatch) currentToken.data.riskScore = parseInt(riskMatch[1]);
          }
          if (trimmedLine.startsWith('Profit Score:')) {
            const profitMatch = trimmedLine.match(/Profit Score:\s*(\d+)\/100/);
            if (profitMatch) currentToken.data.profitScore = parseInt(profitMatch[1]);
          }
          if (trimmedLine.startsWith('Overall Score:')) {
            const overallMatch = trimmedLine.match(/Overall Score:\s*([0-9.]+)\/100/);
            if (overallMatch) currentToken.data.overallScore = parseFloat(overallMatch[1]);
          }
          if (trimmedLine.startsWith('Token Type:')) {
            const typeMatch = trimmedLine.match(/Token Type:\s*(.+)/);
            if (typeMatch) currentToken.data.tokenType = typeMatch[1].trim();
          }
          if (trimmedLine.startsWith('Risk Category:')) {
            const categoryMatch = trimmedLine.match(/Risk Category:\s*(.+)/);
            if (categoryMatch) currentToken.data.riskCategory = categoryMatch[1].trim();
          }
        }
      }
      
      // Add the last token
      if (currentToken) {
        topTokens.push(currentToken);
      }
      
      console.log(`✅ Parsed ${topTokens.length} tokens with comprehensive scoring data`);
      
      // Filter and show tokens based on user preferences if specified
      let filteredTokens = topTokens;
      const riskPreference = marketData.allTokensAnalysis.riskPreference || 'balanced';
      const tokenTypePreference = marketData.allTokensAnalysis.tokenTypePreference || [];
      
      // Apply risk preference filter (STRICT FILTERING)
      if (riskPreference !== 'balanced') {
        const beforeCount = topTokens.length;
        filteredTokens = topTokens.filter(token => {
          const riskScore = token.data.riskScore || 0;
          switch (riskPreference) {
            case 'low':
              return riskScore <= 25; // STRICTER: Only very low risk tokens
            case 'medium':
              return riskScore > 25 && riskScore <= 65;
            case 'high':
              return riskScore > 65;
            default:
              return true;
          }
        });
        console.log(`🎯 STRICT Risk filtering: ${beforeCount} → ${filteredTokens.length} tokens (${riskPreference} risk preference)`);
        console.log(`🎯 Risk scores range: ${riskPreference === 'low' ? '≤25' : riskPreference === 'medium' ? '26-65' : '>65'}`);
        
        // Log the risk scores of filtered tokens for debugging
        if (filteredTokens.length > 0) {
          const riskScores = filteredTokens.map(t => t.data.riskScore || 0);
          console.log(`🎯 Filtered token risk scores: ${riskScores.join(', ')}`);
        }
      }
      
      // Apply token type preference filter
      if (tokenTypePreference.length > 0) {
        filteredTokens = filteredTokens.filter(token => 
          tokenTypePreference.includes(token.data.tokenType)
        );
        console.log(`🏷️ Type filtering: ${filteredTokens.length} tokens matching ${tokenTypePreference.join(', ')}`);
      }
      
      // Special handling for low-risk requests (prioritize stablecoins)
      if (riskPreference === 'low') {
        // For low-risk requests, prioritize stablecoins and wrapped tokens
        const stablecoins = filteredTokens.filter(token => token.data.tokenType === 'stablecoin');
        const wrappedTokens = filteredTokens.filter(token => token.data.tokenType === 'wrapped');
        const otherLowRisk = filteredTokens.filter(token => 
          token.data.tokenType !== 'stablecoin' && 
          token.data.tokenType !== 'wrapped' && 
          (token.data.riskScore || 0) <= 25
        );
        
        // Prioritize stablecoins and wrapped tokens for low-risk requests
        filteredTokens = [...stablecoins, ...wrappedTokens, ...otherLowRisk];
        console.log(`🏛️ Low-risk prioritization: ${stablecoins.length} stablecoins, ${wrappedTokens.length} wrapped tokens, ${otherLowRisk.length} other low-risk`);
      } else if (!tokenTypePreference.includes('stablecoin')) {
        // For non-low-risk requests, limit stablecoins to max 2
        const stablecoins = filteredTokens.filter(token => token.data.tokenType === 'stablecoin');
        const nonStablecoins = filteredTokens.filter(token => token.data.tokenType !== 'stablecoin');
        filteredTokens = [...nonStablecoins, ...stablecoins.slice(0, 2)];
        console.log(`🏛️ Stablecoin limiting: max 2 stablecoins included`);
      }
      
      // Show top tokens with their scores for AI analysis
      if (filteredTokens.length > 0) {
        topScoredTokensData = `
🌊 FILTERED TOKEN ANALYSIS (Top ${Math.min(filteredTokens.length, 15)} for ${riskPreference} risk preference):
${filteredTokens.slice(0, 15).map((token, index) => 
  `${index + 1}. ${token.symbol}
   TYPE: ${token.data.tokenType || 'unknown'}
   PRICE: $${token.data.price?.toFixed(8) || '0.00000000'}
   LIQUIDITY: $${token.data.liquidity?.toLocaleString() || '0'}
   VOLUME_24H: $${token.data.volume?.toLocaleString() || '0'}
   RISK_SCORE: ${token.data.riskScore || 0}/100 (${token.data.riskCategory || 'UNKNOWN'})
   PROFIT_SCORE: ${token.data.profitScore || 0}/100
   OVERALL_SCORE: ${token.data.overallScore?.toFixed(1) || '0.0'}/100`
).join('\n\n')}`;
      }
      
      allTokensData = `
📊 ECOSYSTEM SUMMARY:
• Total Tokens Analyzed: ${marketData.allTokensAnalysis.allTokens.count}
• Analysis Type: ${marketData.allTokensAnalysis.summary?.analysisType || 'comprehensive_scoring'}
• Network Health: ${marketData.allTokensAnalysis.summary?.networkHealth || 'Active'}
${topScoredTokensData}`;
    }

    const userPrompt = `Provide comprehensive investment recommendations based on ALL available tokens with risk/profit scoring:

USER QUERY: "${message}"

ANALYSIS PARAMETERS:
• Network: ${marketData.allTokensAnalysis?.network || 'sei-evm'}
• Request Type: ${requestType}
• Focus: ${hasSpecificTokens ? tokenMentions.join(', ') : 'Diversified ecosystem recommendations'}
• Comprehensive Data: ${hasAllTokensData ? `${marketData.allTokensAnalysis.allTokens.count} tokens with risk/profit scoring` : 'Limited data available'}
${allTokensData}

CRITICAL RISK COMPLIANCE REQUIREMENTS:
1. **MANDATORY RISK COMPLIANCE**: User specifically wants ${marketData.allTokensAnalysis?.riskPreference || 'balanced'} risk tokens - YOU MUST ONLY RECOMMEND THESE
2. **STRICT FILTERING APPLIED**: Only tokens matching risk preference are provided - DO NOT RECOMMEND OUTSIDE THIS FILTER
3. **Risk Score Boundaries**: 
   - LOW risk: ONLY Risk Score ≤25 (stablecoins, wrapped tokens) - NO EXCEPTIONS
   - MEDIUM risk: ONLY Risk Score 26-65 (DeFi, utility tokens) - NO EXCEPTIONS  
   - HIGH risk: ONLY Risk Score >65 (meme tokens, new tokens) - NO EXCEPTIONS
   - BALANCED: Mix across all categories
4. **Token Type Priority**: ${marketData.allTokensAnalysis?.tokenTypePreference?.length > 0 ? `Focus EXCLUSIVELY on: ${marketData.allTokensAnalysis.tokenTypePreference.join(', ')}` : 'All token types available but filtered by risk'}
5. **Special Low-Risk Handling**: For LOW risk requests, prioritize stablecoins and wrapped tokens
6. **Score-Based Selection**: Use the actual Risk Score, Profit Score, and Overall Score data

MANDATORY ANALYSIS REQUIREMENTS:
- ONLY recommend tokens from the filtered list above (already filtered by risk preference)
- If user wants LOW risk (≤25 score): ONLY recommend stablecoins, wrapped tokens, extremely safe tokens
- If user wants HIGH risk (>65 score): ONLY recommend meme tokens, new tokens, volatile tokens  
- Use the actual Risk Score and Profit Score data for reasoning
- Include liquidity analysis from real volume data
- Calculate realistic price targets based on current prices and scores
- FOR LOW RISK REQUESTS: Focus on capital preservation and stability over growth

ABSOLUTE REQUIREMENTS FOR ${marketData.allTokensAnalysis?.riskPreference?.toUpperCase() || 'BALANCED'} RISK PREFERENCE:
${marketData.allTokensAnalysis?.riskPreference === 'low' ? 
  '- ONLY recommend tokens with Risk Score ≤25\n- Prioritize stablecoins (USDC, USDT) and wrapped tokens (WETH, WBTC)\n- Focus on capital preservation and stability\n- Avoid any speculative or volatile tokens' :
marketData.allTokensAnalysis?.riskPreference === 'high' ?
  '- ONLY recommend tokens with Risk Score >65\n- Focus on meme tokens, new tokens, high-volatility opportunities\n- Emphasize potential high returns with associated risks' :
  '- Provide balanced portfolio across risk categories'
}

CRITICAL: The user specifically requested ${marketData.allTokensAnalysis?.riskPreference || 'balanced'} risk tokens. Do NOT include tokens outside this risk category. Provide 5-8 recommendations that strictly match the user's risk preference.`;

    return {
      system: systemPrompt,
      user: userPrompt
    };
  }

  /**
   * Process information with ALL tokens analysis and risk/profit scoring
   * @param {string} message - User message
   * @param {Object} classification - Classification result
   * @param {Object} allTokensAnalysis - All tokens with risk/profit scoring
   * @param {string} network - Network being analyzed
   * @returns {Object} Information processing result
   */
  async processInformationWithAllTokensAnalysis(message, classification, allTokensAnalysis, network) {
    try {
      console.log('🧠 Processing information request with ALL tokens analysis and scoring...');
      console.log('📝 Original message:', message);
      console.log('🌐 Network:', network);
      console.log('📊 All Tokens Analysis Available:', !!allTokensAnalysis);
      
      // Initialize Together AI if not already done
      if (!together && process.env.TOGETHER_API_KEY) {
        try {
          const Together = require('together-ai').default;
          together = new Together({
            apiKey: process.env.TOGETHER_API_KEY
          });
          console.log('🔄 TogetherAI re-initialized for comprehensive token analysis');
        } catch (error) {
          console.error('❌ Together AI re-initialization failed:', error.message);
          throw new Error(`AI service initialization failed: ${error.message}`);
        }
      }

      if (!together) {
        console.error('❌ TogetherAI not available');
        throw new Error('AI service not available. Please set TOGETHER_API_KEY environment variable and install together-ai package.');
      }

      // Extract token queries from message
      const tokenMentions = this.extractTokenMentions(message);
      const requestType = this.classifyInformationRequest(message);
      
      // Build comprehensive market data with ALL tokens analysis and user preferences
      const enhancedMarketData = {
        topTokens: [],
        specificTokens: [],
        tokenRecommendations: [],
        seiStats: { totalTokens: 450, activeTokens: 95, totalPools: 65 },
        marketCap: 0,
        totalVolume: 0,
        averagePrice: 0,
        activeTokens: 0,
        timestamp: new Date().toISOString(),
        requestType: requestType,
        mentionedTokens: tokenMentions.length,
        dataSource: 'ALL_TOKENS_WITH_SCORING',
        mcpStatus: 'connected',
        allTokensAnalysis: {
          ...allTokensAnalysis,
          riskPreference: classification.riskPreference || 'balanced',
          tokenTypePreference: classification.tokenTypePreference || []
        }, // Include the complete token analysis with user preferences
        network: network
      };

      console.log('🎯 Enhanced market data prepared for AI with ALL tokens analysis and scoring');
      
      // Prepare AI prompt for dynamic analysis with ALL tokens data
      console.log('🧠 Building comprehensive AI prompt with ALL tokens and risk/profit scoring...');
      const aiPrompt = this.buildAllTokensAnalysisPrompt(message, requestType, tokenMentions, enhancedMarketData);
      
      // Get AI-powered analysis with enhanced error handling
      console.log('🤖 Querying TogetherAI for comprehensive token recommendations with scoring...');
      
      let aiAnalysis;
      try {
        const aiResponse = await together.chat.completions.create({
          model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
          messages: [
            {
              role: 'system',
              content: aiPrompt.system
            },
            {
              role: 'user',
              content: aiPrompt.user
            }
          ],
          max_tokens: 4000,
          temperature: 0.4,
          top_p: 0.9,
          response_format: { type: 'json_object' }
        });

        console.log('✅ TogetherAI response received with comprehensive token analysis');
        
        if (!aiResponse.choices || !aiResponse.choices[0] || !aiResponse.choices[0].message) {
          throw new Error('Invalid AI response format - no choices or message');
        }
        
        const responseContent = aiResponse.choices[0].message.content;
        if (!responseContent) {
          throw new Error('Empty AI response content');
        }
        
        console.log('🔍 Parsing comprehensive AI token analysis...');
        try {
          aiAnalysis = JSON.parse(responseContent);
        } catch (parseError) {
          console.error('❌ JSON parsing failed:', parseError.message);
          console.log('📝 Raw response:', responseContent);
          
          // Attempt to extract JSON from response if it's wrapped in text
          const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            aiAnalysis = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error(`Failed to parse AI response as JSON: ${parseError.message}`);
          }
        }
        
        // Validate response structure and provide defaults if needed
        aiAnalysis = this.validateAndEnhanceAIResponse(aiAnalysis, enhancedMarketData, requestType, tokenMentions);
        
      } catch (aiError) {
        console.error('❌ Comprehensive TogetherAI API call failed:', aiError.message);
        
        // Provide intelligent fallback analysis based on available data
        aiAnalysis = this.generateFallbackAnalysis(message, requestType, tokenMentions, enhancedMarketData, aiError);
      }

      return {
        type: 'information',
        result: {
          requestType,
          analysis: aiAnalysis.analysis,
          recommendations: aiAnalysis.recommendations,
          marketContext: {
            dataSource: 'all_tokens_with_comprehensive_scoring',
            lastUpdated: enhancedMarketData.timestamp,
            tokensAnalyzed: allTokensAnalysis.allTokens?.count || 'comprehensive_analysis',
            aiModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo'
          },
          actionableInsights: aiAnalysis.actionableInsights || [],
          riskWarnings: aiAnalysis.riskWarnings || [],
          nextSteps: aiAnalysis.nextSteps || [],
          allTokensAnalysis: allTokensAnalysis,
          networkAnalyzed: network,
          enhancedFeatures: {
            comprehensiveTokenAnalysis: true,
            riskProfitScoring: true,
            diversifiedRecommendations: true
          }
        },
        status: 'completed',
        processingMethod: 'ai_powered_comprehensive_token_analysis',
        confidence: aiAnalysis.confidence || 'high'
      };
      
    } catch (error) {
      console.error('Comprehensive token analysis processing error:', error);
      
      return {
        type: 'information',
        result: {
          error: 'Comprehensive AI token analysis temporarily unavailable',
          fallback: 'Unable to process your comprehensive token analysis request at the moment. Please try again in a few moments.',
          suggestion: 'You can ask about specific cryptocurrencies, risk analysis, or comprehensive market insights.',
          allTokensAnalysis: allTokensAnalysis,
          networkAnalyzed: network,
          enhancedFeatures: {
            comprehensiveTokenAnalysis: true,
            riskProfitScoring: true,
            diversifiedRecommendations: true
          }
        },
        status: 'error',
        processingMethod: 'comprehensive_token_analysis_fallback'
      };
    }
  }

  /**
   * Process information with market intelligence integration (DEPRECATED)
   * @param {string} message - User message
   * @param {Object} classification - Classification result
   * @param {Object} marketIntelligence - Enhanced market intelligence
   * @param {string} network - Network being analyzed
   * @returns {Object} Information processing result
   */
  async processInformationWithMarketIntelligence(message, classification, marketIntelligence, network) {
    try {
      console.log('🧠 Processing information request with integrated market intelligence...');
      console.log('📝 Original message:', message);
      console.log('🌐 Network:', network);
      console.log('📊 Market Intelligence Available:', !!marketIntelligence);
      
      // Initialize Together AI if not already done
      if (!together && process.env.TOGETHER_API_KEY) {
        try {
          const Together = require('together-ai').default;
          together = new Together({
            apiKey: process.env.TOGETHER_API_KEY
          });
          console.log('🔄 TogetherAI re-initialized for enhanced processing');
        } catch (error) {
          console.error('❌ Together AI re-initialization failed:', error.message);
          throw new Error(`AI service initialization failed: ${error.message}`);
        }
      }

      if (!together) {
        console.error('❌ TogetherAI not available');
        throw new Error('AI service not available. Please set TOGETHER_API_KEY environment variable and install together-ai package.');
      }

      // Extract token queries from message
      const tokenMentions = this.extractTokenMentions(message);
      const requestType = this.classifyInformationRequest(message);
      
      // Build comprehensive market data with intelligence
      const enhancedMarketData = {
        topTokens: [],
        specificTokens: [],
        tokenRecommendations: [],
        seiStats: { totalTokens: 450, activeTokens: 95, totalPools: 65 },
        marketCap: 0,
        totalVolume: 0,
        averagePrice: 0,
        activeTokens: 0,
        timestamp: new Date().toISOString(),
        requestType: requestType,
        mentionedTokens: tokenMentions.length,
        dataSource: 'ENHANCED_MCP_INTELLIGENCE',
        mcpStatus: 'connected',
        marketIntelligence: marketIntelligence, // Include the intelligence directly
        network: network
      };

      console.log('🎯 Enhanced market data prepared for AI with market intelligence');
      
      // Prepare AI prompt for dynamic analysis with enhanced market intelligence
      console.log('🧠 Building enhanced AI prompt with comprehensive market intelligence...');
      const aiPrompt = this.buildInformationPrompt(message, requestType, tokenMentions, enhancedMarketData);
      
      // Get AI-powered analysis with enhanced error handling
      console.log('🤖 Querying TogetherAI for comprehensive market insights with intelligence data...');
      
      let aiAnalysis;
      try {
        const aiResponse = await together.chat.completions.create({
          model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
          messages: [
            {
              role: 'system',
              content: aiPrompt.system
            },
            {
              role: 'user',
              content: aiPrompt.user
            }
          ],
          max_tokens: 4000,
          temperature: 0.4,
          top_p: 0.9,
          response_format: { type: 'json_object' }
        });

        console.log('✅ TogetherAI response received with enhanced data');
        
        if (!aiResponse.choices || !aiResponse.choices[0] || !aiResponse.choices[0].message) {
          throw new Error('Invalid AI response format - no choices or message');
        }
        
        const responseContent = aiResponse.choices[0].message.content;
        if (!responseContent) {
          throw new Error('Empty AI response content');
        }
        
        console.log('🔍 Parsing enhanced AI response...');
        try {
          aiAnalysis = JSON.parse(responseContent);
        } catch (parseError) {
          console.error('❌ JSON parsing failed:', parseError.message);
          console.log('📝 Raw response:', responseContent);
          
          // Attempt to extract JSON from response if it's wrapped in text
          const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            aiAnalysis = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error(`Failed to parse AI response as JSON: ${parseError.message}`);
          }
        }
        
        // Validate response structure and provide defaults if needed
        aiAnalysis = this.validateAndEnhanceAIResponse(aiAnalysis, enhancedMarketData, requestType, tokenMentions);
        
      } catch (aiError) {
        console.error('❌ Enhanced TogetherAI API call failed:', aiError.message);
        
        // Provide intelligent fallback analysis based on available data
        aiAnalysis = this.generateFallbackAnalysis(message, requestType, tokenMentions, enhancedMarketData, aiError);
      }

      return {
        type: 'information',
        result: {
          requestType,
          analysis: aiAnalysis.analysis,
          recommendations: aiAnalysis.recommendations,
          marketContext: {
            dataSource: 'enhanced_mcp_intelligence',
            lastUpdated: enhancedMarketData.timestamp,
            tokensAnalyzed: tokenMentions.length || 'comprehensive_analysis',
            aiModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo'
          },
          actionableInsights: aiAnalysis.actionableInsights || [],
          riskWarnings: aiAnalysis.riskWarnings || [],
          nextSteps: aiAnalysis.nextSteps || [],
          marketIntelligence: marketIntelligence,
          networkAnalyzed: network,
          enhancedFeatures: {
            newPoolsDetection: true,
            newTokensDiscovery: true,
            trendingAnalysis: true
          }
        },
        status: 'completed',
        processingMethod: 'ai_powered_enhanced_market_analysis',
        confidence: aiAnalysis.confidence || 'high'
      };
      
    } catch (error) {
      console.error('Enhanced Information processing error:', error);
      
      return {
        type: 'information',
        result: {
          error: 'Enhanced AI market analysis temporarily unavailable',
          fallback: 'Unable to process your market inquiry with enhanced intelligence at the moment. Please try again in a few moments.',
          suggestion: 'You can ask about specific cryptocurrencies, market trends, price analysis, or general market insights.',
          marketIntelligence: marketIntelligence,
          networkAnalyzed: network,
          enhancedFeatures: {
            newPoolsDetection: true,
            newTokensDiscovery: true,
            trendingAnalysis: true
          }
        },
        status: 'error',
        processingMethod: 'enhanced_ai_fallback'
      };
    }
  }
}

// Export controller instance
const promptRouterController = new PromptRouterController();
module.exports = promptRouterController;