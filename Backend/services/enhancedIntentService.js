const Together = require('together-ai').default;
const ContactsTokensService = require('./contactsTokensService');

class EnhancedIntentService {
  constructor() {
    this.contactsTokensService = new ContactsTokensService();
    
    // Initialize Together AI
    try {
      this.together = new Together({
        apiKey: process.env.TOGETHER_API_KEY || 'dummy-key'
      });
    } catch (error) {
      console.warn('Together AI not initialized. Please set TOGETHER_API_KEY environment variable.');
      this.together = null;
    }
  }

  /**
   * Enhanced message parsing that extracts intents and validates arguments
   */
  async parseMessageWithValidation(message, userId = null) {
    try {
      console.log('🔍 Enhanced intent parsing for message:', message);

      // Step 1: Classify the message type
      const classification = await this.classifyMessage(message);
      
      // Step 2: Extract arguments based on classification
      const extraction = classification.type === 'pipeline' 
        ? await this.extractPipelineActions(message, classification)
        : classification.type === 'portfolio-information'
        ? await this.extractPortfolioArguments(message, classification)
        : await this.extractArguments(message, classification);
      
      // Step 3: Validate arguments and resolve contacts/tokens
      const validation = this.validateAndResolveArguments(extraction);
      
      // Step 4: Generate interactive UI data for missing arguments
      const interactiveData = this.generateInteractiveData(validation.missing, classification.type);

      const result = {
        classification,
        extraction,
        validation,
        interactiveData,
        timestamp: new Date().toISOString(),
        userId
      };

      console.log('✅ Enhanced intent parsing complete:', result);
      return result;

    } catch (error) {
      console.error('❌ Enhanced intent parsing failed:', error);
      return {
        classification: { type: 'information', confidence: 0.1 },
        extraction: { args: {} },
        validation: { isValid: false, missing: [], resolved: {} },
        interactiveData: null,
        error: error.message,
        timestamp: new Date().toISOString(),
        userId
      };
    }
  }

  /**
   * Classify message type using LLM
   */
  async classifyMessage(message) {
    if (!this.together) {
      return this.fallbackClassification(message);
    }

    try {
      const systemPrompt = `You are an advanced intent classifier for a sophisticated crypto trading platform. Your task is to analyze user messages and classify them with high precision into appropriate categories.

CLASSIFICATION CATEGORIES:

1. **portfolio-information** - Portfolio balance inquiries and information requests:
   - balance: Complete portfolio view ("check my balance", "show my portfolio", "what's my total balance")
   - token-balance: Specific token balance ("what's my TON balance", "how much DUCK do I have")
   - portfolio-summary: Portfolio analytics ("show me my portfolio performance", "my holdings summary")
   
2. **actions** - Immediate, single blockchain operations:
   - transfer: Direct token transfers ("send 100 SEI to Alice", "transfer USDC to 0x123...")
   - swap: Token exchanges ("swap 50 HBAR for USDC", "exchange my SAUCE to USDT")
   - stake: Staking operations ("stake 1000 SEI", "delegate to validator")
   - createAgent: AI agent creation ("create a DCA agent", "make a trading bot")
   - deployContract: Smart contract deployment ("deploy my NFT contract")
   - associateToken: Token association ("associate token 0.0.123456")
   - createTopic: Topic creation for messaging ("create alert topic")
   - sendMessage: Send message to existing topic ("publish to topic 0.0.456")

3. **pipeline** - Complex automated workflows with triggers and conditional logic:
   INDICATORS: conditional statements, triggers, multi-step processes, automation keywords
   - Trigger-based: "when X happens, do Y" / "if X condition, then Y action"
   - Multi-action sequences: "do A, then B, then C"  
   - Conditional logic: "if/when/whenever/as soon as/after/once"
   - Automation: "automatically/automate/set up/create workflow"
   
   EXAMPLES:
   - "when TON price increases by 10%, buy $DUCK and send 1% to my savings wallet"
   - "if my portfolio drops below $5k, swap all USDC for SEI and stake it"
   - "whenever HBAR reaches $1, sell 50% and transfer profits to cold wallet"
   - "automate buying SEI when it dips below $0.40"
   - "set up a workflow: monitor ETH price, if it hits $3000, execute my DCA strategy"

4. **strategy** - High-level trading plans, investment approaches, goal-setting:
   - Investment planning, risk management, portfolio allocation
   - "I want to DCA into SEI over 6 months", "help me create a conservative portfolio"

5. **information** - Data requests, educational content, analysis:
   - Market data, price queries, educational questions, explanations

6. **feedbacks** - Responses about completed actions or system feedback

CLASSIFICATION RULES:
- Portfolio-Information vs Actions: Balance/portfolio queries → portfolio-information; Action execution → actions  
- Portfolio-Information subtypes: General balance → balance; Specific token → token-balance; Analytics → portfolio-summary
- Pipeline vs Action: If message contains conditional logic (if/when/then) + multiple actions OR automation intent → pipeline
- Pipeline vs Strategy: Pipeline = specific executable workflow; Strategy = high-level planning
- Consider context and complexity: simple immediate actions vs. automated multi-step processes
- Look for automation indicators: triggers, conditions, sequences, workflows

Respond with JSON:
{
  "type": "portfolio-information|actions|pipeline|strategy|information|feedbacks",
  "actionSubtype": "balance|token-balance|portfolio-summary|transfer|swap|stake|createAgent|deployContract|associateToken|createTopic|sendMessage|workflow|other",
  "confidence": 0.1-1.0,
  "reasoning": "detailed explanation of classification decision and key indicators found"
}`;

      const response = await this.together.chat.completions.create({
        model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Classify: "${message}"` }
        ],
        max_tokens: 200,
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content);

    } catch (error) {
      console.error('Classification error:', error);
      return this.fallbackClassification(message);
    }
  }

  /**
   * Extract arguments from message using LLM
   */
  async extractArguments(message, classification) {
    if (!this.together || classification.type !== 'actions') {
      return { args: {} };
    }

    try {
      const actionType = classification.actionSubtype || 'other';
      const systemPrompt = this.buildExtractionPrompt(actionType);

      const response = await this.together.chat.completions.create({
        model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract arguments from: "${message}"` }
        ],
        max_tokens: 300,
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const extracted = JSON.parse(response.choices[0].message.content);
      console.log(`🤖 LLM extracted arguments for ${actionType}:`, JSON.stringify(extracted.args, null, 2));
      return {
        actionType,
        args: extracted.args || {},
        originalMessage: message
      };

    } catch (error) {
      console.error('Argument extraction error:', error);
      
      // Add regex fallback for swap actions
      const actionType = classification.actionSubtype || 'other';
      if (actionType === 'swap') {
        console.log('🔄 LLM failed for swap extraction, trying regex fallback');
        const regexArgs = this.extractSwapArgumentsRegex(message);
        if (regexArgs.fromToken && regexArgs.toToken && regexArgs.amount) {
          console.log('✅ Regex fallback extracted swap arguments:', regexArgs);
          return {
            actionType,
            args: regexArgs,
            originalMessage: message
          };
        }
      }
      
      return { 
        actionType,
        args: {},
        originalMessage: message
      };
    }
  }

  /**
   * Extract swap arguments using regex as fallback
   */
  extractSwapArgumentsRegex(message) {
    try {
      console.log('🔍 Using regex to extract swap arguments from:', message);
      
      // Token pattern for DuckChain tokens
      const tokenPattern = /\b(wton|duck|ton|usdt|usdc|btc|eth)\b/gi;
      
      // Amount pattern - matches numbers with optional decimals
      const amountPattern = /\b(\d+(?:\.\d+)?)\b/g;
      
      // Find all tokens in the message
      const tokens = [...message.matchAll(tokenPattern)].map(match => match[1].toUpperCase());
      
      // Find all amounts in the message  
      const amounts = [...message.matchAll(amountPattern)].map(match => parseFloat(match[1]));
      
      console.log('🔍 Regex found tokens:', tokens, 'amounts:', amounts);
      
      // Basic swap pattern detection
      if (tokens.length >= 2 && amounts.length >= 1) {
        const swapType = /\b(exact.*output|exactoutput)\b/i.test(message) ? 'exactOutput' : 'exactInput';
        
        const result = {
          fromToken: tokens[0],
          toToken: tokens[1], 
          amount: amounts[0],
          swapType
        };
        
        console.log('✅ Regex extracted swap arguments:', result);
        return result;
      }
      
      console.log('❌ Regex could not extract complete swap arguments');
      return {};
      
    } catch (error) {
      console.error('❌ Regex extraction error:', error);
      return {};
    }
  }

  /**
   * Extract portfolio information arguments from message using LLM
   */
  async extractPortfolioArguments(message, classification) {
    try {
      const actionType = classification.actionSubtype || 'balance';
      
      const systemPrompt = `Extract arguments for portfolio information request.

PORTFOLIO REQUEST TYPES:
- balance: General portfolio balance ("my balance", "my portfolio", "my wallet")
- token-balance: Specific token balance ("my TON balance", "how much DUCK", "BTC holdings")
- portfolio-summary: Portfolio analytics ("portfolio performance", "holdings summary", "gains/losses")

EXTRACTION RULES:
- For token-balance: Extract the specific token symbol in UPPERCASE
- For balance: No specific token needed (full portfolio)
- For portfolio-summary: Extract any timeframe or specific request

Examples:
"check my balance" → {"requestType": "balance"}
"what's my TON balance" → {"requestType": "token-balance", "token": "TON"}
"how much DUCK do I have" → {"requestType": "token-balance", "token": "DUCK"}
"show my portfolio performance" → {"requestType": "portfolio-summary"}
"my holdings from last month" → {"requestType": "portfolio-summary", "timeframe": "last month"}

Respond with JSON: {"args": {extracted_arguments}}`;

      const response = await this.together.chat.completions.create({
        model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract portfolio arguments from: "${message}"` }
        ],
        max_tokens: 200,
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const extracted = JSON.parse(response.choices[0].message.content);
      console.log(`🤖 LLM extracted portfolio arguments for ${actionType}:`, JSON.stringify(extracted.args, null, 2));
      
      return {
        type: 'portfolio-information',
        actionType,
        args: extracted.args || {},
        originalMessage: message
      };

    } catch (error) {
      console.error('Portfolio argument extraction error:', error);
      return { 
        type: 'portfolio-information',
        actionType: classification.actionSubtype || 'balance',
        args: {},
        originalMessage: message
      };
    }
  }

  /**
   * Build extraction prompt based on action type
   */
  buildExtractionPrompt(actionType) {
    const extractionRules = {
      transfer: {
        args: ['recipient', 'amount', 'tokenId'],
        examples: [
          'send 100 HBAR to Samir → {"recipient": "Samir", "amount": 100, "tokenId": "HBAR"}',
          'transfer 50 USDC to 0.0.1234 → {"recipient": "0.0.1234", "amount": 50, "tokenId": "USDC"}'
        ]
      },
      swap: {
        args: ['fromToken', 'toToken', 'amount', 'swapType'],
        examples: [
          'swap 100 HBAR for USDC → {"fromToken": "HBAR", "toToken": "USDC", "amount": 100, "swapType": "exactInput"}',
          'exchange SAUCE to USDT → {"fromToken": "SAUCE", "toToken": "USDT", "swapType": "exactInput"}',
          'swap 1 hbar to sauce → {"fromToken": "HBAR", "toToken": "SAUCE", "amount": 1, "swapType": "exactInput"}',
          'trade 50 usdc for sauce → {"fromToken": "USDC", "toToken": "SAUCE", "amount": 50, "swapType": "exactInput"}'
        ]
      },
      stake: {
        args: ['amount', 'tokenId', 'validator'],
        examples: [
          'stake 1000 HBAR → {"amount": 1000, "tokenId": "HBAR"}',
          'delegate to validator 0.0.800 → {"validator": "0.0.800"}'
        ]
      },
      createAgent: {
        args: ['name', 'description', 'strategy'],
        examples: [
          'create trading agent called "DCA Bot" → {"name": "DCA Bot", "description": "trading agent"}',
          'make agent for arbitrage → {"description": "arbitrage", "strategy": "arbitrage"}'
        ]
      },
      associateToken: {
        args: ['tokenId'],
        examples: [
          'associate token 0.0.123456 → {"tokenId": "0.0.123456"}',
          'associate USDC → {"tokenId": "USDC"}'
        ]
      },
      createTopic: {
        args: ['memo', 'submitKey'],
        examples: [
          'create topic for alerts → {"memo": "alerts"}',
          'make new topic "price updates" → {"memo": "price updates"}'
        ]
      },
      sendMessage: {
        args: ['topicId', 'message'],
        examples: [
          'send "hello" to topic 0.0.456 → {"topicId": "0.0.456", "message": "hello"}',
          'publish message to topic → {"message": "publish message"}'
        ]
      },
      balance: {
        args: [],
        examples: [
          'show my balance → {}',
          'get my portfolio → {}',
          'check my wallet → {}',
          'what tokens do I have → {}'
        ]
      }
    };

    const rules = extractionRules[actionType] || extractionRules.transfer;
    
    return `Extract arguments for ${actionType} action. Required arguments: ${rules.args.join(', ')}

Rules:
- Extract ONLY the specified arguments
- For names (like "Samir"), keep as-is (don't convert to addresses)
- For token symbols: NORMALIZE to UPPERCASE (hbar → HBAR, sauce → SAUCE, usdc → USDC)
- For amounts, extract as numbers
- For addresses (0.0.xxxxx), keep exact format
- For swapType: default to "exactInput" if not specified
- If argument not found, omit from result
- ALWAYS extract all available tokens and amounts from the message

Examples:
${rules.examples.join('\n')}

Respond with JSON: {"args": {extracted_arguments}}`;
  }

  /**
   * Extract pipeline actions from user prompts for workflow automation
   */
  async extractPipelineActions(message, classification) {
    if (!this.together) {
      return { 
        type: 'pipeline',
        pipeline: {
          trigger: null,
          actions: [],
          conditions: []
        },
        args: {},
        originalMessage: message
      };
    }

    try {
      const systemPrompt = `You are an advanced pipeline extraction AI for sophisticated crypto trading automation. Your task is to parse natural language descriptions of trading workflows and convert them into structured, executable pipeline definitions.

PIPELINE ARCHITECTURE:
- **trigger**: Primary event that initiates the workflow
- **conditions**: Logical conditions that must be met (can be complex boolean logic)
- **actions**: Ordered sequence of operations to execute
- **metadata**: Additional context (priority, execution mode, error handling)

TRIGGER TYPES & PARAMETERS:
- price_movement: {type, token, direction: "increase"/"decrease", percentage: number, timeframe?: string}
- price_target: {type, token, target_price: number, direction: "above"/"below", comparison_type?: "crosses"/"reaches"}
- balance_threshold: {type, threshold_amount: number, asset?: string, comparison: "above"/"below"}
- portfolio_value: {type, target_value: number, currency: "USD", comparison: "above"/"below"}
- time_based: {type, schedule: string, interval?: string}
- technical_indicator: {type, indicator: string, token: string, condition: string, value: number}

ACTION TYPES & PARAMETERS:
- buy: {type, token: string, amount: string|number, order_type?: "market"/"limit", price?: number}
- sell: {type, token: string, amount: string|number, order_type?: "market"/"limit", price?: number}
- swap: {type, from_token: string, to_token: string, amount: string|number, slippage?: number, dex?: string}
- transfer: {type, token?: string, amount: string|number, destination: string, memo?: string}
- stake: {type, token: string, amount?: string|number, validator?: string, duration?: string}
- unstake: {type, token: string, amount?: string|number}
- add_liquidity: {type, token_a: string, token_b: string, amount_a: number, amount_b?: number, pool?: string}
- remove_liquidity: {type, pool: string, percentage: number}
- notify: {type, message: string, channels?: string[]}

CONDITION LOGIC:
- Simple: single condition matching trigger
- Complex: multiple conditions with AND/OR logic
- Nested: conditions within conditions for advanced logic

ADVANCED EXAMPLES:

"when TON increases by 15% in 1 hour, buy $1000 worth of DUCK and immediately transfer 1% of my total balance to my cold wallet address 0x123..." →
{
  "trigger": {
    "type": "price_movement", 
    "token": "TON", 
    "direction": "increase", 
    "percentage": 15, 
    "timeframe": "1h"
  },
  "conditions": [
    {
      "type": "price_movement",
      "token": "TON", 
      "direction": "increase", 
      "percentage": 15,
      "timeframe": "1h"
    }
  ],
  "actions": [
    {
      "type": "buy",
      "token": "DUCK", 
      "amount": 1000,
      "denomination": "USD",
      "order_type": "market"
    },
    {
      "type": "transfer",
      "amount": "1%",
      "source": "total_balance",
      "destination": "0x123...",
      "execution": "immediate"
    }
  ],
  "metadata": {
    "priority": "high",
    "execution_mode": "sequential"
  }
}

"if SEI drops below $0.45 then swap ALL my USDC for SEI, stake 80% of it, and send me a notification" →
{
  "trigger": {
    "type": "price_target",
    "token": "SEI",
    "target_price": 0.45,
    "direction": "below",
    "comparison_type": "crosses"
  },
  "conditions": [
    {
      "type": "price_target",
      "token": "SEI",
      "target_price": 0.45,
      "direction": "below"
    }
  ],
  "actions": [
    {
      "type": "swap",
      "from_token": "USDC",
      "to_token": "SEI",
      "amount": "all"
    },
    {
      "type": "stake",
      "token": "SEI",
      "amount": "80%"
    },
    {
      "type": "notify",
      "message": "SEI pipeline executed: swapped USDC and staked 80%"
    }
  ],
  "metadata": {
    "priority": "medium",
    "execution_mode": "sequential"
  }
}

EXTRACTION RULES:
- Preserve exact token symbols and amounts as specified
- Identify percentage vs. absolute amounts
- Extract precise trigger conditions and thresholds
- Maintain action sequence order
- Include error handling preferences if mentioned
- Capture time-sensitive elements
- Identify wallet addresses, validator addresses, etc.

Extract the complete pipeline structure and respond with JSON:
{
  "pipeline": {
    "trigger": {trigger_object_with_all_parameters},
    "conditions": [{condition_objects_with_logic}],
    "actions": [{action_objects_with_full_parameters}],
    "metadata": {metadata_object}
  }
}`;

      const response = await this.together.chat.completions.create({
        model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract pipeline from: "${message}"` }
        ],
        max_tokens: 800,
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const extracted = JSON.parse(response.choices[0].message.content);
      console.log('🤖 LLM extracted pipeline:', JSON.stringify(extracted.pipeline, null, 2));
      
      return {
        type: 'pipeline',
        pipeline: extracted.pipeline || {
          trigger: null,
          actions: [],
          conditions: []
        },
        args: extracted.pipeline || {},
        originalMessage: message
      };

    } catch (error) {
      console.error('Pipeline extraction error:', error);
      return { 
        type: 'pipeline',
        pipeline: {
          trigger: null,
          actions: [],
          conditions: []
        },
        args: {},
        originalMessage: message,
        error: error.message
      };
    }
  }

  /**
   * Validate arguments and resolve contacts/tokens
   */
  validateAndResolveArguments(extraction) {
    if (!extraction.args) {
      return { isValid: true, missing: [], resolved: {} };
    }

    // Handle pipeline type extractions
    if (extraction.type === 'pipeline') {
      return this.validatePipelineExtraction(extraction);
    }

    // Handle portfolio-information type extractions
    if (extraction.type === 'portfolio-information') {
      return this.validatePortfolioExtraction(extraction);
    }

    const actionType = extraction.actionType;
    return this.contactsTokensService.validateActionArguments(actionType, extraction.args);
  }

  /**
   * Validate portfolio information extraction
   */
  validatePortfolioExtraction(extraction) {
    const missing = [];
    const resolved = {};
    const warnings = [];

    // Portfolio information requests are generally valid
    // We'll validate specific tokens if provided
    if (extraction.args.token) {
      // Validate that the token exists in our system
      const supportedTokens = ['TON', 'DUCK', 'USDT', 'BTC', 'ETH']; // Add more as needed
      if (!supportedTokens.includes(extraction.args.token.toUpperCase())) {
        warnings.push(`Token ${extraction.args.token} may not be supported`);
      }
      resolved.token = extraction.args.token.toUpperCase();
    }

    if (extraction.args.requestType) {
      resolved.requestType = extraction.args.requestType;
    }

    if (extraction.args.timeframe) {
      resolved.timeframe = extraction.args.timeframe;
    }

    const isValid = missing.length === 0;

    console.log(`🔍 Portfolio validation: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    if (warnings.length > 0) {
      console.log('⚠️ Warnings:', warnings);
    }

    return {
      isValid,
      missing,
      resolved,
      warnings,
      errors: [],
      quality: 95 // Portfolio requests are generally high quality
    };
  }

  /**
   * Validate pipeline extraction with sophisticated checks
   */
  validatePipelineExtraction(extraction) {
    if (!extraction.pipeline) {
      return { 
        isValid: false, 
        missing: ['pipeline_structure'], 
        resolved: {},
        errors: ['No pipeline structure found in extraction']
      };
    }

    const { trigger, actions, conditions, metadata } = extraction.pipeline;
    const missing = [];
    const resolved = {};
    const errors = [];
    const warnings = [];

    // Validate trigger with detailed checks
    if (!trigger) {
      missing.push('trigger');
      errors.push('No trigger defined for pipeline');
    } else if (!trigger.type) {
      missing.push('trigger_type');
      errors.push('Trigger missing required type field');
    } else {
      // Validate specific trigger types
      const triggerValidation = this.validateTriggerStructure(trigger);
      if (triggerValidation.isValid) {
        resolved.trigger = trigger;
      } else {
        errors.push(...triggerValidation.errors);
        warnings.push(...triggerValidation.warnings);
      }
    }

    // Validate actions with comprehensive checks
    if (!actions || actions.length === 0) {
      missing.push('actions');
      errors.push('Pipeline must have at least one action');
    } else {
      const actionValidation = this.validateActionsStructure(actions);
      if (actionValidation.validActions.length > 0) {
        resolved.actions = actionValidation.validActions;
      }
      errors.push(...actionValidation.errors);
      warnings.push(...actionValidation.warnings);
    }

    // Validate conditions (optional but if present should be valid)
    if (conditions && conditions.length > 0) {
      const conditionValidation = this.validateConditionsStructure(conditions);
      if (conditionValidation.isValid) {
        resolved.conditions = conditions;
      } else {
        warnings.push(...conditionValidation.warnings);
      }
    }

    // Validate metadata (optional)
    if (metadata) {
      resolved.metadata = metadata;
    }

    // Check for logical consistency
    const consistencyCheck = this.validatePipelineConsistency(resolved);
    warnings.push(...consistencyCheck.warnings);

    const isValid = missing.length === 0 && errors.length === 0;
    
    console.log(`🔍 Advanced pipeline validation: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    if (!isValid) {
      console.log('❌ Missing elements:', missing);
      console.log('❌ Errors:', errors);
    }
    if (warnings.length > 0) {
      console.log('⚠️ Warnings:', warnings);
    }

    return {
      isValid,
      missing,
      resolved,
      errors,
      warnings,
      pipelineType: 'advanced_workflow',
      quality: this.assessPipelineQuality(resolved, errors, warnings)
    };
  }

  /**
   * Validate trigger structure based on type
   */
  validateTriggerStructure(trigger) {
    const errors = [];
    const warnings = [];

    const triggerValidators = {
      price_movement: (t) => {
        if (!t.token) errors.push('Price movement trigger missing token');
        if (!t.direction || !['increase', 'decrease'].includes(t.direction)) 
          errors.push('Price movement trigger needs valid direction (increase/decrease)');
        if (t.percentage === undefined) errors.push('Price movement trigger missing percentage');
        if (t.percentage && (t.percentage <= 0 || t.percentage > 1000)) 
          warnings.push('Price movement percentage seems unusual');
      },
      
      price_target: (t) => {
        if (!t.token) errors.push('Price target trigger missing token');
        if (t.target_price === undefined) errors.push('Price target trigger missing target_price');
        if (!t.direction || !['above', 'below'].includes(t.direction)) 
          errors.push('Price target trigger needs valid direction (above/below)');
        if (t.target_price && t.target_price <= 0) warnings.push('Target price should be positive');
      },
      
      balance_threshold: (t) => {
        if (t.threshold_amount === undefined) errors.push('Balance threshold trigger missing threshold_amount');
        if (!t.comparison || !['above', 'below'].includes(t.comparison)) 
          errors.push('Balance threshold trigger needs valid comparison (above/below)');
        if (t.threshold_amount && t.threshold_amount <= 0) warnings.push('Threshold amount should be positive');
      },

      portfolio_value: (t) => {
        if (t.target_value === undefined) errors.push('Portfolio value trigger missing target_value');
        if (!t.currency) warnings.push('Portfolio value trigger should specify currency');
        if (!t.comparison || !['above', 'below'].includes(t.comparison)) 
          errors.push('Portfolio value trigger needs valid comparison (above/below)');
      }
    };

    const validator = triggerValidators[trigger.type];
    if (validator) {
      validator(trigger);
    } else {
      warnings.push(`Unknown trigger type: ${trigger.type}`);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate actions structure
   */
  validateActionsStructure(actions) {
    const validActions = [];
    const errors = [];
    const warnings = [];

    const actionValidators = {
      buy: (a, i) => {
        if (!a.token) errors.push(`Action ${i}: Buy action missing token`);
        if (a.amount === undefined) errors.push(`Action ${i}: Buy action missing amount`);
        if (a.amount && typeof a.amount === 'string' && !['all', 'max'].includes(a.amount.toLowerCase()) && !a.amount.includes('%')) {
          warnings.push(`Action ${i}: Buy amount format may need clarification`);
        }
      },

      sell: (a, i) => {
        if (!a.token) errors.push(`Action ${i}: Sell action missing token`);
        if (a.amount === undefined) errors.push(`Action ${i}: Sell action missing amount`);
      },

      swap: (a, i) => {
        if (!a.from_token) errors.push(`Action ${i}: Swap action missing from_token`);
        if (!a.to_token) errors.push(`Action ${i}: Swap action missing to_token`);
        if (a.amount === undefined) errors.push(`Action ${i}: Swap action missing amount`);
        if (a.from_token === a.to_token) errors.push(`Action ${i}: Cannot swap token with itself`);
      },

      transfer: (a, i) => {
        if (a.amount === undefined) errors.push(`Action ${i}: Transfer action missing amount`);
        if (!a.destination) errors.push(`Action ${i}: Transfer action missing destination`);
        if (a.destination && !this.isValidAddress(a.destination)) {
          warnings.push(`Action ${i}: Transfer destination address format should be verified`);
        }
      },

      stake: (a, i) => {
        if (!a.token) errors.push(`Action ${i}: Stake action missing token`);
        if (a.amount && typeof a.amount === 'string' && !a.amount.includes('%') && !['all', 'max'].includes(a.amount.toLowerCase())) {
          warnings.push(`Action ${i}: Stake amount format may need clarification`);
        }
      }
    };

    actions.forEach((action, index) => {
      if (!action.type) {
        errors.push(`Action ${index}: Missing action type`);
        return;
      }

      const validator = actionValidators[action.type];
      if (validator) {
        validator(action, index);
        validActions.push(action);
      } else {
        warnings.push(`Action ${index}: Unknown action type: ${action.type}`);
        validActions.push(action); // Include unknown actions but warn
      }
    });

    return { validActions, errors, warnings };
  }

  /**
   * Validate conditions structure
   */
  validateConditionsStructure(conditions) {
    const warnings = [];
    
    conditions.forEach((condition, index) => {
      if (!condition.type) {
        warnings.push(`Condition ${index}: Missing condition type`);
      }
    });

    return { isValid: true, warnings };
  }

  /**
   * Validate pipeline logical consistency
   */
  validatePipelineConsistency(resolved) {
    const warnings = [];

    // Check if trigger and conditions are consistent
    if (resolved.trigger && resolved.conditions) {
      const triggerType = resolved.trigger.type;
      const hasMatchingCondition = resolved.conditions.some(c => c.type === triggerType || 
        (triggerType === 'price_movement' && c.type === 'price_increase') ||
        (triggerType === 'price_movement' && c.type === 'price_decrease'));
      
      if (!hasMatchingCondition) {
        warnings.push('Trigger and conditions may not be logically consistent');
      }
    }

    // Check for potential action conflicts
    if (resolved.actions && resolved.actions.length > 1) {
      const tokenActions = {};
      resolved.actions.forEach((action, index) => {
        if (action.token) {
          if (!tokenActions[action.token]) tokenActions[action.token] = [];
          tokenActions[action.token].push({ action: action.type, index });
        }
      });

      // Check for conflicting actions on same token
      Object.entries(tokenActions).forEach(([token, actionsOnToken]) => {
        if (actionsOnToken.length > 1) {
          const hasConflict = actionsOnToken.some(a => a.action === 'buy') && 
                             actionsOnToken.some(a => a.action === 'sell');
          if (hasConflict) {
            warnings.push(`Potential conflict: buying and selling ${token} in same pipeline`);
          }
        }
      });
    }

    return { warnings };
  }

  /**
   * Assess overall pipeline quality
   */
  assessPipelineQuality(resolved, errors, warnings) {
    let score = 100;
    
    // Deduct for errors and warnings
    score -= errors.length * 20;
    score -= warnings.length * 5;
    
    // Add points for completeness
    if (resolved.trigger) score += 10;
    if (resolved.actions && resolved.actions.length > 0) score += 10;
    if (resolved.conditions) score += 5;
    if (resolved.metadata) score += 5;
    
    // Add points for sophistication
    if (resolved.actions && resolved.actions.length > 1) score += 5;
    if (resolved.trigger && ['price_movement', 'technical_indicator'].includes(resolved.trigger.type)) score += 5;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Basic address validation (can be enhanced)
   */
  isValidAddress(address) {
    // Basic validation - can be enhanced with specific network validation
    return typeof address === 'string' && 
           (address.startsWith('0x') || address.includes('.') || address.match(/^[a-zA-Z0-9]+$/));
  }

  /**
   * Generate interactive UI data for missing arguments
   */
  generateInteractiveData(missingArgs, messageType) {
    if (!missingArgs || missingArgs.length === 0) {
      return null;
    }

    const interactiveComponents = [];

    for (const argName of missingArgs) {
      const component = this.createInteractiveComponent(argName);
      if (component) {
        interactiveComponents.push(component);
      }
    }

    return {
      type: 'argumentRequest',
      message: `I need more information to complete this action. Please provide:`,
      components: interactiveComponents,
      missingArgs
    };
  }

  /**
   * Create interactive component for specific argument
   */
  createInteractiveComponent(argName) {
    const componentMap = {
      recipient: {
        type: 'combobox',
        label: 'Select Recipient',
        placeholder: 'Choose a contact or enter address',
        options: this.contactsTokensService.getComboboxOptions('recipient'),
        allowCustom: true,
        validation: 'address'
      },
      amount: {
        type: 'input',
        inputType: 'number',
        label: 'Amount',
        placeholder: 'Enter amount',
        validation: 'positive_number'
      },
      fromToken: {
        type: 'combobox',
        label: 'From Token',
        placeholder: 'Select token to swap from',
        options: this.contactsTokensService.getComboboxOptions('fromToken', true), // Use testnet swap tokens
        allowCustom: false
      },
      toToken: {
        type: 'combobox', 
        label: 'To Token',
        placeholder: 'Select token to swap to',
        options: this.contactsTokensService.getComboboxOptions('toToken', true), // Use testnet swap tokens
        allowCustom: false
      },
      tokenId: {
        type: 'combobox',
        label: 'Token',
        placeholder: 'Select token',
        options: this.contactsTokensService.getComboboxOptions('tokenId', true), // Use testnet swap tokens
        allowCustom: true,
        validation: 'token_id'
      },
      name: {
        type: 'input',
        inputType: 'text',
        label: 'Name',
        placeholder: 'Enter a name',
        validation: 'required'
      },
      description: {
        type: 'textarea',
        label: 'Description',
        placeholder: 'Enter description',
        rows: 3
      },
      memo: {
        type: 'input',
        inputType: 'text',
        label: 'Memo',
        placeholder: 'Enter memo for topic'
      },
      message: {
        type: 'textarea',
        label: 'Message',
        placeholder: 'Enter message to send',
        rows: 2
      },
      topicId: {
        type: 'input',
        inputType: 'text',
        label: 'Topic ID',
        placeholder: 'Enter topic ID (0.0.xxxxx)',
        validation: 'topic_id'
      }
    };

    return componentMap[argName] || {
      type: 'input',
      inputType: 'text',
      label: argName.charAt(0).toUpperCase() + argName.slice(1),
      placeholder: `Enter ${argName}`
    };
  }

  /**
   * Process user response to interactive components
   */
  async processInteractiveResponse(originalIntent, userResponses) {
    try {
      console.log('🔄 Processing interactive response:', userResponses);

      // Merge user responses with original arguments
      const mergedArgs = {
        ...originalIntent.extraction.args,
        ...userResponses
      };

      // For transfer actions, use Enhanced Transfer Service
      if (originalIntent.extraction.actionType === 'transfer') {
        console.log('🔄 Using Enhanced Transfer Service for interactive response');
        console.log('📋 Merged arguments:', mergedArgs);
        
        const EnhancedTransferService = require('./enhancedTransferService');
        const enhancedTransferService = new EnhancedTransferService();
        
        // Create resolved arguments object with all transfer parameters
        const resolvedArgs = {
          amount: mergedArgs.amount || originalIntent.extraction.args.amount,
          token: mergedArgs.tokenId || originalIntent.extraction.args.tokenId || 'SEI',
          recipient: mergedArgs.recipient || originalIntent.extraction.args.recipient
        };
        
        console.log('📝 Resolved arguments:', resolvedArgs);
        
        // Use direct argument processing instead of re-analyzing message
        const transferResult = await enhancedTransferService.processTransferWithArgs(
          resolvedArgs,
          originalIntent.userId || 'default-user'
        );
        
        return transferResult;
      }

      // For non-transfer actions, use the old validation system
      const validation = this.contactsTokensService.validateActionArguments(
        originalIntent.extraction.actionType,
        mergedArgs
      );

      // If still missing arguments, create new interactive request
      let newInteractiveData = null;
      if (!validation.isValid) {
        newInteractiveData = this.generateInteractiveData(
          validation.missing,
          originalIntent.classification.type
        );
      }

      return {
        ...originalIntent,
        extraction: {
          ...originalIntent.extraction,
          args: mergedArgs
        },
        validation,
        interactiveData: newInteractiveData,
        isComplete: validation.isValid,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Interactive response processing failed:', error);
      throw error;
    }
  }

  /**
   * Build a resolved message from original intent and user responses
   */
  buildResolvedMessage(originalIntent, mergedArgs) {
    const { actionType } = originalIntent.extraction;
    
    if (actionType === 'transfer') {
      const { amount, tokenId = 'SEI', recipient } = mergedArgs;
      return `send ${amount} ${tokenId} to ${recipient}`;
    }
    
    // For other actions, return original message
    return originalIntent.extraction.originalMessage;
  }

  /**
   * Fallback classification for when LLM is not available
   */
  fallbackClassification(message) {
    const lowerMessage = message.toLowerCase();
    
    // Advanced pipeline detection - look for complex patterns
    const pipelinePatterns = [
      // Conditional patterns
      /\b(when|if|whenever|as soon as|once)\b.*\b(then|do|execute|perform|buy|sell|swap|transfer|stake)\b/,
      /\b(after|following)\b.*\b(buy|sell|swap|transfer|stake)\b/,
      // Multi-action patterns  
      /\b(buy|sell|swap|transfer|stake)\b.*\band\s+(then\s+)?\b(buy|sell|swap|transfer|stake)\b/,
      // Automation patterns
      /\b(automate|automatically|set up|create workflow|pipeline)\b/,
      // Trigger patterns
      /\b(trigger|alert|notify)\b.*\b(when|if)\b/
    ];

    // Check for sophisticated pipeline patterns
    if (pipelinePatterns.some(pattern => pattern.test(lowerMessage))) {
      const confidence = this.calculatePipelineConfidence(lowerMessage);
      return {
        type: 'pipeline',
        actionSubtype: 'workflow',
        confidence: confidence,
        reasoning: 'Detected sophisticated pipeline patterns with conditional logic and multiple actions'
      };
    }
    
    // Simple pipeline keywords (lower confidence)
    const basicPipelineKeywords = ['when', 'if', 'then', 'whenever', 'trigger', 'automate'];
    const pipelineKeywordCount = basicPipelineKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
    if (pipelineKeywordCount >= 1) {
      const hasActions = ['buy', 'sell', 'swap', 'transfer', 'stake', 'send'].some(action => lowerMessage.includes(action));
      if (hasActions) {
        return {
          type: 'pipeline',
          actionSubtype: 'workflow',
          confidence: Math.min(0.9, 0.6 + (pipelineKeywordCount * 0.1)),
          reasoning: `Detected ${pipelineKeywordCount} pipeline keyword(s) with action words`
        };
      }
    }
    
    // Enhanced portfolio-information detection
    const portfolioPatterns = {
      balance: {
        patterns: [/\b(check|show|get|what('s|s)?)\b.*\b(balance|wallet|portfolio|holdings|funds)\b/,
                  /\bmy\s+(balance|wallet|portfolio|holdings|funds)\b/,
                  /\b(total|overall|complete)\s+(balance|portfolio|holdings)\b/],
        keywords: ['balance', 'wallet', 'portfolio', 'holdings', 'my funds']
      },
      'token-balance': {
        patterns: [/\b(check|show|get|what('s|s)?|how much)\b.*\b(TON|DUCK|USDT|BTC|ETH)\b.*\b(balance|do I have|holdings?)\b/,
                  /\bmy\s+(TON|DUCK|USDT|BTC|ETH)\s+(balance|holdings?)\b/],
        keywords: ['TON balance', 'DUCK balance', 'my TON', 'my DUCK']
      },
      'portfolio-summary': {
        patterns: [/\b(portfolio|holdings?)\s+(performance|summary|analytics|overview|stats)\b/,
                  /\b(show|get)\s+(portfolio|holdings?)\s+(summary|overview|stats)\b/],
        keywords: ['portfolio performance', 'portfolio summary', 'holdings summary']
      }
    };

    // Check for portfolio-information patterns first (higher priority than actions)
    for (const [portfolioType, config] of Object.entries(portfolioPatterns)) {
      // Check pattern matches first (higher confidence)
      if (config.patterns && config.patterns.some(pattern => pattern.test(lowerMessage))) {
        return {
          type: 'portfolio-information',
          actionSubtype: portfolioType,
          confidence: 0.90,
          reasoning: `Matched ${portfolioType} portfolio pattern with context`
        };
      }
      
      // Fallback to keyword matching (lower confidence)
      if (config.keywords.some(keyword => lowerMessage.includes(keyword))) {
        return {
          type: 'portfolio-information',
          actionSubtype: portfolioType,
          confidence: 0.75,
          reasoning: `Detected ${portfolioType} portfolio keywords`
        };
      }
    }

    // Enhanced action detection with context
    const actionPatterns = {
      transfer: {
        patterns: [/\b(send|transfer|pay)\b.*\b(to|tokens?|coins?)\b/],
        keywords: ['send', 'transfer', 'pay']
      },
      swap: {
        patterns: [/\b(swap|exchange|trade|convert)\b.*\b(for|to|tokens?)\b/],
        keywords: ['swap', 'exchange', 'trade', 'convert']
      },
      stake: {
        patterns: [/\b(stake|delegate)\b.*\b(tokens?|coins?|rewards?)\b/],
        keywords: ['stake', 'delegate']
      }
    };

    // Check for action patterns with higher confidence
    for (const [actionType, config] of Object.entries(actionPatterns)) {
      // Check pattern matches first (higher confidence)
      if (config.patterns && config.patterns.some(pattern => pattern.test(lowerMessage))) {
        return {
          type: 'actions',
          actionSubtype: actionType,
          confidence: 0.85,
          reasoning: `Matched ${actionType} pattern with context`
        };
      }
      
      // Fallback to keyword matching (lower confidence)
      if (config.keywords.some(keyword => lowerMessage.includes(keyword))) {
        return {
          type: 'actions',
          actionSubtype: actionType,
          confidence: 0.65,
          reasoning: `Detected ${actionType} keywords`
        };
      }
    }

    // Strategy detection
    const strategyKeywords = ['strategy', 'plan', 'invest', 'portfolio', 'dca', 'dollar cost averaging', 'long term', 'allocation'];
    if (strategyKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return {
        type: 'strategy',
        actionSubtype: 'other',
        confidence: 0.7,
        reasoning: 'Detected strategy-related keywords'
      };
    }

    // Information request detection
    const informationKeywords = ['what', 'how', 'why', 'explain', 'tell me', 'price of', 'market', 'analysis'];
    if (informationKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return {
        type: 'information',
        actionSubtype: 'other', 
        confidence: 0.6,
        reasoning: 'Detected information request keywords'
      };
    }

    return {
      type: 'information',
      confidence: 0.3,
      reasoning: 'No clear patterns detected, defaulting to information request'
    };
  }

  /**
   * Calculate pipeline confidence based on complexity indicators
   */
  calculatePipelineConfidence(message) {
    let confidence = 0.7; // Base confidence
    
    // Increase confidence for conditional words
    const conditionalWords = ['when', 'if', 'whenever', 'as soon as', 'after', 'once'];
    const conditionalCount = conditionalWords.filter(word => message.includes(word)).length;
    confidence += Math.min(0.2, conditionalCount * 0.05);
    
    // Increase confidence for action words
    const actionWords = ['buy', 'sell', 'swap', 'transfer', 'stake', 'send'];
    const actionCount = actionWords.filter(word => message.includes(word)).length;
    confidence += Math.min(0.15, actionCount * 0.05);
    
    // Increase confidence for logical connectors
    const connectors = ['then', 'and', 'after that', 'followed by'];
    const connectorCount = connectors.filter(word => message.includes(word)).length;
    confidence += Math.min(0.1, connectorCount * 0.05);
    
    // Increase confidence for specific amounts/percentages
    const hasPercentage = /%|\bpercent\b/.test(message);
    const hasAmount = /\$?\d+/.test(message);
    if (hasPercentage) confidence += 0.05;
    if (hasAmount) confidence += 0.05;
    
    return Math.min(0.95, confidence); // Cap at 0.95 for fallback
  }

  /**
   * Get contacts and tokens for frontend
   */
  getContactsAndTokensData() {
    return {
      contacts: this.contactsTokensService.getContactsByCategory(),
      tokens: this.contactsTokensService.getTokensByCategory(true), // Use testnet swap tokens
      allContacts: this.contactsTokensService.getAllContacts(),
      allTokens: this.contactsTokensService.getAllTokens(true) // Use testnet swap tokens
    };
  }
}

module.exports = EnhancedIntentService;
