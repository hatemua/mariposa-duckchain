const Together = require('together-ai').default;
const duckSwapService = require('./duckSwapService');
const Agent = require('../models/Agent');

// Initialize Together AI for swap intent processing
let together;
try {
  together = new Together({
    apiKey: process.env.TOGETHER_API_KEY || 'dummy-key'
  });
} catch (error) {
  console.warn('Together AI not initialized for enhanced swap intent service.');
  together = null;
}

class EnhancedSwapIntentService {
  constructor() {
    this.supportedTokens = ['WTON', 'DUCK', 'TON'];
    this.swapService = duckSwapService;
  }

  /**
   * Process swap intent from natural language
   */
  async processSwapIntent(message, userId, preExtractedArgs = null) {
    try {
      console.log('🔄 Processing swap intent:', message);

      let swapArgs;
      
      if (preExtractedArgs && preExtractedArgs.fromToken && preExtractedArgs.toToken && preExtractedArgs.amount) {
        // Use pre-extracted arguments if they are complete
        console.log('📊 Using pre-extracted arguments:', preExtractedArgs);
        swapArgs = preExtractedArgs;
      } else {
        // Extract swap arguments using AI
        swapArgs = await this.extractSwapArguments(message);
        console.log('📊 Extracted swap arguments:', swapArgs);
      }

      // Validate arguments only if they weren't pre-validated
      if (!preExtractedArgs || !preExtractedArgs.fromToken || !preExtractedArgs.toToken || !preExtractedArgs.amount) {
        const validation = await this.validateSwapArguments(swapArgs, userId);
        
        if (!validation.isValid) {
          return {
            success: false,
            type: 'argumentRequest',
            data: {
              intent: {
                type: 'action',
                subtype: 'swap',
                originalMessage: message,
                extractedArgs: swapArgs,
                missingArguments: validation.missing,
                message: 'I need more information to complete this swap.'
              },
              interactiveData: {
                type: 'argumentRequest',
                message: 'I need more information to complete this swap. Please provide:',
                components: this.generateSwapInteractiveComponents(validation.missing),
                missingArgs: validation.missing
              }
            }
          };
        }
      }

      // Check if user has sufficient balance
      const balanceCheck = await this.checkSwapBalance(userId, swapArgs.fromToken, swapArgs.amount);
      
      if (!balanceCheck.success) {
        if (balanceCheck.reason === 'insufficient_funds') {
          return {
            success: false,
            type: 'swap',
            data: {
              status: 'insufficient_funds',
              currentBalance: balanceCheck.currentBalance,
              requiredAmount: swapArgs.amount,
              shortfall: swapArgs.amount - balanceCheck.currentBalance,
              token: swapArgs.fromToken,
              walletAddress: balanceCheck.walletAddress,
              swapDetails: swapArgs,
              requiresFunding: true
            }
          };
        } else {
          return {
            success: false,
            type: 'swap',
            data: {
              status: 'balance_check_failed',
              error: balanceCheck.error
            }
          };
        }
      }

      // Check token allowance and auto-approve if needed
      const allowanceCheck = await this.swapService.checkAllowance(userId, swapArgs.fromToken, swapArgs.amount);
      
      if (allowanceCheck.needsApproval) {
        console.log(`🔐 Token approval needed for ${swapArgs.fromToken}, auto-approving...`);
        
        try {
          // Automatically approve token spending
          const approvalResult = await this.swapService.approveToken(userId, swapArgs.fromToken, swapArgs.amount);
          
          if (!approvalResult.success) {
            return {
              success: false,
              type: 'swap',
              data: {
                status: 'approval_failed',
                token: swapArgs.fromToken,
                amount: swapArgs.amount,
                error: approvalResult.error,
                swapDetails: swapArgs
              }
            };
          }
          
          console.log(`✅ Token ${swapArgs.fromToken} approved successfully`);
          
        } catch (approvalError) {
          console.error('❌ Auto-approval failed:', approvalError);
          return {
            success: false,
            type: 'swap',
            data: {
              status: 'approval_failed',
              token: swapArgs.fromToken,
              amount: swapArgs.amount,
              error: approvalError.message,
              swapDetails: swapArgs
            }
          };
        }
      }

      // Get swap quote
      const quote = await this.swapService.getSwapQuote(
        swapArgs.fromToken,
        swapArgs.toToken,
        swapArgs.amount,
        swapArgs.slippage || 0.5
      );

      // Execute the swap
      const swapResult = await this.swapService.executeSwap(
        userId,
        swapArgs.fromToken,
        swapArgs.toToken,
        swapArgs.amount,
        swapArgs.slippage || 0.5
      );

      if (swapResult.transactionHash) {
        const isSuccess = swapResult.transactionStatus === 'success';
        return {
          success: true,
          type: 'swap',
          data: {
            status: isSuccess ? 'executed' : 'reverted',
            swapDetails: {
              from: { token: swapArgs.fromToken, amount: swapArgs.amount },
              to: { token: swapArgs.toToken, estimatedAmount: quote.toToken.estimatedAmount },
              slippage: swapArgs.slippage || 0.5,
              quote: quote
            },
            transactionHash: swapResult.transactionHash,
            transactionStatus: swapResult.transactionStatus,
            executionResult: swapResult,
            balances: swapResult.balances,
            message: isSuccess 
              ? `✅ Successfully swapped ${swapArgs.amount} ${swapArgs.fromToken} for ${swapArgs.toToken}!`
              : `⚠️ Swap transaction submitted but reverted: ${swapArgs.amount} ${swapArgs.fromToken} → ${swapArgs.toToken}`
          }
        };
      } else {
        return {
          success: false,
          type: 'swap',
          data: {
            status: 'execution_failed',
            error: swapResult.error,
            swapDetails: swapArgs
          }
        };
      }

    } catch (error) {
      console.error('❌ Swap intent processing error:', error);
      return {
        success: false,
        type: 'swap',
        data: {
          status: 'processing_failed',
          error: error.message
        }
      };
    }
  }

  /**
   * Extract swap arguments from natural language using AI
   */
  async extractSwapArguments(message) {
    if (!together) {
      // Fallback pattern matching if AI is not available
      return this.extractSwapArgumentsWithRegex(message);
    }

    try {
      const prompt = `
Extract swap parameters from this message: "${message}"

Available tokens: WTON, DUCK, TON
Return ONLY a JSON object with these fields:
{
  "fromToken": "source token symbol (WTON/DUCK/TON)",
  "toToken": "destination token symbol (WTON/DUCK/TON)", 
  "amount": "numeric amount to swap",
  "slippage": "slippage tolerance percentage (default 0.5)",
  "isExactOutput": false
}

Examples:
"Swap 100 WTON for DUCK" -> {"fromToken": "WTON", "toToken": "DUCK", "amount": 100, "slippage": 0.5, "isExactOutput": false}
"Exchange 50 DUCK to WTON with 1% slippage" -> {"fromToken": "DUCK", "toToken": "WTON", "amount": 50, "slippage": 1.0, "isExactOutput": false}
"Convert my WTON to DUCK" -> {"fromToken": "WTON", "toToken": "DUCK", "amount": null, "slippage": 0.5, "isExactOutput": false}

If any parameter is unclear or missing, set it to null.
`;

      const response = await together.completions.create({
        model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
        prompt: prompt,
        max_tokens: 200,
        temperature: 0.1,
        top_p: 0.9,
        top_k: 50,
        repetition_penalty: 1,
        stop: ["\n\n", "```"],
        stream: false,
      });

      let extractedText = response.choices[0].text.trim();
      
      // Clean up the response to extract just the JSON
      const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate and normalize the extracted data
        return {
          fromToken: parsed.fromToken?.toUpperCase() || null,
          toToken: parsed.toToken?.toUpperCase() || null,
          amount: parsed.amount ? parseFloat(parsed.amount) : null,
          slippage: parsed.slippage ? parseFloat(parsed.slippage) : 0.5,
          isExactOutput: parsed.isExactOutput || false
        };
      }
      
      throw new Error('Could not parse AI response');
      
    } catch (error) {
      console.error('AI extraction failed, falling back to regex:', error);
      return this.extractSwapArgumentsWithRegex(message);
    }
  }

  /**
   * Fallback regex-based argument extraction
   */
  extractSwapArgumentsWithRegex(message) {
    const msg = message.toLowerCase();
    
    // Extract amount and tokens
    const amountMatch = msg.match(/(\d+(?:\.\d+)?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : null;

    // Extract from token (first token mentioned)
    let fromToken = null;
    let toToken = null;
    
    const tokens = ['wton', 'duck', 'ton'];
    const foundTokens = [];
    
    for (const token of tokens) {
      if (msg.includes(token)) {
        foundTokens.push(token.toUpperCase());
      }
    }
    
    if (foundTokens.length >= 2) {
      fromToken = foundTokens[0];
      toToken = foundTokens[1];
    } else if (foundTokens.length === 1) {
      // Try to infer the other token
      if (msg.includes('to') || msg.includes('for')) {
        const tokenIndex = msg.indexOf(foundTokens[0].toLowerCase());
        const beforeToken = msg.substring(0, tokenIndex);
        const afterToken = msg.substring(tokenIndex);
        
        if (beforeToken.includes('from') || msg.indexOf(foundTokens[0].toLowerCase()) < msg.length / 2) {
          fromToken = foundTokens[0];
        } else {
          toToken = foundTokens[0];
        }
      }
    }

    // Extract slippage
    const slippageMatch = msg.match(/(\d+(?:\.\d+)?)%?\s*slippage/);
    const slippage = slippageMatch ? parseFloat(slippageMatch[1]) : 0.5;

    return {
      fromToken,
      toToken,
      amount,
      slippage,
      isExactOutput: false
    };
  }

  /**
   * Validate swap arguments
   */
  async validateSwapArguments(args, userId) {
    const missing = [];
    const errors = [];

    // Check required fields
    if (!args.fromToken) missing.push('fromToken');
    if (!args.toToken) missing.push('toToken');
    if (!args.amount || args.amount <= 0) missing.push('amount');

    // Validate token symbols
    if (args.fromToken && !this.supportedTokens.includes(args.fromToken)) {
      errors.push(`Unsupported source token: ${args.fromToken}`);
    }
    if (args.toToken && !this.supportedTokens.includes(args.toToken)) {
      errors.push(`Unsupported destination token: ${args.toToken}`);
    }

    // Check if tokens are different
    if (args.fromToken && args.toToken && args.fromToken === args.toToken) {
      errors.push('Source and destination tokens must be different');
    }

    // Validate slippage
    if (args.slippage && (args.slippage < 0.1 || args.slippage > 50)) {
      errors.push('Slippage must be between 0.1% and 50%');
    }

    return {
      isValid: missing.length === 0 && errors.length === 0,
      missing,
      errors,
      resolved: args
    };
  }

  /**
   * Check if user has sufficient balance for swap
   */
  async checkSwapBalance(userId, token, amount) {
    try {
      const agent = await Agent.findOne({ userId: userId, isActive: true });
      if (!agent || !agent.duckAddress) {
        return {
          success: false,
          reason: 'no_agent',
          error: 'No active agent found'
        };
      }

      const balance = await this.swapService.getTokenBalance(agent.duckAddress, this.swapService.getTokenAddress(token));
      const currentBalance = parseFloat(balance.balance);

      if (currentBalance < amount) {
        return {
          success: false,
          reason: 'insufficient_funds',
          currentBalance: currentBalance,
          requiredAmount: amount,
          shortfall: amount - currentBalance,
          walletAddress: agent.duckAddress,
          token: token
        };
      }

      return {
        success: true,
        currentBalance: currentBalance,
        walletAddress: agent.duckAddress
      };

    } catch (error) {
      console.error('Balance check error:', error);
      return {
        success: false,
        reason: 'check_error',
        error: error.message
      };
    }
  }

  /**
   * Generate interactive components for missing swap arguments
   */
  generateSwapInteractiveComponents(missingArgs) {
    const components = [];

    if (missingArgs.includes('fromToken')) {
      components.push({
        type: 'select',
        label: 'From Token',
        placeholder: 'Select token to swap from',
        options: this.supportedTokens.map(token => ({ value: token, label: token }))
      });
    }

    if (missingArgs.includes('toToken')) {
      components.push({
        type: 'select',
        label: 'To Token',
        placeholder: 'Select token to swap to',
        options: this.supportedTokens.map(token => ({ value: token, label: token }))
      });
    }

    if (missingArgs.includes('amount')) {
      components.push({
        type: 'input',
        inputType: 'numeric',
        label: 'Amount',
        placeholder: 'Enter amount to swap'
      });
    }

    components.push({
      type: 'input',
      inputType: 'numeric',
      label: 'Slippage Tolerance (%)',
      placeholder: '0.5',
      defaultValue: '0.5'
    });

    return components;
  }

  /**
   * Process approval for token spending
   */
  async processTokenApproval(userId, tokenSymbol, amount = null) {
    try {
      console.log('🔐 Processing token approval:', { userId, tokenSymbol, amount });
      
      const result = await this.swapService.approveToken(userId, tokenSymbol, amount);
      
      if (result.success) {
        return {
          success: true,
          type: 'approval',
          data: {
            status: 'approved',
            token: tokenSymbol,
            approvedAmount: result.approvedAmount,
            transactionHash: result.transactionHash,
            message: `✅ Successfully approved ${tokenSymbol} for swapping!`
          }
        };
      } else {
        return {
          success: false,
          type: 'approval',
          data: {
            status: 'approval_failed',
            error: result.error
          }
        };
      }
      
    } catch (error) {
      console.error('❌ Token approval error:', error);
      return {
        success: false,
        type: 'approval',
        data: {
          status: 'approval_failed',
          error: error.message
        }
      };
    }
  }
}

module.exports = new EnhancedSwapIntentService();