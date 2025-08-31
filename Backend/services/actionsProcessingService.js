const Together = require('together-ai').default;
const seiAgentService = require('./seiAgentService');
const seiMarketDataService = require('./seiMarketDataService');
const ContactsTokensService = require('./contactsTokensService');
const Agent = require('../models/Agent');
const { SimpleAgent } = require('@mariposa-plus/agent-sdk');

// Create service instances
const contactsTokensService = new ContactsTokensService();

// Initialize Together AI for actions processing
let together;
try {
  together = new Together({
    apiKey: process.env.TOGETHER_API_KEY || 'dummy-key'
  });
} catch (error) {
  console.warn('Together AI not initialized for actions processing. Please set TOGETHER_API_KEY environment variable.');
  together = null;
}

class ActionsProcessingService {
  constructor() {
    this.supportedActions = [
      'transfer', 'swap', 'stake', 'lend', 'borrow', 'bridge',
      'buy', 'sell', 'mint', 'burn', 'balance', 'other'
    ];
  }

  /**
   * Second Layer: Process actions message with specialized LLM and user messaging
   * @param {string} message - User's message
   * @param {Object} classification - Classification result from first layer
   * @param {Object} options - Processing options
   * @returns {Object} Processed action result with user messaging
   */
  async processAction(message, classification, options = {}) {
    const { execute = false, agentId } = options;
    
    // Generate immediate user response
    const userMessage = this.generateActionMessage(message, classification, execute);
    
    if (!together) {
      return {
        userMessage,
        actionPlan: this.generateBasicActionPlan(message, classification),
        status: 'planned',
        executed: false,
        error: 'AI not available - basic action plan generated'
      };
    }

    try {
      console.log('⚡ Processing action with AI analysis...');
      console.log('📝 Action message:', message);
      console.log('🏷️ Action type:', classification.actionSubtype);
      console.log('🔄 Execute mode:', execute);
      
      const actionSubtype = classification.actionSubtype || 'other';
      const actionPrompt = this.buildActionPrompt(message, actionSubtype, execute);
      
      const response = await together.chat.completions.create({
        model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
        messages: [
          {
            role: 'system',
            content: actionPrompt.system
          },
          {
            role: 'user',
            content: actionPrompt.user
          }
        ],
        max_tokens: 1000,
        temperature: 0.2,
        response_format: { type: 'json_object' }
      });

      const actionResult = JSON.parse(response.choices[0].message.content);
      
      // Validate and enhance the action result
      const validatedResult = this.validateActionResult(actionResult, message, classification);
      
      // Check if execution is requested and supported
      if (options.execute && options.agentId) {
        if (classification.actionSubtype === 'transfer') {
          console.log('🚀 Executing transfer action...');
          try {
            const executionResult = await this.executeTransferAction(message, options.agentId, validatedResult);
            validatedResult.execution = executionResult;
            validatedResult.executionStatus = 'completed';
          } catch (executionError) {
            console.error('❌ Transfer execution failed:', executionError);
            validatedResult.execution = {
              error: executionError.message,
              status: 'failed'
            };
            validatedResult.executionStatus = 'failed';
          }
        } else if (classification.actionSubtype === 'swap') {
          console.log('🔄 Executing swap action...');
          try {
            const executionResult = await this.executeSwapAction(message, options.agentId, validatedResult);
            validatedResult.execution = executionResult;
            validatedResult.executionStatus = 'completed';
          } catch (executionError) {
            console.error('❌ Swap execution failed:', executionError);
            validatedResult.execution = {
              error: executionError.message,
              status: 'failed'
            };
            validatedResult.executionStatus = 'failed';
          }
        } else if (classification.actionSubtype === 'balance') {
          console.log('💰 Executing balance check...');
          try {
            const balanceResult = await this.executeBalanceCheck(options.agentId);
            validatedResult.execution = {
              success: true,
              balanceDetails: balanceResult,
              status: 'completed'
            };
            validatedResult.executionStatus = 'completed';
          } catch (executionError) {
            console.error('❌ Balance check failed:', executionError);
            validatedResult.execution = {
              error: executionError.message,
              status: 'failed'
            };
            validatedResult.executionStatus = 'failed';
          }
        } else {
          validatedResult.execution = {
            message: `Execution not yet supported for ${classification.actionSubtype} actions`,
            status: 'not_implemented'
          };
          validatedResult.executionStatus = 'not_implemented';
        }
      } else {
        validatedResult.executionStatus = 'guidance_only';
      }
      
      return validatedResult;

    } catch (error) {
      console.error('Action processing error:', error);
      
      // Fallback to basic action parsing
      return this.fallbackActionProcessing(message, classification, options);
    }
  }

  /**
   * Generate immediate user message for action processing
   * @param {string} message - User message
   * @param {Object} classification - Classification result
   * @param {boolean} execute - Whether to execute the action
   * @returns {string} User-friendly message
   */
  generateActionMessage(message, classification, execute) {
    const actionType = classification.actionSubtype || 'action';
    const actionVerbs = {
      transfer: 'transferring',
      swap: 'swapping',
      stake: 'staking',
      lend: 'lending',
      borrow: 'borrowing',
      buy: 'purchasing',
      sell: 'selling',
      bridge: 'bridging',
      mint: 'minting',
      burn: 'burning',
      other: 'processing'
    };
    
    const verb = actionVerbs[actionType] || 'processing';
    
    if (execute) {
      return `🚀 I'm ${verb} your request right now! Let me handle the transaction for you...`;
    } else {
      return `📋 I understand you want to ${actionType}. Let me analyze your request and prepare the transaction details for you.`;
    }
  }

  /**
   * Generate basic action plan when AI is not available
   * @param {string} message - User message
   * @param {Object} classification - Classification result
   * @returns {Object} Basic action plan
   */
  generateBasicActionPlan(message, classification) {
    const actionType = classification.actionSubtype || 'other';
    
    return {
      action: actionType,
      message: `Basic ${actionType} plan generated`,
      steps: [
        'Validate transaction parameters',
        'Check account balance and permissions',
        'Prepare transaction',
        'Execute transaction',
        'Confirm completion'
      ],
      requirements: ['Valid token addresses', 'Sufficient balance', 'Network connection'],
      estimatedTime: '30-60 seconds',
      confidence: 'medium'
    };
  }

  /**
   * Build specialized action prompt based on action subtype
   * @param {string} message - User's message
   * @param {string} actionSubtype - Type of action
   * @param {boolean} execute - Whether to execute the action
   * @returns {Object} System and user prompts
   */
  buildActionPrompt(message, actionSubtype, execute = false) {
    const baseSystem = `You are a specialized crypto DeFi actions expert. Your job is to analyze user requests and provide detailed actionable instructions for blockchain operations on the SEI EVM network using smart contracts.

IMPORTANT CONTEXT:
- All operations are on SEI EVM network (Chain ID: 1329)
- Supported tokens: SEI, WSEI, USDC, USDT, WETH, WBTC, iSEI, USDa, syUSD, SolvBTC, FXS, MAD, FASTUSD
- Use SEI EVM smart contracts for swaps and transfers (integrated and ready for execution)
- Always consider gas fees and slippage
- Prioritize user safety and security
- Real swap execution is available through SEI smart contract integration

`;

    const actionSpecificPrompts = {
      transfer: `TRANSFER SPECIALIST:
You help users transfer tokens between accounts safely.

Key considerations:
- Verify recipient address format
- Check token balance requirements
- Calculate gas fees
- Suggest transaction confirmation steps
- Warn about irreversible nature

Response format (METRICS-FOCUSED):
{
  "actionType": "transfer",
  "status": "ready|pending|executing|completed|failed",
  "userMessage": "Brief friendly message about the action",
  "transaction": {
    "fromToken": "SEI",
    "amount": 50.00,
    "recipient": "0.0.12345",
    "estimatedGasFee": 0.001,
    "estimatedTime": 3,
    "riskScore": 25,
    "confidence": 95
  },
  "validation": {
    "balanceCheck": true,
    "addressValid": true,
    "networkStatus": "online",
    "estimatedSuccess": 98
  },
  "execution": {
    "steps": ["Validate", "Sign", "Submit", "Confirm"],
    "currentStep": 1,
    "progress": 25,
    "timeRemaining": 45
  },
  "alerts": [
    "Fee: 0.001 HBAR (~$0.00006)",
    "Time: ~3 seconds",
    "Success rate: 98%"
  ]
}`,

      swap: `SWAP SPECIALIST:
You help users swap tokens on SEI EVM efficiently with REAL EXECUTION capability.

Key considerations:
- Current market prices and slippage on SEI EVM/Sailor DEX
- AgenticRouter smart contract routing for optimal rates  
- Price impact warnings for large swaps
- Gas fee estimation for SEI network
- Timing recommendations based on market conditions
- IMPORTANT: Swaps will be ACTUALLY EXECUTED when user requests it

Response format:
{
  "actionType": "swap",
  "fromToken": "token_symbol",
  "toToken": "token_symbol", 
  "amount": "numeric_value_or_percentage",
  "estimatedReceive": "expected_output_amount",
  "slippageTolerance": "percentage",
  "priceImpact": "percentage",
  "bestRoute": "dex_protocol_name",
  "steps": ["step1", "step2", "step3"],
  "warnings": ["warning1", "warning2"],
  "marketConditions": "current_market_assessment",
  "estimatedTime": "time_estimate",
  "riskLevel": "low|medium|high",
  "recommendations": ["recommendation1", "recommendation2"]
}`,

      stake: `STAKING SPECIALIST:
You help users stake tokens for yield and rewards.

Key considerations:
- Staking rewards and APY rates
- Lock-up periods and unbonding times
- Validator selection and risks
- Compound vs simple interest
- Tax implications

Response format:
{
  "actionType": "stake",
  "token": "token_symbol",
  "amount": "numeric_value_or_percentage",
  "estimatedAPY": "percentage",
  "lockPeriod": "time_duration",
  "unbondingTime": "time_duration",
  "validator": "validator_name_or_protocol",
  "steps": ["step1", "step2", "step3"],
  "warnings": ["warning1", "warning2"],
  "rewards": "reward_description",
  "estimatedTime": "time_estimate",
  "riskLevel": "low|medium|high",
  "recommendations": ["recommendation1", "recommendation2"]
}`,

      lend: `LENDING SPECIALIST:
You help users lend tokens for passive income.

Key considerations:
- Lending protocols and rates
- Collateralization requirements
- Liquidation risks
- Variable vs fixed rates
- Platform security and reputation

Response format:
{
  "actionType": "lend",
  "token": "token_symbol",
  "amount": "numeric_value_or_percentage",
  "estimatedAPY": "percentage",
  "platform": "lending_protocol_name",
  "collateralRequired": "true_or_false",
  "liquidationRisk": "percentage_or_description",
  "steps": ["step1", "step2", "step3"],
  "warnings": ["warning1", "warning2"],
  "terms": "lending_terms_description",
  "estimatedTime": "time_estimate",
  "riskLevel": "low|medium|high",
  "recommendations": ["recommendation1", "recommendation2"]
}`,

      borrow: `BORROWING SPECIALIST:
You help users borrow tokens against collateral.

Key considerations:
- Collateral requirements and ratios
- Interest rates and repayment terms
- Liquidation thresholds and risks
- Health factor monitoring
- Debt management strategies

Response format:
{
  "actionType": "borrow",
  "borrowToken": "token_symbol",
  "amount": "numeric_value",
  "collateralToken": "token_symbol",
  "collateralAmount": "numeric_value",
  "collateralRatio": "percentage",
  "interestRate": "percentage",
  "liquidationThreshold": "percentage",
  "platform": "lending_protocol_name",
  "steps": ["step1", "step2", "step3"],
  "warnings": ["warning1", "warning2"],
  "healthFactor": "ratio_or_description",
  "estimatedTime": "time_estimate",
  "riskLevel": "low|medium|high",
  "recommendations": ["recommendation1", "recommendation2"]
}`,

      bridge: `BRIDGE SPECIALIST:
You help users bridge tokens between different networks.

Key considerations:
- Source and destination networks
- Bridge security and reputation
- Transfer times and fees
- Token wrapping/unwrapping
- Cross-chain risks

Response format:
{
  "actionType": "bridge",
  "token": "token_symbol",
  "amount": "numeric_value",
  "fromNetwork": "source_network",
  "toNetwork": "destination_network",
  "bridgeProtocol": "bridge_name",
  "estimatedFee": "fee_amount",
  "estimatedTime": "transfer_time",
  "steps": ["step1", "step2", "step3"],
  "warnings": ["warning1", "warning2"],
  "securityLevel": "security_assessment",
  "riskLevel": "low|medium|high",
  "recommendations": ["recommendation1", "recommendation2"]
}`,

      buy: `BUYING SPECIALIST:
You help users purchase tokens efficiently.

Key considerations:
- Best execution venues and prices
- Order types and timing
- Market conditions and entry points
- Portfolio allocation strategies
- Cost averaging techniques

Response format:
{
  "actionType": "buy",
  "token": "token_symbol",
  "amount": "numeric_value_or_percentage_of_budget",
  "budget": "total_budget_amount",
  "executionVenue": "dex_or_platform",
  "orderType": "market|limit|dca",
  "targetPrice": "price_level",
  "steps": ["step1", "step2", "step3"],
  "warnings": ["warning1", "warning2"],
  "marketAnalysis": "current_market_assessment",
  "estimatedTime": "time_estimate",
  "riskLevel": "low|medium|high",
  "recommendations": ["recommendation1", "recommendation2"]
}`,

      sell: `SELLING SPECIALIST:
You help users sell tokens at optimal times.

Key considerations:
- Market timing and price levels
- Tax implications and holding periods
- Profit-taking strategies
- Partial vs full position exits
- Portfolio rebalancing

Response format:
{
  "actionType": "sell",
  "token": "token_symbol",
  "amount": "numeric_value_or_percentage_of_holdings",
  "currentHoldings": "total_holdings",
  "targetPrice": "price_level",
  "executionVenue": "dex_or_platform",
  "orderType": "market|limit|trailing_stop",
  "steps": ["step1", "step2", "step3"],
  "warnings": ["warning1", "warning2"],
  "marketAnalysis": "current_market_assessment",
  "taxConsiderations": "tax_implications",
  "estimatedTime": "time_estimate",
  "riskLevel": "low|medium|high",
  "recommendations": ["recommendation1", "recommendation2"]
}`,

      other: `GENERAL CRYPTO ACTIONS SPECIALIST:
You help users with various blockchain actions not covered by specific categories.

Key considerations:
- Understand the specific action requested
- Provide comprehensive guidance
- Consider SEI network specifics
- Emphasize security and best practices

Response format:
{
  "actionType": "other",
  "specificAction": "description_of_action",
  "requirements": ["requirement1", "requirement2"],
  "steps": ["step1", "step2", "step3"],
  "warnings": ["warning1", "warning2"],
  "alternatives": ["alternative1", "alternative2"],
  "estimatedTime": "time_estimate",
  "riskLevel": "low|medium|high",
  "recommendations": ["recommendation1", "recommendation2"]
}`
    };

    const system = baseSystem + (actionSpecificPrompts[actionSubtype] || actionSpecificPrompts.other);
    const user = `Analyze this user request and provide detailed actionable guidance: "${message}"`;

    return { system, user };
  }

  /**
   * Validate and enhance action result
   * @param {Object} actionResult - Raw result from LLM
   * @param {string} originalMessage - Original user message
   * @param {Object} classification - Classification result
   * @returns {Object} Enhanced action result
   */
  validateActionResult(actionResult, originalMessage, classification) {
    // Ensure required fields
    if (!actionResult.actionType) {
      actionResult.actionType = classification.actionSubtype || 'other';
    }

    if (!actionResult.steps || !Array.isArray(actionResult.steps)) {
      actionResult.steps = ['Review your request', 'Prepare necessary tokens', 'Execute transaction'];
    }

    if (!actionResult.warnings || !Array.isArray(actionResult.warnings)) {
      actionResult.warnings = ['Always verify transaction details before confirming'];
    }

    if (!actionResult.recommendations || !Array.isArray(actionResult.recommendations)) {
      actionResult.recommendations = ['Start with small amounts to test the process'];
    }

    if (!actionResult.riskLevel) {
      actionResult.riskLevel = 'medium';
    }

    if (!actionResult.estimatedTime) {
      actionResult.estimatedTime = '2-5 minutes';
    }

    // Add metadata
    actionResult.metadata = {
      classification: classification,
      originalMessage: originalMessage,
      processedAt: new Date().toISOString(),
      version: '1.0.0'
    };

    return actionResult;
  }

  /**
   * Fallback action processing when LLM fails
   * @param {string} message - User's message
   * @param {Object} classification - Classification result
   * @param {Object} options - Processing options
   * @returns {Object} Basic action result
   */
  fallbackActionProcessing(message, classification, options = {}) {
    const actionSubtype = classification.actionSubtype || 'other';
    
    return {
      actionType: actionSubtype,
      basicGuidance: `To perform a ${actionSubtype} action, you'll need to connect your wallet to a SEI DEX platform.`,
      steps: [
        'Connect your wallet to a SEI network DEX',
        'Select the appropriate action type',
        'Enter transaction details carefully',
        'Review gas fees and confirm transaction'
      ],
      warnings: [
        'Always double-check transaction details',
        'Ensure you have sufficient gas fees',
        'Start with small amounts for testing'
      ],
      recommendations: [
        'Use reputable DEX platforms only',
        'Keep your private keys secure',
        'Monitor transaction status until confirmation'
      ],
      riskLevel: 'medium',
      estimatedTime: '3-10 minutes',
      metadata: {
        classification: classification,
        originalMessage: message,
        processedAt: new Date().toISOString(),
        fallback: true,
        version: '1.0.0'
      },
      executionStatus: options.execute ? 'fallback_no_execution' : 'guidance_only'
    };
  }

  /**
   * Execute transfer action (creates evaluation topics instead of HBAR transfers)
   * @param {string} message - User's message
   * @param {string} agentId - Agent ID
   * @param {Object} actionResult - Processed action result
   * @returns {Object} Execution result
   */
  async executeTransferAction(message, agentId, actionResult) {
    try {
      console.log('🔍 Parsing action request for evaluation topic creation...');
      
      // Parse transfer details from the message (simplified parsing)
      const parseResult = this.parseTransferRequest(message);
      
      if (!parseResult.success) {
        throw new Error('Failed to parse transfer details');
      }
      
      const { details } = parseResult;
      
      // Validate required details
      if (!details.amount || details.amount <= 0) {
        throw new Error('Invalid or missing transfer amount');
      }
      
      if (!details.recipient) {
        throw new Error('Transfer recipient not specified or not found');
      }
      
      // Handle recipient resolution
      let resolvedRecipient = details.recipient;
      if (details.needsRecipientResolution) {
        // For demo purposes, we'll use a placeholder account
        // In production, this would involve looking up the recipient
        resolvedRecipient = '0.0.1379'; // Example account ID
        console.log(`⚠️  Using placeholder recipient: ${resolvedRecipient} (in production, would resolve "${details.recipient}")`);
      }
      
      console.log('💸 Executing transfer:', {
        amount: details.amount,
        currency: details.currency,
        from: parseResult.fromAgent.accountId,
        to: resolvedRecipient,
        memo: details.memo
      });
      
      let transferResult;
      
        let agentid_ =await Agent.findById(agentId)
        
        transferResult = await seiAgentService.executeTransfer(agentId, {
          token: details.currency || 'SEI',
          to: resolvedRecipient,
          amount: details.amount
        });
      
      console.log(transferResult)
      console.log('✅ Action executed successfully!');
      
      return {
        success: true,
        transactionDetails: transferResult,
        parsedRequest: {
          originalMessage: message,
          extractedDetails: details,
          resolvedRecipient: resolvedRecipient,
          recipientResolved: details.needsRecipientResolution
        },
        executionSummary: {
          action: 'evaluation_topic_creation',
          topicId: transferResult.topicId,
          company: transferResult.company || 'Default Company',
          candidateName: transferResult.candidateName || details.recipient,
          createdBy: transferResult.createdBy,
          transactionId: transferResult.transactionId,
          status: transferResult.success ? 'completed' : 'failed'
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Action execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute swap action using SEI smart contracts
   * @param {string} message - User's message
   * @param {string} agentId - Agent ID
   * @param {Object} actionResult - Processed action result
   * @returns {Object} Execution result
   */
  async executeSwapAction(message, agentId, actionResult) {
    try {
      console.log('🔍 Parsing swap request for execution...');
      console.log('📝 Original message:', message);
      
      // Parse swap details from the message using AI
      const swapDetails = await this.parseSwapIntentWithAI(message);
      console.log('📊 Parsed swap details:', JSON.stringify(swapDetails, null, 2));
      
      if (!swapDetails.isSwap) {
        console.error('❌ Message not recognized as swap intent');
        console.error('Message:', message);
        console.error('Parse result:', swapDetails);
        throw new Error(`Failed to parse swap details from message: "${message}". Parse result: ${JSON.stringify(swapDetails)}`);
      }

      // Validate required swap details
      if (!swapDetails.fromToken || !swapDetails.toToken) {
        console.error('❌ Missing required token information');
        console.error('From token:', swapDetails.fromToken);
        console.error('To token:', swapDetails.toToken);
        throw new Error(`Missing token information. From: ${swapDetails.fromToken}, To: ${swapDetails.toToken}`);
      }

      // Get agent information with private key
      const agent = await Agent.findById(agentId).select('+seiPrivateKey');
      if (!agent) {
        throw new Error('Agent not found');
      }

      // Note: Token validation is now handled by the tokenValidationService in earlier steps

      // Get recipient address (agent's SEI wallet address)
      const recipientAddress = agent.seiAddress;
      
      // Default slippage tolerance
      const slippageTolerance = swapDetails.slippageTolerance || 5; // 5% default
      
      console.log(`💡 Using slippage tolerance: ${slippageTolerance}%`);
      
      // Prepare swap parameters for SEI smart contract
      const swapParams = {
        agentId: agentId,
        fromToken: swapDetails.fromToken,
        toToken: swapDetails.toToken,
        amount: swapDetails.amount || '1',
        recipient: recipientAddress,
        slippageTolerance: slippageTolerance
      };

      console.log('🔄 Executing swap with Agent SDK:', swapParams);
      
      // Initialize Agent SDK instance for this agent
      if (!agent.seiPrivateKey) {
        throw new Error('Agent does not have a private key configured');
      }
      
      // Decrypt the private key
      const decryptedPrivateKey = seiAgentService.decryptPrivateKey(agent.seiPrivateKey);
      
      const agentConfig = {
        privateKey: decryptedPrivateKey,
        address: agent.seiAddress,
        rpcUrl: process.env.SEI_RPC_URL || 'https://evm-rpc.sei-apis.com',
        chainId: process.env.SEI_CHAIN_ID || '1329',
        contractAddresses: {
          agenticRouter: process.env.AGENTIC_ROUTER_ADDRESS || '0x1234567890123456789012345678901234567890',
          wsei: process.env.WSEI_ADDRESS || '0xE30feDd158A2e3b13e9badaeABaFc5516e963E83',
          usdc: process.env.USDC_ADDRESS || '0x3894085Ef7Ff0f0aeDf52E2A2704928d259f9c3a'
        }
      };

      const simpleAgent = new SimpleAgent(agentConfig);
      await simpleAgent.initialize();

      // Execute the swap using Agent SDK
      let swapResult;
      
      if (swapDetails.fromToken.toUpperCase() === 'SEI') {
        // Native SEI to Token swap using Agent SDK (payable, no approval needed)
        const tokenValidationService = require('./tokenValidationService');
        const toTokenInfo = tokenValidationService.findToken(swapDetails.toToken);
        if (!toTokenInfo) {
          throw new Error(`Token ${swapDetails.toToken} not found in token list`);
        }
        
        console.log(`🔄 Native SEI → ${swapDetails.toToken} swap (using swapSeiToToken)`);
        console.log(`📋 Token address: ${toTokenInfo.address}`);
        console.log(`💰 Amount: ${swapParams.amount} SEI`);
        console.log(`🎯 Slippage: ${slippageTolerance}%`);
        
        swapResult = await simpleAgent.swapSeiToToken({
          tokenOut: toTokenInfo.address,
          amountIn: swapParams.amount.toString(),
          slippageTolerance: slippageTolerance,
          recipient: recipientAddress
        });
      } else if (swapDetails.toToken.toUpperCase() === 'SEI') {
        // Token to Native SEI swap using Agent SDK  
        const tokenValidationService = require('./tokenValidationService');
        const fromTokenInfo = tokenValidationService.findToken(swapDetails.fromToken);
        if (!fromTokenInfo) {
          throw new Error(`Token ${swapDetails.fromToken} not found in token list`);
        }
        
        console.log(`🔄 ${swapDetails.fromToken} → Native SEI swap (using swapTokenToSei)`);
        console.log(`📋 Token address: ${fromTokenInfo.address}`);
        console.log(`💰 Amount: ${swapParams.amount} ${swapDetails.fromToken}`);
        
        swapResult = await simpleAgent.swapTokenToSei({
          tokenIn: fromTokenInfo.address,
          amountIn: swapParams.amount.toString(),
          slippageTolerance: slippageTolerance,
          recipient: recipientAddress
        });
      } else {
        // Token to Token swap using Agent SDK (requires approval)
        const tokenValidationService = require('./tokenValidationService');
        const fromTokenInfo = tokenValidationService.findToken(swapDetails.fromToken);
        const toTokenInfo = tokenValidationService.findToken(swapDetails.toToken);
        
        if (!fromTokenInfo || !toTokenInfo) {
          throw new Error(`Token not found: ${swapDetails.fromToken} or ${swapDetails.toToken}`);
        }
        
        console.log(`🔄 ${swapDetails.fromToken} → ${swapDetails.toToken} swap (using swapTokenToToken)`);
        console.log(`📋 From address: ${fromTokenInfo.address}`);
        console.log(`📋 To address: ${toTokenInfo.address}`);
        console.log(`💰 Amount: ${swapParams.amount} ${swapDetails.fromToken}`);
        
        swapResult = await simpleAgent.swapTokenToToken({
          tokenIn: fromTokenInfo.address,
          tokenOut: toTokenInfo.address,
          amountIn: swapParams.amount.toString(),
          slippageTolerance: slippageTolerance,
          recipient: recipientAddress
        });
      }
      
      // Disconnect the agent
      await simpleAgent.disconnect();

      console.log('✅ Swap executed successfully!');

      return {
        success: true,
        swapDetails: swapResult,
        parsedRequest: {
          originalMessage: message,
          extractedDetails: swapDetails,
          inputToken: swapDetails.fromToken,
          outputToken: swapDetails.toToken,
          amount: swapDetails.amount
        },
        executionSummary: {
          action: 'swap_execution',
          transactionHash: swapResult.transactionHash,
          tokenIn: swapResult.tokenIn,
          tokenOut: swapResult.tokenOut,
          amountIn: swapResult.amountIn,
          amountOut: swapResult.amountOut,
          gasUsed: swapResult.gasUsed,
          status: swapResult.success ? 'completed' : 'failed'
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Swap execution failed:', error);
      throw error;
    }
  }

  /**
   * Parse swap intent from message using AI
   * @param {string} message - User's message
   * @returns {Object} Parsed swap details
   */
  async parseSwapIntentWithAI(message) {
    try {
      if (!together) {
        // Fallback parsing without AI
        return this.parseSwapIntentBasic(message);
      }

      const prompt = `Analyze this message and extract swap intent:
      
Message: "${message}"

Supported tokens: SEI, WSEI, USDC, USDT, WETH, WBTC, iSEI, USDa, syUSD, SolvBTC, FXS, MAD, FASTUSD

Return JSON:
{
  "isSwap": boolean,
  "fromToken": "token_symbol",
  "toToken": "token_symbol", 
  "amount": "numeric_value",
  "slippageTolerance": number_or_null
}

Only return the JSON, no explanation.`;

      const response = await together.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
        max_tokens: 200,
        temperature: 0.1
      });

      const result = JSON.parse(response.choices[0].message.content.trim());
      
      // Validate result
      if (result.isSwap && (!result.fromToken || !result.toToken)) {
        result.isSwap = false;
      }
      
      return result;
      
    } catch (error) {
      console.error('Error parsing swap intent with AI:', error);
      return this.parseSwapIntentBasic(message);
    }
  }

  /**
   * Basic swap intent parsing without AI
   * @param {string} message - User's message
   * @returns {Object} Parsed swap details
   */
  parseSwapIntentBasic(message) {
    const lowercaseMessage = message.toLowerCase();
    const swapKeywords = ['swap', 'exchange', 'convert', 'trade'];
    
    const isSwap = swapKeywords.some(keyword => lowercaseMessage.includes(keyword));
    
    if (!isSwap) {
      return { isSwap: false };
    }
    
    // Basic token extraction (very simplified)
    const supportedTokens = ['SEI', 'WSEI', 'USDC', 'USDT', 'WETH', 'WBTC', 'iSEI', 'USDa', 'syUSD', 'SolvBTC', 'FXS', 'MAD', 'FASTUSD'];
    const foundTokens = supportedTokens.filter(token => 
      lowercaseMessage.includes(token.toLowerCase())
    );
    
    // Try to extract amount
    const amountMatch = message.match(/(\d+(?:\.\d+)?)/);
    const amount = amountMatch ? amountMatch[1] : '1';
    
    return {
      isSwap: foundTokens.length >= 2,
      fromToken: foundTokens[0] || null,
      toToken: foundTokens[1] || null,
      amount: amount,
      slippageTolerance: null
    };
  }

  /**
   * Resolve token symbol to contract address/ID using testnet swap tokens
   * @param {string} tokenSymbol - Token symbol (e.g., 'HBAR', 'USDC')
   * @returns {string} Token contract address or ID
   */
  resolveTokenId(tokenSymbol) {
    try {
      // Use ContactsTokensService to find token from testnet swap tokens
      const tokenInfo = contactsTokensService.findToken(tokenSymbol, true); // forSwap = true
      
      if (tokenInfo && tokenInfo.id) {
        console.log(`✅ Resolved token ${tokenSymbol} to ID: ${tokenInfo.id}`);
        return tokenInfo.id;
      }
      
      // Fallback to original hardcoded mapping for backwards compatibility
      const tokenMap = {
        'HBAR': 'HBAR', // Native token
        'USDC': '0.0.456858', // USDC token ID on Hedera
        'USDT': '0.0.681309', // USDT token ID on Hedera
        'SAUCE': '0.0.731861', // SAUCE token ID on Hedera
        'WBTC': '0.0.1456986', // Wrapped BTC on Hedera
        'WETH': '0.0.1456986', // Wrapped ETH on Hedera (placeholder)
      };

      const fallbackId = tokenMap[tokenSymbol.toUpperCase()] || tokenSymbol;
      console.log(`⚠️ Used fallback token mapping for ${tokenSymbol}: ${fallbackId}`);
      return fallbackId;
    } catch (error) {
      console.error('❌ Error resolving token ID:', error);
      // Return the original symbol as fallback
      return tokenSymbol;
    }
  }

  /**
   * Get token decimals using testnet swap tokens
   * @param {string} tokenSymbol - Token symbol
   * @returns {number} Number of decimals
   */
  getTokenDecimals(tokenSymbol) {
    try {
      // Use ContactsTokensService to find token from testnet swap tokens
      const tokenInfo = contactsTokensService.findToken(tokenSymbol, true); // forSwap = true
      
      if (tokenInfo && tokenInfo.decimals !== undefined) {
        console.log(`✅ Found decimals for ${tokenSymbol}: ${tokenInfo.decimals}`);
        return tokenInfo.decimals;
      }
      
      // Fallback to original hardcoded mapping for backwards compatibility
      const decimalsMap = {
        'HBAR': 8,
        'USDC': 6,
        'USDT': 6,
        'SAUCE': 6,
        'WBTC': 8,
        'WETH': 18
      };

      const fallbackDecimals = decimalsMap[tokenSymbol.toUpperCase()] || 6;
      console.log(`⚠️ Used fallback decimals for ${tokenSymbol}: ${fallbackDecimals}`);
      return fallbackDecimals;
    } catch (error) {
      console.error('❌ Error getting token decimals:', error);
      // Default to 6 decimals as fallback
      return 6;
    }
  }

  /**
   * Convert amount to smallest unit
   * @param {number} amount - Amount in regular units
   * @param {number} decimals - Number of decimals
   * @returns {BigInt} Amount in smallest unit
   */
  toSmallestUnit(amount, decimals) {
    return BigInt(Math.floor(amount * Math.pow(10, decimals)));
  }

  /**
   * Estimate swap output (simplified)
   * @param {string} inputToken - Input token ID
   * @param {string} outputToken - Output token ID
   * @param {BigInt} amountIn - Input amount
   * @returns {number} Estimated output amount
   */
  async estimateSwapOutput(inputToken, outputToken, amountIn) {
    try {
      // This is a simplified estimation
      // In production, you'd query SaucerSwap's quoter contract
      
      // Mock exchange rates (in practice, fetch from DEX)
      const mockRates = {
        'HBAR_USDC': 0.065, // 1 HBAR = 0.065 USDC
        'USDC_HBAR': 15.38, // 1 USDC = 15.38 HBAR
        'HBAR_SAUCE': 19.12, // 1 HBAR = 19.12 SAUCE
        'SAUCE_HBAR': 0.052, // 1 SAUCE = 0.052 HBAR
      };

      const pairKey = `${inputToken}_${outputToken}`;
      const rate = mockRates[pairKey] || 1;
      
      return Number(amountIn) * rate;
    } catch (error) {
      console.error('Error estimating swap output:', error);
      return Number(amountIn); // Fallback 1:1 ratio
    }
  }

  /**
   * Get supported actions list
   * @returns {Array} List of supported action types
   */
  getSupportedActions() {
    return [...this.supportedActions];
  }

  /**
   * Get Hedera client for an agent
   * @param {Object} agent - Agent object
   * @returns {Object} Hedera client
   */
  /**
   * Parse transfer request from message (simplified)
   * @param {string} message - Message to parse
   * @returns {Object} Parsed transfer details
   */
  parseTransferRequest(message) {
    try {
      // Simple regex-based parsing for transfer requests
      const transferPatterns = [
        /transfer\s+(\d+(?:\.\d+)?)\s+(\w+)\s+to\s+(\w+)/i,
        /send\s+(\d+(?:\.\d+)?)\s+(\w+)\s+to\s+(\w+)/i,
        /pay\s+(\d+(?:\.\d+)?)\s+(\w+)\s+to\s+(\w+)/i
      ];

      for (const pattern of transferPatterns) {
        const match = message.match(pattern);
        if (match) {
          const [, amount, currency, recipient] = match;
          return {
            success: true,
            details: {
              amount: parseFloat(amount),
              currency: currency.toUpperCase(),
              recipient: recipient,
              memo: `Transfer via agent`
            }
          };
        }
      }

      return {
        success: false,
        error: 'Could not parse transfer details from message'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute action directly (called from interactive response processing)
   * @param {string} actionType - Type of action to execute
   * @param {Object} resolvedArgs - Resolved arguments from validation
   * @param {string} userId - User ID
   * @returns {Object} Execution result
   */
  async executeAction(actionType, resolvedArgs, userId) {
    try {
      console.log('🚀 Executing action directly:', actionType);
      console.log('📋 Resolved arguments:', resolvedArgs);
      
      // Get user's agent
      if (!Agent) {
        throw new Error('Agent model is not properly imported');
      }
      
      const agent = await Agent.findOne({ userId: userId });
      if (!agent) {
        throw new Error('No agent found for this user');
      }
      
      // Execute based on action type
      switch (actionType) {
        case 'transfer':
          console.log('💸 Executing transfer action...');
          
          const transferResult = await seiAgentService.executeTransfer(agent._id, {
            token: resolvedArgs.token || 'SEI',
            to: resolvedArgs.recipient,
            amount: parseFloat(resolvedArgs.amount)
          });
          
          return {
            success: true,
            transactionDetails: transferResult,
            actionType: 'transfer',
            resolvedArgs: resolvedArgs,
            timestamp: new Date().toISOString()
          };

        case 'balance':
          console.log('💰 Executing balance check...');
          
          const balanceResult = await this.executeBalanceCheck(agent._id);
          
          return {
            success: true,
            balanceDetails: balanceResult,
            actionType: 'balance',
            timestamp: new Date().toISOString()
          };
          
        default:
          throw new Error(`Action type '${actionType}' not yet supported for direct execution`);
      }
      
    } catch (error) {
      console.error('❌ Direct action execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute swap action using already resolved token information
   * @param {string} agentId - Agent ID
   * @param {Object} resolvedArgs - Already resolved swap arguments
   * @returns {Object} Execution result
   */
  async executeResolvedSwapAction(agentId, resolvedArgs) {
    try {
      console.log('🔄 Executing resolved swap action...');
      console.log('🎯 Resolved args:', JSON.stringify(resolvedArgs, null, 2));

      // Extract resolved token information
      const fromTokenResolved = resolvedArgs.fromToken_resolved;
      const toTokenResolved = resolvedArgs.toToken_resolved;
      const amount = resolvedArgs.amount;

      if (!fromTokenResolved || !toTokenResolved) {
        throw new Error('Missing resolved token information');
      }

      console.log(`💱 Swap: ${amount} ${fromTokenResolved.symbol} → ${toTokenResolved.symbol}`);
      console.log(`📋 From Token: ${fromTokenResolved.name} (${fromTokenResolved.id})`);
      console.log(`📋 To Token: ${toTokenResolved.name} (${toTokenResolved.id})`);

      // Get agent information
      const agent = await Agent.findById(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      // Calculate amounts in smallest units
      const fromDecimals = fromTokenResolved.decimals || 8;
      const amountInSmallestUnit = BigInt(Math.floor(amount * Math.pow(10, fromDecimals)));

      console.log(`💰 Amount: ${amount} ${fromTokenResolved.symbol} = ${amountInSmallestUnit} (smallest unit)`);

      // Prepare swap parameters for SaucerSwap
      const swapParams = {
        inputToken: fromTokenResolved.id,
        outputToken: toTokenResolved.id,
        amountIn: amountInSmallestUnit,
        amountOut: null, // Will be calculated by the router
        swapType: 'exactInput',
        recipient: agent.walletAddress,
        slippageTolerance: 2.0, // 2% default slippage
        deadline: Math.floor(Date.now() / 1000) + 1200 // 20 minutes from now
      };

      console.log('📝 Swap parameters:', JSON.stringify(swapParams, null, 2));

      // Execute the swap using agent-sdk
      console.log('🚀 Executing swap through SEI AgenticRouter...');
      const swapResult = await seiAgentService.executeSwap(agentId, {
        fromToken: fromTokenResolved.symbol,
        toToken: toTokenResolved.symbol,
        amount: amount,
        slippageTolerance: 15
      });

      console.log('✅ Swap execution completed:', swapResult);

      return {
        success: true,
        transactionId: swapResult.transactionId,
        swapDetails: {
          fromToken: fromTokenResolved.symbol,
          toToken: toTokenResolved.symbol,
          amountIn: amount,
          amountOut: swapResult.amountOut,
          fromTokenId: fromTokenResolved.id,
          toTokenId: toTokenResolved.id
        },
        execution: {
          status: 'completed',
          timestamp: new Date().toISOString(),
          method: 'saucerswap'
        }
      };

    } catch (error) {
      console.error('❌ Resolved swap execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute action based on type
   * @param {string} actionType - Type of action to execute
   * @param {Object} resolvedArgs - Resolved action arguments
   * @param {string} userId - User ID for agent lookup
   * @returns {Object} Execution result
   */
  async executeAction(actionType, resolvedArgs, userId) {
    try {
      console.log(`🚀 Executing ${actionType} action with resolved args:`, resolvedArgs);

      // Find an agent for this user with proper userId handling
      let userAgents;
      
      // Handle different userId formats (ObjectId, email, or fallback string)
      if (userId.includes('@')) {
        // This is an email - find user first, then agents
        const user = await require('../models/User').findOne({ email: userId });
        if (!user) {
          throw new Error('User not found with email: ' + userId);
        }
        userAgents = await Agent.find({ userId: user._id, isActive: true }).limit(1);
      } else if (userId === 'user123' || !userId) {
        // Fallback for test/demo - find any active agent
        console.log('⚠️  Using fallback agent lookup for demo/test userId:', userId);
        userAgents = await Agent.find({ isActive: true }).limit(1);
      } else {
        try {
          // Try as ObjectId first
          userAgents = await Agent.find({ userId: userId, isActive: true }).limit(1);
        } catch (error) {
          // If ObjectId cast fails, try finding user by email as fallback
          const user = await require('../models/User').findOne({ email: userId });
          if (user) {
            userAgents = await Agent.find({ userId: user._id, isActive: true }).limit(1);
          } else {
            // Final fallback - find any active agent for demo
            console.log('⚠️  Could not resolve userId, using fallback agent for demo');
            userAgents = await Agent.find({ isActive: true }).limit(1);
          }
        }
      }
      
      if (!userAgents || userAgents.length === 0) {
        throw new Error('No active agents found for user. Please create an agent first.');
      }
      
      const agentId = userAgents[0]._id.toString();
      console.log(`👤 Using agent ${agentId} for execution`);

      // Route to appropriate execution method based on action type
      switch (actionType.toLowerCase()) {
        case 'transfer':
          return await this.executeTransferAction(resolvedArgs.originalMessage || 'transfer', agentId, { args: resolvedArgs });
          
        case 'swap':
          // Use resolved token information for efficient swap execution
          return await this.executeResolvedSwapAction(agentId, resolvedArgs);
          
        case 'stake':
          throw new Error('Stake action execution not yet implemented');
          
        case 'createagent':
          throw new Error('Agent creation action execution not yet implemented');
          
        case 'associatetoken':
          throw new Error('Token association action execution not yet implemented');
          
        case 'createtopic':
          throw new Error('Topic creation action execution not yet implemented');
          
        case 'sendmessage':
          throw new Error('Message sending action execution not yet implemented');
          
        default:
          throw new Error(`Action type '${actionType}' not yet supported for direct execution`);
      }
      
    } catch (error) {
      console.error(`❌ Action execution failed for ${actionType}:`, error);
      throw error;
    }
  }

  /**
   * Execute balance check for all tokens in the wallet
   * @param {string} agentId - Agent ID
   * @returns {Object} Balance information for all tokens
   */
  async executeBalanceCheck(agentId) {
    try {
      const agent = await Agent.findById(agentId).select('+seiPrivateKey');
      if (!agent) {
        throw new Error('Agent not found');
      }

      // Decrypt private key
      const privateKey = agent.seiPrivateKey;
      if (!privateKey) {
        throw new Error('Agent private key not found');
      }

      // Check if agent has address
      if (!agent.seiAddress) {
        throw new Error('Agent SEI address not found');
      }

      // Initialize SimpleAgent with proper configuration
      const agentConfig = {
        privateKey: privateKey,
        address: agent.seiAddress,
        rpcUrl: process.env.SEI_RPC_URL || 'https://evm-rpc.sei-apis.com',
        chainId: process.env.SEI_CHAIN_ID || '1329',
        contractAddresses: {
          agenticRouter: process.env.AGENTIC_ROUTER_ADDRESS || '0x1234567890123456789012345678901234567890',
          wsei: process.env.WSEI_ADDRESS || '0xE30feDd158A2e3b13e9badaeABaFc5516e963E83',
          usdc: process.env.USDC_ADDRESS || '0x3894085Ef7Ff0f0aeDf52E2A2704928d259f9c3a'
        }
      };

      console.log('🔧 SimpleAgent config:', {
        address: agentConfig.address,
        rpcUrl: agentConfig.rpcUrl,
        chainId: agentConfig.chainId,
        hasPrivateKey: !!agentConfig.privateKey
      });

      const simpleAgent = new SimpleAgent(agentConfig);
      await simpleAgent.initialize();

      // Load token list
      const tokenList = require('../tokeLists.json');
      
      // Get SEI balance first
      const seiBalance = await simpleAgent.getSeiBalance();
      
      const balances = [{
        symbol: 'SEI',
        name: 'SEI',
        balance: seiBalance,
        decimals: 18,
        address: 'native',
        logoURI: 'https://sei.io/logo.png'
      }];

      // Get all token balances
      for (const token of tokenList.tokens) {
        // Skip native SEI as we already got it
        if (token.symbol === 'SEI') continue;
        
        try {
          const tokenBalance = await simpleAgent.getTokenBalance(token.address);
          
          // Only include tokens with non-zero balance
          if (parseFloat(tokenBalance.balance) > 0) {
            balances.push({
              symbol: token.symbol,
              name: token.name,
              balance: tokenBalance.balance,
              decimals: token.decimals,
              address: token.address,
              logoURI: token.logoURI
            });
          }
        } catch (error) {
          console.log(`⚠️  Could not fetch balance for ${token.symbol}:`, error.message);
          // Continue with other tokens
        }
      }

      return {
        address: simpleAgent.config.address,
        seiBalance: seiBalance,
        totalTokens: balances.length,
        balances: balances,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Balance check failed:', error);
      throw error;
    }
  }

  /**
   * Get action processing statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    return {
      service: 'ActionsProcessingService',
      version: '1.0.0',
      supportedActions: this.supportedActions,
      llmEnabled: !!together,
      fallbackEnabled: true,
      specializedPrompts: this.supportedActions.length
    };
  }
}

// Export singleton instance
const actionsProcessingService = new ActionsProcessingService();
module.exports = actionsProcessingService;