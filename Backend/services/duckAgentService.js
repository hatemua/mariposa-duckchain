const { SimpleAgent, Utils } = require('@mariposa-plus/agent-sdk');
const Agent = require('../models/Agent');
const { ethers } = require('ethers');

class DuckAgentService {
  constructor() {
    this.rpcUrl = process.env.DUCK_RPC_URL || 'https://rpc.duckchain.io';
    this.chainId = process.env.DUCK_CHAIN_ID || 'duck-mainnet';
    this.agenticRouterAddress = process.env.DUCK_AGENTIC_ROUTER_ADDRESS || '0x...'; // TODO: Set from deployment
    
    // DUCK network token addresses
    this.tokenAddresses = {
      'DUCK': process.env.DUCK_ADDRESS || '0xdA65892eA771d3268610337E9964D916028B7dAD',
      'WTON': process.env.DUCK_WTON_ADDRESS || '0x7F9308E8d724e724EC31395f3af52e0593BB2e3f',
      'USDT': process.env.DUCK_USDT_ADDRESS || '0xbE138aD5D41FDc392AE0B61b09421987C1966CC3',
    };
    
    this.agents = new Map(); // Cache for initialized agents
  }

  /**
   * Create a new DUCK agent with wallet
   * @param {Object} options - Agent creation options
   * @returns {Object} Created agent data
   */
  async createAgent(options) {
    const {
      name,
      description,
      userId,
      agentType = 'general',
      configuration = {}
    } = options;

    try {
      console.log(`🦆 Creating DUCK agent: ${name} for user: ${userId}`);

      // Generate new wallet
      const wallet = ethers.Wallet.createRandom();
      const privateKey = wallet.privateKey;
      const address = wallet.address;

      // Create agent record in database
      const agentData = {
        name,
        description: description || `DUCK agent for ${agentType} operations`,
        userId,
        agentUuid: this.generateUuid(),
        agentType,
        configuration: {
          ...configuration,
          duckEnabled: true,
          chainId: this.chainId,
          address: address
        },
        duckAddress: address,
        duckPrivateKey: this.encryptPrivateKey(privateKey), // Should be encrypted in production
        isActive: true,
        lastInteraction: new Date(),
        createdAt: new Date()
      };

      const agent = new Agent(agentData);
      const savedAgent = await agent.save();

      console.log(`✅ DUCK agent created: ${savedAgent._id}`);

      // Return sanitized agent data (without private key)
      const { duckPrivateKey, ...sanitizedAgent } = savedAgent.toObject();
      
      return {
        success: true,
        agent: sanitizedAgent,
        address: address
      };

    } catch (error) {
      console.error('❌ Error creating DUCK agent:', error);
      throw new Error(`Failed to create DUCK agent: ${error.message}`);
    }
  }

  /**
   * Initialize and get an agent instance
   * @param {string} agentId - Agent ID or UUID
   * @returns {SimpleAgent} Initialized agent instance
   */
  async getAgentInstance(agentId) {
    try {
      // Check cache first
      if (this.agents.has(agentId)) {
        return this.agents.get(agentId);
      }

      // Find agent in database
      const agentDoc = await Agent.findById(agentId).select('+duckPrivateKey');
      if (!agentDoc) {
        throw new Error('Agent not found');
      }

      if (!agentDoc.duckAddress || !agentDoc.duckPrivateKey) {
        throw new Error('Agent does not have DUCK credentials');
      }

      // Decrypt private key (in production, use proper encryption)
      const privateKey = this.decryptPrivateKey(agentDoc.duckPrivateKey);

      // Create agent configuration
      const agentConfig = {
        privateKey: privateKey,
        address: agentDoc.duckAddress,
        rpcUrl: this.rpcUrl,
        chainId: this.chainId,
        contractAddresses: {
          agenticRouter: this.agenticRouterAddress,
          duck: this.tokenAddresses.DUCK,
          usdc: this.tokenAddresses.USDC
        }
      };

      // Initialize SimpleAgent
      const agent = new SimpleAgent(agentConfig);
      await agent.initialize();

      // Cache the agent
      this.agents.set(agentId, agent);

      console.log(`✅ DUCK Agent instance initialized for ${agentDoc.name}`);
      return agent;

    } catch (error) {
      console.error('❌ Error getting DUCK agent instance:', error);
      throw new Error(`Failed to initialize DUCK agent: ${error.message}`);
    }
  }

  /**
   * Execute a token swap
   * @param {string} agentId - Agent ID
   * @param {Object} swapParams - Swap parameters
   * @returns {Object} Swap result
   */
  async executeSwap(agentId, swapParams) {
    try {
      const agent = await this.getAgentInstance(agentId);
      
      const {
        fromToken,
        toToken,
        amount,
        slippageTolerance = 15
      } = swapParams;

      console.log(`🔄 Executing DUCK swap: ${amount} ${fromToken} → ${toToken}`);

      let result;

      if (fromToken.toLowerCase() === 'duck') {
        // DUCK to Token swap
        const tokenAddress = this.getTokenAddress(toToken);
        if (!tokenAddress) {
          throw new Error(`Unsupported token: ${toToken}`);
        }

        result = await agent.swapNativeToToken({
          tokenOut: tokenAddress,
          amountIn: amount.toString(),
          slippageTolerance: slippageTolerance
        });

      } else if (toToken.toLowerCase() === 'duck') {
        // Token to DUCK swap
        const tokenAddress = this.getTokenAddress(fromToken);
        if (!tokenAddress) {
          throw new Error(`Unsupported token: ${fromToken}`);
        }

        result = await agent.swapTokenToNative({
          tokenIn: tokenAddress,
          amountIn: amount.toString(),
          slippageTolerance: slippageTolerance
        });

      } else {
        // Token to Token swap
        const tokenInAddress = this.getTokenAddress(fromToken);
        const tokenOutAddress = this.getTokenAddress(toToken);
        
        if (!tokenInAddress || !tokenOutAddress) {
          throw new Error(`Unsupported token pair: ${fromToken}/${toToken}`);
        }

        result = await agent.swapTokenToToken({
          tokenIn: tokenInAddress,
          tokenOut: tokenOutAddress,
          amountIn: amount.toString(),
          slippageTolerance: slippageTolerance
        });
      }

      console.log(`✅ DUCK Swap completed: ${result.txHash}`);

      return {
        success: true,
        transactionHash: result.txHash,
        amountIn: result.amountIn,
        amountOut: result.amountOut,
        gasUsed: result.gasUsed,
        fromToken,
        toToken
      };

    } catch (error) {
      console.error('❌ DUCK Swap execution failed:', error);
      throw new Error(`DUCK Swap failed: ${error.message}`);
    }
  }

  /**
   * Execute a token transfer
   * @param {string} agentId - Agent ID
   * @param {Object} transferParams - Transfer parameters
   * @returns {Object} Transfer result
   */
  async executeTransfer(agentId, transferParams) {
    try {
      const agent = await this.getAgentInstance(agentId);
      
      const {
        token,
        to,
        amount
      } = transferParams;

      console.log(`💸 Executing DUCK transfer: ${amount} ${token} → ${to}`);

      let result;

      if (token.toLowerCase() === 'duck') {
        // DUCK transfer
        result = await agent.transferSei(to, amount.toString());
      } else {
        // Token transfer
        const tokenAddress = this.getTokenAddress(token);
        if (!tokenAddress) {
          throw new Error(`Unsupported token: ${token}`);
        }

        result = await agent.transferToken(tokenAddress, to, amount.toString());
      }

      console.log(`✅ DUCK Transfer completed: ${result}`);

      return {
        success: true,
        transactionHash: result,
        token,
        to,
        amount
      };

    } catch (error) {
      console.error('❌ DUCK Transfer execution failed:', error);
      throw new Error(`DUCK Transfer failed: ${error.message}`);
    }
  }

  /**
   * Get agent balance
   * @param {string} agentId - Agent ID
   * @returns {Object} Balance information
   */
  async getAgentBalance(agentId) {
    try {
      // Find agent in database first
      const agentDoc = await Agent.findById(agentId).select('+duckPrivateKey');
      if (!agentDoc) {
        throw new Error('Agent not found');
      }

      console.log(`💰 Getting balance for DUCK agent: ${agentId}`);

      // Get DUCK native balance directly using ethers v6
      const provider = new ethers.JsonRpcProvider(this.rpcUrl);
      const wallet = new ethers.Wallet(this.decryptPrivateKey(agentDoc.duckPrivateKey), provider);
      
      console.log(`🔍 Debug - Agent Address: ${wallet.address}`);
      console.log(`🔍 Debug - RPC URL: ${this.rpcUrl}`);
      console.log(`🔍 Debug - Stored Address: ${agentDoc.duckAddress}`);
      
      const balance = await provider.getBalance(wallet.address);
      console.log(`🔍 Debug - Raw Balance (wei): ${balance.toString()}`);
      console.log(`🔍 TON Native Balance: ${ethers.formatEther(balance)} TON`);
      const tonBalance = ethers.formatEther(balance);

      // Get token balances directly using ethers v6
      const tokenBalances = [];
      const erc20ABI = [
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)",  
        "function symbol() view returns (string)"
      ];

      console.log(`🔍 Debug - Token Addresses:`, this.tokenAddresses);
      
      for (const [symbol, address] of Object.entries(this.tokenAddresses)) {
        try {
          console.log(`🔍 Debug - Checking ${symbol} token at address: ${address}`);
          if (address && address !== '0x...') {
            const contract = new ethers.Contract(address, erc20ABI, provider);
            const [tokenBalance, decimals, tokenSymbol] = await Promise.all([
              contract.balanceOf(wallet.address),
              contract.decimals(),
              contract.symbol()
            ]);
            
            console.log(`🔍 Debug - ${symbol} Raw Balance: ${tokenBalance.toString()}`);
            console.log(`🔍 Debug - ${symbol} Decimals: ${decimals}`);
            console.log(`🔍 Debug - ${symbol} Symbol: ${tokenSymbol}`);
            
            const formattedBalance = ethers.formatUnits(tokenBalance, decimals);
            console.log(`🔍 Debug - ${symbol} Formatted Balance: ${formattedBalance}`);
            
            // Show all balances, not just > 0
            tokenBalances.push({
              symbol: tokenSymbol,
              address: address,
              balance: formattedBalance,
              decimals: Number(decimals)
            });
          } else {
            console.log(`🔍 Debug - Skipping ${symbol}: invalid address ${address}`);
          }
        } catch (error) {
          console.warn(`⚠️ Could not get ${symbol} balance:`, error.message);
        }
      }

      console.log(`🔍 Debug - Final tonBalance before return: ${tonBalance}`);
      console.log(`🔍 Debug - Final tokenBalances count: ${tokenBalances.length}`);

      return {
        success: true,
        duckBalance: tonBalance, // Keep duckBalance key for compatibility, but contains TON native balance
        tokenBalances: tokenBalances,
        address: agentDoc.duckAddress
      };

    } catch (error) {
      console.error('❌ Error getting DUCK agent balance:', error);
      throw new Error(`Failed to get DUCK balance: ${error.message}`);
    }
  }

  /**
   * Get supported tokens
   * @returns {Object} Supported tokens
   */
  getSupportedTokens() {
    return this.tokenAddresses;
  }

  /**
   * Get token address by symbol
   * @param {string} symbol - Token symbol
   * @returns {string|null} Token address
   */
  getTokenAddress(symbol) {
    return this.tokenAddresses[symbol.toUpperCase()] || null;
  }

  /**
   * Register agent with AgenticRouter contract
   * @param {string} agentId - Agent ID
   * @returns {Object} Registration result
   */
  async registerAgentWithContract(agentId) {
    try {
      // This would be called by the admin to register the agent with the contract
      // Implementation depends on admin functionality
      console.log(`📝 DUCK Agent ${agentId} should be registered with contract by admin`);
      
      return {
        success: true,
        message: 'DUCK Agent registration request submitted'
      };

    } catch (error) {
      console.error('❌ Error registering DUCK agent with contract:', error);
      throw new Error(`Failed to register DUCK agent: ${error.message}`);
    }
  }

  /**
   * Cleanup agent instance from cache
   * @param {string} agentId - Agent ID
   */
  async disconnectAgent(agentId) {
    if (this.agents.has(agentId)) {
      const agent = this.agents.get(agentId);
      await agent.disconnect();
      this.agents.delete(agentId);
      console.log(`🔌 DUCK Agent ${agentId} disconnected`);
    }
  }

  // Helper methods
  generateUuid() {
    return require('uuid').v4();
  }

  encryptPrivateKey(privateKey) {
    // In production, use proper encryption
    // For now, just return as-is (should be encrypted!)
    return privateKey;
  }

  decryptPrivateKey(encryptedKey) {
    // In production, use proper decryption
    // For now, just return as-is
    return encryptedKey;
  }
}

module.exports = new DuckAgentService();