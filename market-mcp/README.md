# 📊 Market MCP Server

A comprehensive MCP (Model Context Protocol) server that provides real-time market data and advanced token analysis from GeckoTerminal API across 80+ blockchain networks. Designed specifically for integration with AI trading systems and automated market analysis.

## 🚀 Overview

The Market MCP Server is a critical component of the Mariposa trading platform, providing AI agents with comprehensive market data, new token detection, trending analysis, and automated trading insights. It serves as the primary market intelligence layer for AI-powered trading decisions.

## ✨ Core Features

- **🌐 Multi-Network Support**: Access data from 80+ blockchain networks including Ethereum, BSC, Polygon, SEI, Arbitrum, and more
- **💧 Pool Analytics**: Deep liquidity pool analysis with reserve tracking and volume metrics  
- **💰 Price Intelligence**: Real-time token prices, OHLCV charts, and price change tracking
- **🔍 Advanced Search**: Multi-criteria search across tokens, pools, and addresses
- **🆕 New Token Detection**: AI-powered identification of newly launched tokens
- **📈 Trending Analysis**: Identify tokens with unusual volume or price activity
- **⚡ Real-time Data**: Sub-minute data freshness with intelligent caching
- **🎯 SEI Network Optimization**: Specialized support for SEI EVM with multi-DEX aggregation

## 🛠️ Available MCP Tools

### Core Market Data Tools

1. **`get_networks`** - Retrieve all supported blockchain networks
2. **`get_pool_data`** - Get detailed information for a specific liquidity pool
3. **`get_network_pools`** - Fetch top pools for any network with pagination
4. **`get_ohlcv_data`** - Historical price data (OHLCV) for technical analysis
5. **`get_token_prices`** - Current USD prices for multiple tokens
6. **`search_pools`** - Search pools by token symbol, address, or pool address

### Advanced Analysis Tools

7. **`get_new_pools`** - Detect newly created liquidity pools (last 24-168 hours)
8. **`get_trending_pools`** - Find pools with high activity and volume spikes
9. **`get_new_tokens`** - AI-powered new token discovery with risk analysis
10. **`get_all_tokens`** - Comprehensive token analysis with risk/profit scoring

## 🏗️ Installation & Setup

### Prerequisites
- Node.js 18+
- TypeScript support
- Claude Desktop (for MCP integration)

### Quick Start

```bash
# Clone the repository (if standalone)
git clone <repository-url>
cd market-mcp

# Install dependencies
npm install

# Build the TypeScript project
npm run build

# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

### Environment Configuration

Create a `.env` file (optional):

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# MCP Protocol
MCP_STDIO_MODE=false

# Rate Limiting
GECKO_TERMINAL_REQUEST_INTERVAL=1000
```

## 🔌 Claude Desktop Integration

### Configuration Setup

1. **Locate your Claude Desktop configuration file:**
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. **Add the Market MCP server:**

```json
{
  "mcpServers": {
    "market-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/mariposa/market-mcp/dist/index.js"],
      "env": {
        "MCP_STDIO_MODE": "true"
      }
    }
  }
}
```

3. **Restart Claude Desktop**

4. **Verify integration** - The server tools should appear in Claude Desktop

### HTTP API Mode

The server also provides HTTP endpoints for direct API access:

```bash
# Start server on port 3001
npm start

# Health check
curl http://localhost:3001/api/health

# Get networks
curl http://localhost:3001/api/networks

# New pools
curl -X POST http://localhost:3001/api/new-pools \
  -H "Content-Type: application/json" \
  -d '{"network":"sei-evm","hoursBack":24}'
```

## 🎯 Usage Examples

### Basic Market Data Queries

```plaintext
# Get all supported networks
"Show me all available blockchain networks for trading"

# Find top pools on SEI
"Get the top liquidity pools on SEI network"

# Search for specific tokens
"Find all USDC pools on Ethereum"
```

### Advanced Token Analysis

```plaintext
# Discover new tokens
"Find newly launched tokens on SEI network in the last 24 hours"

# Identify trending opportunities  
"Show me the most trending pools on Ethereum with high volume"

# Comprehensive token analysis
"Analyze all tokens on SEI network with risk and profit scoring"
```

### Technical Analysis

```plaintext
# Get price charts
"Show me OHLCV data for pool 0x123... on Ethereum"

# Price monitoring
"Get current prices for WETH, USDC, and WBTC on Ethereum"
```

## 🔧 SEI Network Specialization

The Market MCP server includes specialized optimizations for SEI network:

- **Multi-DEX Aggregation**: Automatically queries Sailor, DragonSwap, Yaka Finance, and DragonSwap V2
- **Enhanced Pool Discovery**: Improved detection of new SEI-based tokens
- **Optimized Rate Limiting**: Efficient API usage for SEI-specific queries

## 📡 API Rate Limiting & Performance

### GeckoTerminal API Limits
- **Free Tier**: 30 calls/minute
- **Data Freshness**: 1-minute cache
- **Request Spacing**: 1 second between requests
- **Automatic Rate Limiting**: Built-in request queuing

### Performance Optimizations
- **Intelligent Caching**: Reduces redundant API calls
- **Batch Processing**: Efficient multi-pool analysis
- **Request Queuing**: Respects API rate limits automatically
- **Error Recovery**: Graceful handling of API failures

## 🌐 Supported Networks

### Major Networks
- **Ethereum** (`eth`) - All major DEXes
- **SEI EVM** (`sei-evm`) - Sailor, DragonSwap, Yaka Finance
- **Binance Smart Chain** (`bsc`) - PancakeSwap, etc.
- **Polygon** (`polygon`) - QuickSwap, SushiSwap
- **Arbitrum** (`arbitrum`) - Uniswap V3, GMX
- **Optimism** (`optimism`) - Uniswap V3, Synthetix

### Additional Networks
- Avalanche, Fantom, Solana, Near, Cosmos, and 70+ more

## 🔍 Token Analysis Features

### Risk Assessment
- **Liquidity Analysis**: Pool depth and stability
- **Volume Patterns**: Trading activity indicators
- **Price Volatility**: Risk measurement
- **Market Cap Evaluation**: Token maturity assessment
- **Token Type Classification**: Stablecoin, DeFi, Meme, etc.

### Profit Scoring
- **Volume Growth**: Trading momentum
- **Price Momentum**: Directional movement
- **Efficiency Ratios**: Volume/liquidity optimization
- **Growth Potential**: Market cap expansion possibilities

### New Token Detection
- **Liquidity Thresholds**: Filters for meaningful pools
- **Activity Patterns**: Real trading vs. fake volume
- **Age Estimation**: Approximate launch timeframe
- **Risk Categories**: Automated risk classification

## 🚨 Error Handling

The server includes comprehensive error handling:

- **API Failures**: Graceful degradation and retries
- **Rate Limit Protection**: Automatic request spacing
- **Data Validation**: Input parameter checking  
- **Network Timeouts**: Connection failure recovery
- **Detailed Logging**: Request/response tracking

## 📈 Integration with Mariposa Platform

The Market MCP server is designed to integrate seamlessly with:

- **AI Trading Agents**: Provides market context for decision making
- **Automated Strategies**: Real-time data for trading algorithms  
- **Risk Management**: Token analysis for portfolio safety
- **Opportunity Discovery**: New token and trending pool identification

## 🔧 Development & Contributing

### Project Structure
```
market-mcp/
├── src/
│   └── index.ts          # Main server implementation
├── dist/                 # Compiled JavaScript
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── API_DOCUMENTATION.md  # Detailed API reference
└── README.md            # This file
```

### Development Commands
```bash
npm run dev          # Development with auto-reload
npm run build        # Compile TypeScript
npm start            # Production server
npm test             # Run tests (if available)
```

### Adding New Features
1. Extend the `GeckoTerminalAPI` class for new endpoints
2. Add corresponding MCP tools in `MarketMCPServer`
3. Update documentation and examples
4. Test with Claude Desktop integration

## 📄 API Documentation

For detailed API reference and advanced usage examples, see:
- [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md) - Complete API reference
- [`claude_desktop_config.json`](./claude_desktop_config.json) - Example configuration

## 🆘 Troubleshooting

### Common Issues

1. **Claude Desktop not detecting server**
   - Verify absolute path in configuration
   - Check file permissions
   - Restart Claude Desktop

2. **Rate limit errors**
   - Server automatically handles rate limiting
   - Reduce concurrent requests if issues persist

3. **Network timeouts**
   - Check internet connection
   - GeckoTerminal API status

4. **Missing token data**
   - Not all tokens may be available on all networks
   - Try alternative networks or wait for indexing

## 📊 Monitoring & Logging

The server provides extensive logging:

- **Request Tracking**: All GeckoTerminal API calls
- **Performance Metrics**: Response times and data sizes
- **Error Analytics**: Failure rates and error patterns
- **Rate Limit Monitoring**: API quota usage

## 🔗 Links & Resources

- **GeckoTerminal API**: [https://www.geckoterminal.com/](https://www.geckoterminal.com/)
- **MCP Protocol**: [https://modelcontextprotocol.io/](https://modelcontextprotocol.io/)
- **Claude Desktop**: [https://claude.ai/desktop](https://claude.ai/desktop)
- **Mariposa Platform**: See main README.md

---

Built with ❤️ for the Mariposa AI Trading Platform