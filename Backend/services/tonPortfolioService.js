/**
 * DuckChain Portfolio Service
 * Handles DuckChain EVM network wallet balance and portfolio information
 * TON is the native coin on DuckChain, DUCK is an ERC-20 token
 * Integrates with MCP for price data
 */

const { ethers } = require('ethers');
const MCPMarketDataService = require('./mcpMarketDataService');

class TonPortfolioService {
  constructor() {
    // Initialize DuckChain RPC provider (ethers v6 syntax)
    this.provider = new ethers.JsonRpcProvider('https://rpc.duckchain.io');
    this.chainId = 5545; // DuckChain chain ID

    // Initialize MCP service for price data
    this.mcpService = new MCPMarketDataService();

    // Token configurations for DuckChain EVM
    this.tokens = {
      TON: {
        symbol: 'TON',
        name: 'Toncoin',
        decimals: 18, // Standard EVM decimals
        isNative: true,
        geckoId: 'the-open-network',
        contractAddress: null // Native coin
      },
      DUCK: {
        symbol: 'DUCK',
        name: 'DUCK Token',
        decimals: 18, // Standard ERC-20 decimals
        isNative: false,
        geckoId: 'duckcoin',
        contractAddress: '0xdA65892eA771d3268610337E9964D916028B7dAD' // DUCK ERC-20 contract
      }
    };

    // ERC-20 ABI for token balance calls
    this.erc20Abi = [
      'function balanceOf(address owner) view returns (uint256)',
      'function decimals() view returns (uint8)',
      'function symbol() view returns (string)',
      'function name() view returns (string)'
    ];
  }

  /**
   * Get comprehensive portfolio information for a wallet
   * @param {string} walletAddress - TON wallet address
   * @returns {Promise<Object>} Portfolio data with balances and USD values
   */
  async getPortfolioBalance(walletAddress) {
    try {
      console.log(`🔍 Fetching TON portfolio for address: ${walletAddress}`);

      // Get native TON balance and token balances in parallel
      const [tonBalance, tokenBalances, prices] = await Promise.all([
        this.getNativeBalance(walletAddress),
        this.getTokenBalances(walletAddress),
        this.getPrices(['TON', 'DUCK'])
      ]);

      // Calculate portfolio summary
      const portfolio = {
        address: walletAddress,
        timestamp: new Date().toISOString(),
        nativeBalance: {
          symbol: 'TON',
          balance: tonBalance.balance,
          balanceFormatted: tonBalance.balanceFormatted,
          usdPrice: prices.TON?.price || 0,
          usdValue: this.calculateUsdValueFromFormatted(tonBalance.balanceFormatted, prices.TON?.price || 0)
        },
        tokenBalances: [],
        totalUsdValue: 0,
        priceData: prices
      };

      // Process ERC-20 token balances
      if (tokenBalances.length > 0) {
        for (const token of tokenBalances) {
          const tokenBalance = {
            symbol: token.symbol,
            name: token.name,
            contractAddress: token.contractAddress,
            balance: token.balance,
            balanceFormatted: token.balanceFormatted,
            decimals: token.decimals,
            usdPrice: prices[token.symbol]?.price || 0,
            usdValue: this.calculateUsdValueFromFormatted(token.balanceFormatted, prices[token.symbol]?.price || 0),
            isERC20: token.isERC20,
            error: token.error || null
          };
          portfolio.tokenBalances.push(tokenBalance);
        }
      }

      // Calculate total USD value
      portfolio.totalUsdValue = portfolio.nativeBalance.usdValue + 
        portfolio.tokenBalances.reduce((sum, token) => sum + token.usdValue, 0);

      console.log(`✅ Portfolio fetched successfully. Total value: $${portfolio.totalUsdValue.toFixed(2)}`);
      return portfolio;

    } catch (error) {
      console.error('❌ Error fetching TON portfolio:', error);
      throw new Error(`Failed to fetch portfolio: ${error.message}`);
    }
  }

  /**
   * Get specific token balance
   * @param {string} walletAddress - TON wallet address
   * @param {string} tokenSymbol - Token symbol (TON, DUCK)
   * @returns {Promise<Object>} Token balance with USD value
   */
  async getTokenBalance(walletAddress, tokenSymbol) {
    try {
      console.log(`🔍 Fetching ${tokenSymbol} balance for: ${walletAddress}`);

      if (tokenSymbol.toUpperCase() === 'TON') {
        // Native TON balance
        const tonBalance = await this.getNativeBalance(walletAddress);
        const prices = await this.getPrices(['TON']);
        
        return {
          symbol: 'TON',
          balance: tonBalance.balance,
          balanceFormatted: tonBalance.balanceFormatted,
          usdPrice: prices.TON?.price || 0,
          usdValue: this.calculateUsdValueFromFormatted(tonBalance.balanceFormatted, prices.TON?.price || 0),
          timestamp: new Date().toISOString()
        };
      } else {
        // Token balance (like DUCK)
        const tokenBalances = await this.getTokenBalances(walletAddress);
        const tokenConfig = this.tokens[tokenSymbol.toUpperCase()];
        
        if (!tokenConfig) {
          throw new Error(`Unsupported token: ${tokenSymbol}`);
        }

        // Find the specific token
        const tokenData = tokenBalances.find(token => 
          token.contractAddress.toLowerCase() === tokenConfig.contractAddress.toLowerCase()
        );

        const prices = await this.getPrices([tokenSymbol.toUpperCase()]);
        
        if (tokenData && parseFloat(tokenData.balanceFormatted) > 0) {
          return {
            symbol: tokenData.symbol,
            name: tokenData.name,
            contractAddress: tokenData.contractAddress,
            balance: tokenData.balance,
            balanceFormatted: tokenData.balanceFormatted,
            decimals: tokenData.decimals,
            usdPrice: prices[tokenConfig.symbol]?.price || 0,
            usdValue: this.calculateUsdValueFromFormatted(tokenData.balanceFormatted, prices[tokenConfig.symbol]?.price || 0),
            timestamp: new Date().toISOString(),
            isERC20: true
          };
        } else {
          return {
            symbol: tokenConfig.symbol,
            name: tokenConfig.name,
            contractAddress: tokenConfig.contractAddress,
            balance: '0',
            balanceFormatted: '0.00',
            decimals: tokenConfig.decimals,
            usdPrice: prices[tokenConfig.symbol]?.price || 0,
            usdValue: 0,
            timestamp: new Date().toISOString(),
            isERC20: true
          };
        }
      }

    } catch (error) {
      console.error(`❌ Error fetching ${tokenSymbol} balance:`, error);
      throw new Error(`Failed to fetch ${tokenSymbol} balance: ${error.message}`);
    }
  }

  /**
   * Get native TON balance from DuckChain EVM
   * @param {string} walletAddress - EVM wallet address (0x...)
   * @returns {Promise<Object>} Native balance information
   */
  async getNativeBalance(walletAddress) {
    try {
      console.log(`🔍 Fetching native TON balance for ${walletAddress} on DuckChain`);
      
      // Get native balance using ethers
      const balance = await this.provider.getBalance(walletAddress);
      const blockNumber = await this.provider.getBlockNumber();
      
      return {
        balance: balance.toString(),
        balanceFormatted: ethers.formatEther(balance),
        blockNumber,
        network: 'duckchain'
      };
    } catch (error) {
      console.error('Error fetching native TON balance from DuckChain:', error);
      throw new Error(`Failed to fetch TON balance: ${error.message}`);
    }
  }

  /**
   * Get ERC-20 token balances for the wallet on DuckChain
   * @param {string} walletAddress - EVM wallet address (0x...)
   * @returns {Promise<Array>} Array of token balances
   */
  async getTokenBalances(walletAddress) {
    try {
      console.log(`🔍 Fetching ERC-20 token balances for ${walletAddress} on DuckChain`);
      
      const tokenBalances = [];
      
      // Get balances for all configured ERC-20 tokens
      for (const [symbol, tokenConfig] of Object.entries(this.tokens)) {
        if (!tokenConfig.isNative && tokenConfig.contractAddress) {
          try {
            const contract = new ethers.Contract(
              tokenConfig.contractAddress,
              this.erc20Abi,
              this.provider
            );
            
            // Get token balance
            const balance = await contract.balanceOf(walletAddress);
            
            // Get token info (decimals, symbol, name)
            const [decimals, contractSymbol, contractName] = await Promise.all([
              contract.decimals(),
              contract.symbol(),
              contract.name()
            ]);
            
            tokenBalances.push({
              symbol: contractSymbol || tokenConfig.symbol,
              name: contractName || tokenConfig.name,
              contractAddress: tokenConfig.contractAddress,
              balance: balance.toString(),
              balanceFormatted: ethers.formatUnits(balance, decimals),
              decimals: decimals,
              isERC20: true
            });
            
          } catch (tokenError) {
            console.warn(`⚠️ Could not fetch ${symbol} balance:`, tokenError.message);
            // Add zero balance for tokens that fail to load
            tokenBalances.push({
              symbol: tokenConfig.symbol,
              name: tokenConfig.name,
              contractAddress: tokenConfig.contractAddress,
              balance: '0',
              balanceFormatted: '0',
              decimals: tokenConfig.decimals,
              isERC20: true,
              error: tokenError.message
            });
          }
        }
      }
      
      return tokenBalances;
      
    } catch (error) {
      console.error('Error fetching ERC-20 token balances:', error);
      return [];
    }
  }

  /**
   * Get prices for multiple tokens using MCP service
   * @param {Array<string>} symbols - Array of token symbols
   * @returns {Promise<Object>} Prices object with symbol as key
   */
  async getPrices(symbols) {
    try {
      console.log(`💰 Fetching prices for: ${symbols.join(', ')}`);
      
      const prices = {};
      
      for (const symbol of symbols) {
        try {
          if (symbol === 'TON') {
            // Get TON price from MCP (WTON/USDT pair)
            const tonPrice = await this.mcpService.getTokenPrice('wton', 'usdt', 'ton');
            prices.TON = {
              symbol: 'TON',
              price: tonPrice?.price || 0,
              priceChange24h: tonPrice?.priceChange24h || 0,
              source: 'mcp-ton-network',
              timestamp: new Date().toISOString()
            };
          } else if (symbol === 'DUCK') {
            // Get DUCK price from MCP (DUCK/USDT pair)
            const duckPrice = await this.mcpService.getTokenPrice('duck', 'usdt', 'ton');
            prices.DUCK = {
              symbol: 'DUCK',
              price: duckPrice?.price || 0,
              priceChange24h: duckPrice?.priceChange24h || 0,
              source: 'mcp-ton-network',
              timestamp: new Date().toISOString()
            };
          }
        } catch (priceError) {
          console.warn(`⚠️ Could not fetch price for ${symbol}:`, priceError.message);
          prices[symbol] = {
            symbol,
            price: 0,
            priceChange24h: 0,
            source: 'unavailable',
            timestamp: new Date().toISOString(),
            error: priceError.message
          };
        }
      }

      return prices;

    } catch (error) {
      console.error('❌ Error fetching prices:', error);
      // Return zero prices for all symbols if price fetching fails
      const fallbackPrices = {};
      symbols.forEach(symbol => {
        fallbackPrices[symbol] = {
          symbol,
          price: 0,
          priceChange24h: 0,
          source: 'error',
          timestamp: new Date().toISOString(),
          error: error.message
        };
      });
      return fallbackPrices;
    }
  }

  /**
   * Get token configuration by contract address
   * @param {string} contractAddress - Token contract address
   * @returns {Object|null} Token configuration
   */
  getTokenConfig(contractAddress) {
    return Object.values(this.tokens).find(token => 
      token.contractAddress && 
      token.contractAddress.toLowerCase() === contractAddress.toLowerCase()
    );
  }

  /**
   * Format balance with proper decimals
   * @param {string} balance - Raw balance string
   * @param {number} decimals - Token decimals
   * @returns {string} Formatted balance
   */
  formatBalance(balance, decimals) {
    try {
      const divisor = Math.pow(10, decimals);
      const formatted = (parseInt(balance) / divisor).toFixed(6);
      // Remove trailing zeros
      return parseFloat(formatted).toString();
    } catch (error) {
      console.error('Error formatting balance:', error);
      return '0';
    }
  }

  /**
   * Calculate USD value from formatted balance
   * @param {string} balanceFormatted - Already formatted balance (e.g., "1.234")
   * @param {number} usdPrice - USD price per token
   * @returns {number} USD value
   */
  calculateUsdValueFromFormatted(balanceFormatted, usdPrice) {
    try {
      const balanceFloat = parseFloat(balanceFormatted);
      return balanceFloat * (usdPrice || 0);
    } catch (error) {
      console.error('Error calculating USD value:', error);
      return 0;
    }
  }

  /**
   * Calculate USD value (legacy method for compatibility)
   * @param {string} balance - Raw balance
   * @param {number} decimals - Token decimals  
   * @param {number} usdPrice - USD price per token
   * @returns {number} USD value
   */
  calculateUsdValue(balance, decimals, usdPrice) {
    try {
      const balanceFloat = parseInt(balance) / Math.pow(10, decimals);
      return balanceFloat * (usdPrice || 0);
    } catch (error) {
      console.error('Error calculating USD value:', error);
      return 0;
    }
  }

  /**
   * Get portfolio summary with analytics
   * @param {string} walletAddress - TON wallet address
   * @returns {Promise<Object>} Portfolio analytics
   */
  async getPortfolioSummary(walletAddress) {
    try {
      const portfolio = await this.getPortfolioBalance(walletAddress);
      
      // Calculate additional metrics
      const summary = {
        ...portfolio,
        analytics: {
          tokenCount: portfolio.tokenBalances.length + (portfolio.nativeBalance.balance !== '0' ? 1 : 0),
          largestHolding: this.getLargestHolding(portfolio),
          diversification: this.calculateDiversification(portfolio),
          totalGainLoss24h: this.calculateDailyGainLoss(portfolio)
        }
      };

      return summary;

    } catch (error) {
      console.error('❌ Error generating portfolio summary:', error);
      throw new Error(`Failed to generate portfolio summary: ${error.message}`);
    }
  }

  /**
   * Get the largest holding by USD value
   * @param {Object} portfolio - Portfolio data
   * @returns {Object} Largest holding info
   */
  getLargestHolding(portfolio) {
    const holdings = [
      { ...portfolio.nativeBalance, type: 'native' },
      ...portfolio.tokenBalances.map(token => ({ ...token, type: 'token' }))
    ];

    return holdings.reduce((largest, current) => 
      current.usdValue > largest.usdValue ? current : largest, 
      holdings[0] || { usdValue: 0 }
    );
  }

  /**
   * Calculate portfolio diversification
   * @param {Object} portfolio - Portfolio data
   * @returns {Object} Diversification metrics
   */
  calculateDiversification(portfolio) {
    if (portfolio.totalUsdValue === 0) {
      return { herfindahlIndex: 0, isWellDiversified: false };
    }

    const holdings = [
      portfolio.nativeBalance,
      ...portfolio.tokenBalances
    ];

    // Calculate Herfindahl Index (concentration measure)
    let herfindahlIndex = 0;
    holdings.forEach(holding => {
      const percentage = holding.usdValue / portfolio.totalUsdValue;
      herfindahlIndex += percentage * percentage;
    });

    return {
      herfindahlIndex,
      isWellDiversified: herfindahlIndex < 0.25, // Less than 25% concentration
      dominantAsset: holdings.find(h => (h.usdValue / portfolio.totalUsdValue) > 0.5)?.symbol || null
    };
  }

  /**
   * Calculate daily gain/loss based on 24h price changes
   * @param {Object} portfolio - Portfolio data
   * @returns {number} Total daily gain/loss in USD
   */
  calculateDailyGainLoss(portfolio) {
    let totalGainLoss = 0;

    // Native balance gain/loss
    if (portfolio.nativeBalance.usdValue > 0 && portfolio.priceData.TON?.priceChange24h) {
      const dailyChange = (portfolio.priceData.TON.priceChange24h / 100) * portfolio.nativeBalance.usdValue;
      totalGainLoss += dailyChange;
    }

    // Token balances gain/loss
    portfolio.tokenBalances.forEach(token => {
      const priceData = portfolio.priceData[token.symbol];
      if (token.usdValue > 0 && priceData?.priceChange24h) {
        const dailyChange = (priceData.priceChange24h / 100) * token.usdValue;
        totalGainLoss += dailyChange;
      }
    });

    return totalGainLoss;
  }
}

module.exports = TonPortfolioService;