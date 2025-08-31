const Together = require('together-ai').default;

// Initialize Together AI for strategy processing
let together;
try {
  together = new Together({
    apiKey: process.env.TOGETHER_API_KEY || 'dummy-key'
  });
} catch (error) {
  console.warn('Together AI not initialized for strategy processing.');
  together = null;
}

class StrategyProcessingService {
  constructor() {
    // 4 Different LLM models for diverse strategy perspectives
    this.strategistModels = [
      'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',    // Conservative analyst
      'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',   // Advanced strategist
      'mistralai/Mixtral-8x7B-Instruct-v0.1',           // Risk manager
      'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO'     // Growth optimizer
    ];

    this.strategistRoles = [
      'Conservative Analyst',
      'Advanced Strategist', 
      'Risk Manager',
      'Growth Optimizer'
    ];

    this.masterModel = 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo';
    
    // Comprehensive logging system
    this.sessionLogs = new Map();
  }

  /**
   * Initialize logging session for a strategy request
   */
  initializeLogging(message, userId) {
    const sessionId = `${userId}-${Date.now()}`;
    const sessionLog = {
      sessionId,
      userId,
      originalMessage: message,
      startTime: new Date(),
      layers: {},
      llmCalls: [],
      performance: {}
    };
    
    this.sessionLogs.set(sessionId, sessionLog);
    console.log(`🔍 [${sessionId}] Strategy logging session initialized`);
    console.log(`📝 [${sessionId}] Original message: "${message}"`);
    console.log(`👤 [${sessionId}] User ID: ${userId}`);
    
    return sessionId;
  }

  /**
   * Log layer processing
   */
  logLayer(sessionId, layerNumber, phase, data = {}) {
    const sessionLog = this.sessionLogs.get(sessionId);
    if (!sessionLog) return;

    const timestamp = new Date();
    const layerKey = `layer${layerNumber}`;
    
    if (!sessionLog.layers[layerKey]) {
      sessionLog.layers[layerKey] = { phases: {}, startTime: timestamp };
    }
    
    sessionLog.layers[layerKey].phases[phase] = {
      timestamp,
      data
    };

    console.log(`🎯 [${sessionId}] Layer ${layerNumber} - ${phase.toUpperCase()}`, data.summary || '');
    
    if (data.details) {
      console.log(`📊 [${sessionId}] Layer ${layerNumber} details:`, JSON.stringify(data.details, null, 2));
    }
  }

  /**
   * Log individual LLM calls
   */
  logLLMCall(sessionId, model, role, phase, prompt, response, error = null) {
    const sessionLog = this.sessionLogs.get(sessionId);
    if (!sessionLog) return;

    const llmCall = {
      timestamp: new Date(),
      model,
      role: role || 'Unknown',
      phase,
      promptLength: prompt?.length || 0,
      responseLength: response?.length || 0,
      success: !error,
      error: error?.message || null
    };

    sessionLog.llmCalls.push(llmCall);

    if (error) {
      console.log(`❌ [${sessionId}] LLM CALL FAILED - ${role} (${model})`);
      console.log(`💥 [${sessionId}] Error: ${error.message}`);
    } else {
      console.log(`✅ [${sessionId}] LLM CALL SUCCESS - ${role} (${model})`);
      console.log(`📄 [${sessionId}] Prompt: ${prompt?.length || 0} chars | Response: ${response?.length || 0} chars`);
    }

    // Log response preview for debugging
    if (response && response.length > 0) {
      const preview = response.substring(0, 200) + (response.length > 200 ? '...' : '');
      console.log(`📋 [${sessionId}] Response preview: ${preview}`);
    }
  }

  /**
   * Finalize logging and output summary
   */
  finalizeLogging(sessionId, finalResult) {
    const sessionLog = this.sessionLogs.get(sessionId);
    if (!sessionLog) return;

    sessionLog.endTime = new Date();
    sessionLog.totalDuration = sessionLog.endTime - sessionLog.startTime;
    sessionLog.finalResult = {
      success: finalResult.success,
      type: finalResult.type,
      status: finalResult.data?.status
    };

    // Calculate performance metrics
    sessionLog.performance = {
      totalDurationMs: sessionLog.totalDuration,
      totalDurationSeconds: (sessionLog.totalDuration / 1000).toFixed(2),
      totalLLMCalls: sessionLog.llmCalls.length,
      successfulLLMCalls: sessionLog.llmCalls.filter(call => call.success).length,
      failedLLMCalls: sessionLog.llmCalls.filter(call => !call.success).length,
      layersCompleted: Object.keys(sessionLog.layers).length
    };

    // Output comprehensive summary
    console.log(`\n🎯 ========== STRATEGY PROCESSING SUMMARY [${sessionId}] ==========`);
    console.log(`👤 User: ${sessionLog.userId}`);
    console.log(`📝 Message: "${sessionLog.originalMessage}"`);
    console.log(`⏱️  Total Duration: ${sessionLog.performance.totalDurationSeconds}s`);
    console.log(`🧠 LLM Calls: ${sessionLog.performance.totalLLMCalls} (${sessionLog.performance.successfulLLMCalls} success, ${sessionLog.performance.failedLLMCalls} failed)`);
    console.log(`🎪 Layers Completed: ${sessionLog.performance.layersCompleted}/3`);
    console.log(`✅ Final Result: ${finalResult.success ? 'SUCCESS' : 'FAILED'} (${finalResult.data?.status || 'unknown'})`);

    // Layer breakdown
    Object.entries(sessionLog.layers).forEach(([layerKey, layerData]) => {
      const layerNum = layerKey.replace('layer', '');
      const phases = Object.keys(layerData.phases);
      console.log(`   Layer ${layerNum}: ${phases.join(' → ')}`);
    });

    // LLM breakdown by model
    const modelStats = {};
    sessionLog.llmCalls.forEach(call => {
      if (!modelStats[call.model]) {
        modelStats[call.model] = { total: 0, success: 0, failed: 0 };
      }
      modelStats[call.model].total++;
      if (call.success) {
        modelStats[call.model].success++;
      } else {
        modelStats[call.model].failed++;
      }
    });

    console.log(`🤖 LLM Model Breakdown:`);
    Object.entries(modelStats).forEach(([model, stats]) => {
      const modelName = model.split('/').pop() || model;
      console.log(`   ${modelName}: ${stats.success}/${stats.total} successful`);
    });

    console.log(`========== END SUMMARY [${sessionId}] ==========\n`);

    // Keep logs for a while then cleanup
    setTimeout(() => {
      this.sessionLogs.delete(sessionId);
    }, 300000); // 5 minutes

    return sessionLog;
  }

  /**
   * LAYER 1: Detect if message requires strategy processing
   * Already handled by messageClassificationService, this validates strategy depth
   */
  async validateStrategyRequest(message, userId, sessionId = null) {
    let prompt = '';
    
    try {
      if (sessionId) {
        this.logLayer(sessionId, 1, 'start', {
          summary: 'Validating strategy request depth and complexity'
        });
      }

      prompt = `
Analyze if this request requires comprehensive strategy development:

Message: "${message}"

Determine:
1. Strategy complexity level (simple|moderate|complex)
2. Required analysis depth (basic|intermediate|advanced) 
3. Time horizon needed (short|medium|long)
4. Risk analysis required (low|medium|high)

Return JSON:
{
  "requiresFullStrategy": true/false,
  "complexity": "simple|moderate|complex",
  "analysisDepth": "basic|intermediate|advanced",
  "timeHorizon": "short|medium|long", 
  "riskAnalysisLevel": "low|medium|high",
  "reasoning": "brief explanation"
}`;

      if (sessionId) {
        this.logLayer(sessionId, 1, 'llm_call_start', {
          summary: 'Sending validation request to Layer 1 LLM',
          details: {
            model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
            promptLength: prompt.length,
            temperature: 0.1
          }
        });
      }

      const response = await together.chat.completions.create({
        model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const responseText = response.choices[0].message.content;
      const validation = JSON.parse(responseText);

      if (sessionId) {
        this.logLLMCall(sessionId, 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', 'Strategy Validator', 'Layer 1 Validation', prompt, responseText);
        
        this.logLayer(sessionId, 1, 'complete', {
          summary: `Validation complete: ${validation.requiresFullStrategy ? 'FULL STRATEGY REQUIRED' : 'SIMPLE RESPONSE SUFFICIENT'}`,
          details: {
            requiresFullStrategy: validation.requiresFullStrategy,
            complexity: validation.complexity,
            analysisDepth: validation.analysisDepth,
            timeHorizon: validation.timeHorizon,
            riskAnalysisLevel: validation.riskAnalysisLevel,
            reasoning: validation.reasoning
          }
        });
      }
      
      return {
        success: true,
        shouldProcess: validation.requiresFullStrategy,
        metadata: validation
      };

    } catch (error) {
      if (sessionId) {
        this.logLLMCall(sessionId, 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', 'Strategy Validator', 'Layer 1 Validation', prompt, null, error);
        
        this.logLayer(sessionId, 1, 'error', {
          summary: 'Layer 1 validation failed',
          details: {
            error: error.message,
            fallbackAction: 'Defaulting to full strategy processing'
          }
        });
      }

      console.error('❌ Layer 1 validation error:', error);
      return {
        success: false,
        shouldProcess: true, // Default to processing if error
        error: error.message
      };
    }
  }

  /**
   * LAYER 2: Generate strategies from 4 different LLM perspectives
   */
  async generateMultipleStrategies(message, userId, validationMetadata, sessionId = null) {
    try {
      if (sessionId) {
        this.logLayer(sessionId, 2, 'start', {
          summary: 'Starting multi-perspective strategy generation from 4 LLMs',
          details: {
            models: this.strategistModels,
            roles: this.strategistRoles,
            parallelProcessing: true
          }
        });
      }

      const strategistPrompts = this.buildStrategistPrompts(message, validationMetadata);

      // Generate strategies in parallel from 4 different LLMs
      const strategyPromises = this.strategistModels.map(async (model, index) => {
        const role = this.strategistRoles[index];
        const prompt = strategistPrompts[index];
        
        if (sessionId) {
          this.logLayer(sessionId, 2, `llm_${index + 1}_start`, {
            summary: `Starting ${role} strategy generation`,
            details: {
              model: model,
              role: role,
              promptLength: prompt.length,
              temperature: 0.3
            }
          });
        }

        try {
          const response = await together.chat.completions.create({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 800,
            temperature: 0.3, // Slightly higher for creativity
            response_format: { type: 'json_object' }
          });

          const responseText = response.choices[0].message.content;
          const strategy = JSON.parse(responseText);

          if (sessionId) {
            this.logLLMCall(sessionId, model, role, `Layer 2 Strategy Generation`, prompt, responseText);
            
            this.logLayer(sessionId, 2, `llm_${index + 1}_success`, {
              summary: `${role} strategy generated successfully`,
              details: {
                strategyName: strategy.strategyName || 'Unnamed Strategy',
                approach: strategy.approach,
                riskPercentage: strategy.riskPercentage
              }
            });
          }

          return {
            llmIndex: index,
            model: model,
            role: role,
            strategy: strategy,
            success: true
          };
        } catch (error) {
          if (sessionId) {
            this.logLLMCall(sessionId, model, role, `Layer 2 Strategy Generation`, prompt, null, error);
            
            this.logLayer(sessionId, 2, `llm_${index + 1}_failed`, {
              summary: `${role} strategy generation failed`,
              details: {
                error: error.message,
                model: model
              }
            });
          }

          console.error(`❌ Strategy generation failed for ${role} (${model}):`, error);
          return {
            llmIndex: index,
            model: model,
            role: role,
            strategy: null,
            success: false,
            error: error.message
          };
        }
      });

      if (sessionId) {
        this.logLayer(sessionId, 2, 'parallel_processing', {
          summary: 'Waiting for all 4 LLM strategy generations to complete'
        });
      }

      const results = await Promise.all(strategyPromises);
      
      // Filter successful strategies
      const successfulStrategies = results.filter(r => r.success && r.strategy);
      const failedStrategies = results.filter(r => !r.success);
      
      if (sessionId) {
        this.logLayer(sessionId, 2, 'results_summary', {
          summary: `Layer 2 completed: ${successfulStrategies.length}/4 strategies generated`,
          details: {
            successful: successfulStrategies.length,
            failed: failedStrategies.length,
            successfulRoles: successfulStrategies.map(s => s.role),
            failedRoles: failedStrategies.map(s => s.role)
          }
        });
      }
      
      if (successfulStrategies.length === 0) {
        if (sessionId) {
          this.logLayer(sessionId, 2, 'complete_failure', {
            summary: 'All 4 LLM strategy generations failed',
            details: {
              errors: failedStrategies.map(s => ({ role: s.role, error: s.error }))
            }
          });
        }
        throw new Error('No strategies generated successfully');
      }

      if (sessionId) {
        this.logLayer(sessionId, 2, 'complete', {
          summary: `Layer 2 successful: ${successfulStrategies.length}/4 strategies ready for consolidation`,
          details: {
            strategySummaries: successfulStrategies.map(s => ({
              role: s.role,
              name: s.strategy.strategyName,
              approach: s.strategy.approach,
              risk: s.strategy.riskPercentage
            }))
          }
        });
      }
      
      return {
        success: true,
        strategies: successfulStrategies,
        metadata: validationMetadata
      };

    } catch (error) {
      if (sessionId) {
        this.logLayer(sessionId, 2, 'error', {
          summary: 'Layer 2 strategy generation failed',
          details: {
            error: error.message,
            strategiesGenerated: 0
          }
        });
      }

      console.error('❌ Layer 2 strategy generation error:', error);
      return {
        success: false,
        error: error.message,
        strategies: []
      };
    }
  }

  /**
   * LAYER 3: Master LLM consolidates all strategies into final recommendation
   */
  async consolidateStrategies(strategies, originalMessage, validationMetadata, userId, sessionId = null) {
    let consolidationPrompt = '';
    
    try {
      if (sessionId) {
        this.logLayer(sessionId, 3, 'start', {
          summary: 'Master LLM consolidating all strategies into final recommendation',
          details: {
            inputStrategies: strategies.length,
            masterModel: this.masterModel,
            strategyRoles: strategies.map(s => s.role)
          }
        });
      }

      consolidationPrompt = this.buildConsolidationPrompt(
        strategies, 
        originalMessage, 
        validationMetadata
      );

      if (sessionId) {
        this.logLayer(sessionId, 3, 'llm_call_start', {
          summary: 'Sending consolidation request to Master LLM',
          details: {
            model: this.masterModel,
            promptLength: consolidationPrompt.length,
            temperature: 0.2,
            maxTokens: 1200
          }
        });
      }

      const response = await together.chat.completions.create({
        model: this.masterModel,
        messages: [{ role: 'user', content: consolidationPrompt }],
        max_tokens: 1200,
        temperature: 0.2, // Lower temperature for consistent consolidation
        response_format: { type: 'json_object' }
      });

      const responseText = response.choices[0].message.content;
      const finalStrategy = JSON.parse(responseText);

      if (sessionId) {
        this.logLLMCall(sessionId, this.masterModel, 'Master Consolidator', 'Layer 3 Consolidation', consolidationPrompt, responseText);
        
        this.logLayer(sessionId, 3, 'consolidation_complete', {
          summary: 'Master LLM consolidation successful',
          details: {
            finalStrategyName: finalStrategy.strategyName,
            approach: finalStrategy.approach,
            riskPercentage: finalStrategy.riskPercentage,
            confidenceScore: finalStrategy.confidenceScore
          }
        });
      }
      
      // Validate final strategy format
      const validatedStrategy = this.validateFinalStrategy(finalStrategy);

      if (sessionId) {
        this.logLayer(sessionId, 3, 'validation_complete', {
          summary: 'Final strategy validation and normalization complete',
          details: {
            allocationsNormalized: Object.keys(validatedStrategy.allocation).length > 0,
            immediateActions: validatedStrategy.immediateActions.length,
            rebalancingActions: validatedStrategy.rebalancingActions.length
          }
        });
      }
      
      const result = {
        success: true,
        type: 'strategy',
        data: {
          status: 'strategy_generated',
          strategy: validatedStrategy,
          sourceStrategies: strategies.length,
          processingMetadata: {
            layer1: validationMetadata,
            layer2: `${strategies.length}/4 strategies generated`,
            layer3: 'master_consolidation_completed'
          },
          message: '🎯 Comprehensive strategy generated successfully!'
        }
      };

      if (sessionId) {
        this.logLayer(sessionId, 3, 'complete', {
          summary: 'Layer 3 completed successfully - Final strategy ready',
          details: {
            strategyName: validatedStrategy.strategyName,
            processingComplete: true,
            readyForDelivery: true
          }
        });
      }

      return result;

    } catch (error) {
      if (sessionId) {
        this.logLLMCall(sessionId, this.masterModel, 'Master Consolidator', 'Layer 3 Consolidation', consolidationPrompt, null, error);
        
        this.logLayer(sessionId, 3, 'error', {
          summary: 'Layer 3 consolidation failed',
          details: {
            error: error.message,
            fallbackAction: 'Generating fallback strategy from available strategies'
          }
        });
      }

      console.error('❌ Layer 3 consolidation error:', error);
      return {
        success: false,
        type: 'strategy',
        data: {
          status: 'consolidation_failed',
          error: error.message,
          fallbackStrategy: this.generateFallbackStrategy(strategies, originalMessage)
        }
      };
    }
  }

  /**
   * Build specialized prompts for each strategist LLM
   */
  buildStrategistPrompts(message, metadata) {
    const baseContext = `
User Request: "${message}"
Strategy Complexity: ${metadata.complexity}
Analysis Depth: ${metadata.analysisDepth}
Time Horizon: ${metadata.timeHorizon}
Risk Level: ${metadata.riskAnalysisLevel}

Available tokens: WTON, DUCK, TON, USDT
Current DeFi ecosystem: DuckChain with iZiSwap DEX`;

    return [
      // Conservative Analyst (Model 1)
      `${baseContext}

You are a CONSERVATIVE FINANCIAL ANALYST. Focus on capital preservation and steady growth.

Create a conservative strategy emphasizing:
- Risk mitigation and capital protection
- Steady, predictable returns
- Dollar-cost averaging approaches
- Conservative allocation percentages
- Defensive rebalancing triggers

Return JSON format:
{
  "strategyName": "strategy name",
  "approach": "conservative|balanced|aggressive", 
  "riskPercentage": 0-100,
  "timeFrame": "days|weeks|months|years",
  "allocation": {"WTON": 40, "DUCK": 30, "TON": 20, "USDT": 10},
  "rebalancingActions": [{"trigger": "condition", "action": "what to do", "frequency": "when"}],
  "entryStrategy": "how to start",
  "exitStrategy": "when/how to exit",
  "riskManagement": "risk controls",
  "expectedReturn": "percentage range",
  "keyMetrics": ["metric1", "metric2"],
  "reasoning": "why this approach"
}`,

      // Advanced Strategist (Model 2) 
      `${baseContext}

You are an ADVANCED QUANTITATIVE STRATEGIST. Focus on sophisticated analysis and optimal allocation.

Create an advanced strategy emphasizing:
- Mathematical optimization
- Multi-factor analysis
- Dynamic rebalancing algorithms
- Risk-adjusted returns
- Market efficiency exploitation

Return same JSON format as above but with advanced quantitative reasoning.`,

      // Risk Manager (Model 3)
      `${baseContext}

You are a RISK MANAGEMENT SPECIALIST. Focus on downside protection and volatility control.

Create a risk-focused strategy emphasizing:
- Maximum drawdown limits
- Volatility-based position sizing
- Correlation analysis between assets
- Stop-loss and hedge mechanisms
- Stress testing scenarios

Return same JSON format as above but with comprehensive risk controls.`,

      // Growth Optimizer (Model 4)
      `${baseContext}

You are a GROWTH-ORIENTED OPTIMIZER. Focus on maximizing returns while managing acceptable risk.

Create a growth strategy emphasizing:
- High-potential opportunities
- Momentum-based allocations
- Growth maximization techniques
- Opportunistic rebalancing
- Compound growth strategies

Return same JSON format as above but optimized for maximum growth potential.`
    ];
  }

  /**
   * Build consolidation prompt for master LLM
   */
  buildConsolidationPrompt(strategies, originalMessage, metadata) {
    const strategiesSummary = strategies.map((s, i) => 
      `\n--- Strategy ${i+1} (${s.model.split('/')[1]}) ---\n${JSON.stringify(s.strategy, null, 2)}`
    ).join('\n');

    return `
You are the MASTER STRATEGY CONSOLIDATOR. Analyze these ${strategies.length} different strategy perspectives and create the optimal final recommendation.

ORIGINAL REQUEST: "${originalMessage}"
COMPLEXITY: ${metadata.complexity} | TIME: ${metadata.timeHorizon} | RISK: ${metadata.riskAnalysisLevel}

STRATEGIES TO CONSOLIDATE:
${strategiesSummary}

Your task:
1. Identify the best elements from each strategy
2. Resolve conflicts between approaches
3. Create a unified, actionable strategy
4. Balance risk vs reward optimally
5. Provide clear implementation steps

Return the FINAL CONSOLIDATED STRATEGY in JSON:
{
  "strategyName": "descriptive name combining best approaches",
  "approach": "conservative|balanced|aggressive",
  "riskPercentage": 0-100,
  "confidenceScore": 0-100,
  "timeFrame": "specific timeframe",
  "allocation": {"WTON": %, "DUCK": %, "TON": %, "USDT": %},
  "rebalancingActions": [
    {
      "trigger": "specific condition", 
      "action": "exact action to take",
      "frequency": "timing",
      "threshold": "numeric threshold if applicable"
    }
  ],
  "immediateActions": [
    {"step": 1, "action": "first thing to do", "amount": "if applicable"},
    {"step": 2, "action": "second thing to do", "amount": "if applicable"}
  ],
  "entryStrategy": "how to begin implementation",
  "exitStrategy": "when and how to exit", 
  "riskManagement": "comprehensive risk controls",
  "expectedReturn": "realistic return range",
  "keyMetrics": ["metric1", "metric2", "metric3"],
  "dataNeeded": ["what additional data would help"],
  "marketConditions": "ideal conditions for this strategy",
  "reasoning": "why this consolidated approach is optimal",
  "sourceStrategies": "which elements taken from each strategy"
}`;
  }

  /**
   * Validate and normalize final strategy response
   */
  validateFinalStrategy(strategy) {
    // Ensure required fields exist with defaults
    const validated = {
      strategyName: strategy.strategyName || 'Custom Strategy',
      approach: strategy.approach || 'balanced',
      riskPercentage: Math.max(0, Math.min(100, strategy.riskPercentage || 50)),
      confidenceScore: Math.max(0, Math.min(100, strategy.confidenceScore || 70)),
      timeFrame: strategy.timeFrame || 'medium-term',
      allocation: strategy.allocation || {},
      rebalancingActions: Array.isArray(strategy.rebalancingActions) ? strategy.rebalancingActions : [],
      immediateActions: Array.isArray(strategy.immediateActions) ? strategy.immediateActions : [],
      entryStrategy: strategy.entryStrategy || 'Gradual implementation recommended',
      exitStrategy: strategy.exitStrategy || 'Review performance periodically',
      riskManagement: strategy.riskManagement || 'Standard risk controls apply',
      expectedReturn: strategy.expectedReturn || 'Variable based on market conditions',
      keyMetrics: Array.isArray(strategy.keyMetrics) ? strategy.keyMetrics : [],
      dataNeeded: Array.isArray(strategy.dataNeeded) ? strategy.dataNeeded : [],
      marketConditions: strategy.marketConditions || 'Normal market conditions',
      reasoning: strategy.reasoning || 'Consolidated from multiple strategy perspectives',
      sourceStrategies: strategy.sourceStrategies || 'Multiple LLM perspectives'
    };

    // Normalize allocation percentages to sum to 100
    const totalAllocation = Object.values(validated.allocation).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    if (totalAllocation > 0) {
      Object.keys(validated.allocation).forEach(token => {
        validated.allocation[token] = ((parseFloat(validated.allocation[token]) || 0) / totalAllocation * 100).toFixed(2);
      });
    }

    return validated;
  }

  /**
   * Generate fallback strategy if consolidation fails
   */
  generateFallbackStrategy(strategies, originalMessage) {
    if (strategies.length === 0) {
      return {
        strategyName: 'Basic Balanced Strategy',
        approach: 'balanced',
        riskPercentage: 50,
        allocation: { WTON: 30, DUCK: 30, TON: 25, USDT: 15 },
        reasoning: 'Fallback strategy due to processing error'
      };
    }

    // Use the first successful strategy as fallback
    return strategies[0].strategy;
  }

  /**
   * Main entry point: Process complete 3-layer strategy workflow
   */
  async processStrategy(message, userId) {
    // Initialize comprehensive logging session
    const sessionId = this.initializeLogging(message, userId);
    
    try {
      console.log(`🚀 [${sessionId}] Starting 3-layer strategy processing`);

      // Layer 1: Validate strategy request
      const validation = await this.validateStrategyRequest(message, userId, sessionId);
      if (!validation.success) {
        throw new Error(`Layer 1 failed: ${validation.error}`);
      }

      if (!validation.shouldProcess) {
        const simpleResult = {
          success: true,
          type: 'strategy',
          data: {
            status: 'simple_response',
            message: 'This request can be handled with basic guidance rather than comprehensive strategy development.',
            suggestion: 'Try asking for more specific strategy goals or longer-term planning needs.'
          }
        };
        
        this.finalizeLogging(sessionId, simpleResult);
        return simpleResult;
      }

      // Layer 2: Generate multiple strategies
      const multiStrategies = await this.generateMultipleStrategies(message, userId, validation.metadata, sessionId);
      if (!multiStrategies.success || multiStrategies.strategies.length === 0) {
        throw new Error(`Layer 2 failed: ${multiStrategies.error}`);
      }

      // Layer 3: Consolidate into final strategy
      const finalResult = await this.consolidateStrategies(
        multiStrategies.strategies, 
        message, 
        validation.metadata, 
        userId,
        sessionId
      );

      console.log(`✅ [${sessionId}] 3-layer strategy processing completed successfully`);
      
      // Finalize comprehensive logging and output summary
      this.finalizeLogging(sessionId, finalResult);
      
      return finalResult;

    } catch (error) {
      console.error(`❌ [${sessionId}] 3-layer strategy processing error:`, error);
      
      const errorResult = {
        success: false,
        type: 'strategy',
        data: {
          status: 'processing_failed',
          error: error.message,
          fallback: this.generateFallbackStrategy([], message)
        }
      };
      
      // Finalize logging even on error
      this.finalizeLogging(sessionId, errorResult);
      
      return errorResult;
    }
  }

  /**
   * Async strategy processing with progress tracking
   */
  async processStrategyAsync(message, userId, processingId) {
    const sessionId = this.initializeLogging(message, userId);
    
    try {
      console.log(`🚀 [${sessionId}] Starting async strategy processing for ${processingId}`);

      // Store progress for potential polling endpoint
      this.updateProgress(processingId, {
        stage: 'Layer 1: Request Validation',
        percentage: 10,
        currentStep: 'Validating strategy requirements...'
      });

      // Layer 1: Validate strategy request
      const validation = await this.validateStrategyRequest(message, userId, sessionId);
      if (!validation.success) {
        throw new Error(`Layer 1 failed: ${validation.error}`);
      }

      this.updateProgress(processingId, {
        stage: 'Layer 2: Multi-LLM Strategy Generation',
        percentage: 25,
        currentStep: 'Generating strategies from 4 AI specialists...'
      });

      if (!validation.shouldProcess) {
        const simpleResult = {
          success: true,
          type: 'strategy',
          data: {
            status: 'simple_response',
            message: 'This request can be handled with basic guidance rather than comprehensive strategy development.',
            suggestion: 'Try asking for more specific strategy goals or longer-term planning needs.'
          }
        };
        
        this.finalizeLogging(sessionId, simpleResult);
        this.completeProcessing(processingId, simpleResult);
        return simpleResult;
      }

      // Layer 2: Generate multiple strategies
      const multiStrategies = await this.generateMultipleStrategies(message, userId, validation.metadata, sessionId);
      if (!multiStrategies.success || multiStrategies.strategies.length === 0) {
        throw new Error(`Layer 2 failed: ${multiStrategies.error}`);
      }

      this.updateProgress(processingId, {
        stage: 'Layer 3: Master AI Consolidation',
        percentage: 75,
        currentStep: 'Consolidating best elements from all strategies...'
      });

      // Layer 3: Consolidate into final strategy
      const finalResult = await this.consolidateStrategies(
        multiStrategies.strategies, 
        message, 
        validation.metadata, 
        userId,
        sessionId
      );

      this.updateProgress(processingId, {
        stage: 'Finalizing Strategy',
        percentage: 95,
        currentStep: 'Preparing comprehensive analysis...'
      });

      console.log(`✅ [${sessionId}] Async strategy processing completed successfully`);
      
      // Finalize comprehensive logging and output summary
      this.finalizeLogging(sessionId, finalResult);
      
      // Mark processing as complete
      this.completeProcessing(processingId, finalResult);
      
      return finalResult;

    } catch (error) {
      console.error(`❌ [${sessionId}] Async strategy processing error:`, error);
      
      const errorResult = {
        success: false,
        type: 'strategy',
        data: {
          status: 'processing_failed',
          error: error.message,
          fallback: this.generateFallbackStrategy([], message)
        }
      };
      
      // Finalize logging even on error
      this.finalizeLogging(sessionId, errorResult);
      
      // Mark processing as failed
      this.completeProcessing(processingId, errorResult);
      
      return errorResult;
    }
  }

  /**
   * Update processing progress (could be stored in Redis or memory)
   */
  updateProgress(processingId, progress) {
    // Simple in-memory storage for now
    if (!global.strategyProgress) {
      global.strategyProgress = new Map();
    }
    
    const currentProgress = global.strategyProgress.get(processingId) || {};
    const updatedProgress = {
      ...currentProgress,
      ...progress,
      timestamp: new Date().toISOString()
    };
    
    global.strategyProgress.set(processingId, updatedProgress);
    console.log(`📊 Progress update for ${processingId}:`, progress);
  }

  /**
   * Mark processing as complete and store final result
   */
  completeProcessing(processingId, finalResult) {
    if (!global.strategyResults) {
      global.strategyResults = new Map();
    }
    
    global.strategyResults.set(processingId, {
      result: finalResult,
      completedAt: new Date().toISOString(),
      status: finalResult.success ? 'completed' : 'failed'
    });

    // Update final progress
    this.updateProgress(processingId, {
      stage: 'Strategy Complete',
      percentage: 100,
      currentStep: finalResult.success ? 'Strategy analysis ready!' : 'Processing failed',
      completed: true
    });

    console.log(`✅ Processing completed for ${processingId}`);
    
    // Clean up after 5 minutes
    setTimeout(() => {
      if (global.strategyProgress) {
        global.strategyProgress.delete(processingId);
      }
      if (global.strategyResults) {
        global.strategyResults.delete(processingId);
      }
      console.log(`🧹 Cleaned up processing data for ${processingId}`);
    }, 300000); // 5 minutes
  }
}

module.exports = new StrategyProcessingService();