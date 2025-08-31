#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

interface Network {
  id: string;
  name: string;
}

interface Pool {
  id: string;
  address: string;
  name: string;
  network: string;
  dex?: string;
  base_token_price_usd: string | null;
  quote_token_price_usd: string | null;
  reserve_in_usd: string | null;
  volume_usd: object;
  price_change_percentage: object;
  fdv_usd?: string | null;
  market_cap_usd?: string | null;
  transactions?: object;
}

interface Token {
  id: string;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  price_usd: string | null;
}

interface NewToken {
  token: Token;
  pool: Pool;
  isNew: boolean;
  liquidityUSD: number;
  volume24h: number;
  age: string;
}

interface TrendingPool {
  pool: Pool;
  trendingScore: number;
  volumeIncrease: number;
  priceVolatility: number;
}

interface Dex {
  id: string;
  name: string;
}

class GeckoTerminalAPI {
  private baseUrl = 'https://api.geckoterminal.com/api/v2';
  private headers = {
    'Accept': 'application/json;version=20230302',
    'User-Agent': 'MarketMCP/1.0.0'
  };
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 1000; // 1 second between requests (optimized for responsiveness)
  private requestCounter = 0;
  private errorCounter = 0;

  private logGeckoTerminalURL(url: string, context: string = '') {
    this.requestCounter++;
    const timestamp = new Date().toISOString();
    console.log(`🌐 [GECKO URL] [${timestamp}] [REQ#${this.requestCounter}] ${context ? `[${context}] ` : ''}${url}`);
  }

  private logAPIResponse(context: string, success: boolean, statusCode?: number, responseSize?: number, duration?: number) {
    const timestamp = new Date().toISOString();
    const status = success ? '✅' : '❌';
    if (!success) this.errorCounter++;
    console.log(`📡 [GECKO RESPONSE] [${timestamp}] [${context}] ${status} Status: ${statusCode || 'N/A'} | Size: ${responseSize || 'N/A'}B | Duration: ${duration || 'N/A'}ms | Errors: ${this.errorCounter}`);
  }

  private logRateLimitInfo() {
    const timestamp = new Date().toISOString();
    console.log(`⏳ [RATE LIMIT] [${timestamp}] Last request: ${Date.now() - this.lastRequestTime}ms ago | Total requests: ${this.requestCounter}`);
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      console.log(`⏳ [RATE LIMIT] Waiting ${waitTime}ms to respect 30 calls/min quota...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  async fetchNetworks(): Promise<Network[]> {
    const startTime = Date.now();
    await this.enforceRateLimit();
    const url = `${this.baseUrl}/networks`;
    this.logGeckoTerminalURL(url, 'FETCH_NETWORKS');
    
    try {
      const response = await fetch(url, { headers: this.headers });
      const duration = Date.now() - startTime;
      
      if (!response.ok) {
        this.logAPIResponse('FETCH_NETWORKS', false, response.status, undefined, duration);
        throw new Error(`Failed to fetch networks: ${response.statusText}`);
      }
      
      const data = await response.json();
      const responseSize = JSON.stringify(data).length;
      this.logAPIResponse('FETCH_NETWORKS', true, response.status, responseSize, duration);
      
      const networks = data.data.map((network: any) => ({
        id: network.id,
        name: network.attributes.name
      }));
      
      console.log(`📊 [FETCH_NETWORKS] Processed ${networks.length} networks`);
      return networks;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logAPIResponse('FETCH_NETWORKS', false, undefined, undefined, duration);
      console.error(`❌ [FETCH_NETWORKS] Error:`, error.message);
      throw error;
    }
  }

  async fetchDexesByNetwork(networkId: string, page = 1): Promise<Dex[]> {
    await this.enforceRateLimit();
    const url = `${this.baseUrl}/networks/${networkId}/dexes?page=${page}`;
    this.logGeckoTerminalURL(url, 'FETCH_DEXES');
    const response = await fetch(url, { headers: this.headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch dexes for network ${networkId}: ${response.statusText}`);
    }
    const data = await response.json();
    return data.data.map((dex: any) => ({
      id: dex.id,
      name: dex.attributes.name
    }));
  }

  async fetchPoolsByDex(networkId: string, dexId: string, page = 1): Promise<Pool[]> {
    await this.enforceRateLimit();
    const url = `${this.baseUrl}/networks/${networkId}/dexes/${dexId}/pools?page=${page}&include=base_token,quote_token,dex`;
    this.logGeckoTerminalURL(url, `FETCH_POOLS_BY_DEX[${dexId}]`);
    const response = await fetch(url, { headers: this.headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch pools for network ${networkId}, dex ${dexId}: ${response.statusText}`);
    }
    const data = await response.json();
    return data.data.map((pool: any) => ({
      id: pool.id,
      address: pool.attributes.address,
      name: pool.attributes.name,
      network: networkId,
      dex: dexId,
      base_token_price_usd: pool.attributes.base_token_price_usd,
      quote_token_price_usd: pool.attributes.quote_token_price_usd,
      reserve_in_usd: pool.attributes.reserve_in_usd,
      volume_usd: pool.attributes.volume_usd,
      price_change_percentage: pool.attributes.price_change_percentage,
      fdv_usd: pool.attributes.fdv_usd,
      market_cap_usd: pool.attributes.market_cap_usd,
      transactions: pool.attributes.transactions
    }));
  }

  async fetchAllPoolsByDex(networkId: string, dexId: string): Promise<Pool[]> {
    const allPools: Pool[] = [];
    let page = 1;
    let hasMorePages = true;

    console.log(`🌊 Fetching all pools from ${networkId}/${dexId}...`);

    while (hasMorePages) {
      try {
        await this.enforceRateLimit();
        const url = `${this.baseUrl}/networks/${networkId}/dexes/${dexId}/pools?page=${page}&include=base_token,quote_token,dex`;
        this.logGeckoTerminalURL(url, `ALL_POOLS[${dexId}][P${page}]`);
        const response = await fetch(url, { headers: this.headers });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch page ${page}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const pools = data.data.map((pool: any) => ({
          id: pool.id,
          address: pool.attributes.address,
          name: pool.attributes.name,
          network: networkId,
          dex: dexId,
          base_token_price_usd: pool.attributes.base_token_price_usd,
          quote_token_price_usd: pool.attributes.quote_token_price_usd,
          reserve_in_usd: pool.attributes.reserve_in_usd,
          volume_usd: pool.attributes.volume_usd,
          price_change_percentage: pool.attributes.price_change_percentage,
          fdv_usd: pool.attributes.fdv_usd,
          market_cap_usd: pool.attributes.market_cap_usd,
          transactions: pool.attributes.transactions
        }));

        allPools.push(...pools);
        console.log(`📄 Page ${page}: Found ${pools.length} pools (Total: ${allPools.length})`);

        // Check if there are more pages
        hasMorePages = pools.length > 0 && data.data.length === 100; // GeckoTerminal typically returns 100 per page
        page++;

        // Safety limit to prevent infinite loops
        if (page > 50) {
          console.warn('⚠️ Reached page limit (50), stopping...');
          break;
        }

        // Rate limiting is now handled globally by enforceRateLimit()
      } catch (error) {
        console.error(`❌ Error fetching page ${page}:`, error);
        hasMorePages = false;
      }
    }

    console.log(`✅ Completed fetching ${allPools.length} pools from ${networkId}/${dexId}`);
    return allPools;
  }

  async fetchDuckSwapPools(networkId: string = 'duckchain'): Promise<Pool[]> {
    console.log(`🦆 Fetching all DuckSwap pools from ${networkId}...`);
    return this.fetchAllPoolsByDex(networkId, 'duckswap');
  }

  async fetchDuckChainAllDexPools(networkId: string = 'duckchain'): Promise<Pool[]> {
    console.log(`🌊 Fetching pools from multiple DEXes on ${networkId}...`);
    
    const targetDexes = ['duckswap'];
    const allPools: Pool[] = [];
    
    for (const dex of targetDexes) {
      try {
        console.log(`📊 Fetching from DEX: ${dex}`);
        const pools = await this.fetchAllPoolsByDex(networkId, dex);
        allPools.push(...pools);
        console.log(`✅ ${dex}: ${pools.length} pools fetched`);
        
        // Rate limiting between DEXes is now handled globally by enforceRateLimit()
        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: any) {
        console.warn(`⚠️ Failed to fetch from ${dex}:`, error.message);
      }
    }
    
    console.log(`🎯 Total pools from all DEXes: ${allPools.length}`);
    return allPools;
  }

  async fetchNewPools(networkId: string, hoursBack: number = 24): Promise<Pool[]> {
    console.log(`🆕 Fetching new pools from ${networkId} (last ${hoursBack} hours)...`);
    
    try {
      // Fetch multiple pages to get a larger sample for new pools detection
      const allPools: Pool[] = [];
      const maxPages = 5; // Increased to get more data for new pools detection
      
      for (let page = 1; page <= maxPages; page++) {
        try {
          const pools = await this.fetchPoolsByNetwork(networkId, page);
          allPools.push(...pools);
          
          // If we get less than 100 pools, we've reached the end
          if (pools.length < 100) break;
          
          // Small delay between pages
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (pageError: any) {
          console.warn(`⚠️ Failed to fetch page ${page}:`, pageError.message);
          break;
        }
      }
      
      // Filter pools by liquidity and activity to identify likely new pools
      const newPools = allPools.filter(pool => {
        const liquidityUSD = parseFloat(pool.reserve_in_usd || '0');
        const volume24h = parseFloat((pool.volume_usd as any)?.h24 || '0');
        
        // New pools typically have:
        // 1. Lower but meaningful liquidity (1k-500k USD)
        // 2. Recent trading activity
        // 3. Reasonable volume-to-liquidity ratio
        return liquidityUSD >= 1000 && 
               liquidityUSD <= 500000 && 
               volume24h > 0 &&
               volume24h > liquidityUSD * 0.01; // At least 1% daily turnover
      });
      
      // Sort by liquidity (ascending) - newer pools tend to have lower liquidity
      newPools.sort((a, b) => {
        const liquidityA = parseFloat(a.reserve_in_usd || '0');
        const liquidityB = parseFloat(b.reserve_in_usd || '0');
        return liquidityA - liquidityB;
      });
      
      console.log(`🆕 Found ${newPools.length} potential new pools from ${allPools.length} total`);
      return newPools.slice(0, 50); // Return top 50 newest
      
    } catch (error: any) {
      console.error(`❌ Failed to fetch new pools:`, error.message);
      throw error;
    }
  }

  async fetchTrendingPools(networkId: string): Promise<Pool[]> {
    console.log(`📈 Fetching trending pools from ${networkId}...`);
    
    try {
      const allPools: Pool[] = [];
      const maxPages = 3; // Fetch from multiple pages for better trending detection
      
      for (let page = 1; page <= maxPages; page++) {
        try {
          const pools = await this.fetchPoolsByNetwork(networkId, page);
          allPools.push(...pools);
          
          if (pools.length < 100) break;
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (pageError: any) {
          console.warn(`⚠️ Failed to fetch page ${page} for trending:`, pageError.message);
          break;
        }
      }
      
      // Filter and rank pools by trending criteria
      const trendingPools = allPools.filter(pool => {
        const liquidityUSD = parseFloat(pool.reserve_in_usd || '0');
        const volume24h = parseFloat((pool.volume_usd as any)?.h24 || '0');
        const priceChange24h = Math.abs(parseFloat((pool.price_change_percentage as any)?.h24 || '0'));
        
        // Trending pools have:
        // 1. Significant volume activity
        // 2. High volume-to-liquidity ratio
        // 3. Price volatility indicating trading interest
        const volumeToLiquidityRatio = liquidityUSD > 0 ? volume24h / liquidityUSD : 0;
        
        return liquidityUSD >= 10000 && 
               volume24h >= 50000 && 
               volumeToLiquidityRatio >= 0.1 && 
               priceChange24h >= 5;
      });
      
      // Sort by volume activity and price change
      trendingPools.sort((a, b) => {
        const volumeA = parseFloat((a.volume_usd as any)?.h24 || '0');
        const volumeB = parseFloat((b.volume_usd as any)?.h24 || '0');
        const changeA = Math.abs(parseFloat((a.price_change_percentage as any)?.h24 || '0'));
        const changeB = Math.abs(parseFloat((b.price_change_percentage as any)?.h24 || '0'));
        
        // Combined score: volume + price volatility
        const scoreA = volumeA + (changeA * 10000);
        const scoreB = volumeB + (changeB * 10000);
        
        return scoreB - scoreA;
      });
      
      console.log(`📈 Found ${trendingPools.length} trending pools from ${allPools.length} total`);
      return trendingPools.slice(0, 30); // Return top 30 trending
      
    } catch (error: any) {
      console.error(`❌ Failed to fetch trending pools:`, error.message);
      throw error;
    }
  }

  async fetchPoolsByNetwork(networkId: string, page = 1): Promise<Pool[]> {
    const startTime = Date.now();
    console.log(`🔍 [FETCH_NETWORK_POOLS] Starting fetch for network: ${networkId}, page: ${page}`);
    
    await this.enforceRateLimit();
    const url = `${this.baseUrl}/networks/${networkId}/pools?page=${page}&include=base_token,quote_token,dex`;
    this.logGeckoTerminalURL(url, `FETCH_NETWORK_POOLS[${networkId}]`);
    
    try {
      const response = await fetch(url, { headers: this.headers });
      const duration = Date.now() - startTime;
      
      if (!response.ok) {
        this.logAPIResponse(`FETCH_NETWORK_POOLS[${networkId}]`, false, response.status, undefined, duration);
        throw new Error(`Failed to fetch pools for network ${networkId}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const responseSize = JSON.stringify(data).length;
      this.logAPIResponse(`FETCH_NETWORK_POOLS[${networkId}]`, true, response.status, responseSize, duration);
      
      const pools = data.data.map((pool: any) => ({
        id: pool.id,
        address: pool.attributes.address,
        name: pool.attributes.name,
        network: networkId,
        base_token_price_usd: pool.attributes.base_token_price_usd,
        quote_token_price_usd: pool.attributes.quote_token_price_usd,
        reserve_in_usd: pool.attributes.reserve_in_usd,
        volume_usd: pool.attributes.volume_usd,
        price_change_percentage: pool.attributes.price_change_percentage,
        fdv_usd: pool.attributes.fdv_usd,
        market_cap_usd: pool.attributes.market_cap_usd,
        transactions: pool.attributes.transactions
      }));
      
      console.log(`📊 [FETCH_NETWORK_POOLS] Network: ${networkId} | Page: ${page} | Pools found: ${pools.length} | Duration: ${duration}ms`);
      pools.forEach((pool: Pool, index: number) => {
        if (index < 3) { // Log first 3 pools for debugging
          console.log(`  📝 Pool ${index + 1}: ${pool.name} | Address: ${pool.address} | Reserve: $${pool.reserve_in_usd}`);
        }
      });
      
      return pools;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logAPIResponse(`FETCH_NETWORK_POOLS[${networkId}]`, false, undefined, undefined, duration);
      console.error(`❌ [FETCH_NETWORK_POOLS] Network: ${networkId} | Error:`, error.message);
      throw error;
    }
  }

  async fetchPoolData(networkId: string, poolAddress: string): Promise<any> {
    await this.enforceRateLimit();
    const url = `${this.baseUrl}/networks/${networkId}/pools/${poolAddress}?include=base_token,quote_token,dex`;
    this.logGeckoTerminalURL(url, `FETCH_POOL_DATA[${poolAddress.slice(0, 8)}...]`);
    const response = await fetch(url, { headers: this.headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch pool data: ${response.statusText}`);
    }
    return await response.json();
  }

  async fetchOHLCV(networkId: string, poolAddress: string, timeframe: string = 'hour', aggregate = '1'): Promise<any> {
    await this.enforceRateLimit();
    const url = `${this.baseUrl}/networks/${networkId}/pools/${poolAddress}/ohlcv/${timeframe}?aggregate=${aggregate}`;
    this.logGeckoTerminalURL(url, `FETCH_OHLCV[${poolAddress.slice(0, 8)}...]`);
    const response = await fetch(url, { headers: this.headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch OHLCV data: ${response.statusText}`);
    }
    return await response.json();
  }

  async fetchTokenPrice(networkId: string, tokenAddresses: string[]): Promise<any> {
    await this.enforceRateLimit();
    const addresses = tokenAddresses.join(',');
    const url = `${this.baseUrl}/simple/networks/${networkId}/token_price/${addresses}?include_24hr_vol=true&include_24hr_price_change=true`;
    this.logGeckoTerminalURL(url, `FETCH_TOKEN_PRICES[${tokenAddresses.length} tokens]`);
    const response = await fetch(url, { headers: this.headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch token prices: ${response.statusText}`);
    }
    return await response.json();
  }

  async searchPools(query: string, networkId?: string): Promise<any> {
    await this.enforceRateLimit();
    let url = `${this.baseUrl}/search/pools?query=${encodeURIComponent(query)}&include=base_token,quote_token,dex`;
    if (networkId) {
      url += `&network=${networkId}`;
    }
    this.logGeckoTerminalURL(url, `SEARCH_POOLS[${query}]`);
    const response = await fetch(url, { headers: this.headers });
    if (!response.ok) {
      throw new Error(`Failed to search pools: ${response.statusText}`);
    }
    return await response.json();
  }
}

class PoolAnalyzer {
  static analyzeNewToken(pool: Pool, tokenData: any): NewToken {
    const liquidityUSD = parseFloat(pool.reserve_in_usd || '0');
    const volume24h = parseFloat((pool.volume_usd as any)?.h24 || '0');
    
    // Determine if token is likely new based on liquidity and activity patterns
    const isNew = liquidityUSD >= 1000 && 
                  liquidityUSD <= 500000 && 
                  volume24h > 0 &&
                  volume24h > liquidityUSD * 0.01;
    
    // Estimate age based on liquidity levels (rough approximation)
    let age = 'Unknown';
    if (liquidityUSD < 10000) age = '< 1 day';
    else if (liquidityUSD < 50000) age = '1-7 days';
    else if (liquidityUSD < 200000) age = '1-4 weeks';
    else age = '> 1 month';
    
    return {
      token: tokenData,
      pool,
      isNew,
      liquidityUSD,
      volume24h,
      age
    };
  }
  
  static analyzeTrendingPool(pool: Pool): TrendingPool {
    const liquidityUSD = parseFloat(pool.reserve_in_usd || '0');
    const volume24h = parseFloat((pool.volume_usd as any)?.h24 || '0');
    const priceChange24h = Math.abs(parseFloat((pool.price_change_percentage as any)?.h24 || '0'));
    
    const volumeToLiquidityRatio = liquidityUSD > 0 ? volume24h / liquidityUSD : 0;
    
    // Calculate trending score based on activity and volatility
    let trendingScore = 0;
    if (volume24h > 100000) trendingScore += 30;
    else if (volume24h > 50000) trendingScore += 20;
    else if (volume24h > 10000) trendingScore += 10;
    
    if (volumeToLiquidityRatio > 0.5) trendingScore += 25;
    else if (volumeToLiquidityRatio > 0.2) trendingScore += 15;
    else if (volumeToLiquidityRatio > 0.1) trendingScore += 10;
    
    if (priceChange24h > 20) trendingScore += 25;
    else if (priceChange24h > 10) trendingScore += 15;
    else if (priceChange24h > 5) trendingScore += 10;
    
    return {
      pool,
      trendingScore,
      volumeIncrease: volumeToLiquidityRatio,
      priceVolatility: priceChange24h
    };
  }
}

class MarketDataProcessor {
  static formatPoolData(poolData: any): string {
    const pool = poolData.data;
    const attributes = pool.attributes;
    
    let result = `Pool: ${attributes.name}\n`;
    result += `Address: ${attributes.address}\n`;
    result += `Network: ${pool.relationships?.network?.data?.id || 'Unknown'}\n`;
    result += `Reserve (USD): $${attributes.reserve_in_usd || 'N/A'}\n`;
    
    if (attributes.base_token_price_usd) {
      result += `Base Token Price: $${attributes.base_token_price_usd}\n`;
    }
    if (attributes.quote_token_price_usd) {
      result += `Quote Token Price: $${attributes.quote_token_price_usd}\n`;
    }

    if (attributes.volume_usd) {
      result += `24h Volume: $${attributes.volume_usd.h24 || 'N/A'}\n`;
    }

    if (attributes.price_change_percentage) {
      const changes = attributes.price_change_percentage;
      if (changes.h24) result += `24h Change: ${changes.h24}%\n`;
      if (changes.h1) result += `1h Change: ${changes.h1}%\n`;
    }

    return result;
  }

  static formatNetworksList(networks: Network[]): string {
    let result = 'Available Networks:\n\n';
    networks.forEach(network => {
      result += `- ${network.id}: ${network.name}\n`;
    });
    return result;
  }

  static formatPoolsList(pools: Pool[]): string {
    let result = 'Pools:\n\n';
    pools.forEach(pool => {
      result += `${pool.name} (${pool.address})\n`;
      result += `  Reserve: $${pool.reserve_in_usd || 'N/A'}\n`;
      if (pool.volume_usd && (pool.volume_usd as any).h24) {
        result += `  24h Volume: $${(pool.volume_usd as any).h24}\n`;
      }
      result += '\n';
    });
    return result;
  }

  static formatOHLCV(ohlcvData: any): string {
    const data = ohlcvData.data;
    const ohlcvList = data.attributes.ohlcv_list;
    
    let result = `OHLCV Data for Pool: ${data.id}\n\n`;
    result += 'Timestamp\t\tOpen\t\tHigh\t\tLow\t\tClose\t\tVolume\n';
    result += '─'.repeat(80) + '\n';
    
    ohlcvList.slice(-10).forEach((ohlcv: number[]) => {
      const timestamp = new Date(ohlcv[0] * 1000).toISOString();
      result += `${timestamp}\t${ohlcv[1].toFixed(4)}\t\t${ohlcv[2].toFixed(4)}\t\t${ohlcv[3].toFixed(4)}\t\t${ohlcv[4].toFixed(4)}\t\t${ohlcv[5].toFixed(2)}\n`;
    });
    
    return result;
  }

  static formatNewPools(pools: Pool[]): string {
    let result = `🆕 New Pools Detected\n`;
    result += `Found: ${pools.length} pools\n`;
    result += `Generated: ${new Date().toISOString()}\n\n`;
    
    pools.forEach((pool, index) => {
      result += `${index + 1}. ${pool.name} (${pool.address})\n`;
      result += `   Reserve: $${pool.reserve_in_usd || 'N/A'}\n`;
      if (pool.volume_usd && (pool.volume_usd as any).h24) {
        result += `   24h Volume: $${(pool.volume_usd as any).h24}\n`;
      }
      const priceChange24h = (pool.price_change_percentage as any)?.h24;
      if (priceChange24h) {
        result += `   24h Change: ${parseFloat(priceChange24h).toFixed(2)}%\n`;
      }
      
      // Estimate pool age based on liquidity
      const liquidityUSD = parseFloat(pool.reserve_in_usd || '0');
      let estimatedAge = 'Unknown';
      if (liquidityUSD < 10000) estimatedAge = '< 1 day';
      else if (liquidityUSD < 50000) estimatedAge = '1-7 days';
      else if (liquidityUSD < 200000) estimatedAge = '1-4 weeks';
      else estimatedAge = '> 1 month';
      
      result += `   Estimated Age: ${estimatedAge}\n`;
      result += `   Network: ${pool.network}\n\n`;
    });
    
    return result;
  }
  
  static formatTrendingPools(trendingPools: TrendingPool[]): string {
    let result = `📈 Trending Pools\n`;
    result += `Found: ${trendingPools.length} trending pools\n`;
    result += `Generated: ${new Date().toISOString()}\n\n`;
    
    trendingPools.forEach((trending, index) => {
      const pool = trending.pool;
      result += `${index + 1}. ${pool.name} (${pool.address})\n`;
      result += `   Trending Score: ${trending.trendingScore.toFixed(1)}/100\n`;
      result += `   Reserve: $${pool.reserve_in_usd || 'N/A'}\n`;
      if (pool.volume_usd && (pool.volume_usd as any).h24) {
        result += `   24h Volume: $${(pool.volume_usd as any).h24}\n`;
      }
      result += `   Volume/Liquidity Ratio: ${(trending.volumeIncrease * 100).toFixed(1)}%\n`;
      result += `   Price Volatility: ${trending.priceVolatility.toFixed(1)}%\n`;
      result += `   Network: ${pool.network}\n\n`;
    });
    
    return result;
  }
  
  static formatNewTokens(newTokens: NewToken[]): string {
    let result = `🎯 New Tokens Detected\n`;
    result += `Found: ${newTokens.length} new tokens\n`;
    result += `Generated: ${new Date().toISOString()}\n\n`;
    
    newTokens.forEach((newToken, index) => {
      const token = newToken.token;
      const pool = newToken.pool;
      
      result += `${index + 1}. ${token.name} (${token.symbol})\n`;
      result += `   Address: ${token.address}\n`;
      result += `   Pool: ${pool.name}\n`;
      result += `   Current Price: $${token.price_usd || 'N/A'}\n`;
      result += `   Liquidity: $${newToken.liquidityUSD.toFixed(2)}\n`;
      result += `   24h Volume: $${newToken.volume24h.toFixed(2)}\n`;
      result += `   Estimated Age: ${newToken.age}\n`;
      result += `   Network: ${pool.network}\n\n`;
    });
    
    return result;
  }
}

class MarketMCPServer {
  private server: Server;
  private api: GeckoTerminalAPI;
  private expressApp: express.Application;

  constructor() {
    this.server = new Server(
      {
        name: 'market-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.api = new GeckoTerminalAPI();
    this.expressApp = express();
    this.setupExpress();
    this.setupHandlers();
  }

  private setupExpress() {
    this.expressApp.set('trust proxy', 1);
    
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100
    });

    this.expressApp.use(cors());
    this.expressApp.use(express.json());
    this.expressApp.use(limiter);

    this.expressApp.post('/api/new-pools', async (req, res) => {
      try {
        const { network, hoursBack = 24 } = req.body;
        const newPools = await this.api.fetchNewPools(network, hoursBack);
        res.json({ pools: newPools, count: newPools.length });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    this.expressApp.post('/api/trending-pools', async (req, res) => {
      try {
        const { network } = req.body;
        const trendingPools = await this.api.fetchTrendingPools(network);
        res.json({ pools: trendingPools, count: trendingPools.length });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    this.expressApp.get('/api/networks', async (req, res) => {
      try {
        const networks = await this.api.fetchNetworks();
        res.json(networks);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    this.expressApp.get('/api/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });
  }

  private async getNewTokensFromPools(pools: Pool[], count: number = 10): Promise<NewToken[]> {
    console.log(`🎯 Analyzing ${pools.length} pools for new tokens...`);
    
    const newTokens: NewToken[] = [];
    const processingLimit = Math.min(50, pools.length);
    
    for (let i = 0; i < processingLimit && newTokens.length < count * 2; i++) {
      const pool = pools[i];
      
      try {
        const liquidityUSD = parseFloat(pool.reserve_in_usd || '0');
        
        // Filter for potential new tokens based on liquidity range
        if (liquidityUSD < 1000 || liquidityUSD > 500000) {
          continue;
        }
        
        const poolData = await this.api.fetchPoolData(pool.network, pool.address);
        const baseToken = poolData.included?.find((item: any) => 
          item.type === 'token' && item.id === poolData.data.relationships.base_token.data.id
        );
        
        if (baseToken) {
          const tokenData = {
            id: baseToken.id,
            address: baseToken.attributes.address,
            name: baseToken.attributes.name,
            symbol: baseToken.attributes.symbol,
            decimals: baseToken.attributes.decimals,
            price_usd: pool.base_token_price_usd
          };
          
          const newToken = PoolAnalyzer.analyzeNewToken(pool, tokenData);
          
          if (newToken.isNew) {
            newTokens.push(newToken);
            console.log(`  ✅ Found new token: ${tokenData.symbol} (${newToken.age})`);
          }
        }
        
        // Small delay to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error: any) {
        console.warn(`⚠️ Failed to analyze pool ${pool.address}:`, error.message);
        continue;
      }
    }
    
    // Sort by liquidity (ascending) - newer tokens typically have lower liquidity
    newTokens.sort((a, b) => a.liquidityUSD - b.liquidityUSD);
    
    console.log(`🎯 Found ${newTokens.length} new tokens from ${processingLimit} pools analyzed`);
    return newTokens.slice(0, count);
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: []
      };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request: any) => {
      throw new Error(`Resource not found: ${request.params.uri}`);
    });

    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_networks',
            description: 'Get all supported blockchain networks from GeckoTerminal',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_pool_data',
            description: 'Get detailed data for a specific pool on a network',
            inputSchema: {
              type: 'object',
              properties: {
                network: {
                  type: 'string',
                  description: 'Network ID (e.g., eth, bsc, polygon)',
                },
                pool_address: {
                  type: 'string',
                  description: 'Pool contract address',
                },
              },
              required: ['network', 'pool_address'],
            },
          },
          {
            name: 'get_network_pools',
            description: 'Get top pools for a specific network',
            inputSchema: {
              type: 'object',
              properties: {
                network: {
                  type: 'string',
                  description: 'Network ID (e.g., eth, bsc, polygon)',
                },
                page: {
                  type: 'number',
                  description: 'Page number for pagination (default: 1)',
                },
              },
              required: ['network'],
            },
          },
          {
            name: 'get_ohlcv_data',
            description: 'Get OHLCV (Open, High, Low, Close, Volume) data for a pool',
            inputSchema: {
              type: 'object',
              properties: {
                network: {
                  type: 'string',
                  description: 'Network ID (e.g., eth, bsc, polygon)',
                },
                pool_address: {
                  type: 'string',
                  description: 'Pool contract address',
                },
                timeframe: {
                  type: 'string',
                  description: 'Timeframe: day, hour, or minute (default: hour)',
                  enum: ['day', 'hour', 'minute'],
                },
                aggregate: {
                  type: 'string',
                  description: 'Aggregation period (e.g., 1, 4, 12 for hours; 1, 5, 15 for minutes)',
                },
              },
              required: ['network', 'pool_address'],
            },
          },
          {
            name: 'get_token_prices',
            description: 'Get current USD prices for multiple tokens on a network',
            inputSchema: {
              type: 'object',
              properties: {
                network: {
                  type: 'string',
                  description: 'Network ID (e.g., eth, bsc, polygon)',
                },
                token_addresses: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                  description: 'Array of token contract addresses (max 30)',
                },
              },
              required: ['network', 'token_addresses'],
            },
          },
          {
            name: 'search_pools',
            description: 'Search for pools by token symbol, address, or pool address',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query (token symbol, token address, or pool address)',
                },
                network: {
                  type: 'string',
                  description: 'Optional: filter by network ID',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_new_pools',
            description: 'Detect and get newly created pools on a network',
            inputSchema: {
              type: 'object',
              properties: {
                network: {
                  type: 'string',
                  description: 'Network ID (e.g., duckchain, eth, bsc, polygon)',
                },
                hours_back: {
                  type: 'number',
                  description: 'Hours to look back for new pools (default: 24, max: 168)',
                  minimum: 1,
                  maximum: 168,
                },
              },
              required: ['network'],
            },
          },
          {
            name: 'get_trending_pools',
            description: 'Get pools with high trading activity and volume spikes',
            inputSchema: {
              type: 'object',
              properties: {
                network: {
                  type: 'string',
                  description: 'Network ID (e.g., duckchain, eth, bsc, polygon)',
                },
              },
              required: ['network'],
            },
          },
          {
            name: 'get_new_tokens',
            description: 'Detect newly listed tokens with analysis',
            inputSchema: {
              type: 'object',
              properties: {
                network: {
                  type: 'string',
                  description: 'Network ID (e.g., duckchain, eth, bsc, polygon)',
                },
                count: {
                  type: 'number',
                  description: 'Number of new tokens to return (default: 10, max: 20)',
                  minimum: 1,
                  maximum: 20,
                },
              },
              required: ['network'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const toolCallId = `TOOL-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const startTime = Date.now();
      const toolName = request.params.name;
      const args = request.params.arguments;
      
      console.log(`🔧 [MCP TOOL CALL] [${toolCallId}] ============================`);
      console.log(`🔧 [MCP TOOL CALL] [${toolCallId}] Tool: ${toolName}`);
      console.log(`🔧 [MCP TOOL CALL] [${toolCallId}] Args:`, JSON.stringify(args, null, 2));
      console.log(`🔧 [MCP TOOL CALL] [${toolCallId}] Timestamp: ${new Date().toISOString()}`);
      
      try {
        let result;
        switch (toolName) {
          case 'get_networks':
            result = await this.handleGetNetworks(args);
            break;
          case 'get_pool_data':
            result = await this.handleGetPoolData(args);
            break;
          case 'get_network_pools':
            result = await this.handleGetNetworkPools(args);
            break;
          case 'get_ohlcv_data':
            result = await this.handleGetOHLCVData(args);
            break;
          case 'get_token_prices':
            result = await this.handleGetTokenPrices(args);
            break;
          case 'search_pools':
            result = await this.handleSearchPools(args);
            break;
          case 'get_new_pools':
            result = await this.handleGetNewPools(args);
            break;
          case 'get_trending_pools':
            result = await this.handleGetTrendingPools(args);
            break;
          case 'get_new_tokens':
            result = await this.handleGetNewTokens(args);
            break;
          case 'get_all_tokens':
            result = await this.handleGetAllTokens(args);
            break;
          default:
            console.error(`❌ [MCP TOOL CALL] [${toolCallId}] Unknown tool: ${toolName}`);
            throw new Error(`Tool not found: ${toolName}`);
        }
        
        const duration = Date.now() - startTime;
        const responseSize = JSON.stringify(result).length;
        console.log(`✅ [MCP TOOL CALL] [${toolCallId}] Tool completed successfully in ${duration}ms (response: ${responseSize}B)`);
        console.log(`🔧 [MCP TOOL CALL] [${toolCallId}] ============================`);
        
        return result;
      } catch (error: any) {
        const duration = Date.now() - startTime;
        console.error(`❌ [MCP TOOL CALL] [${toolCallId}] Tool failed after ${duration}ms:`, error.message);
        console.error(`❌ [MCP TOOL CALL] [${toolCallId}] Stack:`, error.stack);
        console.log(`🔧 [MCP TOOL CALL] [${toolCallId}] ============================`);
        throw error;
      }
    });
  }

  private async handleGetNetworks(args: any) {
    const requestId = `NET-${Date.now()}`;
    const startTime = Date.now();
    console.log(`🌐 [MCP HANDLER] [${requestId}] handleGetNetworks called`);
    
    try {
      const networks = await this.api.fetchNetworks();
      const duration = Date.now() - startTime;
      console.log(`✅ [MCP HANDLER] [${requestId}] Networks fetched successfully in ${duration}ms (${networks.length} networks)`);
      
      return {
        content: [
          {
            type: 'text',
            text: MarketDataProcessor.formatNetworksList(networks),
          },
        ],
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ [MCP HANDLER] [${requestId}] Networks fetch failed after ${duration}ms:`, error.message);
      
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching networks: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetPoolData(args: any) {
    const { network, pool_address } = args;
    try {
      const poolData = await this.api.fetchPoolData(network, pool_address);
      return {
        content: [
          {
            type: 'text',
            text: MarketDataProcessor.formatPoolData(poolData),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching pool data: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetNetworkPools(args: any) {
    const requestId = `POOLS-${Date.now()}`;
    const startTime = Date.now();
    const { network, page = 1 } = args;
    
    console.log(`🌊 [MCP HANDLER] [${requestId}] handleGetNetworkPools called for network: ${network}, page: ${page}`);
    
    try {
      let pools: Pool[];
      
      // For DuckChain, fetch from multiple DEXes to get diverse tokens
      if (network === 'duckchain') {
        console.log(`🌊 [MCP HANDLER] [${requestId}] Using specialized DuckChain multi-DEX strategy`);
        if (page === 1) {
          console.log(`🌊 [MCP HANDLER] [${requestId}] Page 1: Fetching from multiple DEXes`);
          pools = await this.api.fetchDuckChainAllDexPools(network);
        } else {
          console.log(`🌊 [MCP HANDLER] [${requestId}] Page ${page}: Using DuckSwap pagination`);
          pools = await this.api.fetchPoolsByDex(network, 'duckswap', page);
        }
      } else {
        console.log(`🌊 [MCP HANDLER] [${requestId}] Using standard network pools method`);
        pools = await this.api.fetchPoolsByNetwork(network, page);
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ [MCP HANDLER] [${requestId}] Network pools fetched successfully in ${duration}ms (${pools.length} pools)`);
      
      return {
        content: [
          {
            type: 'text',
            text: MarketDataProcessor.formatPoolsList(pools),
          },
        ],
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ [MCP HANDLER] [${requestId}] Network pools fetch failed after ${duration}ms:`, error.message);
      
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching network pools: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetOHLCVData(args: any) {
    const { network, pool_address, timeframe = 'hour', aggregate = '1' } = args;
    try {
      const ohlcvData = await this.api.fetchOHLCV(network, pool_address, timeframe, aggregate);
      return {
        content: [
          {
            type: 'text',
            text: MarketDataProcessor.formatOHLCV(ohlcvData),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching OHLCV data: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetTokenPrices(args: any) {
    const { network, token_addresses } = args;
    try {
      const priceData = await this.api.fetchTokenPrice(network, token_addresses);
      const attributes = priceData.data[0].attributes;
      
      let result = 'Token Prices:\n\n';
      Object.entries(attributes.token_prices).forEach(([address, price]) => {
        result += `${address}: $${price}\n`;
      });
      
      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching token prices: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleSearchPools(args: any) {
    const { query, network } = args;
    try {
      const searchResults = await this.api.searchPools(query, network);
      
      let result = `Search results for "${query}":\n\n`;
      searchResults.data.forEach((pool: any) => {
        result += `${pool.attributes.name} (${pool.attributes.address})\n`;
        result += `  Network: ${pool.relationships?.network?.data?.id || 'Unknown'}\n`;
        result += `  Reserve: $${pool.attributes.reserve_in_usd || 'N/A'}\n\n`;
      });
      
      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error searching pools: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetNewPools(args: any) {
    const requestId = `NEW-POOLS-${Date.now()}`;
    const startTime = Date.now();
    const { network, hours_back = 24 } = args;
    
    console.log(`🆕 [MCP HANDLER] [${requestId}] handleGetNewPools called for network: ${network}, hours back: ${hours_back}`);
    
    try {
      const newPools = await this.api.fetchNewPools(network, hours_back);
      const duration = Date.now() - startTime;
      
      console.log(`✅ [MCP HANDLER] [${requestId}] New pools fetched successfully in ${duration}ms (${newPools.length} pools)`);
      
      return {
        content: [
          {
            type: 'text',
            text: MarketDataProcessor.formatNewPools(newPools),
          },
        ],
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ [MCP HANDLER] [${requestId}] New pools fetch failed after ${duration}ms:`, error.message);
      
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching new pools: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetTrendingPools(args: any) {
    const requestId = `TRENDING-${Date.now()}`;
    const startTime = Date.now();
    const { network } = args;
    
    console.log(`📈 [MCP HANDLER] [${requestId}] handleGetTrendingPools called for network: ${network}`);
    
    try {
      const pools = await this.api.fetchTrendingPools(network);
      const trendingPools = pools.map(pool => PoolAnalyzer.analyzeTrendingPool(pool));
      const duration = Date.now() - startTime;
      
      console.log(`✅ [MCP HANDLER] [${requestId}] Trending pools fetched successfully in ${duration}ms (${trendingPools.length} pools)`);
      
      return {
        content: [
          {
            type: 'text',
            text: MarketDataProcessor.formatTrendingPools(trendingPools),
          },
        ],
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ [MCP HANDLER] [${requestId}] Trending pools fetch failed after ${duration}ms:`, error.message);
      
        return {
          content: [
            {
              type: 'text',
            text: `Error fetching trending pools: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetNewTokens(args: any) {
    const requestId = `NEW-TOKENS-${Date.now()}`;
    const startTime = Date.now();
    const { network, count = 10 } = args;
    
    console.log(`🎯 [MCP HANDLER] [${requestId}] handleGetNewTokens called for network: ${network}, count: ${count}`);
    
    try {
      // First get new pools as they're likely to contain new tokens
      const newPools = await this.api.fetchNewPools(network, 48); // Look back 48 hours for more coverage
      const newTokens = await this.getNewTokensFromPools(newPools, count);
      const duration = Date.now() - startTime;
      
      console.log(`✅ [MCP HANDLER] [${requestId}] New tokens fetched successfully in ${duration}ms (${newTokens.length} tokens)`);
      
      return {
        content: [
          {
            type: 'text',
            text: MarketDataProcessor.formatNewTokens(newTokens),
          },
        ],
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ [MCP HANDLER] [${requestId}] New tokens fetch failed after ${duration}ms:`, error.message);
      
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching new tokens: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  private identifyTokenType(pool: Pool): string {
    const tokenName = pool.name.toLowerCase();
    const baseToken = pool.name.split('/')[0].trim().toLowerCase();
    
    // Stablecoin detection
    const stablecoinKeywords = ['usd', 'usdc', 'usdt', 'dai', 'busd', 'frax', 'tusd', 'lusd'];
    if (stablecoinKeywords.some(keyword => baseToken.includes(keyword))) {
      return 'stablecoin';
    }
    
    // Wrapped token detection
    if (baseToken.startsWith('w') && baseToken.length > 2) {
      return 'wrapped';
    }
    
    // Meme token detection
    const memeKeywords = ['doge', 'shib', 'pepe', 'floki', 'meme', 'inu', 'moon', 'safe'];
    if (memeKeywords.some(keyword => baseToken.includes(keyword))) {
      return 'meme';
    }
    
    // DeFi token detection
    const defiKeywords = ['swap', 'farm', 'yield', 'stake', 'pool', 'defi', 'finance'];
    if (defiKeywords.some(keyword => baseToken.includes(keyword))) {
      return 'defi';
    }
    
    return 'utility';
  }

  private calculateRiskScore(pool: Pool): number {
    let risk = 0;
    const tokenType = this.identifyTokenType(pool);
    
    // Base risk by token type
    switch (tokenType) {
      case 'stablecoin':
        risk += 5; // Very low base risk
        break;
      case 'wrapped':
        risk += 15; // Low base risk
        break;
      case 'defi':
        risk += 25; // Medium base risk
        break;
      case 'utility':
        risk += 35; // Medium-high base risk
        break;
      case 'meme':
        risk += 50; // High base risk
        break;
      default:
        risk += 40; // Default high risk
    }
    
    // Liquidity risk (higher liquidity = lower risk)
    const liquidity = parseFloat(pool.reserve_in_usd || '0');
    if (liquidity < 1000) risk += 25;
    else if (liquidity < 10000) risk += 20;
    else if (liquidity < 50000) risk += 15;
    else if (liquidity < 100000) risk += 10;
    // else risk += 0 for high liquidity
    
    // Volume risk (higher volume = lower risk)
    const volume24h = parseFloat((pool.volume_usd as any)?.h24 || '0');
    if (volume24h < 100) risk += 20;
    else if (volume24h < 1000) risk += 15;
    else if (volume24h < 10000) risk += 10;
    // else risk += 0 for high volume
    
    // Price volatility risk (but not for stablecoins)
    if (tokenType !== 'stablecoin') {
      const change24h = Math.abs(parseFloat((pool.price_change_percentage as any)?.h24 || '0'));
      if (change24h > 50) risk += 20;
      else if (change24h > 20) risk += 15;
      else if (change24h > 10) risk += 10;
      else if (change24h > 5) risk += 5;
    }
    
    // Market cap risk (lower market cap = higher risk)
    const marketCap = parseFloat(pool.market_cap_usd || '0');
    if (marketCap < 100000) risk += 15;
    else if (marketCap < 1000000) risk += 10;
    else if (marketCap < 10000000) risk += 5;
    // else risk += 0 for large market cap
    
    return Math.min(risk, 100); // Cap at 100
  }

  private calculateProfitScore(pool: Pool): number {
    let profit = 0;
    
    // Volume growth indicates activity
    const volume24h = parseFloat((pool.volume_usd as any)?.h24 || '0');
    if (volume24h > 100000) profit += 25;
    else if (volume24h > 50000) profit += 20;
    else if (volume24h > 10000) profit += 15;
    else if (volume24h > 1000) profit += 10;
    
    // Price momentum
    const change24h = parseFloat((pool.price_change_percentage as any)?.h24 || '0');
    if (change24h > 20) profit += 20;
    else if (change24h > 10) profit += 15;
    else if (change24h > 5) profit += 10;
    else if (change24h > 0) profit += 5;
    
    // Liquidity to volume ratio (efficiency)
    const liquidity = parseFloat(pool.reserve_in_usd || '0');
    const volumeToLiquidityRatio = volume24h / (liquidity || 1);
    if (volumeToLiquidityRatio > 1) profit += 15;
    else if (volumeToLiquidityRatio > 0.5) profit += 10;
    else if (volumeToLiquidityRatio > 0.1) profit += 5;
    
    // Market cap growth potential
    const marketCap = parseFloat(pool.market_cap_usd || '0');
    if (marketCap > 0 && marketCap < 1000000) profit += 15; // Small cap growth potential
    else if (marketCap < 10000000) profit += 10; // Mid cap potential
    else if (marketCap < 100000000) profit += 5; // Large cap stability
    
    // Transaction count indicates real usage
    const txCount = ((pool.transactions as any)?.h24?.buys || 0) + ((pool.transactions as any)?.h24?.sells || 0);
    if (txCount > 500) profit += 10;
    else if (txCount > 100) profit += 8;
    else if (txCount > 50) profit += 5;
    else if (txCount > 10) profit += 3;
    
    return Math.min(profit, 100); // Cap at 100
  }

  private async handleGetAllTokens(args: any) {
    const requestId = `ALL-TOKENS-${Date.now()}`;
    const startTime = Date.now();
    const { network = 'duckchain', includeScoring = true } = args;
    
    console.log(`🌊 [MCP HANDLER] [${requestId}] handleGetAllTokens called for network: ${network}, scoring: ${includeScoring}`);
    
    try {
      // Get all pools from the network
      const pools = await this.api.fetchDuckChainAllDexPools(network);
      
      console.log(`📊 [MCP HANDLER] [${requestId}] Retrieved ${pools.length} pools from ${network}`);
      
      // Calculate scores for all tokens if requested
      const tokensWithScores = pools.map(pool => {
        const riskScore = includeScoring ? this.calculateRiskScore(pool) : 0;
        const profitScore = includeScoring ? this.calculateProfitScore(pool) : 0;
        const overallScore = includeScoring ? Math.max(0, profitScore - (riskScore * 0.7)) : 0;
        
        return {
          pool,
          riskScore,
          profitScore,
          overallScore
        };
      });

      // Sort by overall score (best opportunities first)
      if (includeScoring) {
        tokensWithScores.sort((a, b) => b.overallScore - a.overallScore);
      }

      // Format output
      const timestamp = new Date().toISOString();
      let output = `🌊 All Tokens Analysis\nNetwork: ${network}\nTokens Found: ${pools.length}\nGenerated: ${timestamp}\n\n`;

      tokensWithScores.forEach((tokenData, index) => {
        const pool = tokenData.pool;
        const baseToken = pool.name.split('/')[0].trim();
        const tokenType = this.identifyTokenType(pool);
        
        output += `${index + 1}. ${baseToken}\n`;
        output += `   Pool: ${pool.name}\n`;
        output += `   Address: ${pool.address}\n`;
        output += `   Token Type: ${tokenType}\n`;
        output += `   Price: $${pool.base_token_price_usd || '0'}\n`;
        output += `   Liquidity: $${parseFloat(pool.reserve_in_usd || '0').toLocaleString()}\n`;
        output += `   24h Volume: $${parseFloat((pool.volume_usd as any)?.h24 || '0').toLocaleString()}\n`;
        output += `   24h Change: ${(pool.price_change_percentage as any)?.h24 || '0'}%\n`;
        output += `   Market Cap: $${parseFloat(pool.market_cap_usd || '0').toLocaleString()}\n`;
        
        if (includeScoring) {
          output += `   Risk Score: ${tokenData.riskScore}/100\n`;
          output += `   Profit Score: ${tokenData.profitScore}/100\n`;
          output += `   Overall Score: ${tokenData.overallScore.toFixed(1)}/100\n`;
          output += `   Risk Category: ${tokenData.riskScore <= 30 ? 'LOW' : tokenData.riskScore <= 60 ? 'MEDIUM' : 'HIGH'}\n`;
        }
        
        output += `   Transactions 24h: ${((pool.transactions as any)?.h24?.buys || 0) + ((pool.transactions as any)?.h24?.sells || 0)}\n`;
        output += `   Network: ${pool.network}\n\n`;
      });

      if (includeScoring) {
        output += `\n📊 Scoring Methodology:\n`;
        output += `Risk Score: Based on liquidity, volume, volatility, market cap\n`;
        output += `Profit Score: Based on volume growth, momentum, efficiency, potential\n`;
        output += `Overall Score: Profit potential adjusted for risk level\n`;
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ [MCP HANDLER] [${requestId}] All tokens analysis completed in ${duration}ms (${pools.length} tokens)`);
      
      return {
        content: [
          {
            type: 'text',
            text: output,
          },
        ],
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ [MCP HANDLER] [${requestId}] All tokens analysis failed after ${duration}ms:`, error.message);
      
      return {
        content: [
          {
            type: 'text',
            text: `Error retrieving all tokens from ${network}: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async run() {
    const startupTime = Date.now();
    console.log(`🚀 [MCP SERVER] =================================`);
    console.log(`🚀 [MCP SERVER] Starting Market MCP Server`);
    console.log(`🚀 [MCP SERVER] Startup time: ${new Date().toISOString()}`);
    
    // Check if we should run in stdio-only mode
    const stdioMode = process.env.MCP_STDIO_MODE === 'true';
    console.log(`🚀 [MCP SERVER] Mode: ${stdioMode ? 'STDIO-ONLY' : 'STDIO + HTTP'}`);
    
    if (!stdioMode) {
      // Run HTTP server only if not in stdio mode
      const PORT = process.env.PORT || 3001;
      console.log(`🚀 [MCP SERVER] Setting up HTTP server on port ${PORT}`);
      
      this.expressApp.listen(PORT, () => {
        console.error(`🌐 [MCP SERVER] Express server running on port ${PORT}`);
        console.log(`🌐 [MCP SERVER] HTTP endpoints available at http://localhost:${PORT}`);
      });
    }

    // Always set up stdio transport for MCP protocol
    console.log(`🚀 [MCP SERVER] Setting up STDIO transport for MCP protocol`);
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    const setupDuration = Date.now() - startupTime;
    
    if (stdioMode) {
      console.error(`✅ [MCP SERVER] Market MCP server running on stdio with GeckoTerminal API integration (startup: ${setupDuration}ms)`);
    } else {
      console.error(`✅ [MCP SERVER] Market MCP server running on stdio and HTTP with GeckoTerminal API integration (startup: ${setupDuration}ms)`);
    }
    
    console.log(`✅ [MCP SERVER] Available tools: get_networks, get_pool_data, get_network_pools, get_ohlcv_data, get_token_prices, search_pools, get_new_pools, get_trending_pools, get_new_tokens, get_all_tokens`);
    console.log(`✅ [MCP SERVER] Rate limiting: ${this.api['MIN_REQUEST_INTERVAL']}ms between requests`);
    console.log(`✅ [MCP SERVER] Server ready to handle requests!`);
    console.log(`🚀 [MCP SERVER] =================================`);
  }
}

const server = new MarketMCPServer();
server.run().catch(console.error);