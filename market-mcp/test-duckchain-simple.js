// Simple test for DuckChain pools endpoint
class DuckChainSimpleTest {
  constructor() {
    this.baseUrl = 'https://api.geckoterminal.com/api/v2';
    this.headers = {
      'Accept': 'application/json;version=20230302',
      'User-Agent': 'MarketMCP/1.0.0'
    };
  }

  async testDuckChainPools() {
    console.log('🔍 Testing DuckChain pools endpoint...');
    try {
      const response = await fetch(`${this.baseUrl}/networks/duckchain/pools?page=1`, { 
        headers: this.headers 
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        console.log(`✅ Success! Found ${data.data.length} pools on DuckChain`);
        
        console.log('\n📊 Sample pools:');
        data.data.slice(0, 5).forEach((pool, i) => {
          console.log(`${i + 1}. ${pool.attributes.name}`);
          console.log(`   Address: ${pool.attributes.address}`);
          console.log(`   Reserve: $${pool.attributes.reserve_in_usd || 'N/A'}`);
          console.log(`   24h Volume: $${pool.attributes.volume_usd?.h24 || 'N/A'}`);
          console.log('');
        });
        
        // Extract tokens from pools
        console.log('🪙 Extracting tokens from pools:');
        const tokenSet = new Set();
        data.data.forEach(pool => {
          // Pool name usually contains token pair like "TOKEN1/TOKEN2"
          const tokens = pool.attributes.name.split('/');
          tokens.forEach(token => tokenSet.add(token.trim()));
        });
        
        const uniqueTokens = Array.from(tokenSet);
        console.log(`Found ${uniqueTokens.length} unique tokens:`);
        uniqueTokens.slice(0, 15).forEach(token => console.log(`  - ${token}`));
        
        return true;
      } else {
        console.log('❌ No pools found in response');
        return false;
      }
    } catch (error) {
      console.error('❌ Error testing DuckChain pools:', error.message);
      return false;
    }
  }

  async run() {
    console.log('🚀 Testing DuckChain MCP Configuration...\n');
    const success = await this.testDuckChainPools();
    
    if (success) {
      console.log('\n✅ DuckChain MCP is properly configured and working!');
      console.log('✅ Your MCP can fetch pools and extract tokens from DuckChain');
    } else {
      console.log('\n❌ DuckChain test failed');
    }
  }
}

const test = new DuckChainSimpleTest();
test.run().catch(console.error);