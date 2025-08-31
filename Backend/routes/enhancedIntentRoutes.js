const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const promptRouterController = require('../controllers/promptRouterController');

// The controller is already an instance, no need to instantiate
const controller = promptRouterController;

/**
 * @swagger
 * /api/enhanced-intent/process:
 *   post:
 *     summary: Process natural language messages and extract pipeline actions
 *     description: |
 *       Advanced LLM-powered endpoint that analyzes natural language messages and extracts structured pipeline actions for crypto trading automation.
 *       
 *       **Key Features:**
 *       - **Dynamic Classification**: Uses advanced LLM to classify messages into actions, pipelines, strategies, information requests, or feedback
 *       - **Pipeline Extraction**: Extracts complex workflows with triggers, conditions, and sequential actions
 *       - **Smart Validation**: Validates extracted pipelines with sophisticated error checking and quality scoring
 *       - **Interactive Components**: Provides UI components for collecting missing information
 *       
 *       **Pipeline Examples:**
 *       - "when TON increases by 15% buy $1000 worth of DUCK and transfer 1% to my cold wallet"
 *       - "if SEI drops below $0.45 then swap ALL my USDC for SEI and stake 80% of it"
 *       - "when my portfolio reaches $10k, send 10% to savings and stake the rest"
 *       
 *       **Action Examples:**
 *       - "check my SEI balance" (classified as actions)
 *       - "send 100 SEI to Alice" (classified as actions)
 *       - "swap 50 HBAR for USDC" (classified as actions)
 *     tags:
 *       - Enhanced Intent Processing
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EnhancedIntentRequest'
 *           examples:
 *             complex_pipeline:
 *               summary: Complex Pipeline with Multiple Actions
 *               description: A sophisticated pipeline with price trigger, buy action, and transfer
 *               value:
 *                 message: "when TON increases by 15% in 1 hour, buy $1000 worth of DUCK and immediately transfer 1% of my total balance to my cold wallet 0x123abc"
 *                 userId: "user123"
 *                 sessionId: "session-456"
 *             conditional_workflow:
 *               summary: Conditional Workflow
 *               description: Pipeline with price condition and multiple sequential actions
 *               value:
 *                 message: "if SEI drops below $0.45 then swap ALL my USDC for SEI, stake 80% of it, and send me a notification"
 *                 userId: "user456"
 *                 sessionId: "session-789"
 *             automation_request:
 *               summary: Automation Request
 *               description: Simple automation setup
 *               value:
 *                 message: "automate buying SEI when it dips below $0.40"
 *                 userId: "user789"
 *                 sessionId: "session-012"
 *             simple_action:
 *               summary: Simple Action (Non-Pipeline)
 *               description: Basic balance check action
 *               value:
 *                 message: "check my SEI balance"
 *                 userId: "user012"
 *                 sessionId: "session-345"
 *             strategy_discussion:
 *               summary: Strategy Discussion
 *               description: High-level strategy planning
 *               value:
 *                 message: "I want to create a DCA strategy for SEI over 6 months"
 *                 userId: "user345"
 *                 sessionId: "session-678"
 *     responses:
 *       '200':
 *         description: Successfully processed the message
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EnhancedIntentResponse'
 *             examples:
 *               pipeline_success:
 *                 summary: Successful Pipeline Extraction
 *                 description: Complete pipeline with trigger, actions, and validation results
 *                 value:
 *                   success: true
 *                   data:
 *                     classification:
 *                       type: "pipeline"
 *                       actionSubtype: "workflow"
 *                       confidence: 0.95
 *                       reasoning: "Detected sophisticated pipeline patterns with conditional logic and multiple actions"
 *                     extraction:
 *                       type: "pipeline"
 *                       pipeline:
 *                         trigger:
 *                           type: "price_movement"
 *                           token: "TON"
 *                           direction: "increase"
 *                           percentage: 15
 *                           timeframe: "1h"
 *                         actions:
 *                           - type: "buy"
 *                             token: "DUCK"
 *                             amount: 1000
 *                             denomination: "USD"
 *                             order_type: "market"
 *                           - type: "transfer"
 *                             amount: "1%"
 *                             source: "total_balance"
 *                             destination: "0x123abc"
 *                             execution: "immediate"
 *                         conditions:
 *                           - type: "price_movement"
 *                             token: "TON"
 *                             direction: "increase"
 *                             percentage: 15
 *                             timeframe: "1h"
 *                         metadata:
 *                           priority: "high"
 *                           execution_mode: "sequential"
 *                       originalMessage: "when TON increases by 15% in 1 hour, buy $1000 worth of DUCK and immediately transfer 1% of my total balance to my cold wallet 0x123abc"
 *                     validation:
 *                       isValid: true
 *                       missing: []
 *                       resolved:
 *                         trigger:
 *                           type: "price_movement"
 *                           token: "TON"
 *                         actions:
 *                           - type: "buy"
 *                             token: "DUCK"
 *                           - type: "transfer"
 *                             amount: "1%"
 *                       errors: []
 *                       warnings: []
 *                       quality: 95
 *                       pipelineType: "advanced_workflow"
 *                     interactiveData: null
 *                     timestamp: "2025-08-29T14:30:00.000Z"
 *                     userId: "user123"
 *                   timestamp: "2025-08-29T14:30:00.000Z"
 *               action_success:
 *                 summary: Successful Action Classification
 *                 description: Simple action classified correctly
 *                 value:
 *                   success: true
 *                   data:
 *                     classification:
 *                       type: "actions"
 *                       actionSubtype: "balance"
 *                       confidence: 0.85
 *                       reasoning: "Matched balance pattern with context"
 *                     extraction:
 *                       actionType: "balance"
 *                       args: {}
 *                       originalMessage: "check my SEI balance"
 *                     validation:
 *                       isValid: true
 *                       missing: []
 *                       resolved: {}
 *                       requiredArgs: []
 *                     interactiveData: null
 *                     timestamp: "2025-08-29T14:30:00.000Z"
 *                     userId: "user012"
 *                   timestamp: "2025-08-29T14:30:00.000Z"
 *               incomplete_pipeline:
 *                 summary: Incomplete Pipeline with Interactive Components
 *                 description: Pipeline needs more information from user
 *                 value:
 *                   success: true
 *                   data:
 *                     classification:
 *                       type: "pipeline"
 *                       actionSubtype: "workflow"
 *                       confidence: 0.90
 *                       reasoning: "Detected pipeline pattern but missing specific details"
 *                     extraction:
 *                       type: "pipeline"
 *                       pipeline:
 *                         trigger: null
 *                         actions: []
 *                         conditions: []
 *                       args: {}
 *                       originalMessage: "when price goes up, buy some tokens"
 *                     validation:
 *                       isValid: false
 *                       missing: ["trigger", "actions"]
 *                       resolved: {}
 *                       errors: ["No trigger defined for pipeline", "Pipeline must have at least one action"]
 *                       warnings: []
 *                       quality: 60
 *                       pipelineType: "advanced_workflow"
 *                     interactiveData:
 *                       type: "argumentRequest"
 *                       message: "I need more information to complete this action. Please provide:"
 *                       components:
 *                         - type: "input"
 *                           label: "Trigger Token"
 *                           placeholder: "Enter token symbol (e.g., TON, SEI)"
 *                         - type: "input"
 *                           label: "Target Action"
 *                           placeholder: "Enter action to perform (buy/sell/swap/transfer)"
 *                       missingArgs: ["trigger", "actions"]
 *                     timestamp: "2025-08-29T14:30:00.000Z"
 *                     userId: "user789"
 *                   timestamp: "2025-08-29T14:30:00.000Z"
 *       '400':
 *         description: Bad request - Invalid input parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Validation failed"
 *               errors:
 *                 - msg: "Message must be between 1 and 1000 characters"
 *                   param: "message"
 *               timestamp: "2025-08-29T14:30:00.000Z"
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Internal server error"
 *               error: "Enhanced intent service unavailable"
 *               timestamp: "2025-08-29T14:30:00.000Z"
 * Enhanced message processing with intent validation
 * POST /api/enhanced-intent/process
 */
router.post('/process', [
  body('message')
    .notEmpty()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),
  body('userId')
    .optional()
    .isString()
    .withMessage('User ID must be a string'),
  body('sessionId')
    .optional()
    .isString()
    .withMessage('Session ID must be a string')
], controller.processMessageWithValidation);

/**
 * Process interactive response from user
 * POST /api/enhanced-intent/interactive-response
 */
router.post('/interactive-response', [
  body('originalIntent')
    .exists()
    .withMessage('Original intent is required'),
  body('userResponses')
    .isObject()
    .withMessage('User responses must be an object'),
  body('userId')
    .optional()
    .isString()
    .withMessage('User ID must be a string')
], controller.processInteractiveResponse);

/**
 * Get contacts and tokens data
 * GET /api/enhanced-intent/contacts-tokens
 */
router.get('/contacts-tokens', controller.getContactsAndTokens);

/**
 * Get supported actions and their required arguments
 * GET /api/enhanced-intent/supported-actions
 */
router.get('/supported-actions', (req, res) => {
  try {
    const supportedActions = {
      transfer: {
        name: 'Transfer Tokens',
        description: 'Send SEI or tokens to another account on SEI Network',
        requiredArgs: ['recipient', 'amount'],
        optionalArgs: ['tokenAddress'],
        examples: [
          'Send 100 SEI to 0x1234...5678',
          'Transfer 50 USDC to Alice',
          'Send 1000 DRAGONX to sei1abc...xyz'
        ]
      },
      swap: {
        name: 'Swap Tokens',
        description: 'Exchange one token for another using DragonSwap or SeiSwap',
        requiredArgs: ['fromToken', 'toToken', 'amount'],
        optionalArgs: ['swapType', 'slippage', 'dex'],
        examples: [
          'Swap 100 SEI for USDC on DragonSwap',
          'Exchange my WBTC for USDT on SeiSwap',
          'Convert 1000 USDC to SEI with 1% slippage'
        ]
      },
      createAgent: {
        name: 'Create AI Agent',
        description: 'Create a new AI trading agent for SEI ecosystem',
        requiredArgs: ['name', 'description'],
        optionalArgs: ['strategy', 'parameters'],
        examples: [
          'Create a DCA agent for SEI tokens',
          'Make an agent called "SEI Arbitrage Bot"',
          'Create agent for DragonSwap liquidity management'
        ]
      },
      stake: {
        name: 'Stake SEI',
        description: 'Stake SEI tokens for rewards with validators',
        requiredArgs: ['amount'],
        optionalArgs: ['validator'],
        examples: [
          'Stake 1000 SEI',
          'Delegate to validator seivalidator1...',
          'Stake SEI with highest APY validator'
        ]
      },
      addLiquidity: {
        name: 'Add Liquidity',
        description: 'Add liquidity to SEI DEX pools',
        requiredArgs: ['tokenA', 'tokenB', 'amountA'],
        optionalArgs: ['amountB', 'slippage', 'dex'],
        examples: [
          'Add liquidity to SEI/USDC pool',
          'Provide liquidity for WBTC/ETH on DragonSwap',
          'Add 100 SEI and equivalent USDT to pool'
        ]
      },
      removeLiquidity: {
        name: 'Remove Liquidity',
        description: 'Remove liquidity from SEI DEX pools',
        requiredArgs: ['poolAddress', 'percentage'],
        optionalArgs: ['minAmountA', 'minAmountB'],
        examples: [
          'Remove 50% liquidity from SEI/USDC pool',
          'Withdraw all liquidity from WBTC/ETH pool',
          'Remove liquidity from pool 0x123...abc'
        ]
      },
      bridge: {
        name: 'Bridge Assets',
        description: 'Bridge tokens between SEI and other networks',
        requiredArgs: ['amount', 'tokenAddress', 'destinationChain'],
        optionalArgs: ['destinationAddress'],
        examples: [
          'Bridge 100 USDC from SEI to Ethereum',
          'Transfer WBTC from Arbitrum to SEI',
          'Bridge SEI to Polygon network'
        ]
      }
    };

    res.json({
      success: true,
      data: supportedActions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Health check for enhanced intent service
 * GET /api/enhanced-intent/health
 */
router.get('/health', (req, res) => {
  try {
    res.json({
      success: true,
      status: 'healthy',
      service: 'Enhanced Intent Service',
      version: '1.0.0',
      features: [
        'SEI ecosystem intent classification',
        'Argument validation for SEI transactions',
        'Contact resolution on SEI network',
        'SEI token lookup and validation',
        'Interactive components for DeFi operations'
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
