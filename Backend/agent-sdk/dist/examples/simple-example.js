"use strict";
/**
 * Simple Agent SDK Example
 *
 * This example uses only stable dependencies:
 * - ethers v5 (stable and well-tested)
 * - bignumber.js (for decimal precision)
 * - axios (for HTTP requests)
 *
 * No complex Cosmos or SEI-specific libraries that cause compatibility issues
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.demonstrateUtilities = exports.setupEventListeners = exports.runSimpleExample = exports.createSimpleAgent = void 0;
const SimpleAgent_1 = require("../src/SimpleAgent");
async function runSimpleExample(privateKey, address) {
    console.log('🚀 Starting Simple Agent Example');
    console.log('📦 Using stable dependencies: ethers v5, bignumber.js, axios');
    // Configuration for SEI testnet
    const agentConfig = {
        privateKey: privateKey,
        address: address,
        rpcUrl: 'https://evm-rpc.arctic-1.seinetwork.io',
        chainId: 'arctic-1',
        contractAddresses: {
            agenticRouter: process.env.AGENTIC_ROUTER_ADDRESS || '0x1234567890abcdef1234567890abcdef12345678',
            wsei: process.env.WSEI_ADDRESS || '0x2345678901abcdef2345678901abcdef23456789',
            usdc: process.env.USDC_ADDRESS || '0x3456789012abcdef3456789012abcdef34567890'
        }
    };
    try {
        // 1. Initialize Agent
        console.log('\n🤖 Initializing Simple Agent...');
        const agent = new SimpleAgent_1.SimpleAgent(agentConfig);
        // Set up event listeners
        setupEventListeners(agent);
        // Initialize connection
        await agent.initialize();
        // 2. Check Balances
        console.log('\n💰 Checking Balances...');
        const seiBalance = await agent.getSeiBalance();
        console.log(`SEI Balance: ${seiBalance} SEI`);
        // Check token balances
        try {
            const usdcBalance = await agent.getTokenBalance(agentConfig.contractAddresses.usdc);
            console.log(`${usdcBalance.symbol} Balance: ${usdcBalance.balance}`);
        }
        catch (error) {
            console.log('Could not fetch USDC balance (token may not exist)');
        }
        // 3. Gas Price Information
        console.log('\n⛽ Gas Information...');
        const gasPrice = await agent.getGasPrice();
        console.log(`Current Gas Price: ${gasPrice} gwei`);
        // 4. Example SEI Transfer (commented out to avoid accidental transfers)
        /*
        console.log('\n💸 Transferring SEI...');
        const transferTx = await agent.transferSei(
          'sei1recipient...', // Replace with actual address
          '0.01' // 0.01 SEI
        );
        console.log(`Transfer completed: ${transferTx}`);
        */
        // 5. Example Token Swap (commented out to avoid accidental swaps)
        /*
        console.log('\n🔄 Swapping SEI for USDC...');
        const swapResult = await agent.swapSeiToToken({
          tokenOut: agentConfig.contractAddresses.usdc,
          amountIn: '0.1', // 0.1 SEI
          slippageTolerance: 5
        });
        console.log(`Swap completed: ${swapResult.txHash}`);
        */
        // 6. Utility Functions Demo
        console.log('\n🔧 Utility Functions Demo...');
        demonstrateUtilities();
        console.log('\n✅ Simple Agent example completed successfully!');
        console.log('💡 To run swaps and transfers, uncomment the relevant sections and provide real addresses.');
        // Cleanup
        await agent.disconnect();
    }
    catch (error) {
        console.error('\n❌ Example failed:', error.message);
        // Common error solutions
        if (error.message.includes('network')) {
            console.log('💡 Solution: Check your RPC URL and network connectivity');
        }
        else if (error.message.includes('private key')) {
            console.log('💡 Solution: Ensure your private key is valid and has the 0x prefix');
        }
        else if (error.message.includes('balance')) {
            console.log('💡 Solution: Ensure your wallet has sufficient SEI for gas fees');
        }
    }
}
exports.runSimpleExample = runSimpleExample;
function setupEventListeners(agent) {
    console.log('🎧 Setting up event listeners...');
    agent.on('initialized', (data) => {
        console.log('🚀 Agent initialized:', data);
    });
    agent.on('swapExecuted', (result) => {
        console.log('🔄 Swap executed:', {
            txHash: result.txHash,
            success: result.success,
            gasUsed: result.gasUsed
        });
    });
    agent.on('transferCompleted', (result) => {
        console.log('💸 Transfer completed:', result);
    });
    agent.on('error', (error) => {
        console.error('❌ Agent error:', error.message);
    });
}
exports.setupEventListeners = setupEventListeners;
function demonstrateUtilities() {
    console.log('🔢 BigNumber Operations:');
    const amount = SimpleAgent_1.Utils.toBigNumber('123.456789');
    console.log(`  Original: ${amount.toString()}`);
    console.log(`  Formatted (2 decimals): ${SimpleAgent_1.Utils.formatAmount(amount, 2)}`);
    console.log('\n🔍 Address Validation:');
    const validAddress = '0x1234567890abcdef1234567890abcdef12345678';
    const invalidAddress = 'invalid-address';
    console.log(`  Valid address (${validAddress.substring(0, 10)}...): ${SimpleAgent_1.Utils.isValidAddress(validAddress)}`);
    console.log(`  Invalid address: ${SimpleAgent_1.Utils.isValidAddress(invalidAddress)}`);
    console.log('\n📉 Slippage Calculation:');
    const originalAmount = '100';
    const slippageAmount = SimpleAgent_1.Utils.calculateSlippage(originalAmount, 5); // 5% slippage
    console.log(`  Original: ${originalAmount}`);
    console.log(`  With 5% slippage: ${slippageAmount}`);
}
exports.demonstrateUtilities = demonstrateUtilities;
// Example of different ways to run this
function createSimpleAgent(privateKey, address) {
    const config = {
        privateKey,
        address,
        rpcUrl: 'https://evm-rpc.arctic-1.seinetwork.io',
        chainId: 'arctic-1',
        contractAddresses: {
            agenticRouter: '0x1234567890abcdef1234567890abcdef12345678',
            wsei: '0x2345678901abcdef2345678901abcdef23456789',
            usdc: '0x3456789012abcdef3456789012abcdef34567890'
        }
    };
    return new SimpleAgent_1.SimpleAgent(config);
}
exports.createSimpleAgent = createSimpleAgent;
// Run example if this file is executed directly
if (require.main === module) {
    console.log('🔐 Simple Agent SDK Example');
    console.log('⚠️  To run this example, provide private key and address as arguments:');
    console.log('Usage: npm run example -- "your-private-key" "your-address"');
    console.log('\n📋 Example command:');
    console.log('ts-node examples/simple-example.ts "0x..." "0x..."');
    console.log('\n🔒 SECURITY NOTE: Never hardcode private keys in production!');
    // Get command line arguments
    const args = process.argv.slice(2);
    if (args.length >= 2) {
        const [privateKey, address] = args;
        runSimpleExample(privateKey, address).catch(console.error);
    }
    else {
        console.log('\n❌ Missing required arguments');
    }
}
//# sourceMappingURL=simple-example.js.map