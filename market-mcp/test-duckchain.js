// Test script for DuckChain functionality
// Using built-in fetch (Node.js 18+)

class DuckChainTester {
  constructor() {
    this.baseUrl = 'https://api.geckoterminal.com/api/v2';
    this.headers = {
      'Accept': 'application/json;version=20230302',
      'User-Agent': 'MarketMCP/1.0.0'
    };
  }

  async testDuckChainNetworkExists() {
    console.log('🔍 Testing if DuckChain network exists in GeckoTerminal...');
    try {
      const response = await fetch(`${this.baseUrl}/networks`, { headers: this.headers });
      const data = await response.json();
      
      const duckchainNetwork = data.data.find(network => 
        network.id.toLowerCase().includes('duck') || 
        network.attributes.name.toLowerCase().includes('duck')
      );
      
      if (duckchainNetwork) {
        console.log('✅ DuckChain network found:', {
          id: duckchainNetwork.id,
          name: duckchainNetwork.attributes.name
        });
        return duckchainNetwork;
      } else {
        console.log('❌ DuckChain network not found in available networks');
        console.log('All available networks:');
        data.data.forEach(n => console.log(`  - ${n.id}: ${n.attributes.name}`));
        return null;
      }
    } catch (error) {
      console.error('❌ Error fetching networks:', error.message);
      return null;
    }
  }

  async testDuckSwapDexExists(networkId) {
    console.log(`🔍 Testing if DuckSwap DEX exists on ${networkId}...`);
    try {
      const response = await fetch(`${this.baseUrl}/networks/${networkId}/dexes`, { headers: this.headers });
      const data = await response.json();
      
      const duckswapDex = data.data.find(dex => 
        dex.id === 'duckswap' || 
        dex.attributes.name.toLowerCase().includes('duck')
      );
      
      if (duckswapDex) {
        console.log('✅ DuckSwap DEX found:', {
          id: duckswapDex.id,
          name: duckswapDex.attributes.name
        });
        return duckswapDex;
      } else {
        console.log('❌ DuckSwap DEX not found');
        console.log('Available DEXes:', data.data.map(d => ({ id: d.id, name: d.attributes.name })));
        return null;
      }
    } catch (error) {
      console.error('❌ Error fetching DEXes:', error.message);
      return null;
    }
  }

  async testDuckChainPools(networkId) {
    console.log(`🔍 Testing pools on ${networkId}...`);
    try {
      const response = await fetch(`${this.baseUrl}/networks/${networkId}/pools?page=1`, { headers: this.headers });
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        console.log(`✅ Found ${data.data.length} pools on ${networkId}`);
        console.log('Sample pools:');
        data.data.slice(0, 3).forEach((pool, i) => {
          console.log(`  ${i + 1}. ${pool.attributes.name} - Reserve: $${pool.attributes.reserve_in_usd || 'N/A'}`);
        });
        return data.data;
      } else {
        console.log('❌ No pools found');
        return [];
      }
    } catch (error) {
      console.error('❌ Error fetching pools:', error.message);
      return [];
    }
  }

  async runAllTests() {
    console.log('🚀 Starting DuckChain MCP Tests...\n');
    
    // Test 1: Check if DuckChain network exists
    const network = await this.testDuckChainNetworkExists();
    if (!network) {
      console.log('\n❌ Cannot continue tests - DuckChain network not found');
      return;
    }
    
    const networkId = network.id;
    console.log(`\nUsing network ID: ${networkId}\n`);
    
    // Test 2: Check if DuckSwap DEX exists
    await this.testDuckSwapDexExists(networkId);
    console.log('');
    
    // Test 3: Check if we can fetch pools
    await this.testDuckChainPools(networkId);
    
    console.log('\n✅ DuckChain MCP tests completed!');
  }
}

const tester = new DuckChainTester();
tester.runAllTests().catch(console.error);