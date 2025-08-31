/**
 * Portfolio Controller
 * Handles DuckChain EVM portfolio balance and information requests
 * TON is native coin, DUCK is ERC-20 token
 */

const TonPortfolioService = require('../services/tonPortfolioService');
const duckAgentService = require('../services/duckAgentService');
const Agent = require('../models/Agent');
const User = require('../models/User');

class PortfolioController {
  constructor() {
    this.tonPortfolioService = new TonPortfolioService();
    
    // Default EVM wallet address for demo purposes (DuckChain)
    // In a real app, this would come from the user's authenticated session
    this.defaultWalletAddress = process.env.DEFAULT_DUCKCHAIN_WALLET || '0x742d35Cc6634C0532925a3b8D8C16e4000000000';
  }

  /**
   * Process portfolio information request
   * @param {Object} intentData - Processed intent from enhancedIntentService
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Portfolio response
   */
  async processPortfolioRequest(intentData, userId) {
    try {
      console.log('📊 Processing portfolio request:', intentData);

      const { actionSubtype } = intentData.classification;
      const { token, requestType } = intentData.validation.resolved || {};
      const walletAddress = await this.getUserWalletAddress(userId);

      let response = {};

      switch (actionSubtype) {
        case 'balance':
          response = await this.getCompleteBalance(walletAddress);
          break;
        case 'token-balance':
          response = await this.getSpecificTokenBalance(walletAddress, token);
          break;
        case 'portfolio-summary':
          response = await this.getPortfolioSummary(walletAddress);
          break;
        default:
          response = await this.getCompleteBalance(walletAddress);
      }

      // Format response for the mobile app
      return this.formatPortfolioResponse(response, actionSubtype, intentData);

    } catch (error) {
      console.error('❌ Error processing portfolio request:', error);
      return {
        success: false,
        type: 'portfolio-information',
        error: error.message,
        data: {
          message: `I'm having trouble accessing your portfolio right now. ${error.message}`,
          portfolioData: null
        }
      };
    }
  }

  /**
   * Get complete portfolio balance using DUCK agent
   * @param {string} walletAddress - Wallet address
   * @returns {Promise<Object>} Complete portfolio data
   */
  async getCompleteBalance(walletAddress) {
    try {
      // Find the DUCK agent by wallet address
      const agent = await Agent.findOne({ 
        duckAddress: walletAddress,
        isActive: true 
      });

      if (!agent) {
        console.log(`⚠️ No DUCK agent found for address ${walletAddress}, falling back to TON service`);
        const portfolio = await this.tonPortfolioService.getPortfolioBalance(walletAddress);
        return {
          ...portfolio,
          formattedSummary: this.createBalanceSummary(portfolio)
        };
      }

      // Use DUCK agent service to get balance
      console.log(`💰 Getting DUCK agent balance for agent: ${agent._id}`);
      const duckBalance = await duckAgentService.getAgentBalance(agent._id);
      
      // Transform DUCK balance to portfolio format
      const portfolio = this.transformDuckBalanceToPortfolio(duckBalance);
      
      // Create formatted summary
      const summary = {
        ...portfolio,
        formattedSummary: this.createBalanceSummary(portfolio)
      };

      return summary;

    } catch (error) {
      console.error('❌ Error getting DUCK agent balance:', error);
      throw error;
    }
  }

  /**
   * Transform DUCK agent balance to portfolio format
   * @param {Object} duckBalance - DUCK agent balance data
   * @returns {Object} Portfolio format
   */
  transformDuckBalanceToPortfolio(duckBalance) {
    const { duckBalance: nativeBalanceString, tokenBalances = [], address } = duckBalance;
    
    // Transform native TON balance (duckBalance is actually TON native coin)
    const transformedNativeBalance = {
      balanceFormatted: nativeBalanceString || '0',
      usdValue: 0, // TODO: Add USD value calculation
      address: address
    };

    // Transform token balances
    const transformedTokenBalances = tokenBalances.map(token => ({
      symbol: token.symbol || 'Unknown',
      balanceFormatted: token.balance || '0',
      usdValue: parseFloat(token.usdValue || '0'),
      usdPrice: parseFloat(token.usdPrice || '0'),
      contractAddress: token.contractAddress || ''
    }));

    // Calculate total USD value
    const totalUsdValue = transformedNativeBalance.usdValue + 
      transformedTokenBalances.reduce((sum, token) => sum + token.usdValue, 0);

    return {
      nativeBalance: transformedNativeBalance,
      tokenBalances: transformedTokenBalances,
      totalUsdValue,
      address,
      network: 'DUCK'
    };
  }

  /**
   * Get specific token balance
   * @param {string} walletAddress - Wallet address
   * @param {string} tokenSymbol - Token symbol
   * @returns {Promise<Object>} Token balance data
   */
  async getSpecificTokenBalance(walletAddress, tokenSymbol) {
    const tokenBalance = await this.tonPortfolioService.getTokenBalance(walletAddress, tokenSymbol);
    
    return {
      tokenBalance,
      formattedSummary: this.createTokenBalanceSummary(tokenBalance)
    };
  }

  /**
   * Get portfolio summary with analytics
   * @param {string} walletAddress - Wallet address
   * @returns {Promise<Object>} Portfolio summary with analytics
   */
  async getPortfolioSummary(walletAddress) {
    const summary = await this.tonPortfolioService.getPortfolioSummary(walletAddress);
    
    return {
      ...summary,
      formattedSummary: this.createAnalyticsSummary(summary)
    };
  }

  /**
   * Create formatted balance summary message
   * @param {Object} portfolio - Portfolio data
   * @returns {string} Formatted summary
   */
  createBalanceSummary(portfolio) {
    const { nativeBalance, tokenBalances, totalUsdValue, network } = portfolio;

    let summary = `💰 **Your Portfolio Balance**\n\n`;
    summary += `**Total Value:** $${totalUsdValue.toFixed(2)}\n\n`;

    // Native balance - show DUCK or TON based on network
    if (parseFloat(nativeBalance.balanceFormatted) > 0) {
      const nativeSymbol = network === 'DUCK' ? 'DUCK' : 'TON';
      const nativeEmoji = network === 'DUCK' ? '🦆' : '🪙';
      summary += `${nativeEmoji} **${nativeSymbol}:** ${nativeBalance.balanceFormatted} ${nativeSymbol}`;
      if (nativeBalance.usdValue > 0) {
        summary += ` ($${nativeBalance.usdValue.toFixed(2)})`;
      }
      summary += `\n`;
    }

    // Token balances
    if (tokenBalances.length > 0) {
      summary += `\n**Token Holdings:**\n`;
      tokenBalances.forEach(token => {
        if (parseFloat(token.balanceFormatted) > 0) {
          summary += `• **${token.symbol}:** ${token.balanceFormatted}`;
          if (token.usdValue > 0) {
            summary += ` ($${token.usdValue.toFixed(2)})`;
          }
          summary += `\n`;
        }
      });
    }

    if (totalUsdValue === 0) {
      const nativeSymbol = network === 'DUCK' ? 'DUCK' : 'TON';
      summary = `📭 Your wallet appears to be empty. No ${nativeSymbol} or tokens found.`;
    }

    return summary;
  }

  /**
   * Create formatted token balance summary
   * @param {Object} tokenBalance - Token balance data
   * @returns {string} Formatted summary
   */
  createTokenBalanceSummary(tokenBalance) {
    const { symbol, balanceFormatted, usdValue, usdPrice } = tokenBalance;

    if (parseFloat(balanceFormatted) === 0) {
      return `📭 You don't have any ${symbol} tokens in your wallet.`;
    }

    let summary = `💎 **Your ${symbol} Balance**\n\n`;
    summary += `**Amount:** ${balanceFormatted} ${symbol}\n`;
    
    if (usdPrice > 0) {
      summary += `**Current Price:** $${usdPrice.toFixed(4)}\n`;
      summary += `**USD Value:** $${usdValue.toFixed(2)}\n`;
    }

    return summary;
  }

  /**
   * Create formatted analytics summary
   * @param {Object} summary - Portfolio summary with analytics
   * @returns {string} Formatted analytics
   */
  createAnalyticsSummary(summary) {
    const { analytics, totalUsdValue, nativeBalance, tokenBalances } = summary;

    let formattedSummary = `📈 **Portfolio Analytics**\n\n`;
    formattedSummary += `**Total Value:** $${totalUsdValue.toFixed(2)}\n`;
    formattedSummary += `**Holdings Count:** ${analytics.tokenCount} assets\n\n`;

    // Largest holding
    if (analytics.largestHolding && analytics.largestHolding.usdValue > 0) {
      const percentage = ((analytics.largestHolding.usdValue / totalUsdValue) * 100).toFixed(1);
      formattedSummary += `**Largest Holding:** ${analytics.largestHolding.symbol} (${percentage}%)\n`;
    }

    // Diversification
    if (analytics.diversification) {
      const diversificationStatus = analytics.diversification.isWellDiversified 
        ? "Well diversified 🎯" 
        : "Consider diversifying 📊";
      formattedSummary += `**Diversification:** ${diversificationStatus}\n`;
    }

    // Daily performance
    if (analytics.totalGainLoss24h !== undefined) {
      const gainLossSign = analytics.totalGainLoss24h >= 0 ? '+' : '';
      const gainLossEmoji = analytics.totalGainLoss24h >= 0 ? '📈' : '📉';
      formattedSummary += `**24h Change:** ${gainLossSign}$${analytics.totalGainLoss24h.toFixed(2)} ${gainLossEmoji}\n`;
    }

    return formattedSummary;
  }

  /**
   * Format portfolio response for mobile app
   * @param {Object} data - Portfolio data
   * @param {string} requestType - Type of request
   * @param {Object} intentData - Original intent data
   * @returns {Object} Formatted response
   */
  formatPortfolioResponse(data, requestType, intentData) {
    return {
      success: true,
      type: 'portfolio-information',
      subtype: requestType,
      data: {
        message: data.formattedSummary || 'Portfolio information retrieved successfully.',
        portfolioData: {
          ...data,
          requestType,
          timestamp: new Date().toISOString()
        },
        intent: {
          ...intentData,
          processed: true,
          timestamp: new Date().toISOString()
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get user's wallet address from their DUCK agent
   * @param {string} userId - User ID
   * @returns {Promise<string>} Wallet address
   */
  async getUserWalletAddress(userId) {
    try {
      console.log(`🔍 Looking for DUCK agent wallet for user: ${userId}`);
      
      // Find user's DUCK agent
      const agent = await Agent.findOne({ 
        userId: userId,
        duckAddress: { $exists: true },
        isActive: true 
      });

      if (!agent) {
        console.log(`⚠️ No DUCK agent found for user ${userId}, using default wallet`);
        return this.defaultWalletAddress;
      }

      console.log(`✅ Found DUCK agent wallet: ${agent.duckAddress}`);
      return agent.duckAddress;

    } catch (error) {
      console.error('❌ Error getting user wallet address:', error);
      // Fallback to default wallet
      return this.defaultWalletAddress;
    }
  }

  /**
   * HTTP endpoint for getting portfolio balance
   */
  async getPortfolioBalance(req, res) {
    try {
      const { userId } = req.body;
      const walletAddress = await this.getUserWalletAddress(userId || 'demo-user');
      
      const portfolio = await this.getCompleteBalance(walletAddress);
      
      res.json({
        success: true,
        data: portfolio
      });

    } catch (error) {
      console.error('Error in portfolio balance endpoint:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * HTTP endpoint for getting specific token balance
   */
  async getTokenBalanceEndpoint(req, res) {
    try {
      const { userId, token } = req.body;
      const walletAddress = await this.getUserWalletAddress(userId || 'demo-user');
      
      const tokenBalance = await this.getSpecificTokenBalance(walletAddress, token);
      
      res.json({
        success: true,
        data: tokenBalance
      });

    } catch (error) {
      console.error('Error in token balance endpoint:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = PortfolioController;