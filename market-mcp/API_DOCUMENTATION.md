# Market MCP Server API Documentation

## Overview

Enhanced MCP server that provides real-time market data from GeckoTerminal API with AI-powered token recommendations, trust scoring, and risk management analysis.

## Features

### Core MCP Tools
- **get_networks** - Get all supported blockchain networks
- **get_pool_data** - Get detailed data for specific pools
- **get_network_pools** - Get top pools for a network
- **get_ohlcv_data** - Get OHLCV candlestick data
- **get_token_prices** - Get current token prices
- **search_pools** - Search pools by various criteria

### New AI-Powered Features
- **recommend_tokens** - Get intelligent token recommendations with scoring
- **Trust Score Calculation** - Market data + rugpool risk assessment
- **Risk Management Scoring** - Comprehensive risk analysis
- **Express API Integration** - RESTful endpoints for web integration

## Trust Score Algorithm

The trust score (0-100) is calculated based on:

- **Liquidity Analysis (30 points max)**
  - >$1M liquidity: 30 points
  - >$100K liquidity: 20 points
  - >$10K liquidity: 10 points

- **Volume Analysis (25 points max)**
  - >$500K 24h volume: 25 points
  - >$100K 24h volume: 15 points
  - >$10K 24h volume: 8 points

- **Price Stability (20 points max)**
  - <5% 24h change: 20 points
  - <15% 24h change: 15 points
  - <30% 24h change: 8 points

- **Volume/Liquidity Ratio (15 points max)**
  - Healthy ratio (0.1-2): 15 points

- **Rugpool Detection (-30 points)**
  - Keywords: 'test', 'scam', 'rug', 'fake', 'copy'

## Risk Score Algorithm

The risk score (0-100, higher = riskier) considers:

- **Low Liquidity Risk**
  - <$10K: +30 points
  - <$100K: +15 points
  - >$1M: -20 points

- **Price Volatility Risk**
  - >50% 24h change: +25 points
  - >20% 24h change: +15 points
  - <5% 24h change: -10 points

- **Volume Risk**
  - <$1K 24h volume: +20 points
  - >$100K 24h volume: -10 points

- **Volume/Liquidity Imbalance**
  - Ratio >5: +25 points
  - Ratio <0.01: +15 points

- **Memecoin Risk**
  - Contains meme indicators: +20 points

## MCP Tool Usage

### recommend_tokens

```javascript
{
  "name": "recommend_tokens",
  "arguments": {
    "network": "eth",           // Required: Network ID
    "criteria": "balanced",     // Optional: safe|growth|stable|balanced
    "count": 3                  // Optional: 1-5 tokens (default: 3)
  }
}
```

**Criteria Types:**
- **safe**: Low risk (<40) + High trust (>60)
- **growth**: High volume activity (>30% volume score)
- **stable**: High price stability (>70% stability score)
- **balanced**: All tokens ranked by overall score

## Express API Endpoints

### POST /api/recommend-tokens
Get AI-powered token recommendations.

**Request Body:**
```json
{
  "network": "eth",
  "criteria": "balanced",
  "count": 3
}
```

**Response:**
```json
{
  "tokens": [
    {
      "token": {
        "id": "...",
        "address": "0x...",
        "name": "Token Name",
        "symbol": "TKN",
        "price_usd": "1.25"
      },
      "trustScore": 85,
      "riskScore": 25,
      "overallScore": 81.0,
      "analysis": {
        "liquidityScore": 75.5,
        "volumeScore": 60.2,
        "priceStabilityScore": 80.0,
        "rugpoolRisk": 20,
        "marketCapScore": 45.8
      }
    }
  ],
  "criteria": "balanced",
  "timestamp": 1703123456789
}
```

### GET /api/networks
Get all supported blockchain networks.

### GET /api/health
Health check endpoint.

## Deployment

### MCP Server Mode (Claude Desktop)
```bash
npm run build
```

Add to Claude Desktop config:
```json
{
  "mcpServers": {
    "market-mcp": {
      "command": "node",
      "args": ["C:\\path\\to\\market-mcp\\dist\\index.js"],
      "env": {}
    }
  }
}
```

### Standalone Server Mode
```bash
npm run build
npm start
# Server runs on port 3001 (configurable via PORT env var)
```

## Example Claude Interactions

**Basic Usage:**
"Get token recommendations for Ethereum network with balanced criteria"

**Advanced Usage:**
"Find 5 safe tokens on Polygon with low risk scores"

**Risk Analysis:**
"Show me growth tokens on BSC and explain their risk factors"

## Rate Limiting

- MCP Mode: Governed by GeckoTerminal API (30 calls/minute)
- Express API: 100 requests per 15-minute window per IP

## Error Handling

All errors include:
- Descriptive error messages
- Proper HTTP status codes (Express API)
- MCP error format (MCP tools)
- Graceful degradation for partial failures