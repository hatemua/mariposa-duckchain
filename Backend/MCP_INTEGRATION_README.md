# MCP Market Data Integration

This document describes the implementation of Model Context Protocol (MCP) integration for real-time market data in the Mariposa backend system, with specific focus on the sei-EVM network.

## Overview

The MCP Market Data Integration provides:
- Real-time market data from GeckoTerminal API
- AI-powered token recommendations with trust/risk scoring
- Sei network specific market analysis
- Context generation for LLMs and trading agents
- Comprehensive pool and price data access

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Market-MCP    │
│   Components    │◄──►│   Controllers   │◄──►│     Server      │
│                 │    │   & Services    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                        ┌─────────────────┐    ┌─────────────────┐
                        │   Agent System  │    │  GeckoTerminal  │
                        │   Integration   │    │       API       │
                        └─────────────────┘    └─────────────────┘
```

## File Structure

```
Backend/
├── services/
│   └── mcpMarketDataService.js      # Main MCP client service
├── controllers/
│   └── mcpMarketDataController.js   # API endpoint handlers
├── routes/
│   └── mcpMarketDataRoutes.js       # Route definitions
├── config/
│   └── mcpConfig.js                 # Configuration settings
├── test-mcp-integration.js          # Integration test suite
└── MCP_INTEGRATION_README.md        # This documentation
```

## Installation & Setup

### 1. Install Dependencies

```bash
cd Backend
npm install @modelcontextprotocol/sdk
```

### 2. Build Market-MCP Server

```bash
cd ../market-mcp
npm install
npm run build
```

### 3. Configure Environment

The MCP integration automatically connects to the market-mcp server. Ensure the server path is correct in `config/mcpConfig.js`.

### 4. Start the Backend

```bash
cd ../Backend
npm start
```

The backend will automatically initialize the MCP connection and log the status.

## API Endpoints

### General Market Data

- `GET /api/mcp/networks` - Get all supported blockchain networks
- `GET /api/mcp/status` - Get MCP service health status
- `GET /api/mcp/search/pools?query=USDC` - Search pools by token/address
- `GET /api/mcp/recommendations?criteria=balanced&count=3` - Get AI token recommendations

### Pool & Price Data

- `GET /api/mcp/pool/:network/:address` - Get detailed pool data
- `GET /api/mcp/ohlcv/:network/:address` - Get OHLCV technical analysis data
- `POST /api/mcp/prices` - Get current token prices (POST with token addresses array)

### Sei Network Specific

- `GET /api/mcp/sei/pools` - Get top Sei network pools
- `GET /api/mcp/sei/summary` - Get comprehensive Sei market summary

### LLM & Agent Integration

- `GET /api/mcp/context/llm` - Get formatted market context for LLMs
- `POST /api/mcp/agent/context` - Get customized context for specific agent types

## Usage Examples

### Basic Market Data Access

```javascript
// Get all supported networks
const response = await fetch('/api/mcp/networks');
const networks = await response.json();

// Get Sei pools
const seiPools = await fetch('/api/mcp/sei/pools?page=1');
const poolData = await seiPools.json();

// Get token recommendations
const recommendations = await fetch('/api/mcp/recommendations?criteria=safe&count=5');
const tokens = await recommendations.json();
```

### LLM Context Generation

```javascript
// Get market context for an LLM
const context = await fetch('/api/mcp/context/llm?includeTopPools=true&includeTokenRecommendations=true');
const llmContext = await context.json();

// Use the formatted prompt
console.log(llmContext.formattedPrompt);
```

### Agent-Specific Context

```javascript
// Get context for a trading agent
const agentContext = await fetch('/api/mcp/agent/context', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentType: 'trading',
    focusArea: 'conservative'
  })
});
const tradingContext = await agentContext.json();
```

## Service Integration

### Using the MCP Service Directly

```javascript
const MCPMarketDataService = require('./services/mcpMarketDataService');

// Initialize service
const marketService = new MCPMarketDataService();

// Get Sei market data
const seiData = await marketService.getSeiPools(1);

// Get token recommendations
const recommendations = await marketService.getTokenRecommendations('balanced', 3);

// Generate LLM context
const context = await marketService.getMarketContextForLLM({
  includeTopPools: true,
  includeTokenRecommendations: true
});
```

### Agent System Integration

The MCP service integrates seamlessly with the existing agent system:

```javascript
// In an agent controller
const marketContext = await marketService.getMarketContextForLLM({
  networkId: 'sei',
  recommendationCriteria: 'safe'
});

// Pass context to agent
const agentResponse = await agent.chat(userMessage, {
  additionalContext: marketContext.formattedPrompt
});
```

## Configuration

### Network Configuration

Edit `config/mcpConfig.js` to customize network settings:

```javascript
networks: {
  default: 'sei',
  supported: {
    'sei': {
      id: 'sei',
      name: 'Sei Network',
      isDefault: true,
      isEVM: true
    }
    // ... other networks
  }
}
```

### Cache Settings

```javascript
cache: {
  timeout: 60000, // 1 minute
  maxSize: {
    networks: 100,
    pools: 500,
    prices: 1000
  }
}
```

### Recommendation Criteria

Available recommendation criteria:
- `safe` - Low risk, high trust tokens
- `growth` - High volume activity tokens  
- `stable` - Price-stable tokens
- `balanced` - Overall best-scoring tokens
- `high_risk_high_reward` - High potential but risky tokens

## Testing

### Run Integration Tests

```bash
cd Backend
node test-mcp-integration.js
```

This will test:
- ✅ MCP server connection
- ✅ Network data retrieval
- ✅ Sei pools access
- ✅ Token recommendations
- ✅ Pool search functionality
- ✅ LLM context generation
- ✅ Service status monitoring

### Manual Testing

Test individual endpoints:

```bash
# Test service status
curl http://localhost:5000/api/mcp/status

# Test Sei pools
curl http://localhost:5000/api/mcp/sei/pools

# Test recommendations
curl http://localhost:5000/api/mcp/recommendations?criteria=balanced
```

## Troubleshooting

### Common Issues

1. **MCP Server Connection Failed**
   - Ensure market-mcp server is built: `cd market-mcp && npm run build`
   - Check server path in `mcpConfig.js`
   - Verify Node.js version compatibility

2. **Sei Network Not Found**
   - Check if 'sei' is supported in GeckoTerminal API
   - Service will auto-detect available Sei networks
   - Fallback to manual network configuration

3. **Cache Issues**
   - Cache automatically expires after 1 minute
   - Restart service to clear all caches
   - Adjust cache timeout in configuration

4. **Rate Limiting**
   - GeckoTerminal API: 30 calls/minute
   - Internal rate limiting: 100 requests/15 minutes
   - Use caching to minimize API calls

### Debug Mode

Enable debug logging:

```bash
NODE_ENV=development MCP_VERBOSE=true npm start
```

## Performance Considerations

### Caching Strategy
- Network data: Cached for 5 minutes
- Pool data: Cached for 1 minute  
- Price data: Cached for 30 seconds
- Recommendations: Cached for 2 minutes

### API Optimization
- Parallel requests where possible
- Intelligent fallbacks for failed requests
- Graceful degradation when MCP server unavailable

### Memory Usage
- Automatic cache cleanup every 5 minutes
- Maximum cache sizes enforced
- Connection pooling for MCP communication

## Security

### API Security
- Rate limiting on all endpoints
- Input validation and sanitization
- Error message sanitization
- No sensitive data exposure

### MCP Communication
- Local process communication only
- No external network exposure of MCP server
- Automatic connection recovery

## Integration with Existing Systems

### Agent System
The MCP service integrates with existing agent controllers:

```javascript
// In agentController.js
const marketData = await mcpService.getMarketContextForLLM(options);
const response = await agent.processWithMarketContext(message, marketData);
```

### SEI Agent Integration
Specific integration with Sei network agents:

```javascript
// In seiAgentController.js  
const seiMarketData = await mcpService.getSeiMarketSummary();
const seiAgent = await agent.enhanceWithMarketData(seiMarketData);
```

## Future Enhancements

### Planned Features
- [ ] WebSocket real-time updates
- [ ] Multi-network portfolio tracking
- [ ] Advanced technical indicators
- [ ] Custom token watchlists
- [ ] Price alert system
- [ ] Historical data analysis

### Agent Enhancements
- [ ] Market sentiment analysis
- [ ] Automated trading signal generation
- [ ] Risk assessment automation
- [ ] Portfolio optimization suggestions

## Support

For questions or issues:
1. Check this documentation
2. Run the integration test suite
3. Review console logs for error details
4. Check MCP server status at `/api/mcp/status`

## Changelog

### v1.0.0 (Current)
- ✅ Initial MCP integration
- ✅ Sei network support
- ✅ Token recommendations
- ✅ LLM context generation
- ✅ Agent system integration
- ✅ Comprehensive test suite
