/**
 * Test Pool Data Fetching for SEI Network
 * 
 * Tests fetching real-time pool data from GeckoTerminal API
 * Pool address: 0xb243320bcf9c95DB7F74108B6773b8F4Dc3adaF5
 */

const { SimpleAgent, Utils } = require('./dist/src/SimpleAgent');
const { ethers } = require('ethers');
const axios = require('axios');

// SEI Network tokens with their addresses
const SEI_TOKENS = [
  {
    "symbol": "ETH",
    "price": "3674.19000000",
    "dailychange": "-4.203",
    "id": "0x160345fc359604fc6e70e3c5facbde5f7a9342d8"
  },
  {
    "symbol": "BTC", 
    "price": "118604.10000000",
    "dailychange": "-0.113",
    "id": "0x0555e30da8f98308edb960aa94c0db47230d2b9c"
  },
  {
    "symbol": "SEI",
    "price": "0.33950000", 
    "dailychange": "-6.910",
    "id": "0x0000000000000000000000000000000000000000"
  },
  {
    "symbol": "USDC",
    "price": 1,
    "dailychange": 0,
    "id": "0x3894085ef7ff0f0aedf52e2a2704928d1ec074f1"
  }
];

// Configuration
const POOL_ADDRESS = '0xb243320bcf9c95DB7F74108B6773b8F4Dc3adaF5';
const GECKO_API_BASE = 'https://api.geckoterminal.com/api/v2/networks/sei-evm';

/**
 * Fetch pool data for a specific token address
 */
async function fetchTokenPools(tokenAddress) {
  try {
    console.log(`\n🔍 Fetching pools for token: ${tokenAddress}`);
    
    const url = `${GECKO_API_BASE}/tokens/${tokenAddress}/pools?page=1`;
    console.log(`📡 API URL: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mariposa-Agent-SDK/1.0.0'
      }
    });
    
    if (response.data && response.data.data) {
      // Filter for Sailor DEX only
      const sailorPools = response.data.data.filter(pool => 
        pool.relationships.dex.data.id === 'sailor'
      );
      
      console.log(`✅ Found ${sailorPools.length} Sailor pools for token`);
      return sailorPools;
    }
    
    return [];
    
  } catch (error) {
    console.error(`❌ Failed to fetch pools for ${tokenAddress}:`, error.message);
    return [];
  }
}

/**
 * Get real-time market data for all SEI tokens
 */
async function getAllSEIMarketData() {
  console.log('📊 Fetching real-time market data for all SEI tokens...');
  console.log('🔄 Processing tokens:', SEI_TOKENS.map(t => t.symbol).join(', '));
  
  const marketData = {
    timestamp: new Date().toISOString(),
    tokens: [],
    pools: [],
    summary: {
      totalLiquidity: 0,
      totalVolume24h: 0,
      activeTokens: 0
    }
  };
  
  for (const token of SEI_TOKENS) {
    console.log(`\n💰 Processing ${token.symbol} (${token.id})`);
    
    const pools = await fetchTokenPools(token.id);
    
    const tokenData = {
      symbol: token.symbol,
      address: token.id,
      price: parseFloat(token.price),
      dailyChange: parseFloat(token.dailychange),
      pools: pools.map(pool => ({
        id: pool.id,
        address: pool.attributes.address,
        name: pool.attributes.name,
        baseTokenPriceUsd: parseFloat(pool.attributes.base_token_price_usd),
        quoteTokenPriceUsd: parseFloat(pool.attributes.quote_token_price_usd),
        fdvUsd: parseFloat(pool.attributes.fdv_usd || 0),
        priceChange24h: parseFloat(pool.attributes.price_change_percentage?.h24 || 0),
        volume24h: parseFloat(pool.attributes.volume_usd?.h24 || 0),
        reserveUsd: parseFloat(pool.attributes.reserve_in_usd || 0),
        transactions24h: pool.attributes.transactions?.h24 || { buys: 0, sells: 0 },
        baseToken: pool.relationships.base_token.data.id,
        quoteToken: pool.relationships.quote_token.data.id,
        dex: pool.relationships.dex.data.id
      })),
      totalPools: pools.length,
      totalLiquidity: pools.reduce((sum, pool) => sum + parseFloat(pool.attributes.reserve_in_usd || 0), 0),
      totalVolume24h: pools.reduce((sum, pool) => sum + parseFloat(pool.attributes.volume_usd?.h24 || 0), 0)
    };
    
    marketData.tokens.push(tokenData);
    marketData.pools.push(...tokenData.pools);
    
    // Update summary
    marketData.summary.totalLiquidity += tokenData.totalLiquidity;
    marketData.summary.totalVolume24h += tokenData.totalVolume24h;
    if (tokenData.totalPools > 0) {
      marketData.summary.activeTokens++;
    }
    
    console.log(`📈 ${token.symbol} Summary:`);
    console.log(`  Pools: ${tokenData.totalPools}`);
    console.log(`  Liquidity: $${tokenData.totalLiquidity.toLocaleString()}`);
    console.log(`  Volume 24h: $${tokenData.totalVolume24h.toLocaleString()}`);
    
    // Rate limiting - wait between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return marketData;
}

/**
 * Test swapSeiToToken with the provided pool
 */
async function testSwapWithPool() {
  console.log('\n🔄 Testing Swap with Pool Data');
  console.log('🎯 Target Pool:', POOL_ADDRESS);
  
  // Use your provided private key
  const privateKey = '0xb07d22478ec9688d31d3a0ceb678a6158c08e62989a6225843ec0e16b3086619';
  const address = ethers.utils.computeAddress(privateKey);
  
  console.log('📍 Wallet Address:', address);
  
  // Agent configuration
  const config = {
    privateKey: privateKey,
    address: address,
    rpcUrl: 'https://evm-rpc.arctic-1.seinetwork.io',
    chainId: '713715',
    contractAddresses: {
      agenticRouter: '0xe48976418675D5A52e4B0dBB305614775115675a',
      wsei: '0x57eE725BEeB991c70c53f9642f36755EC6eb2139',
      usdc: '0x3894085ef7ff0f0aedf52e2a2704928d1ec074f1'
    }
  };
  
  try {
    // Get real-time market data first
    console.log('\n📊 Fetching current market data...');
    const marketData = await getAllSEIMarketData();
    
    console.log('\n📋 Market Summary:');
    console.log(`  Active Tokens: ${marketData.summary.activeTokens}`);
    console.log(`  Total Liquidity: $${marketData.summary.totalLiquidity.toLocaleString()}`);
    console.log(`  Total Volume 24h: $${marketData.summary.totalVolume24h.toLocaleString()}`);
    
    // Find the best pool for USDC
    const usdcPools = marketData.tokens.find(t => t.symbol === 'USDC')?.pools || [];
    const bestUsdcPool = usdcPools.reduce((best, pool) => 
      (!best || pool.volume24h > best.volume24h) ? pool : best, null
    );
    
    if (bestUsdcPool) {
      console.log('\n🎯 Best USDC Pool Found:');
      console.log(`  Name: ${bestUsdcPool.name}`);
      console.log(`  Address: ${bestUsdcPool.address}`);
      console.log(`  Liquidity: $${bestUsdcPool.reserveUsd.toLocaleString()}`);
      console.log(`  Volume 24h: $${bestUsdcPool.volume24h.toLocaleString()}`);
      console.log(`  Price Change 24h: ${bestUsdcPool.priceChange24h}%`);
    }
    
    // Initialize agent
    console.log('\n🤖 Initializing agent...');
    const agent = new SimpleAgent(config);
    await agent.initialize();
    
    // Check balances
    const seiBalance = await agent.getSeiBalance();
    console.log(`💰 Current SEI Balance: ${seiBalance}`);
    
    if (parseFloat(seiBalance) > 0.001) {
      console.log('\n🔄 Executing test swap: SEI → USDC');
      
      // Execute swap with real market data context
      const swapResult = await agent.swapSeiToToken({
        tokenOut: config.contractAddresses.usdc,
        amountIn: '0.001', // Small test amount
        slippageTolerance: 25, // High slippage for testnet
        recipient: address
      });
      
      console.log('✅ Swap completed successfully!');
      console.log(`📋 Transaction Hash: ${swapResult.txHash}`);
      console.log(`💸 Amount In: ${swapResult.amountIn} SEI`);
      console.log(`⛽ Gas Used: ${swapResult.gasUsed}`);
      
      // Check new USDC balance
      const usdcBalance = await agent.getTokenBalance(config.contractAddresses.usdc);
      console.log(`💵 New USDC Balance: ${usdcBalance.balance} ${usdcBalance.symbol}`);
      
    } else {
      console.log('⚠️  Insufficient SEI balance for swap test');
      console.log('💡 Send some testnet SEI to:', address);
      console.log('🌐 Testnet faucet: https://faucet.seinetwork.io/');
    }
    
    // Cleanup
    await agent.disconnect();
    
    // Return market data for further use
    return marketData;
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    throw error;
  }
}

/**
 * Format market data for AI prompt
 */
function formatMarketDataForAI(marketData) {
  const aiData = {
    lastUpdated: marketData.timestamp,
    overview: {
      totalTokens: marketData.tokens.length,
      activeTokens: marketData.summary.activeTokens,
      totalLiquidity: marketData.summary.totalLiquidity,
      totalVolume24h: marketData.summary.totalVolume24h
    },
    tokens: marketData.tokens.map(token => ({
      symbol: token.symbol,
      price: token.price,
      dailyChange: token.dailyChange,
      totalPools: token.totalPools,
      totalLiquidity: token.totalLiquidity,
      volume24h: token.totalVolume24h,
      bestPool: token.pools.length > 0 ? {
        name: token.pools[0].name,
        liquidity: token.pools[0].reserveUsd,
        volume24h: token.pools[0].volume24h,
        priceChange24h: token.pools[0].priceChange24h
      } : null
    }))
  };
  
  return `
CURRENT SEI NETWORK MARKET DATA (Real-time from GeckoTerminal):
Updated: ${aiData.lastUpdated}

MARKET OVERVIEW:
- Total Available Tokens: ${aiData.overview.totalTokens}
- Active Trading Tokens: ${aiData.overview.activeTokens}
- Total Liquidity: $${aiData.overview.totalLiquidity.toLocaleString()}
- Total 24h Volume: $${aiData.overview.totalVolume24h.toLocaleString()}

TOKEN DETAILS:
${aiData.tokens.map(token => `
${token.symbol}:
  Current Price: $${token.price}
  24h Change: ${token.dailyChange}%
  Available Pools: ${token.totalPools}
  Total Liquidity: $${token.totalLiquidity.toLocaleString()}
  24h Volume: $${token.volume24h.toLocaleString()}
  ${token.bestPool ? `Best Pool: ${token.bestPool.name} (Liquidity: $${token.bestPool.liquidity.toLocaleString()})` : 'No active pools'}
`).join('')}

TRADING RECOMMENDATIONS BASED ON DATA:
- Highest Volume: ${aiData.tokens.sort((a, b) => b.volume24h - a.volume24h)[0]?.symbol}
- Best Liquidity: ${aiData.tokens.sort((a, b) => b.totalLiquidity - a.totalLiquidity)[0]?.symbol}
- Most Volatile: ${aiData.tokens.sort((a, b) => Math.abs(b.dailyChange) - Math.abs(a.dailyChange))[0]?.symbol}

MARKET CONDITIONS:
${aiData.overview.totalVolume24h > 100000 ? 'High trading activity detected' : 'Moderate trading activity'}
${aiData.overview.totalLiquidity > 1000000 ? 'Good liquidity across markets' : 'Limited liquidity - use caution with large trades'}
`;
}

/**
 * Test with specific pool address
 */
async function testSpecificPool() {
  console.log('\n🎯 Testing Specific Pool Address');
  console.log('🏊 Pool:', POOL_ADDRESS);
  
  try {
    // Fetch pool details from GeckoTerminal
    const poolUrl = `${GECKO_API_BASE}/pools/${POOL_ADDRESS}`;
    console.log(`📡 Fetching pool data: ${poolUrl}`);
    
    const response = await axios.get(poolUrl, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (response.data && response.data.data) {
      const pool = response.data.data;
      console.log('\n✅ Pool Found:');
      console.log(`  Name: ${pool.attributes.name}`);
      console.log(`  Address: ${pool.attributes.address}`);
      console.log(`  Base Token Price: $${pool.attributes.base_token_price_usd}`);
      console.log(`  Quote Token Price: $${pool.attributes.quote_token_price_usd}`);
      console.log(`  Liquidity: $${pool.attributes.reserve_in_usd}`);
      console.log(`  24h Volume: $${pool.attributes.volume_usd?.h24 || 0}`);
      console.log(`  24h Price Change: ${pool.attributes.price_change_percentage?.h24}%`);
      console.log(`  DEX: ${pool.relationships.dex.data.id}`);
      
      return pool;
    } else {
      console.log('❌ Pool not found or no data available');
      return null;
    }
    
  } catch (error) {
    console.error('❌ Failed to fetch pool data:', error.message);
    return null;
  }
}

// Export functions for use in strategy generation
module.exports = {
  getAllSEIMarketData,
  fetchTokenPools,
  formatMarketDataForAI,
  testSwapWithPool,
  testSpecificPool,
  SEI_TOKENS
};

// Run tests if called directly
if (require.main === module) {
  console.log('🧪 SEI Network Pool Data Testing');
  console.log('📊 Fetching real-time market data for strategy optimization');
  
  async function runTests() {
    try {
      // Test 1: Fetch all market data
      console.log('\n=== TEST 1: Market Data Fetching ===');
      const marketData = await getAllSEIMarketData();
      
      // Test 2: Format for AI
      console.log('\n=== TEST 2: AI Format ===');
      const aiFormatted = formatMarketDataForAI(marketData);
      console.log('📝 AI-formatted data preview:');
      console.log(aiFormatted.substring(0, 500) + '...');
      
      // Test 3: Specific pool
      console.log('\n=== TEST 3: Specific Pool Test ===');
      await testSpecificPool();
      
      // Test 4: Swap test (if balance available)
      console.log('\n=== TEST 4: Swap Test ===');
      await testSwapWithPool();
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }
  }
  
  runTests();
} 