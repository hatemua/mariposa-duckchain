const { SimpleAgent, Utils } = require('@mariposa-plus/agent-sdk');
const Agent = require('../models/Agent');
const { ethers } = require('ethers');

class SeiAgentService {
  constructor() {
    this.rpcUrl = process.env.SEI_RPC_URL || 'https://evm-rpc.arctic-1.seinetwork.io';
    this.chainId = process.env.SEI_CHAIN_ID || 'arctic-1';
    this.agenticRouterAddress = process.env.AGENTIC_ROUTER_ADDRESS || '0x...'; // TODO: Set from deployment
    
    // SEI EVM token addresses
    this.tokenAddresses = {
      'WSEI': process.env.WSEI_ADDRESS || '0xe30fedd158a2e3b13e9badaeabafc5516e95e8c7',
      'USDC': process.env.USDC_ADDRESS || '0x3894085ef7ff0f0aedf52e2a2704928d1ec074f1',
      'USDT': process.env.USDT_ADDRESS || '0x9151434b16b9763660705744891fa906f660ecc5',
      'WETH': process.env.WETH_ADDRESS || '0x160345fc359604fc6e70e3c5facbde5f7a9342d8',
      'WBTC': process.env.WBTC_ADDRESS || '0x0555e30da8f98308edb960aa94c0db47230d2b9c'
    };
    
    this.agents = new Map(); // Cache for initialized agents
  }

  /**
   * Create a new SEI agent with wallet
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
      console.log(`🚀 Creating SEI agent: ${name} for user: ${userId}`);

      // Generate new wallet
      const wallet = ethers.Wallet.createRandom();
      const privateKey = wallet.privateKey;
      const address = wallet.address;

      // Create agent record in database
      const agentData = {
        name,
        description: description || `SEI agent for ${agentType} operations`,
        userId,
        agentUuid: this.generateUuid(),
        agentType,
        configuration: {
          ...configuration,
          seiEnabled: true,
          chainId: this.chainId,
          address: address
        },
        seiAddress: address,
        seiPrivateKey: this.encryptPrivateKey(privateKey), // Should be encrypted in production
        isActive: true,
        lastInteraction: new Date(),
        createdAt: new Date()
      };

      const agent = new Agent(agentData);
      const savedAgent = await agent.save();

      console.log(`✅ SEI agent created: ${savedAgent._id}`);

      // Return sanitized agent data (without private key)
      const { seiPrivateKey, ...sanitizedAgent } = savedAgent.toObject();
      
      return {
        success: true,
        agent: sanitizedAgent,
        address: address
      };

    } catch (error) {
      console.error('❌ Error creating SEI agent:', error);
      throw new Error(`Failed to create SEI agent: ${error.message}`);
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
      const agentDoc = await Agent.findById(agentId).select('+seiPrivateKey');
      if (!agentDoc) {
        throw new Error('Agent not found');
      }

      if (!agentDoc.seiAddress || !agentDoc.seiPrivateKey) {
        throw new Error('Agent does not have SEI credentials');
      }

      // Decrypt private key (in production, use proper encryption)
      const privateKey = this.decryptPrivateKey(agentDoc.seiPrivateKey);

      // Create agent configuration
      const agentConfig = {
        privateKey: privateKey,
        address: agentDoc.seiAddress,
        rpcUrl: this.rpcUrl,
        chainId: this.chainId,
        contractAddresses: {
          agenticRouter: this.agenticRouterAddress,
          wsei: this.tokenAddresses.WSEI,
          usdc: this.tokenAddresses.USDC
        }
      };

      // Initialize SimpleAgent
      const agent = new SimpleAgent(agentConfig);
      await agent.initialize();

      // Cache the agent
      this.agents.set(agentId, agent);

      console.log(`✅ Agent instance initialized for ${agentDoc.name}`);
      return agent;

    } catch (error) {
      console.error('❌ Error getting agent instance:', error);
      throw new Error(`Failed to initialize agent: ${error.message}`);
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

      console.log(`🔄 Executing swap: ${amount} ${fromToken} → ${toToken}`);

      let result;

      if (fromToken.toLowerCase() === 'sei') {
        // SEI to Token swap
        const tokenAddress = this.getTokenAddress(toToken);
        if (!tokenAddress) {
          throw new Error(`Unsupported token: ${toToken}`);
        }

        result = await agent.swapSeiToToken({
          tokenOut: tokenAddress,
          amountIn: amount.toString(),
          slippageTolerance: slippageTolerance
        });

      } else if (toToken.toLowerCase() === 'sei') {
        // Token to SEI swap
        const tokenAddress = this.getTokenAddress(fromToken);
        if (!tokenAddress) {
          throw new Error(`Unsupported token: ${fromToken}`);
        }

        result = await agent.swapTokenToSei({
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

      console.log(`✅ Swap completed: ${result.txHash}`);

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
      console.error('❌ Swap execution failed:', error);
      throw new Error(`Swap failed: ${error.message}`);
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

      console.log(`💸 Executing transfer: ${amount} ${token} → ${to}`);

      let result;

      if (token.toLowerCase() === 'sei') {
        // SEI transfer
        result = await agent.transferSei(to, amount.toString());
      } else {
        // Token transfer
        const tokenAddress = this.getTokenAddress(token);
        if (!tokenAddress) {
          throw new Error(`Unsupported token: ${token}`);
        }

        result = await agent.transferToken(tokenAddress, to, amount.toString());
      }

      console.log(`✅ Transfer completed: ${result}`);

      return {
        success: true,
        transactionHash: result,
        token,
        to,
        amount
      };

    } catch (error) {
      console.error('❌ Transfer execution failed:', error);
      throw new Error(`Transfer failed: ${error.message}`);
    }
  }

  /**
   * Get agent balance
   * @param {string} agentId - Agent ID
   * @returns {Object} Balance information
   */
  async getAgentBalance(agentId) {
    try {
      const agent = await this.getAgentInstance(agentId);

      console.log(`💰 Getting balance for agent: ${agentId}`);

      // Get SEI balance
      const seiBalance = await agent.getSeiBalance();

      // Get token balances
      const tokenBalances = [];
      for (const [symbol, address] of Object.entries(this.tokenAddresses)) {
        try {
          const balance = await agent.getTokenBalance(address);
          if (parseFloat(balance.balance) > 0) {
            tokenBalances.push(balance);
          }
        } catch (error) {
          console.warn(`⚠️ Could not get ${symbol} balance:`, error.message);
        }
      }

      return {
        success: true,
        seiBalance: seiBalance,
        tokenBalances: tokenBalances,
        address: agent.getAddress()
      };

    } catch (error) {
      console.error('❌ Error getting agent balance:', error);
      throw new Error(`Failed to get balance: ${error.message}`);
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
      console.log(`📝 Agent ${agentId} should be registered with contract by admin`);
      
      return {
        success: true,
        message: 'Agent registration request submitted'
      };

    } catch (error) {
      console.error('❌ Error registering agent with contract:', error);
      throw new Error(`Failed to register agent: ${error.message}`);
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
      console.log(`🔌 Agent ${agentId} disconnected`);
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

module.exports = new SeiAgentService();
