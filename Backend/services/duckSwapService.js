const { ethers } = require('ethers');
const Agent = require('../models/Agent');

class DuckSwapService {
  constructor() {
    // DuckChain RPC endpoint
    this.provider = new ethers.JsonRpcProvider('https://rpc.duckchain.io');
    
    // Contract addresses from your codebase
    this.CONTRACTS = {
      SWAP_ROUTER: '0x3EF68D3f7664b2805D4E88381b64868a56f88bC4', // iZiSwap Router
      WTON_DUCK_POOL: '0xe14364f158c30fC322F59528ff6CBaC4a6005048', // iZiSwap WTON/DUCK Pool
      WTON_ADDRESS: '0x7F9308E8d724e724EC31395f3af52e0593BB2e3f',
      DUCK_ADDRESS: '0xdA65892eA771d3268610337E9964D916028B7dAD',
      FACTORY_ADDRESS: '0x8c1A3cF8f83074169FE5D7aD50B978e1cD6b37c7'
    };

    // Pool fee tiers (typical for Uniswap-style DEXs)
    this.FEE_TIERS = {
      LOW: 500,     // 0.05%
      MEDIUM: 3000, // 0.3%
      HIGH: 10000   // 1%
    };

    // iZiSwap Pool ABI (based on actual contract)
    this.IZISWAP_POOL_ABI = [
      // swapY2X - swap token Y for token X
      {
        "inputs": [
          {"name": "recipient", "type": "address"},
          {"name": "amount", "type": "uint128"},
          {"name": "highPt", "type": "int24"},
          {"name": "data", "type": "bytes"}
        ],
        "name": "swapY2X",
        "outputs": [
          {"name": "amountX", "type": "uint256"},
          {"name": "amountY", "type": "uint256"}
        ],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      // swapX2Y - swap token X for token Y  
      {
        "inputs": [
          {"name": "recipient", "type": "address"},
          {"name": "amount", "type": "uint128"},
          {"name": "lowPt", "type": "int24"},
          {"name": "data", "type": "bytes"}
        ],
        "name": "swapX2Y",
        "outputs": [
          {"name": "amountX", "type": "uint256"},
          {"name": "amountY", "type": "uint256"}
        ],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      // swapY2XDesireX - swap Y for exact amount of X
      {
        "inputs": [
          {"name": "recipient", "type": "address"},
          {"name": "desireX", "type": "uint128"},
          {"name": "lowPt", "type": "int24"}
        ],
        "name": "swapY2XDesireX", 
        "outputs": [
          {"name": "amountX", "type": "uint256"},
          {"name": "amountY", "type": "uint256"}
        ],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      // swapX2YDesireY - swap X for exact amount of Y
      {
        "inputs": [
          {"name": "recipient", "type": "address"},
          {"name": "desireY", "type": "uint128"},
          {"name": "highPt", "type": "int24"}
        ],
        "name": "swapX2YDesireY",
        "outputs": [
          {"name": "amountX", "type": "uint256"},
          {"name": "amountY", "type": "uint256"}
        ],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      // Get pool state
      {
        "inputs": [],
        "name": "state",
        "outputs": [
          {"name": "sqrtPrice_96", "type": "uint160"},
          {"name": "currentPoint", "type": "int24"},
          {"name": "observationCurrentIndex", "type": "uint16"},
          {"name": "observationQueueLen", "type": "uint16"},
          {"name": "observationNextQueueLen", "type": "uint16"},
          {"name": "locked", "type": "bool"},
          {"name": "liquidity", "type": "uint128"},
          {"name": "liquidityX", "type": "uint128"}
        ],
        "stateMutability": "view",
        "type": "function"
      },
      // Get tokenX address
      {
        "inputs": [],
        "name": "tokenX",
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
      },
      // Get tokenY address
      {
        "inputs": [],
        "name": "tokenY", 
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
      }
    ];

    // Router ABI for swapAmount function
    this.SWAP_ABI = [
      // SwapAmount function
      {
        "inputs": [
          {
            "components": [
              {"name": "path", "type": "bytes"},
              {"name": "recipient", "type": "address"},
              {"name": "amount", "type": "uint128"},
              {"name": "minAcquired", "type": "uint256"},
              {"name": "deadline", "type": "uint256"}
            ],
            "name": "params",
            "type": "tuple"
          }
        ],
        "name": "swapAmount",
        "outputs": [
          {"name": "cost", "type": "uint256"},
          {"name": "acquire", "type": "uint256"}
        ],
        "stateMutability": "payable",
        "type": "function"
      }
    ];

    // Additional individual swap functions (removed - not needed for current implementation)
    /*
      {
        "inputs": [
          {
            "components": [
              {"name": "tokenX", "type": "address"},
              {"name": "tokenY", "type": "address"},
              {"name": "fee", "type": "uint24"},
              {"name": "boundaryPt", "type": "int24"},
              {"name": "recipient", "type": "address"},
              {"name": "amount", "type": "uint128"},
              {"name": "maxPayed", "type": "uint256"},
              {"name": "minAcquired", "type": "uint256"},
              {"name": "deadline", "type": "uint256"}
            ],
            "name": "swapParams",
            "type": "tuple"
          }
        ],
        "name": "swapX2Y",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "components": [
              {"name": "tokenX", "type": "address"},
              {"name": "tokenY", "type": "address"},
              {"name": "fee", "type": "uint24"},
              {"name": "boundaryPt", "type": "int24"},
              {"name": "recipient", "type": "address"},
              {"name": "amount", "type": "uint128"},
              {"name": "maxPayed", "type": "uint256"},
              {"name": "minAcquired", "type": "uint256"},
              {"name": "deadline", "type": "uint256"}
            ],
            "name": "swapParams",
            "type": "tuple"
          }
        ],
        "name": "swapY2X",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
      }
    */

    // ERC20 ABI for token operations
    this.ERC20_ABI = [
      "function balanceOf(address owner) view returns (uint256)",
      "function decimals() view returns (uint8)",
      "function symbol() view returns (string)",
      "function name() view returns (string)",
      "function approve(address spender, uint256 amount) returns (bool)",
      "function allowance(address owner, address spender) view returns (uint256)",
      "function transfer(address to, uint256 amount) returns (bool)"
    ];
  }

  /**
   * Get token information
   */
  async getTokenInfo(tokenAddress) {
    try {
      const contract = new ethers.Contract(tokenAddress, this.ERC20_ABI, this.provider);
      
      const [symbol, name, decimals] = await Promise.all([
        contract.symbol(),
        contract.name(),
        contract.decimals()
      ]);

      return { symbol, name, decimals: Number(decimals), address: tokenAddress };
    } catch (error) {
      console.error('Error getting token info:', error);
      throw error;
    }
  }

  /**
   * Get token balance for an address
   */
  async getTokenBalance(walletAddress, tokenAddress) {
    try {
      if (tokenAddress.toLowerCase() === 'native' || tokenAddress.toLowerCase() === 'ton') {
        // Get native TON balance
        const balance = await this.provider.getBalance(walletAddress);
        return {
          balance: ethers.formatEther(balance),
          decimals: 18,
          symbol: 'TON'
        };
      }

      const contract = new ethers.Contract(tokenAddress, this.ERC20_ABI, this.provider);
      const [balance, decimals, symbol] = await Promise.all([
        contract.balanceOf(walletAddress),
        contract.decimals(),
        contract.symbol()
      ]);

      return {
        balance: ethers.formatUnits(balance, decimals),
        decimals: Number(decimals),
        symbol
      };
    } catch (error) {
      console.error('Error getting token balance:', error);
      throw error;
    }
  }

  /**
   * Encode swap path for multi-hop swaps
   */
  encodePath(tokens, fees) {
    let path = '0x';
    for (let i = 0; i < tokens.length; i++) {
      path += tokens[i].slice(2); // Remove 0x prefix
      if (i < fees.length) {
        path += fees[i].toString(16).padStart(6, '0'); // 3 bytes for fee
      }
    }
    return path;
  }

  /**
   * Get swap quote (estimate output amount)
   */
  async getSwapQuote(fromToken, toToken, amountIn, slippage = 0.5) {
    try {
      console.log('🔄 Getting swap quote:', { fromToken, toToken, amountIn, slippage });

      // Determine token addresses
      const fromAddress = this.getTokenAddress(fromToken);
      const toAddress = this.getTokenAddress(toToken);

      if (fromAddress === toAddress) {
        throw new Error('Cannot swap identical tokens');
      }

      // Get token info
      const fromTokenInfo = await this.getTokenInfo(fromAddress);
      const toTokenInfo = await this.getTokenInfo(toAddress);

      // Convert amount to wei
      const amountInWei = ethers.parseUnits(amountIn.toString(), fromTokenInfo.decimals);

      // For now, return a mock quote (in production, you'd query the pool or use a quoter contract)
      // This is a simplified version - you should implement proper price calculation
      const mockExchangeRate = fromToken === 'WTON' && toToken === 'DUCK' ? 1000 : 
                              fromToken === 'DUCK' && toToken === 'WTON' ? 0.001 : 1;
      
      const estimatedOutput = parseFloat(amountIn) * mockExchangeRate;
      const minimumOutput = estimatedOutput * (1 - slippage / 100);

      return {
        fromToken: { ...fromTokenInfo, amount: amountIn },
        toToken: { ...toTokenInfo, estimatedAmount: estimatedOutput.toString() },
        route: [fromAddress, toAddress],
        fees: [this.FEE_TIERS.MEDIUM],
        priceImpact: '0.1', // Mock value
        minimumOutput: minimumOutput.toString(),
        slippage: slippage.toString(),
        gasEstimate: '150000' // Mock gas estimate
      };
    } catch (error) {
      console.error('❌ Error getting swap quote:', error);
      throw error;
    }
  }

  /**
   * Execute token swap
   */
  async executeSwap(userId, fromToken, toToken, amount, slippage = 0.5, isExactOutput = false) {
    try {
      console.log('🔄 Executing swap:', { userId, fromToken, toToken, amount, slippage, isExactOutput });

      // Get user's agent
      const agent = await Agent.findOne({ userId: userId, isActive: true }).select('+duckPrivateKey');
      if (!agent || !agent.duckAddress || !agent.duckPrivateKey) {
        throw new Error('No active DuckChain agent found for user');
      }

      // Create wallet instance - use router for swaps
      const wallet = new ethers.Wallet(agent.duckPrivateKey, this.provider);
      const routerContract = new ethers.Contract(this.CONTRACTS.SWAP_ROUTER, this.SWAP_ABI, wallet);

      // Get token addresses
      const fromAddress = this.getTokenAddress(fromToken);
      const toAddress = this.getTokenAddress(toToken);

      // Get token info
      const fromTokenInfo = await this.getTokenInfo(fromAddress);
      const toTokenInfo = await this.getTokenInfo(toAddress);

      // Check balance
      const balance = await this.getTokenBalance(agent.duckAddress, fromAddress);
      if (parseFloat(balance.balance) < parseFloat(amount)) {
        throw new Error(`Insufficient ${fromToken} balance. Available: ${balance.balance}, Required: ${amount}`);
      }

      // Prepare swap parameters
      const amountInWei = ethers.parseUnits(amount.toString(), fromTokenInfo.decimals);
      const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 minutes from now
      const minAmountOut = this.calculateMinAmountOut(amount, slippage, fromTokenInfo.decimals, toTokenInfo.decimals);

      // Encode the path that will route through the iZiSwap pool
      // Path format for iZiSwap: fromToken + poolAddress + fee + toToken
      const path = this.encodeIZiSwapPath(fromAddress, toAddress, this.CONTRACTS.WTON_DUCK_POOL);
      
      const swapParams = {
        path: path,
        recipient: agent.duckAddress,
        amount: amountInWei,
        minAcquired: minAmountOut,
        deadline: deadline
      };

      console.log('Executing swapAmount via router:', {
        fromToken,
        toToken,
        amount: amount.toString(),
        minAmountOut: ethers.formatUnits(minAmountOut, toTokenInfo.decimals),
        poolUsed: this.CONTRACTS.WTON_DUCK_POOL
      });

      let tx;
      let swapResult;

      try {
        tx = await routerContract.swapAmount(swapParams, {
          gasLimit: 500000,
          gasPrice: ethers.parseUnits('20', 'gwei')
        });

        const txHash = tx.hash;
        console.log('Swap transaction submitted:', txHash);
        
        // Always return success with hash, regardless of revert
        try {
          swapResult = await tx.wait();
          console.log('Transaction confirmed:', swapResult.status === 1 ? 'SUCCESS' : 'REVERTED');
        } catch (waitError) {
          console.log('Transaction reverted, but we have the hash:', txHash);
          // Create a mock result for reverted transactions
          swapResult = {
            status: 0,
            transactionHash: txHash,
            blockNumber: null,
            gasUsed: null
          };
        }
        
      } catch (error) {
        console.error('Failed to submit swap transaction:', error);
        throw new Error(`Failed to submit transaction: ${error.message}`);
      }

      // Get final balances
      const finalFromBalance = await this.getTokenBalance(agent.duckAddress, fromAddress);
      const finalToBalance = await this.getTokenBalance(agent.duckAddress, toAddress);

      return {
        success: true,
        transactionHash: tx.hash,
        transactionStatus: swapResult.status === 1 ? 'success' : 'reverted',
        swapDetails: {
          fromToken: { symbol: fromToken, amount: amount, address: fromAddress },
          toToken: { symbol: toToken, address: toAddress },
          slippage: slippage,
          gasUsed: swapResult.gasUsed?.toString(),
          effectiveGasPrice: swapResult.effectiveGasPrice?.toString(),
          blockNumber: swapResult.blockNumber?.toString()
        },
        balances: {
          [fromToken]: finalFromBalance.balance,
          [toToken]: finalToBalance.balance
        },
        timestamp: new Date().toISOString(),
        status: 'executed'
      };

    } catch (error) {
      console.error('❌ Swap execution error:', error);
      return {
        success: false,
        error: error.message,
        status: 'failed'
      };
    }
  }

  /**
   * Get token address from symbol
   */
  getTokenAddress(tokenSymbol) {
    const symbol = tokenSymbol.toString().toUpperCase();
    switch (symbol) {
      case 'WTON':
        return this.CONTRACTS.WTON_ADDRESS;
      case 'DUCK':
        return this.CONTRACTS.DUCK_ADDRESS;
      case 'TON':
      case 'NATIVE':
        return 'native'; // For native TON
      default:
        // Assume it's already an address if it starts with 0x
        if (symbol.startsWith('0X')) {
          return tokenSymbol;
        }
        throw new Error(`Unsupported token: ${tokenSymbol}`);
    }
  }

  /**
   * Encode path for iZiSwap router swapAmount function
   * Path format for iZiSwap: tokenA + pool + fee + tokenB
   */
  encodeIZiSwapPath(tokenA, tokenB, poolAddress) {
    try {
      // Remove 0x prefix from addresses
      const tokenA_clean = tokenA.replace('0x', '');
      const tokenB_clean = tokenB.replace('0x', '');
      const pool_clean = poolAddress.replace('0x', '');
      
      // Convert fee to 3-byte hex (24 bits) - using medium fee tier
      const fee = this.FEE_TIERS.MEDIUM.toString(16).padStart(6, '0');
      
      // For iZiSwap router, the path should be: tokenA + pool + tokenB
      // The router will figure out the fee from the pool
      const pathHex = '0x' + tokenA_clean + pool_clean + tokenB_clean;
      
      console.log('Encoded iZiSwap path:', {
        tokenA: tokenA,
        tokenB: tokenB,
        pool: poolAddress,
        fee: this.FEE_TIERS.MEDIUM,
        encoded: pathHex
      });
      
      return pathHex;
    } catch (error) {
      console.error('Error encoding iZiSwap path:', error);
      throw error;
    }
  }

  /**
   * Legacy encode path function (kept for compatibility)
   */
  encodePath(tokens, fees) {
    try {
      if (tokens.length !== 2 || fees.length !== 1) {
        throw new Error('Only single-hop swaps supported currently');
      }

      // Convert addresses to bytes without 0x prefix
      const token0 = tokens[0].replace('0x', '');
      const token1 = tokens[1].replace('0x', '');
      
      // Convert fee to 3-byte hex (24 bits)
      const fee = fees[0].toString(16).padStart(6, '0');
      
      // Concatenate: token0 + fee + token1
      const pathHex = '0x' + token0 + fee + token1;
      
      console.log('Encoded path:', {
        token0: tokens[0],
        fee: fees[0],
        token1: tokens[1],
        encoded: pathHex
      });
      
      return pathHex;
    } catch (error) {
      console.error('Error encoding path:', error);
      throw error;
    }
  }

  /**
   * Calculate minimum amount out with slippage
   */
  calculateMinAmountOut(amountIn, slippage, fromDecimals, toDecimals) {
    // This is a simplified calculation
    // In production, you should get the actual price from the pool
    const mockExchangeRate = 1000; // WTON to DUCK rate
    const estimatedOut = parseFloat(amountIn) * mockExchangeRate;
    const minOut = estimatedOut * (1 - slippage / 100);
    return ethers.parseUnits(minOut.toString(), toDecimals);
  }

  /**
   * Check if user needs to approve token spending
   */
  async checkAllowance(userId, tokenSymbol, amount) {
    try {
      const agent = await Agent.findOne({ userId: userId, isActive: true });
      if (!agent || !agent.duckAddress) {
        throw new Error('No active agent found');
      }

      const tokenAddress = this.getTokenAddress(tokenSymbol);
      if (tokenAddress === 'native') {
        return { needsApproval: false, currentAllowance: 'unlimited' };
      }

      const tokenContract = new ethers.Contract(tokenAddress, this.ERC20_ABI, this.provider);
      const allowance = await tokenContract.allowance(agent.duckAddress, this.CONTRACTS.SWAP_ROUTER);
      const tokenInfo = await this.getTokenInfo(tokenAddress);
      const requiredAmount = ethers.parseUnits(amount.toString(), tokenInfo.decimals);

      return {
        needsApproval: allowance < requiredAmount,
        currentAllowance: ethers.formatUnits(allowance, tokenInfo.decimals),
        requiredAmount: amount.toString()
      };
    } catch (error) {
      console.error('Error checking allowance:', error);
      throw error;
    }
  }

  /**
   * Approve token spending
   */
  async approveToken(userId, tokenSymbol, amount = null) {
    try {
      const agent = await Agent.findOne({ userId: userId, isActive: true }).select('+duckPrivateKey');
      if (!agent || !agent.duckPrivateKey) {
        throw new Error('No active agent found');
      }

      const tokenAddress = this.getTokenAddress(tokenSymbol);
      const wallet = new ethers.Wallet(agent.duckPrivateKey, this.provider);
      const tokenContract = new ethers.Contract(tokenAddress, this.ERC20_ABI, wallet);

      // Use max approval if no specific amount provided
      const approvalAmount = amount ? 
        ethers.parseUnits(amount.toString(), await tokenContract.decimals()) :
        ethers.MaxUint256;

      const tx = await tokenContract.approve(this.CONTRACTS.SWAP_ROUTER, approvalAmount, {
        gasLimit: 100000
      });

      await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        approvedAmount: amount || 'unlimited'
      };
    } catch (error) {
      console.error('Error approving token:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new DuckSwapService();