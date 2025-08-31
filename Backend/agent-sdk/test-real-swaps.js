/**
 * Real Swap Test Script
 * 
 * Tests actual swap functionality with real SEI testnet addresses
 * USDC: 0x3894085ef7ff0f0aedf52e2a2704928d1ec074f1
 * WBTC: 0x0555e30da8f98308edb960aa94c0db47230d2b9c
 */

const { SimpleAgent, Utils } = require('./dist/src/SimpleAgent');
const { ethers } = require('ethers');

// Real contract addresses for SEI testnet
const REAL_ADDRESSES = {
  usdc: '0x3894085ef7ff0f0aedf52e2a2704928d1ec074f1',
  wbtc: '0x0555e30da8f98308edb960aa94c0db47230d2b9c',
  // You'll need to provide these real addresses
  agenticRouter: '0xe48976418675D5A52e4B0dBB305614775115675a', // Replace with real AgenticRouter
  wsei: '0x57eE725BEeB991c70c53f9642f36755EC6eb2139'      // WSEI address for Arctic testnet
};

/**
 * Get wallet info from provided private key
 */
function getWalletFromPrivateKey(privateKey) {
  const address = ethers.utils.computeAddress(privateKey);
  return {
    privateKey: privateKey,
    address: address
  };
}

/**
 * Create agent with real configuration
 */
function createRealAgent(privateKey, address) {
  // SEI Network Configuration
  const NETWORK_CONFIG = {
    // Testnet (Arctic)
    testnet: {
      rpcUrl: 'https://evm-rpc.arctic-1.seinetwork.io',
      chainId: '713715'
    },
    // Mainnet (Pacific) 
    mainnet: {
      rpcUrl: 'https://evm-rpc.sei-apis.com',
      chainId: '1329'
    }
  };
  
  // Use testnet for now (change to mainnet when ready)
  const network = NETWORK_CONFIG.mainnet;
  
  const config = {
    privateKey: privateKey,
    address: address,
    rpcUrl: network.rpcUrl,
    chainId: network.chainId,
    contractAddresses: {
      agenticRouter: REAL_ADDRESSES.agenticRouter,
      wsei: REAL_ADDRESSES.wsei,
      usdc: REAL_ADDRESSES.usdc
    }
  };

  return new SimpleAgent(config);
}

/**
 * Check if AgenticRouter contract is deployed and accessible
 */
async function checkAgenticRouter(agent) {
  console.log('\n🔍 Checking AgenticRouter contract...');
  
  try {
    const contract = new ethers.Contract(
      REAL_ADDRESSES.agenticRouter,
      ['function isAgent(address) view returns (bool)'],
      agent.wallet || new ethers.providers.JsonRpcProvider('https://evm-rpc.arctic-1.seinetwork.io')
    );
    
    // Try to call a view function
    const isAgent = await contract.isAgent(agent.getAddress());
    console.log(`✅ AgenticRouter accessible. Is agent registered: ${isAgent}`);
    
    if (!isAgent) {
      console.log('⚠️  Warning: Agent is not registered in AgenticRouter');
      console.log('💡 You may need to register the agent first');
    }
    
    return true;
  } catch (error) {
    console.error('❌ AgenticRouter check failed:', error.message);
    console.log('💡 Possible issues:');
    console.log('   - Contract not deployed at this address');
    console.log('   - Wrong network or RPC');
    console.log('   - Contract ABI mismatch');
    return false;
  }
}

/**
 * Test swap SEI to token (SEI -> USDC)
 */
async function testSwapSeiToToken(agent) {
  console.log('\n🔄 Testing SEI to USDC swap...');
  
  try {
    // Check SEI balance first
    const seiBalance = await agent.getSeiBalance();
    console.log(`Current SEI balance: ${seiBalance} SEI`);
    
    if (parseFloat(seiBalance) < 0.002) {
      console.log('⚠️  Warning: Low SEI balance. Make sure you have testnet SEI.');
      console.log('💡 You can get testnet SEI from: https://faucet.seinetwork.io/');
    }
    
    // Perform swap: 0.001 SEI -> USDC (smaller amount for testing)
    const swapResult = await agent.swapSeiToToken({
      tokenOut: REAL_ADDRESSES.usdc,
      amountIn: '0.001', // 0.001 SEI (smaller amount)
      slippageTolerance: 25, // Higher slippage tolerance for testnet
      recipient: agent.getAddress()
    });
    
    console.log('✅ SEI to USDC swap successful!');
    console.log(`Transaction Hash: ${swapResult.txHash}`);
    console.log(`Amount In: ${swapResult.amountIn} SEI`);
    console.log(`Gas Used: ${swapResult.gasUsed}`);
    
    // Check USDC balance after swap
    const usdcBalance = await agent.getTokenBalance(REAL_ADDRESSES.usdc);
    console.log(`New USDC balance: ${usdcBalance.balance} ${usdcBalance.symbol}`);
    
    return swapResult;
    
  } catch (error) {
    console.error('❌ SEI to USDC swap failed:', error.message);
    
    // Common error solutions
    if (error.message.includes('insufficient funds')) {
      console.log('💡 Solution: Add more SEI to your wallet');
    } else if (error.message.includes('pool')) {
      console.log('💡 Solution: Check if SEI/USDC pool exists');
    } else if (error.message.includes('slippage')) {
      console.log('💡 Solution: Try increasing slippage tolerance');
    }
    
    throw error;
  }
}

/**
 * Test swap token to SEI (USDC -> SEI)
 */
async function testSwapTokenToSei(agent) {
  console.log('\n🔄 Testing USDC to SEI swap...');
  
  try {
    // Check USDC balance first
    const usdcBalance = await agent.getTokenBalance(REAL_ADDRESSES.usdc);
    console.log(`Current USDC balance: ${usdcBalance.balance} ${usdcBalance.symbol}`);
    
    if (parseFloat(usdcBalance.balance) < 0.1) {
      console.log('⚠️  Warning: Low USDC balance. Swap some SEI to USDC first.');
      return null;
    }
    
    // Perform swap: 0.1 USDC -> SEI
    const swapResult = await agent.swapTokenToSei({
      tokenIn: REAL_ADDRESSES.usdc,
      amountIn: '0.1', // 0.1 USDC
      slippageTolerance: 25, // Higher slippage tolerance for testnet
      recipient: agent.getAddress()
    });
    
    console.log('✅ USDC to SEI swap successful!');
    console.log(`Transaction Hash: ${swapResult.txHash}`);
    console.log(`Amount In: ${swapResult.amountIn} USDC`);
    console.log(`Gas Used: ${swapResult.gasUsed}`);
    
    // Check SEI balance after swap
    const seiBalance = await agent.getSeiBalance();
    console.log(`New SEI balance: ${seiBalance} SEI`);
    
    return swapResult;
    
  } catch (error) {
    console.error('❌ USDC to SEI swap failed:', error.message);
    
    // Common error solutions
    if (error.message.includes('allowance')) {
      console.log('💡 Solution: Token approval may have failed');
    } else if (error.message.includes('pool')) {
      console.log('💡 Solution: Check if USDC/SEI pool exists');
    }
    
    throw error;
  }
}

/**
 * Test swap token to token (USDC -> WBTC)
 */
async function testSwapTokenToToken(agent) {
  console.log('\n🔄 Testing USDC to WBTC swap...');
  
  try {
    // Check USDC balance first
    const usdcBalance = await agent.getTokenBalance(REAL_ADDRESSES.usdc);
    console.log(`Current USDC balance: ${usdcBalance.balance} ${usdcBalance.symbol}`);
    
    if (parseFloat(usdcBalance.balance) < 1) {
      console.log('⚠️  Warning: Low USDC balance. Swap some SEI to USDC first.');
      return null;
    }
    
    // Perform swap: 1 USDC -> WBTC
    const swapResult = await agent.swapTokenToToken({
      tokenIn: REAL_ADDRESSES.usdc,
      tokenOut: REAL_ADDRESSES.wbtc,
      amountIn: '1', // 1 USDC
      slippageTolerance: 5,
      recipient: agent.getAddress()
    });
    
    console.log('✅ USDC to WBTC swap successful!');
    console.log(`Transaction Hash: ${swapResult.txHash}`);
    console.log(`Amount In: ${swapResult.amountIn} USDC`);
    console.log(`Gas Used: ${swapResult.gasUsed}`);
    
    // Check WBTC balance after swap
    const wbtcBalance = await agent.getTokenBalance(REAL_ADDRESSES.wbtc);
    console.log(`New WBTC balance: ${wbtcBalance.balance} ${wbtcBalance.symbol}`);
    
    return swapResult;
    
  } catch (error) {
    console.error('❌ USDC to WBTC swap failed:', error.message);
    
    // Common error solutions
    if (error.message.includes('allowance')) {
      console.log('💡 Solution: Token approval may have failed');
    } else if (error.message.includes('pool')) {
      console.log('💡 Solution: Check if USDC/WBTC pool exists');
    }
    
    throw error;
  }
}

/**
 * Main test function
 */
async function testRealSwaps() {
  console.log('🧪 Testing Real Swap Functionality\n');
  console.log('📍 Using SEI Arctic Testnet (Chain ID: 713715)');
  console.log('🌐 RPC: https://evm-rpc.arctic-1.seinetwork.io');
  console.log(`💰 USDC: ${REAL_ADDRESSES.usdc}`);
  console.log(`₿ WBTC: ${REAL_ADDRESSES.wbtc}`);
  
  // Use provided private key
  const privateKey = '0xb07d22478ec9688d31d3a0ceb678a6158c08e62989a6225843ec0e16b3086619';
  const wallet = getWalletFromPrivateKey(privateKey);
  
  console.log('\n🔄 Using Provided Private Key');
  console.log(`📍 Wallet Address: ${wallet.address}`);
  console.log(`🔑 Private Key: ${wallet.privateKey.substring(0, 10)}...`);
  
      try {
     // Create agent with provided private key
     const agent = createRealAgent(wallet.privateKey, wallet.address);
    
    // Set up event listeners
    agent.on('initialized', (data) => {
      console.log('🚀 Agent initialized:', data);
    });
    
    agent.on('swapExecuted', (result) => {
      console.log('🔄 Swap executed:', {
        txHash: result.txHash,
        success: result.success
      });
    });
    
    agent.on('error', (error) => {
      console.error('❌ Agent error:', error.message);
    });
    
    // Initialize agent
    console.log('\n🤖 Initializing agent...');
    await agent.initialize();
    
    // Check initial balances
    console.log('\n💰 Initial Balances:');
    const seiBalance = await agent.getSeiBalance();
    console.log(`SEI: ${seiBalance}`);
    
    try {
      const usdcBalance = await agent.getTokenBalance(REAL_ADDRESSES.usdc);
      console.log(`USDC: ${usdcBalance.balance} ${usdcBalance.symbol}`);
    } catch (error) {
      console.log('USDC: 0 (or token not found)');
    }
    
    try {
      const wbtcBalance = await agent.getTokenBalance(REAL_ADDRESSES.wbtc);
      console.log(`WBTC: ${wbtcBalance.balance} ${wbtcBalance.symbol}`);
    } catch (error) {
      console.log('WBTC: 0 (or token not found)');
    }
    
    // Check AgenticRouter contract first
    const routerWorking = await checkAgenticRouter(agent);
    
    // Test swaps only if we have SEI balance and router is working
    if (parseFloat(seiBalance) > 0.002 && routerWorking) {
      // Test 1: SEI -> USDC
      await testSwapSeiToToken(agent);
      
      // Wait a bit between swaps
      console.log('\n⏳ Waiting 5 seconds before next swap...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Test 2: USDC -> WBTC
      await testSwapTokenToToken(agent);
      
      // Wait a bit between swaps
      console.log('\n⏳ Waiting 5 seconds before next swap...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Test 3: USDC -> SEI (if we have USDC left)
      await testSwapTokenToSei(agent);
      
         } else {
       console.log('\n⚠️  Insufficient SEI balance for testing swaps');
       console.log('💡 Send some testnet SEI to:', wallet.address);
       console.log('💡 Testnet faucet: https://faucet.seinetwork.io/');
     }
    
    // Cleanup
    await agent.disconnect();
    
    console.log('\n🎉 Real swap testing completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure you have testnet SEI');
    console.log('2. Check AgenticRouter contract address');
    console.log('3. Verify token addresses are correct');
    console.log('4. Check network connectivity');
  }
}

// Export for use in other scripts
module.exports = {
  testRealSwaps,
  getWalletFromPrivateKey,
  createRealAgent,
  REAL_ADDRESSES
};

// Run if called directly
if (require.main === module) {
  console.log('🔐 SECURITY WARNING: Using provided private key for testing');
  console.log('⚠️  Only use this on testnet, never on mainnet with real funds\n');
  
  testRealSwaps().catch(console.error);
} 