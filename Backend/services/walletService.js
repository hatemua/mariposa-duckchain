const { ethers } = require('ethers');
const Wallet = require('../models/Wallet');

class WalletService {
  constructor() {
    this.seiRpcUrl = process.env.SEI_RPC_URL || 'https://evm-rpc.sei-apis.com';
    this.chainId = 1329; // SEI mainnet
    this.provider = new ethers.JsonRpcProvider(this.seiRpcUrl);
  }

  /**
   * Generate a new SEI EVM wallet for an agent
   * @param {Object} agentData - Agent information
   * @returns {Object} Generated wallet data
   */
  static async generateWallet(agentData) {
    try {
      console.log(`🏦 GENERATING SEI EVM WALLET FOR AGENT: ${agentData.name}`);
      
      // Generate random wallet compatible with SEI EVM
      const randomWallet = ethers.Wallet.createRandom();
      
      // Get wallet class based on strategy
      const walletClass = Wallet.getWalletClass(agentData.primaryStrategy);
      
      console.log(`📱 SEI EVM Address: ${randomWallet.address}`);
      console.log(`🏷️  Wallet Class: ${walletClass}`);
      console.log(`🌊 Network: SEI EVM (Chain ID: 1329)`);
      console.log(`🔐 Private Key Generated (encrypted storage)`);
      
      const walletData = {
        address: randomWallet.address,
        privateKey: randomWallet.privateKey,
        mnemonic: randomWallet.mnemonic?.phrase,
        walletClass: walletClass,
        network: 'sei',
        chainId: 1329
      };
      
      return walletData;
      
    } catch (error) {
      console.error('❌ Error generating SEI wallet:', error);
      throw new Error(`Failed to generate SEI wallet: ${error.message}`);
    }
  }

  /**
   * Create and save wallet to database
   * @param {String} agentId - Agent ID
   * @param {String} agentName - Agent name
   * @param {Object} walletData - Wallet generation data
   * @param {Number} initialBudget - Initial portfolio value
   * @returns {Object} Saved wallet
   */
  static async createWallet(agentId, agentName, walletData, initialBudget = 0) {
    try {
      console.log(`💾 SAVING WALLET TO DATABASE...`);
      
      const wallet = new Wallet({
        agentId: agentId,
        agentName: agentName,
        walletAddress: walletData.address,
        encryptedPrivateKey: walletData.privateKey, // Will be encrypted by pre-save hook
        walletClass: walletData.walletClass,
        network: 'sei', // Default to SEI network
        portfolioValue: {
          initial: initialBudget,
          current: initialBudget,
          peak: initialBudget
        }
      });
      
      const savedWallet = await wallet.save();
      console.log(`✅ WALLET SAVED WITH ID: ${savedWallet._id}`);
      
      return savedWallet;
      
    } catch (error) {
      console.error('❌ Error saving wallet:', error);
      throw new Error(`Failed to save wallet: ${error.message}`);
    }
  }

  /**
   * Get wallet by agent ID
   * @param {String} agentId - Agent ID
   * @returns {Object} Wallet data
   */
  static async getWalletByAgentId(agentId) {
    try {
      const wallet = await Wallet.findOne({ agentId, isActive: true });
      return wallet;
    } catch (error) {
      console.error('Error fetching wallet:', error);
      throw new Error(`Failed to fetch wallet: ${error.message}`);
    }
  }

  /**
   * Update wallet balance
   * @param {String} walletId - Wallet ID
   * @param {Object} balanceData - Balance update data
   * @returns {Object} Updated wallet
   */
  static async updateBalance(walletId, balanceData) {
    try {
      const wallet = await Wallet.findById(walletId);
      if (!wallet) throw new Error('Wallet not found');
      
      // Update native balance
      if (balanceData.native !== undefined) {
        wallet.balance.native = balanceData.native;
      }
      
      // Update token balances
      if (balanceData.tokens) {
        wallet.balance.tokens = balanceData.tokens;
      }
      
      // Calculate total portfolio value
      let totalValue = wallet.balance.native;
      wallet.balance.tokens.forEach(token => {
        totalValue += token.usdValue || 0;
      });
      
      wallet.updatePortfolioValue(totalValue);
      
      await wallet.save();
      return wallet;
      
    } catch (error) {
      console.error('Error updating wallet balance:', error);
      throw new Error(`Failed to update balance: ${error.message}`);
    }
  }

  /**
   * Record a trade
   * @param {String} walletId - Wallet ID
   * @param {Object} tradeData - Trade information
   * @returns {Object} Updated wallet
   */
  static async recordTrade(walletId, tradeData) {
    try {
      const wallet = await Wallet.findById(walletId);
      if (!wallet) throw new Error('Wallet not found');
      
      wallet.addTrade({
        ...tradeData,
        timestamp: new Date()
      });
      
      await wallet.save();
      return wallet;
      
    } catch (error) {
      console.error('Error recording trade:', error);
      throw new Error(`Failed to record trade: ${error.message}`);
    }
  }

  /**
   * Get wallet performance metrics
   * @param {String} walletId - Wallet ID
   * @returns {Object} Performance data
   */
  static async getPerformanceMetrics(walletId) {
    try {
      const wallet = await Wallet.findById(walletId);
      if (!wallet) throw new Error('Wallet not found');
      
      const performance = wallet.calculatePerformance();
      
      return {
        ...performance,
        portfolioValue: wallet.portfolioValue,
        riskMetrics: wallet.riskMetrics,
        totalTrades: wallet.tradingHistory.length
      };
      
    } catch (error) {
      console.error('Error calculating performance:', error);
      throw new Error(`Failed to calculate performance: ${error.message}`);
    }
  }

  /**
   * Get wallet balance from SEI network
   * @param {String} walletId - Wallet ID
   * @returns {Object} Balance information
   */
  static async getWalletBalanceFromNetwork(walletId) {
    try {
      const wallet = await Wallet.findById(walletId);
      if (!wallet) throw new Error('Wallet not found');
      
      const service = new WalletService();
      
      // Get SEI balance
      const seiBalance = await service.provider.getBalance(wallet.walletAddress);
      
      return {
        walletId: walletId,
        address: wallet.walletAddress,
        seiBalance: ethers.formatEther(seiBalance),
        seiBalanceWei: seiBalance.toString(),
        network: 'sei',
        chainId: 1329,
        lastUpdated: new Date()
      };
      
    } catch (error) {
      console.error('Error fetching wallet balance from network:', error);
      throw new Error(`Failed to fetch network balance: ${error.message}`);
    }
  }

  /**
   * Create wallet for user (SEI EVM)
   * @param {String} userId - User ID
   * @param {String} userName - User name
   * @param {Object} walletData - Wallet data
   * @param {Number} initialBalance - Initial balance in SEI
   * @returns {Object} Created wallet
   */
  static async createUserWallet(userId, userName, walletData, initialBalance = 0) {
    try {
      console.log(`💾 CREATING SEI EVM WALLET FOR USER: ${userName}`);
      
      const wallet = new Wallet({
        ownerId: userId,
        ownerType: 'user',
        userId: userId,
        userName: userName,
        walletAddress: walletData.address,
        encryptedPrivateKey: walletData.privateKey, // Will be encrypted by pre-save hook
        walletClass: walletData.walletClass || 'trading',
        network: 'sei',
        balance: {
          native: initialBalance
        },
        portfolioValue: {
          initial: initialBalance,
          current: initialBalance,
          peak: initialBalance
        }
      });
      
      const savedWallet = await wallet.save();
      console.log(`✅ USER WALLET SAVED WITH ID: ${savedWallet._id}`);
      
      return savedWallet;
      
    } catch (error) {
      console.error('❌ Error creating user wallet:', error);
      throw new Error(`Failed to create user wallet: ${error.message}`);
    }
  }

  /**
   * Update wallet balances from SEI network
   * @param {String} walletId - Wallet ID
   * @returns {Object} Updated wallet
   */
  static async syncWalletWithNetwork(walletId) {
    try {
      const networkBalance = await this.getWalletBalanceFromNetwork(walletId);
      
      const balanceData = {
        native: parseFloat(networkBalance.seiBalance),
        tokens: [] // TODO: Add token balance fetching
      };
      
      return await this.updateBalance(walletId, balanceData);
      
    } catch (error) {
      console.error('Error syncing wallet with network:', error);
      throw new Error(`Failed to sync wallet: ${error.message}`);
    }
  }
}

module.exports = WalletService; 