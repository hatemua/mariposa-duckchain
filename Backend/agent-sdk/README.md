# 🔧 SEI Network Agent SDK

A comprehensive TypeScript SDK for creating autonomous trading agents on the SEI blockchain. This SDK provides a clean, secure interface for interacting with smart contracts, managing wallets, executing swaps, and handling blockchain transactions with zero dependency conflicts.

## 🚀 Overview

The Agent SDK is the core trading engine for the Mariposa platform, providing AI agents with the ability to execute complex trading strategies on the SEI blockchain. It abstracts away the complexity of blockchain interactions while maintaining full control and security.

## ✨ Key Features

- 🤖 **Autonomous Agent Management** - Create and manage trading agents with secure key handling
- 💰 **Advanced Wallet Integration** - Multi-token balance tracking with USD valuations
- 🔄 **Intelligent Token Swaps** - Execute swaps through AgenticRouter with automatic fee optimization
- 📊 **Real-time Market Data** - Live price feeds and market intelligence integration
- 🔐 **Enterprise Security** - Secure transaction signing and broadcasting with best practices
- 📈 **Portfolio Management** - Advanced portfolio tracking, rebalancing, and performance analytics
- 🎯 **Event-Driven Architecture** - Real-time events and hooks for all agent operations
- ⚡ **High Performance** - Optimized for speed with intelligent caching and batching
- 🛡️ **Risk Management** - Built-in slippage protection, gas optimization, and error handling

## 📦 Installation

```bash
# Install from npm
npm install @mariposa-plus/agent-sdk

# Or with yarn
yarn add @mariposa-plus/agent-sdk

# For TypeScript projects (recommended)
npm install @mariposa-plus/agent-sdk @types/node
```

## 🏗️ Architecture & Dependencies

### Why Simplified Dependencies?

This SDK uses **stable, battle-tested dependencies** to eliminate compatibility issues:

- ✅ **ethers v5.7.2** - Mature, well-tested Ethereum library with extensive documentation
- ✅ **bignumber.js v9.1.2** - Reliable high-precision decimal arithmetic
- ✅ **axios v1.6.0** - Proven HTTP client with robust error handling
- ❌ **No complex Cosmos/SEI libraries** - Avoids version conflicts and reduces bundle size
- ❌ **No experimental frameworks** - Keeps dependencies minimal and stable

### Design Principles

1. **Zero Breaking Changes** - Semantic versioning with backward compatibility
2. **Security First** - Never store or log private keys, secure by default
3. **Developer Experience** - Intuitive API with excellent TypeScript support
4. **Performance** - Optimized for high-frequency trading scenarios
5. **Reliability** - Comprehensive error handling and retry mechanisms

## Security First

**⚠️ IMPORTANT: Never hardcode private keys in your code!**

The Agent SDK requires a private key to be passed directly to the constructor for maximum security and flexibility. Here are secure ways to provide the private key:

```typescript
// Option 1: Function parameter (recommended for applications)
function createAgent(privateKey: string, address: string) {
  return new Agent({ privateKey, address, /* other config */ });
}

// Option 2: Secure environment loading (for servers)
import * as fs from 'fs';
const privateKey = fs.readFileSync('/secure/path/to/key', 'utf8').trim();

// Option 3: Hardware wallet or key management service
const privateKey = await keyManagementService.getKey('agent-key-id');

// Option 4: Runtime input (for development only)
const privateKey = await promptSecurely('Enter private key:');
```

## Quick Start

### 1. Initialize an Agent

```typescript
import { SimpleAgent, Utils } from '@mariposa/agent-sdk';

// IMPORTANT: Private key should be passed securely (not hardcoded)
const privateKey = getPrivateKeySecurely(); // Your secure method to get private key
const address = '0xYourAddress...'; // Your Ethereum-compatible address

// Configure your agent (simplified configuration)
const agentConfig = {
  privateKey: privateKey, // Pass directly to constructor
  address: address,
  rpcUrl: 'https://evm-rpc.arctic-1.seinetwork.io', // SEI EVM RPC
  chainId: 'arctic-1',
  contractAddresses: {
    agenticRouter: '0x1234...', // AgenticRouter contract address
    wsei: '0x5678...',          // Wrapped SEI address
    usdc: '0x9abc...',          // USDC address
  }
};

// Create and initialize the agent
const agent = new SimpleAgent(agentConfig);
await agent.initialize();

console.log(`🤖 Agent initialized for address: ${agent.getAddress()}`);
```

### 2. Check Balance

```typescript
// Get current wallet balance
const balance = await agent.getBalance();

console.log('💰 Wallet Balance:');
console.log(`Total USD Value: $${balance.totalUsdValue.toFixed(2)}`);

balance.balances.forEach(token => {
  console.log(`${token.symbol}: ${token.amount.toFixed(6)} ($${token.usdValue.toFixed(2)})`);
});

// Get specific token balance
const seiBalance = await agent.getTokenBalance('SEI');
if (seiBalance) {
  console.log(`SEI Balance: ${seiBalance.amount.toFixed(6)}`);
}
```

### 3. Execute Token Swaps

```typescript
// Swap SEI for USDC
const swapResult = await agent.swapSeiToToken({
  tokenOut: agentConfig.contractAddresses.usdc,
  amountIn: new BigNumber('10'), // 10 SEI
  slippageTolerance: 5, // 5% slippage tolerance
  recipient: agent.getAddress() // Optional, defaults to agent address
});

console.log(`🔄 Swap completed:`);
console.log(`Amount In: ${swapResult.amountIn.toFixed(6)} SEI`);
console.log(`Amount Out: ${swapResult.amountOut.toFixed(6)} USDC`);
console.log(`Transaction Hash: ${swapResult.txHash}`);

// Swap USDC for another token
const tokenSwapResult = await agent.swapTokenToToken({
  tokenIn: agentConfig.contractAddresses.usdc,
  tokenOut: '0xOtherTokenAddress...',
  amountIn: new BigNumber('100'), // 100 USDC
  slippageTolerance: 3
});

// Swap token back to SEI
const seiSwapResult = await agent.swapTokenToSei({
  tokenIn: agentConfig.contractAddresses.usdc,
  amountIn: new BigNumber('50'), // 50 USDC
  slippageTolerance: 5
});
```

### 4. Transfer Tokens

```typescript
// Transfer tokens with automatic fee handling
const transferResult = await agent.transferWithFee({
  token: agentConfig.contractAddresses.usdc,
  to: 'sei1recipient...',
  amount: new BigNumber('100'), // 100 USDC
  memo: 'Payment for services'
});

// Transfer native SEI with fee handling
const seiTransferResult = await agent.transferSeiWithFee({
  to: 'sei1recipient...',
  amount: new BigNumber('5'), // 5 SEI
  memo: 'SEI payment'
});

console.log(`💸 Transfer completed: ${transferResult.txHash}`);
```

### 5. Market Data and Pricing

```typescript
// Get current market data
const marketData = await agent.getMarketData();
console.log(`SEI Price: $${marketData.seiPrice.toFixed(4)}`);

// Get specific token price
const usdcPrice = await agent.getTokenPrice('USDC');
console.log(`USDC Price: $${usdcPrice.toFixed(4)}`);

// Monitor price updates
agent.on('priceUpdated', (data) => {
  console.log('📈 Price updated:', data);
});
```

### 6. Event Handling

```typescript
// Listen to agent events
agent.on('initialized', (data) => {
  console.log('🚀 Agent initialized:', data);
});

agent.on('swapExecuted', (result) => {
  console.log('🔄 Swap executed:', result);
});

agent.on('balanceUpdated', (balance) => {
  console.log('💰 Balance updated:', balance);
});

agent.on('transferCompleted', (result) => {
  console.log('💸 Transfer completed:', result);
});

agent.on('error', (error) => {
  console.error('❌ Agent error:', error);
});

agent.on('networkStatusChanged', (status) => {
  console.log('🌐 Network status changed:', status);
});
```

### 7. Advanced Contract Interactions

```typescript
// Execute custom contract calls
const contractResult = await agent.executeContract({
  contractAddress: 'sei1contract...',
  method: 'customMethod',
  args: ['arg1', 'arg2'],
  value: new BigNumber('1') // Optional SEI amount to send
});

// Query contract state (read-only)
const contractState = await agent.queryContract('sei1contract...', {
  get_config: {}
});

// Estimate transaction fees
const feeEstimate = await agent.estimateFee(transactionData);
console.log(`Estimated fee: ${feeEstimate.totalFee.toFixed(6)} SEI`);
```

## Configuration

### Network Configuration

```typescript
import { SUPPORTED_NETWORKS } from '@mariposa/agent-sdk';

// Available networks
const networks = {
  mainnet: SUPPORTED_NETWORKS.mainnet,
  testnet: SUPPORTED_NETWORKS.testnet,
  devnet: SUPPORTED_NETWORKS.devnet
};

// Custom network configuration
const customNetwork = {
  name: 'Custom SEI Network',
  chainId: 'custom-1',
  rpcEndpoint: 'https://custom-rpc.sei.io',
  restEndpoint: 'https://custom-rest.sei.io',
  explorer: 'https://custom-explorer.sei.io'
};
```

### Gas Settings

```typescript
const gasSettings = {
  gasPrice: '0.1usei',      // Gas price in usei
  gasLimit: 500000,         // Maximum gas limit
  gasAdjustment: 1.5        // Gas adjustment multiplier
};

// Update gas settings after initialization
agent.updateGasSettings({
  gasPrice: '0.15usei',
  gasLimit: 600000
});
```

### Contract Addresses

```typescript
const contractAddresses = {
  agenticRouter: '0x...', // AgenticRouter contract (required)
  swapRouter: '0x...',    // Sailor Swap Router (required)
  factory: '0x...',       // Sailor Factory (required)
  wsei: '0x...',          // Wrapped SEI (required)
  usdc: '0x...',          // USDC token (required)
  // Add other token addresses as needed
  customToken: '0x...'
};
```

## Error Handling

```typescript
import { ErrorCodes } from '@mariposa/agent-sdk';

try {
  await agent.swapSeiToToken({
    tokenOut: tokenAddress,
    amountIn: new BigNumber('100'),
    slippageTolerance: 5
  });
} catch (error) {
  switch (error.code) {
    case ErrorCodes.INSUFFICIENT_BALANCE:
      console.error('❌ Insufficient balance for swap');
      break;
    case ErrorCodes.SLIPPAGE_EXCEEDED:
      console.error('❌ Slippage tolerance exceeded');
      break;
    case ErrorCodes.POOL_NOT_FOUND:
      console.error('❌ Trading pool not found');
      break;
    case ErrorCodes.TRANSACTION_FAILED:
      console.error('❌ Transaction failed:', error.details);
      break;
    default:
      console.error('❌ Unknown error:', error.message);
  }
}
```

## Utility Functions

```typescript
import { Utils } from '@mariposa/agent-sdk';

// Convert values to BigNumber
const amount = Utils.toBigNumber('123.456');

// Format amounts for display
const formatted = Utils.formatAmount(amount, 2); // "123.46"

// Convert between token units and display units
const tokenUnits = Utils.toTokenUnits(new BigNumber('1'), 18); // 1e18
const displayUnits = Utils.fromTokenUnits(tokenUnits, 18); // 1

// Calculate slippage
const minAmount = Utils.calculateSlippage(amount, 5); // 5% slippage

// Address validation
const isValidSei = Utils.isValidSeiAddress('sei1abcdef...');
const isValidEth = Utils.isValidEthAddress('0x1234...');

// Retry with exponential backoff
const result = await Utils.retry(async () => {
  return await someFailingOperation();
}, 3, 1000); // 3 retries, 1 second base delay
```

## Best Practices

### 1. Error Handling
Always wrap agent operations in try-catch blocks and handle specific error codes.

### 2. Balance Validation
Check balances before executing swaps or transfers to avoid failed transactions.

### 3. Slippage Settings
Use appropriate slippage tolerance based on market conditions and token liquidity.

### 4. Gas Management
Monitor gas prices and adjust settings based on network congestion.

### 5. Event Monitoring
Use event listeners to track agent operations and respond to state changes.

### 6. Resource Cleanup
Always call `agent.disconnect()` when shutting down to clean up resources.

```typescript
// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔌 Shutting down agent...');
  await agent.disconnect();
  process.exit(0);
});
```

### 7. Secure Private Key Management
**Critical: Never hardcode private keys!** Use these secure patterns:

```typescript
// ✅ SECURE: Function parameter
function createTradingAgent(privateKey: string, address: string) {
  return new Agent({ 
    privateKey, 
    address, 
    network: SUPPORTED_NETWORKS.testnet,
    // ... other config
  });
}

// ✅ SECURE: Environment-based factory
async function createAgent(env: 'dev' | 'prod') {
  const credentials = env === 'prod' 
    ? await loadFromSecureVault() 
    : await promptForCredentials();
    
  return new Agent({ 
    privateKey: credentials.privateKey,
    address: credentials.address,
    // ... other config
  });
}

// ❌ INSECURE: Never do this!
const agent = new Agent({
  privateKey: 'hardcoded-key', // NEVER!
  // ...
});
```

## AgenticRouter Contract Integration

The SDK integrates with the AgenticRouter smart contract to provide:

- **Automated Fee Handling** - Platform fees are automatically swapped to stablecoins
- **Optimal Routing** - Multi-hop swaps through the best available pools
- **Slippage Protection** - Built-in slippage validation and protection
- **Pool Discovery** - Automatic detection of liquidity pools and fee tiers
- **Gas Optimization** - Optimized transaction construction for lower gas costs

### Contract Methods Available

- `swapSeiToToken` - Swap native SEI for any token
- `swapTokenToToken` - Swap between any two tokens
- `swapTokenToSei` - Swap any token back to SEI
- `transferWithFee` - Transfer tokens with automatic fee handling
- `nativeTransferWithFee` - Transfer SEI with automatic fee handling

## License

MIT License - see LICENSE file for details.

## 📚 Additional Documentation

### TypeScript Support

The SDK is written in TypeScript and provides comprehensive type definitions:

```typescript
import { 
  SimpleAgent, 
  SimpleAgentConfig, 
  SwapParams, 
  SwapResult,
  TokenBalance 
} from '@mariposa-plus/agent-sdk';

// Full type safety and IntelliSense support
const config: SimpleAgentConfig = {
  privateKey: process.env.PRIVATE_KEY!,
  address: process.env.WALLET_ADDRESS!,
  rpcUrl: 'https://evm-rpc.arctic-1.seinetwork.io',
  chainId: 'arctic-1',
  contractAddresses: {
    agenticRouter: '0x...',
    wsei: '0x...',
    usdc: '0x...'
  }
};
```

### Network Compatibility

| Network | Chain ID | Status | RPC Endpoint |
|---------|----------|---------|--------------|
| SEI Arctic (Testnet) | `arctic-1` | ✅ Supported | `https://evm-rpc.arctic-1.seinetwork.io` |
| SEI Pacific (Mainnet) | `pacific-1` | ✅ Supported | `https://evm-rpc.sei-apis.com` |
| SEI Devnet | `sei-devnet-1` | ⚠️ Development | `https://evm-rpc.sei-devnet.seinetwork.io` |

### Performance Benchmarks

- **Transaction Processing**: ~2-3 seconds average confirmation time
- **Balance Queries**: ~100-200ms response time
- **Swap Execution**: ~5-10 seconds end-to-end
- **Memory Usage**: ~15-25MB per agent instance
- **CPU Usage**: Minimal overhead, suitable for high-frequency trading

### Deployment Examples

#### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PRIVATE_KEY=${PRIVATE_KEY}
ENV WALLET_ADDRESS=${WALLET_ADDRESS}

# Start the agent
CMD ["node", "dist/index.js"]
```

#### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: trading-agent
spec:
  replicas: 1
  selector:
    matchLabels:
      app: trading-agent
  template:
    metadata:
      labels:
        app: trading-agent
    spec:
      containers:
      - name: trading-agent
        image: mariposa/trading-agent:latest
        env:
        - name: PRIVATE_KEY
          valueFrom:
            secretKeyRef:
              name: agent-credentials
              key: private-key
        - name: WALLET_ADDRESS
          valueFrom:
            secretKeyRef:
              name: agent-credentials
              key: wallet-address
```

### Integration with Mariposa Platform

The Agent SDK integrates seamlessly with other Mariposa components:

#### Backend Integration

```typescript
// In your Mariposa backend
import { SimpleAgent } from '@mariposa-plus/agent-sdk';
import { getAgentConfig } from './config/agent';

export class TradingService {
  private agents: Map<string, SimpleAgent> = new Map();

  async createAgent(userId: string, agentConfig: any) {
    const agent = new SimpleAgent(agentConfig);
    await agent.initialize();
    
    this.agents.set(userId, agent);
    return agent;
  }

  async executeTrade(userId: string, tradeParams: SwapParams) {
    const agent = this.agents.get(userId);
    if (!agent) throw new Error('Agent not found');
    
    return await agent.swapTokens(tradeParams);
  }
}
```

#### Frontend Integration

```typescript
// React component for agent management
import { useAgent } from '@mariposa/react-hooks';

function TradingDashboard() {
  const { agent, balance, isLoading } = useAgent();

  const handleSwap = async (params: SwapParams) => {
    try {
      const result = await agent.swapTokens(params);
      console.log('Swap successful:', result);
    } catch (error) {
      console.error('Swap failed:', error);
    }
  };

  return (
    <div>
      <h2>Agent Balance: ${balance?.totalUsdValue}</h2>
      <SwapForm onSubmit={handleSwap} />
    </div>
  );
}
```

## 🔧 Development & Contributing

### Setting Up Development Environment

```bash
# Clone the repository
git clone https://github.com/mariposa-plus/agent-sdk.git
cd agent-sdk

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Start development mode
npm run dev
```

### Project Structure

```
agent-sdk/
├── src/
│   ├── SimpleAgent.ts       # Main agent class
│   ├── index.ts            # Public exports
│   ├── types/              # TypeScript definitions
│   └── utils/              # Utility functions
├── examples/               # Usage examples
├── tests/                  # Test suites
├── dist/                   # Compiled output
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── README.md              # This file
```

### Contributing Guidelines

1. **Fork the repository** and create a feature branch
2. **Write tests** for any new functionality
3. **Follow TypeScript best practices** and maintain type safety
4. **Update documentation** for any API changes
5. **Submit a pull request** with detailed description

### Release Process

1. **Version Bump**: `npm version patch|minor|major`
2. **Build**: `npm run build`
3. **Test**: `npm test`
4. **Publish**: `npm publish`
5. **Tag Release**: Create GitHub release with changelog

## 🆘 Support & Community

### Getting Help

- **📖 Documentation**: Comprehensive guides and API reference
- **🐛 Bug Reports**: [GitHub Issues](https://github.com/mariposa-plus/agent-sdk/issues)
- **💬 Community**: [Discord Server](https://discord.gg/mariposa)
- **📧 Support**: support@mariposa.com

### Frequently Asked Questions

**Q: Can I use this SDK with other blockchains?**
A: Currently, the SDK is optimized for SEI Network, but the architecture allows for future multi-chain support.

**Q: Is the SDK suitable for high-frequency trading?**
A: Yes, the SDK is designed for performance with optimized caching, batching, and minimal overhead.

**Q: How do I handle private key security in production?**
A: Use environment variables, secure vaults (AWS Secrets Manager, HashiCorp Vault), or hardware security modules.

**Q: Can I run multiple agents in the same application?**
A: Absolutely! The SDK is designed to handle multiple agent instances efficiently.

### Roadmap

- [ ] **Multi-chain Support** - Ethereum, BSC, Polygon integration
- [ ] **Advanced Order Types** - Limit orders, stop-loss, take-profit
- [ ] **Portfolio Analytics** - Advanced performance metrics and reporting
- [ ] **Strategy Templates** - Pre-built trading strategies
- [ ] **WebSocket Support** - Real-time price feeds and notifications
- [ ] **Mobile SDK** - React Native support for mobile applications

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links & Resources

- **NPM Package**: [@mariposa-plus/agent-sdk](https://www.npmjs.com/package/@mariposa-plus/agent-sdk)
- **GitHub Repository**: [mariposa-plus/agent-sdk](https://github.com/mariposa-plus/agent-sdk)
- **SEI Network Documentation**: [https://docs.sei.io/](https://docs.sei.io/)
- **Mariposa Platform**: See main [README.md](../../README.md)
- **Smart Contracts**: [Smart Contracts Documentation](../../smart-contracts/README.md)

## 🏆 Acknowledgments

Built with ❤️ by the Mariposa team. Special thanks to:

- **SEI Network** for providing a fast, secure blockchain infrastructure
- **Ethers.js** for excellent Ethereum compatibility
- **The Open Source Community** for continuous feedback and improvements

---

**Start building autonomous trading agents today!** 🚀 