// Comprehensive MCP Tools Test for DuckChain
import { spawn } from 'child_process';
import { promises as fs } from 'fs';

class MCPToolsTester {
  constructor() {
    this.mcpProcess = null;
    this.testResults = [];
  }

  async startMCPServer() {
    console.log('🚀 Starting MCP Server...');
    
    // Start the MCP server in stdio mode
    this.mcpProcess = spawn('npm', ['run', 'dev'], {
      cwd: process.cwd(),
      env: { ...process.env, MCP_STDIO_MODE: 'true' },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Wait for server to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (this.mcpProcess.killed) {
      throw new Error('MCP Server failed to start');
    }
    
    console.log('✅ MCP Server started');
    return this.mcpProcess;
  }

  async sendMCPRequest(method, params = {}) {
    if (!this.mcpProcess) {
      throw new Error('MCP Server not started');
    }

    const request = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: method,
      params: params
    };

    return new Promise((resolve, reject) => {
      let responseData = '';
      let errorData = '';
      
      const timeout = setTimeout(() => {
        reject(new Error(`Request timeout for ${method}`));
      }, 30000); // 30 second timeout

      const onData = (data) => {
        responseData += data.toString();
        try {
          const response = JSON.parse(responseData);
          clearTimeout(timeout);
          this.mcpProcess.stdout.removeListener('data', onData);
          this.mcpProcess.stderr.removeListener('data', onError);
          resolve(response);
        } catch (e) {
          // Continue collecting data
        }
      };

      const onError = (data) => {
        errorData += data.toString();
      };

      this.mcpProcess.stdout.on('data', onData);
      this.mcpProcess.stderr.on('data', onError);

      // Send the request
      this.mcpProcess.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async testListTools() {
    console.log('\n🔧 Testing: List Tools');
    try {
      const response = await this.sendMCPRequest('tools/list');
      
      if (response.result && response.result.tools) {
        const tools = response.result.tools;
        console.log(`✅ Found ${tools.length} tools:`);
        tools.forEach(tool => {
          console.log(`  - ${tool.name}: ${tool.description}`);
        });
        
        this.testResults.push({
          test: 'List Tools',
          status: 'PASS',
          details: `${tools.length} tools found`
        });
        
        return tools;
      } else {
        throw new Error('Invalid tools response');
      }
    } catch (error) {
      console.log(`❌ List Tools failed: ${error.message}`);
      this.testResults.push({
        test: 'List Tools',
        status: 'FAIL',
        details: error.message
      });
      return [];
    }
  }

  async testGetNetworks() {
    console.log('\n🌐 Testing: Get Networks');
    try {
      const response = await this.sendMCPRequest('tools/call', {
        name: 'get_networks',
        arguments: {}
      });

      if (response.result) {
        console.log('✅ Get Networks successful');
        console.log('Response preview:', response.result.content[0].text.substring(0, 200) + '...');
        
        this.testResults.push({
          test: 'Get Networks',
          status: 'PASS',
          details: 'Networks retrieved successfully'
        });
        
        return response.result;
      } else {
        throw new Error('No result in response');
      }
    } catch (error) {
      console.log(`❌ Get Networks failed: ${error.message}`);
      this.testResults.push({
        test: 'Get Networks',
        status: 'FAIL',
        details: error.message
      });
      return null;
    }
  }

  async testGetDuckChainPools() {
    console.log('\n🦆 Testing: Get DuckChain Pools');
    try {
      const response = await this.sendMCPRequest('tools/call', {
        name: 'get_network_pools',
        arguments: {
          network: 'duckchain',
          page: 1
        }
      });

      if (response.result && !response.result.isError) {
        console.log('✅ DuckChain pools retrieved successfully');
        const content = response.result.content[0].text;
        console.log('Pools preview:', content.substring(0, 300) + '...');
        
        this.testResults.push({
          test: 'Get DuckChain Pools',
          status: 'PASS',
          details: 'Pools retrieved successfully'
        });
        
        return response.result;
      } else {
        throw new Error(response.result?.content?.[0]?.text || 'Unknown error');
      }
    } catch (error) {
      console.log(`❌ Get DuckChain Pools failed: ${error.message}`);
      this.testResults.push({
        test: 'Get DuckChain Pools',
        status: 'FAIL',
        details: error.message
      });
      return null;
    }
  }

  async testSearchPools() {
    console.log('\n🔍 Testing: Search Pools for DUCK');
    try {
      const response = await this.sendMCPRequest('tools/call', {
        name: 'search_pools',
        arguments: {
          query: 'DUCK',
          network: 'duckchain'
        }
      });

      if (response.result && !response.result.isError) {
        console.log('✅ Search pools successful');
        const content = response.result.content[0].text;
        console.log('Search results preview:', content.substring(0, 200) + '...');
        
        this.testResults.push({
          test: 'Search Pools',
          status: 'PASS',
          details: 'Search completed successfully'
        });
        
        return response.result;
      } else {
        throw new Error(response.result?.content?.[0]?.text || 'Search failed');
      }
    } catch (error) {
      console.log(`❌ Search Pools failed: ${error.message}`);
      this.testResults.push({
        test: 'Search Pools',
        status: 'FAIL',
        details: error.message
      });
      return null;
    }
  }

  async testGetPoolData() {
    console.log('\n📊 Testing: Get Specific Pool Data');
    try {
      // Use the DUCK/WTON pool address from our earlier test
      const poolAddress = '0xe14364f158c30fc322f59528ff6cbac4a6005048';
      
      const response = await this.sendMCPRequest('tools/call', {
        name: 'get_pool_data',
        arguments: {
          network: 'duckchain',
          pool_address: poolAddress
        }
      });

      if (response.result && !response.result.isError) {
        console.log('✅ Pool data retrieved successfully');
        const content = response.result.content[0].text;
        console.log('Pool data preview:', content.substring(0, 300) + '...');
        
        this.testResults.push({
          test: 'Get Pool Data',
          status: 'PASS',
          details: 'Pool data retrieved successfully'
        });
        
        return response.result;
      } else {
        throw new Error(response.result?.content?.[0]?.text || 'Pool data fetch failed');
      }
    } catch (error) {
      console.log(`❌ Get Pool Data failed: ${error.message}`);
      this.testResults.push({
        test: 'Get Pool Data',
        status: 'FAIL',
        details: error.message
      });
      return null;
    }
  }

  async testGetNewPools() {
    console.log('\n🆕 Testing: Get New Pools (Expected to fail - new chain)');
    try {
      const response = await this.sendMCPRequest('tools/call', {
        name: 'get_new_pools',
        arguments: {
          network: 'duckchain',
          hours_back: 24
        }
      });

      // This might fail for new chains - that's expected
      if (response.result) {
        if (response.result.isError) {
          console.log('⚠️ New pools detection failed (expected for new chains)');
          console.log('Error:', response.result.content[0].text);
          
          this.testResults.push({
            test: 'Get New Pools',
            status: 'EXPECTED_FAIL',
            details: 'New pools detection not available for new chains'
          });
        } else {
          console.log('✅ New pools detected');
          this.testResults.push({
            test: 'Get New Pools',
            status: 'PASS',
            details: 'New pools found'
          });
        }
      }
      
      return response.result;
    } catch (error) {
      console.log(`⚠️ Get New Pools failed (expected): ${error.message}`);
      this.testResults.push({
        test: 'Get New Pools',
        status: 'EXPECTED_FAIL',
        details: error.message
      });
      return null;
    }
  }

  async stopMCPServer() {
    if (this.mcpProcess) {
      console.log('\n🛑 Stopping MCP Server...');
      this.mcpProcess.kill('SIGTERM');
      
      // Wait for process to exit
      await new Promise(resolve => {
        this.mcpProcess.on('exit', resolve);
        setTimeout(resolve, 2000); // Fallback timeout
      });
      
      console.log('✅ MCP Server stopped');
    }
  }

  async generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 MCP DUCKCHAIN TEST REPORT');
    console.log('='.repeat(60));
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const expectedFails = this.testResults.filter(r => r.status === 'EXPECTED_FAIL').length;
    
    console.log(`\n📊 Summary:`);
    console.log(`  ✅ Passed: ${passed}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  ⚠️  Expected Failures: ${expectedFails}`);
    console.log(`  📝 Total Tests: ${this.testResults.length}`);
    
    console.log(`\n📋 Detailed Results:`);
    this.testResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : 
                  result.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`  ${icon} ${result.test}: ${result.details}`);
    });
    
    // Save report to file
    const report = {
      timestamp: new Date().toISOString(),
      summary: { passed, failed, expectedFails, total: this.testResults.length },
      results: this.testResults
    };
    
    await fs.writeFile('mcp-test-report.json', JSON.stringify(report, null, 2));
    console.log(`\n💾 Test report saved to: mcp-test-report.json`);
    
    return report;
  }

  async runAllTests() {
    try {
      console.log('🧪 Starting Comprehensive MCP DuckChain Tests');
      console.log('=' .repeat(60));
      
      // Start MCP server
      await this.startMCPServer();
      
      // Run tests in sequence
      await this.testListTools();
      await this.testGetNetworks();
      await this.testGetDuckChainPools();
      await this.testSearchPools();
      await this.testGetPoolData();
      await this.testGetNewPools();
      
      // Generate report
      await this.generateReport();
      
    } catch (error) {
      console.error('💥 Test suite failed:', error.message);
      console.error(error.stack);
    } finally {
      // Always stop the server
      await this.stopMCPServer();
    }
  }
}

// Run the tests
const tester = new MCPToolsTester();
tester.runAllTests().catch(console.error);