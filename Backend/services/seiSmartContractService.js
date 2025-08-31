const { ethers } = require('ethers');
const Agent = require('../models/Agent');
const Wallet = require('../models/Wallet');

class SeiSmartContractService {
  constructor() {
    this.rpcUrl = process.env.SEI_RPC_URL || 'https://evm-rpc.sei-apis.com';
    this.chainId = 1329; // SEI mainnet
    this.agenticRouterAddress = process.env.AGENTIC_ROUTER_ADDRESS || '0x...'; // TODO: Set from deployment
    
    // SEI EVM token addresses
    this.tokenAddresses = {
      'WSEI': '0xe30fedd158a2e3b13e9badaeabafc5516e95e8c7',
      'USDC': '0x3894085ef7ff0f0aedf52e2a2704928d1ec074f1',
      'USDT': '0x9151434b16b9763660705744891fa906f660ecc5',
      'WETH': '0x160345fc359604fc6e70e3c5facbde5f7a9342d8',
      'WBTC': '0x0555e30da8f98308edb960aa94c0db47230d2b9c',
      'iSEI': '0x5cf6826140c1c56ff49c808a1a75407cd1df9423',
      'USDa': '0xff12470a969dd362eb6595ffb44c82c959fe9acc',
      'syUSD': '0x059a6b0ba116c63191182a0956cf697d0d2213ec',
      'SolvBTC': '0x541fd749419ca806a8bc7da8ac23d346f2df8b77',
      'uBTC': '0x78e26e8b953c7c78a58d69d8b9a91745c2bbb258',
      'MAD': '0x0814f0476b6686630df19b7c86c3ec41ce8676c0',
      'FXS': '0x64445f0aecC51E94aD52d8AC56b7190e764E561a',
      'FASTUSD': '0x37a4dd9ced2b19cfe8fac251cd727b5787e45269',
      'sUSDa': '0x6ab5d5e96ac59f66bab57450275cc16961219796',
      'kavaUSDT': '0xb75d0b03c06a926e488e2659df1a861f860bd3d1',
      'SolvBTC.BBN': '0xcc0966d8418d412c599a6421b760a847eb169a8c'
    };

    // AgenticRouter contract ABI (key functions)
    this.agenticRouterABI = [
      // Agent management
      "function registerAgent(address agent, bool allowed) external",
      "function isAgent(address) external view returns (bool)",
      
      // Swap functions
      "function swapSeiToToken(address tokenOut, uint256 amountOutMin, address recipient, uint256 deadline) external payable returns (uint256 amountOut)",
      "function swapTokenToToken(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin, address recipient, uint256 deadline) external returns (uint256 amountOut)",
      "function swapTokenToSei(address tokenIn, uint256 amountIn, uint256 amountOutMin, address recipient, uint256 deadline) external returns (uint256 amountOut)",
      
      // Transfer functions
      "function transferWithFee(address token, address from, address to, uint256 amount) external",
      "function nativeTransferWithFee(address to) external payable",
      
      // View functions
      "function calculateFee(uint256 amount) external view returns (uint256 fee, uint256 net)",
      "function getBestFeeTier(address tokenA, address tokenB) external view returns (uint24 fee)",
      "function getOptimalPath(address tokenIn, address tokenOut) external view returns (bytes memory path, bool isDirect)",
      "function checkPoolExists(address tokenA, address tokenB, uint24 fee) external view returns (bool exists, address poolAddress)",
      "function getPoolInfo(address tokenA, address tokenB, uint24 fee) external view returns (bool exists, address poolAddress, uint128 liquidity, uint160 sqrtPriceX96)",
      
      // Events
      "event SwapExecuted(address indexed agent, string swapType, uint256 netIn, uint256 amountOut)",
      "event TransferWithFee(address indexed agent, address token, uint256 amount, uint256 fee, uint256 net)",
      "event NativeTransferWithFee(address indexed agent, uint256 amount, uint256 fee, uint256 net)",
      "event AgentRegistered(address indexed agent, bool allowed)"
    ];

    // ERC20 token ABI (for approvals and transfers)
    this.erc20ABI = [
      "function approve(address spender, uint256 amount) external returns (bool)",
      "function transfer(address to, uint256 amount) external returns (bool)",
      "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
      "function balanceOf(address account) external view returns (uint256)",
      "function allowance(address owner, address spender) external view returns (uint256)",
      "function decimals() external view returns (uint8)",
      "function symbol() external view returns (string)",
      "function name() external view returns (string)"
    ];

    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
  }

  /**
   * Get wallet signer for an agent
   * @param {string} agentId - Agent ID
   * @returns {ethers.Wallet} Signer instance
   */
  async getAgentSigner(agentId) {
    try {
      const wallet = await Wallet.findOne({ 
        $or: [
          { agentId: agentId },
          { ownerId: agentId, ownerType: 'agent' }
        ],
        isActive: true 
      });
      
      if (!wallet) {
        throw new Error(`No wallet found for agent ${agentId}`);
      }

      // Decrypt the private key
      const decryptedPrivateKey = wallet.decryptPrivateKey();
      
      // Create wallet instance connected to SEI provider
      const walletSigner = new ethers.Wallet(decryptedPrivateKey, this.provider);
      
      console.log(`✅ Agent signer created for ${agentId}: ${walletSigner.address}`);
      return walletSigner;
      
    } catch (error) {
      console.error(`❌ Error creating agent signer for ${agentId}:`, error);
      throw new Error(`Failed to create agent signer: ${error.message}`);
    }
  }

  /**
   * Get AgenticRouter contract instance
   * @param {ethers.Wallet} signer - Wallet signer
   * @returns {ethers.Contract} Contract instance
   */
  getAgenticRouterContract(signer) {
    return new ethers.Contract(this.agenticRouterAddress, this.agenticRouterABI, signer);
  }

  /**
   * Get ERC20 token contract instance
   * @param {string} tokenAddress - Token contract address
   * @param {ethers.Wallet} signer - Wallet signer
   * @returns {ethers.Contract} Token contract instance
   */
  getTokenContract(tokenAddress, signer) {
    return new ethers.Contract(tokenAddress, this.erc20ABI, signer);
  }

  /**
   * Register an agent with the AgenticRouter contract
   * @param {string} agentId - Agent ID
   * @param {string} adminPrivateKey - Admin private key for registration
   * @returns {Object} Transaction result
   */
  async registerAgent(agentId, adminPrivateKey) {
    try {
      console.log(`\n🤖 REGISTERING AGENT ${agentId} WITH SMART CONTRACT`);
      console.log('═'.repeat(60));

      // Get agent wallet address
      const wallet = await Wallet.findOne({ 
        $or: [
          { agentId: agentId },
          { ownerId: agentId, ownerType: 'agent' }
        ],
        isActive: true 
      });
      
      if (!wallet) {
        throw new Error(`No wallet found for agent ${agentId}`);
      }

      // Create admin signer
      const adminSigner = new ethers.Wallet(adminPrivateKey, this.provider);
      const agenticRouter = this.getAgenticRouterContract(adminSigner);

      // Register the agent
      const tx = await agenticRouter.registerAgent(wallet.walletAddress, true);
      console.log(`📝 Registration transaction submitted: ${tx.hash}`);

      const receipt = await tx.wait();
      console.log(`✅ Agent ${agentId} registered successfully`);
      console.log(`🔗 Transaction hash: ${receipt.transactionHash}`);
      console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString(),
        agentAddress: wallet.walletAddress,
        message: 'Agent registered successfully'
      };

    } catch (error) {
      console.error(`❌ Error registering agent ${agentId}:`, error);
      throw new Error(`Failed to register agent: ${error.message}`);
    }
  }

  /**
   * Check if an agent is registered
   * @param {string} agentId - Agent ID
   * @returns {boolean} Registration status
   */
  async isAgentRegistered(agentId) {
    try {
      const wallet = await Wallet.findOne({ 
        $or: [
          { agentId: agentId },
          { ownerId: agentId, ownerType: 'agent' }
        ],
        isActive: true 
      });
      
      if (!wallet) {
        return false;
      }

      const agenticRouter = new ethers.Contract(this.agenticRouterAddress, this.agenticRouterABI, this.provider);
      const isRegistered = await agenticRouter.isAgent(wallet.walletAddress);
      
      return isRegistered;
      
    } catch (error) {
      console.error(`Error checking agent registration for ${agentId}:`, error);
      return false;
    }
  }

  /**
   * Execute SEI to Token swap
   * @param {string} agentId - Agent ID
   * @param {string} tokenOutSymbol - Output token symbol
   * @param {string} amountInSei - Amount of SEI to swap (in SEI units)
   * @param {string} recipientAddress - Recipient address
   * @param {number} slippageTolerance - Slippage tolerance (default 5%)
   * @returns {Object} Swap result
   */
  async swapSeiToToken(agentId, tokenOutSymbol, amountInSei, recipientAddress, slippageTolerance = 5) {
    try {
      console.log(`\n💱 SEI TO ${tokenOutSymbol} SWAP`);
      console.log('═'.repeat(50));
      console.log(`Agent: ${agentId}`);
      console.log(`Amount: ${amountInSei} SEI`);
      console.log(`Token: ${tokenOutSymbol}`);
      console.log(`Recipient: ${recipientAddress}`);

      // Get token address
      const tokenOutAddress = this.tokenAddresses[tokenOutSymbol];
      if (!tokenOutAddress) {
        throw new Error(`Unsupported token: ${tokenOutSymbol}`);
      }

      // Get agent signer
      const signer = await this.getAgentSigner(agentId);
      const agenticRouter = this.getAgenticRouterContract(signer);

      // Convert SEI amount to wei
      const amountInWei = ethers.parseEther(amountInSei);

      // Calculate minimum output with slippage (simplified - in production, get from price oracle)
      const amountOutMin = 1; // For now, use minimal amount to test functionality

      // Set deadline (15 minutes from now)
      const deadline = Math.floor(Date.now() / 1000) + 900;

      // Execute swap
      const tx = await agenticRouter.swapSeiToToken(
        tokenOutAddress,
        amountOutMin,
        recipientAddress,
        deadline,
        { value: amountInWei }
      );

      console.log(`📝 Swap transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();

      // Parse events from receipt
      const swapEvents = receipt.logs
        .filter(log => log.address === this.agenticRouterAddress)
        .map(log => {
          try {
            return agenticRouter.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .filter(event => event && event.name === 'SwapExecuted');

      let amountOut = '0';
      if (swapEvents.length > 0) {
        amountOut = swapEvents[0].args.amountOut.toString();
      }

      console.log(`✅ Swap completed successfully`);
      console.log(`🔗 Transaction hash: ${receipt.transactionHash}`);
      console.log(`💰 Amount out: ${amountOut}`);
      console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        amountIn: amountInWei.toString(),
        amountOut: amountOut,
        gasUsed: receipt.gasUsed.toString(),
        tokenIn: 'SEI',
        tokenOut: tokenOutSymbol,
        message: 'Swap executed successfully'
      };

    } catch (error) {
      console.error(`❌ Error executing SEI to ${tokenOutSymbol} swap:`, error);
      throw new Error(`Swap failed: ${error.message}`);
    }
  }

  /**
   * Execute Token to Token swap
   * @param {string} agentId - Agent ID
   * @param {string} tokenInSymbol - Input token symbol
   * @param {string} tokenOutSymbol - Output token symbol
   * @param {string} amountIn - Amount to swap
   * @param {string} recipientAddress - Recipient address
   * @param {number} slippageTolerance - Slippage tolerance (default 5%)
   * @returns {Object} Swap result
   */
  async swapTokenToToken(agentId, tokenInSymbol, tokenOutSymbol, amountIn, recipientAddress, slippageTolerance = 5) {
    try {
      console.log(`\n💱 ${tokenInSymbol} TO ${tokenOutSymbol} SWAP`);
      console.log('═'.repeat(50));
      console.log(`Agent: ${agentId}`);
      console.log(`Amount: ${amountIn} ${tokenInSymbol}`);
      console.log(`Output Token: ${tokenOutSymbol}`);
      console.log(`Recipient: ${recipientAddress}`);

      // Get token addresses
      const tokenInAddress = this.tokenAddresses[tokenInSymbol];
      const tokenOutAddress = this.tokenAddresses[tokenOutSymbol];
      
      if (!tokenInAddress || !tokenOutAddress) {
        throw new Error(`Unsupported token pair: ${tokenInSymbol}/${tokenOutSymbol}`);
      }

      // Get agent signer
      const signer = await this.getAgentSigner(agentId);
      const agenticRouter = this.getAgenticRouterContract(signer);
      const tokenContract = this.getTokenContract(tokenInAddress, signer);

      // Get token decimals and convert amount
      const decimals = await tokenContract.decimals();
      const amountInWei = ethers.parseUnits(amountIn, decimals);

      // Check allowance and approve if needed
      const allowance = await tokenContract.allowance(signer.address, this.agenticRouterAddress);
      if (allowance < amountInWei) {
        console.log(`🔓 Approving ${tokenInSymbol} for AgenticRouter...`);
        const approveTx = await tokenContract.approve(this.agenticRouterAddress, amountInWei);
        await approveTx.wait();
        console.log(`✅ Approval confirmed`);
      }

      // Calculate minimum output with slippage (simplified)
      const amountOutMin = 1; // For now, use minimal amount to test functionality

      // Set deadline (15 minutes from now)
      const deadline = Math.floor(Date.now() / 1000) + 900;

      // Execute swap
      const tx = await agenticRouter.swapTokenToToken(
        tokenInAddress,
        tokenOutAddress,
        amountInWei,
        amountOutMin,
        recipientAddress,
        deadline
      );

      console.log(`📝 Swap transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();

      // Parse events from receipt
      const swapEvents = receipt.logs
        .filter(log => log.address === this.agenticRouterAddress)
        .map(log => {
          try {
            return agenticRouter.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .filter(event => event && event.name === 'SwapExecuted');

      let amountOut = '0';
      if (swapEvents.length > 0) {
        amountOut = swapEvents[0].args.amountOut.toString();
      }

      console.log(`✅ Swap completed successfully`);
      console.log(`🔗 Transaction hash: ${receipt.transactionHash}`);
      console.log(`💰 Amount out: ${amountOut}`);
      console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        amountIn: amountInWei.toString(),
        amountOut: amountOut,
        gasUsed: receipt.gasUsed.toString(),
        tokenIn: tokenInSymbol,
        tokenOut: tokenOutSymbol,
        message: 'Swap executed successfully'
      };

    } catch (error) {
      console.error(`❌ Error executing ${tokenInSymbol} to ${tokenOutSymbol} swap:`, error);
      throw new Error(`Swap failed: ${error.message}`);
    }
  }

  /**
   * Execute Token to SEI swap
   * @param {string} agentId - Agent ID
   * @param {string} tokenInSymbol - Input token symbol
   * @param {string} amountIn - Amount to swap
   * @param {string} recipientAddress - Recipient address
   * @param {number} slippageTolerance - Slippage tolerance (default 5%)
   * @returns {Object} Swap result
   */
  async swapTokenToSei(agentId, tokenInSymbol, amountIn, recipientAddress, slippageTolerance = 5) {
    try {
      console.log(`\n💱 ${tokenInSymbol} TO SEI SWAP`);
      console.log('═'.repeat(50));
      console.log(`Agent: ${agentId}`);
      console.log(`Amount: ${amountIn} ${tokenInSymbol}`);
      console.log(`Recipient: ${recipientAddress}`);

      // Get token address
      const tokenInAddress = this.tokenAddresses[tokenInSymbol];
      if (!tokenInAddress) {
        throw new Error(`Unsupported token: ${tokenInSymbol}`);
      }

      // Get agent signer
      const signer = await this.getAgentSigner(agentId);
      const agenticRouter = this.getAgenticRouterContract(signer);
      const tokenContract = this.getTokenContract(tokenInAddress, signer);

      // Get token decimals and convert amount
      const decimals = await tokenContract.decimals();
      const amountInWei = ethers.parseUnits(amountIn, decimals);

      // Check allowance and approve if needed
      const allowance = await tokenContract.allowance(signer.address, this.agenticRouterAddress);
      if (allowance < amountInWei) {
        console.log(`🔓 Approving ${tokenInSymbol} for AgenticRouter...`);
        const approveTx = await tokenContract.approve(this.agenticRouterAddress, amountInWei);
        await approveTx.wait();
        console.log(`✅ Approval confirmed`);
      }

      // Calculate minimum output with slippage (simplified)
      const amountOutMin = 1; // For now, use minimal amount to test functionality

      // Set deadline (15 minutes from now)
      const deadline = Math.floor(Date.now() / 1000) + 900;

      // Execute swap
      const tx = await agenticRouter.swapTokenToSei(
        tokenInAddress,
        amountInWei,
        amountOutMin,
        recipientAddress,
        deadline
      );

      console.log(`📝 Swap transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();

      // Parse events from receipt
      const swapEvents = receipt.logs
        .filter(log => log.address === this.agenticRouterAddress)
        .map(log => {
          try {
            return agenticRouter.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .filter(event => event && event.name === 'SwapExecuted');

      let amountOut = '0';
      if (swapEvents.length > 0) {
        amountOut = swapEvents[0].args.amountOut.toString();
      }

      console.log(`✅ Swap completed successfully`);
      console.log(`🔗 Transaction hash: ${receipt.transactionHash}`);
      console.log(`💰 Amount out: ${ethers.formatEther(amountOut)} SEI`);
      console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        amountIn: amountInWei.toString(),
        amountOut: amountOut,
        gasUsed: receipt.gasUsed.toString(),
        tokenIn: tokenInSymbol,
        tokenOut: 'SEI',
        message: 'Swap executed successfully'
      };

    } catch (error) {
      console.error(`❌ Error executing ${tokenInSymbol} to SEI swap:`, error);
      throw new Error(`Swap failed: ${error.message}`);
    }
  }

  /**
   * Execute token transfer with fee
   * @param {string} agentId - Agent ID
   * @param {string} tokenSymbol - Token symbol
   * @param {string} fromAddress - From address
   * @param {string} toAddress - To address
   * @param {string} amount - Amount to transfer
   * @returns {Object} Transfer result
   */
  async transferTokenWithFee(agentId, tokenSymbol, fromAddress, toAddress, amount) {
    try {
      console.log(`\n💸 TOKEN TRANSFER WITH FEE`);
      console.log('═'.repeat(40));
      console.log(`Agent: ${agentId}`);
      console.log(`Token: ${tokenSymbol}`);
      console.log(`From: ${fromAddress}`);
      console.log(`To: ${toAddress}`);
      console.log(`Amount: ${amount}`);

      // Get token address
      const tokenAddress = this.tokenAddresses[tokenSymbol];
      if (!tokenAddress) {
        throw new Error(`Unsupported token: ${tokenSymbol}`);
      }

      // Get agent signer
      const signer = await this.getAgentSigner(agentId);
      const agenticRouter = this.getAgenticRouterContract(signer);
      const tokenContract = this.getTokenContract(tokenAddress, signer);

      // Get token decimals and convert amount
      const decimals = await tokenContract.decimals();
      const amountInWei = ethers.parseUnits(amount, decimals);

      // Execute transfer with fee
      const tx = await agenticRouter.transferWithFee(
        tokenAddress,
        fromAddress,
        toAddress,
        amountInWei
      );

      console.log(`📝 Transfer transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();

      console.log(`✅ Transfer completed successfully`);
      console.log(`🔗 Transaction hash: ${receipt.transactionHash}`);
      console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        amount: amountInWei.toString(),
        gasUsed: receipt.gasUsed.toString(),
        token: tokenSymbol,
        message: 'Transfer executed successfully'
      };

    } catch (error) {
      console.error(`❌ Error executing token transfer:`, error);
      throw new Error(`Transfer failed: ${error.message}`);
    }
  }

  /**
   * Execute native SEI transfer with fee
   * @param {string} agentId - Agent ID
   * @param {string} toAddress - To address
   * @param {string} amountInSei - Amount in SEI
   * @returns {Object} Transfer result
   */
  async transferSeiWithFee(agentId, toAddress, amountInSei) {
    try {
      console.log(`\n💸 SEI TRANSFER WITH FEE`);
      console.log('═'.repeat(40));
      console.log(`Agent: ${agentId}`);
      console.log(`To: ${toAddress}`);
      console.log(`Amount: ${amountInSei} SEI`);

      // Get agent signer
      const signer = await this.getAgentSigner(agentId);
      const agenticRouter = this.getAgenticRouterContract(signer);

      // Convert SEI amount to wei
      const amountInWei = ethers.parseEther(amountInSei);

      // Execute transfer with fee
      const tx = await agenticRouter.nativeTransferWithFee(toAddress, {
        value: amountInWei
      });

      console.log(`📝 Transfer transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();

      console.log(`✅ Transfer completed successfully`);
      console.log(`🔗 Transaction hash: ${receipt.transactionHash}`);
      console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        amount: amountInWei.toString(),
        gasUsed: receipt.gasUsed.toString(),
        token: 'SEI',
        message: 'Transfer executed successfully'
      };

    } catch (error) {
      console.error(`❌ Error executing SEI transfer:`, error);
      throw new Error(`Transfer failed: ${error.message}`);
    }
  }

  /**
   * Get token balance for an agent
   * @param {string} agentId - Agent ID
   * @param {string} tokenSymbol - Token symbol (optional, returns SEI balance if not provided)
   * @returns {Object} Balance information
   */
  async getAgentBalance(agentId, tokenSymbol = null) {
    try {
      const signer = await this.getAgentSigner(agentId);
      
      if (!tokenSymbol || tokenSymbol.toLowerCase() === 'sei') {
        // Get SEI balance
        const balance = await this.provider.getBalance(signer.address);
        return {
          symbol: 'SEI',
          balance: ethers.formatEther(balance),
          balanceWei: balance.toString(),
          address: signer.address
        };
      } else {
        // Get token balance
        const tokenAddress = this.tokenAddresses[tokenSymbol];
        if (!tokenAddress) {
          throw new Error(`Unsupported token: ${tokenSymbol}`);
        }

        const tokenContract = this.getTokenContract(tokenAddress, signer);
        const balance = await tokenContract.balanceOf(signer.address);
        const decimals = await tokenContract.decimals();
        
        return {
          symbol: tokenSymbol,
          balance: ethers.formatUnits(balance, decimals),
          balanceWei: balance.toString(),
          decimals: decimals,
          address: signer.address,
          tokenAddress: tokenAddress
        };
      }
    } catch (error) {
      console.error(`Error getting balance for agent ${agentId}:`, error);
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  /**
   * Get all supported tokens
   * @returns {Object} Token addresses mapping
   */
  getSupportedTokens() {
    return { ...this.tokenAddresses };
  }

  /**
   * Check if token is supported
   * @param {string} symbol - Token symbol
   * @returns {boolean} Support status
   */
  isTokenSupported(symbol) {
    return symbol in this.tokenAddresses;
  }

  /**
   * Get token address by symbol
   * @param {string} symbol - Token symbol
   * @returns {string|null} Token address or null if not supported
   */
  getTokenAddress(symbol) {
    return this.tokenAddresses[symbol] || null;
  }

  /**
   * Get pool information for a token pair
   * @param {string} tokenA - First token symbol
   * @param {string} tokenB - Second token symbol
   * @param {number} fee - Fee tier (optional)
   * @returns {Object} Pool information
   */
  async getPoolInfo(tokenA, tokenB, fee = 3000) {
    try {
      const tokenAAddress = tokenA === 'SEI' ? this.tokenAddresses['WSEI'] : this.tokenAddresses[tokenA];
      const tokenBAddress = tokenB === 'SEI' ? this.tokenAddresses['WSEI'] : this.tokenAddresses[tokenB];
      
      if (!tokenAAddress || !tokenBAddress) {
        throw new Error(`Unsupported token pair: ${tokenA}/${tokenB}`);
      }

      const agenticRouter = new ethers.Contract(this.agenticRouterAddress, this.agenticRouterABI, this.provider);
      
      const poolInfo = await agenticRouter.getPoolInfo(tokenAAddress, tokenBAddress, fee);
      
      return {
        exists: poolInfo.exists,
        poolAddress: poolInfo.poolAddress,
        liquidity: poolInfo.liquidity.toString(),
        sqrtPriceX96: poolInfo.sqrtPriceX96.toString(),
        tokenA: tokenA,
        tokenB: tokenB,
        fee: fee
      };
      
    } catch (error) {
      console.error(`Error getting pool info for ${tokenA}/${tokenB}:`, error);
      throw new Error(`Failed to get pool info: ${error.message}`);
    }
  }
}

module.exports = new SeiSmartContractService();
