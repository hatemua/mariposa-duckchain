/**
 * MCP Market Data Routes
 * Routes for real-time market data via MCP
 */

const express = require('express');
const MCPMarketDataController = require('../controllers/mcpMarketDataController');

const router = express.Router();
const mcpController = new MCPMarketDataController();

// ===============================
// GENERAL MARKET DATA ROUTES
// ===============================

/**
 * @route GET /api/mcp/networks
 * @desc Get all supported blockchain networks
 * @access Public
 */
router.get('/networks', async (req, res) => {
    await mcpController.getNetworks(req, res);
});

/**
 * @route GET /api/mcp/status
 * @desc Get MCP service status and health
 * @access Public
 */
router.get('/status', async (req, res) => {
    await mcpController.getStatus(req, res);
});

/**
 * @route GET /api/mcp/search/pools
 * @desc Search for pools by token symbol or address
 * @query {string} query - Search query (required)
 * @query {string} network - Network filter (optional)
 * @access Public
 */
router.get('/search/pools', async (req, res) => {
    await mcpController.searchPools(req, res);
});

/**
 * @route GET /api/mcp/recommendations
 * @desc Get AI-powered token recommendations
 * @query {string} criteria - Recommendation criteria (balanced, safe, growth, stable, high_risk_high_reward)
 * @query {number} count - Number of recommendations (1-5)
 * @query {string} network - Network ID (optional, defaults to Sei)
 * @access Public
 */
router.get('/recommendations', async (req, res) => {
    await mcpController.getTokenRecommendations(req, res);
});

// ===============================
// POOL DATA ROUTES
// ===============================

/**
 * @route GET /api/mcp/pool/:network/:address
 * @desc Get detailed pool data
 * @param {string} network - Network ID
 * @param {string} address - Pool address
 * @access Public
 */
router.get('/pool/:network/:address', async (req, res) => {
    await mcpController.getPoolData(req, res);
});

/**
 * @route GET /api/mcp/ohlcv/:network/:address
 * @desc Get OHLCV data for technical analysis
 * @param {string} network - Network ID
 * @param {string} address - Pool address
 * @query {string} timeframe - Time frame (hour, day, minute)
 * @query {string} aggregate - Aggregation period
 * @access Public
 */
router.get('/ohlcv/:network/:address', async (req, res) => {
    await mcpController.getOHLCVData(req, res);
});

/**
 * @route POST /api/mcp/prices
 * @desc Get current token prices
 * @body {string[]} tokenAddresses - Array of token addresses
 * @body {string} network - Network ID (optional)
 * @access Public
 */
router.post('/prices', async (req, res) => {
    await mcpController.getTokenPrices(req, res);
});

// ===============================
// SEI-SPECIFIC ROUTES
// ===============================

/**
 * @route GET /api/mcp/sei/pools
 * @desc Get top pools for Sei network
 * @query {number} page - Page number for pagination
 * @access Public
 */
router.get('/sei/pools', async (req, res) => {
    await mcpController.getSeiPools(req, res);
});

/**
 * @route GET /api/mcp/sei/summary
 * @desc Get Sei-specific market data summary
 * @access Public
 */
router.get('/sei/summary', async (req, res) => {
    await mcpController.getSeiMarketSummary(req, res);
});

// ===============================
// LLM CONTEXT ROUTES
// ===============================

/**
 * @route GET /api/mcp/context/llm
 * @desc Get comprehensive market context formatted for LLMs
 * @query {boolean} includeTopPools - Include top pools data
 * @query {boolean} includeTokenRecommendations - Include token recommendations
 * @query {boolean} includePriceData - Include price data
 * @query {string} network - Network ID (optional)
 * @query {string} recommendationCriteria - Criteria for recommendations
 * @access Public
 */
router.get('/context/llm', async (req, res) => {
    await mcpController.getMarketContextForLLM(req, res);
});

/**
 * @route POST /api/mcp/agent/context
 * @desc Get market context formatted for specific agent types
 * @body {string} agentType - Type of agent (trading, analysis, discovery)
 * @body {string} focusArea - Focus area (conservative, aggressive, general)
 * @body {string} network - Network ID (optional)
 * @access Public
 */
router.post('/agent/context', async (req, res) => {
    await mcpController.getAgentMarketContext(req, res);
});

// ===============================
// MIDDLEWARE AND ERROR HANDLING
// ===============================

// Rate limiting middleware (if needed)
router.use((req, res, next) => {
    // Add rate limiting logic here if needed
    next();
});

// Error handling middleware
router.use((error, req, res, next) => {
    console.error('MCP Market Data Route Error:', error);
    
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An error occurred while processing market data request',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
