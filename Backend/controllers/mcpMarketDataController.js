/**
 * MCP Market Data Controller
 * Handles API requests for real-time market data via MCP
 */

const MCPMarketDataService = require('../services/mcpMarketDataService');

// Singleton instance to prevent multiple MCP service initializations
let mcpServiceInstance = null;

class MCPMarketDataController {
    constructor() {
        // Use singleton pattern to prevent multiple service instances
        if (!mcpServiceInstance) {
            mcpServiceInstance = new MCPMarketDataService();
        }
        this.marketDataService = mcpServiceInstance;
    }

    /**
     * Get all supported networks
     * GET /api/mcp/networks
     */
    async getNetworks(req, res) {
        try {
            const result = await this.marketDataService.getNetworks();
            
            if (result.success) {
                res.json({
                    success: true,
                    networks: result.data,
                    count: result.data.length
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: result.error,
                    message: 'Failed to fetch networks'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Internal server error while fetching networks'
            });
        }
    }

    /**
     * Get top pools for Sei network
     * GET /api/mcp/sei/pools
     */
    async getSeiPools(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const result = await this.marketDataService.getSeiPools(page);
            
            if (result.success) {
                res.json({
                    success: true,
                    network: result.network,
                    page: result.page,
                    data: result.data
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: result.error,
                    message: 'Failed to fetch Sei pools'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Internal server error while fetching Sei pools'
            });
        }
    }

    /**
     * Get detailed pool data
     * GET /api/mcp/pool/:network/:address
     */
    async getPoolData(req, res) {
        try {
            const { network, address } = req.params;
            const result = await this.marketDataService.getPoolData(address, network);
            
            if (result.success) {
                res.json({
                    success: true,
                    network: result.network,
                    poolAddress: result.poolAddress,
                    data: result.data
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: result.error,
                    message: 'Failed to fetch pool data'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Internal server error while fetching pool data'
            });
        }
    }

    /**
     * Get OHLCV data for technical analysis
     * GET /api/mcp/ohlcv/:network/:address
     */
    async getOHLCVData(req, res) {
        try {
            const { network, address } = req.params;
            const { timeframe = 'hour', aggregate = '1' } = req.query;
            
            const result = await this.marketDataService.getOHLCVData(
                address, 
                timeframe, 
                aggregate, 
                network
            );
            
            if (result.success) {
                res.json({
                    success: true,
                    network: result.network,
                    poolAddress: result.poolAddress,
                    timeframe: result.timeframe,
                    data: result.data
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: result.error,
                    message: 'Failed to fetch OHLCV data'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Internal server error while fetching OHLCV data'
            });
        }
    }

    /**
     * Get token prices
     * POST /api/mcp/prices
     */
    async getTokenPrices(req, res) {
        try {
            const { tokenAddresses, network } = req.body;
            
            if (!tokenAddresses || !Array.isArray(tokenAddresses)) {
                return res.status(400).json({
                    success: false,
                    error: 'tokenAddresses array is required',
                    message: 'Please provide an array of token addresses'
                });
            }

            const result = await this.marketDataService.getTokenPrices(tokenAddresses, network);
            
            if (result.success) {
                res.json({
                    success: true,
                    network: result.network,
                    tokens: result.tokens,
                    data: result.data
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: result.error,
                    message: 'Failed to fetch token prices'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Internal server error while fetching token prices'
            });
        }
    }

    /**
     * Search pools
     * GET /api/mcp/search/pools
     */
    async searchPools(req, res) {
        try {
            const { query, network } = req.query;
            
            if (!query) {
                return res.status(400).json({
                    success: false,
                    error: 'query parameter is required',
                    message: 'Please provide a search query'
                });
            }

            const result = await this.marketDataService.searchPools(query, network);
            
            if (result.success) {
                res.json({
                    success: true,
                    query: result.query,
                    network: result.network,
                    data: result.data
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: result.error,
                    message: 'Failed to search pools'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Internal server error while searching pools'
            });
        }
    }

    /**
     * Get AI-powered token recommendations
     * GET /api/mcp/recommendations
     */
    async getTokenRecommendations(req, res) {
        try {
            const { 
                criteria = 'balanced', 
                count = 3, 
                network 
            } = req.query;

            const result = await this.marketDataService.getTokenRecommendations(
                criteria, 
                parseInt(count), 
                network
            );
            
            if (result.success) {
                res.json({
                    success: true,
                    network: result.network,
                    criteria: result.criteria,
                    count: result.count,
                    data: result.data
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: result.error,
                    message: 'Failed to get token recommendations'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Internal server error while getting recommendations'
            });
        }
    }

    /**
     * Get comprehensive market context for LLMs
     * GET /api/mcp/context/llm
     */
    async getMarketContextForLLM(req, res) {
        try {
            const {
                includeTopPools = 'true',
                includeTokenRecommendations = 'true',
                includePriceData = 'false',
                network,
                recommendationCriteria = 'balanced'
            } = req.query;

            const options = {
                includeTopPools: includeTopPools === 'true',
                includeTokenRecommendations: includeTokenRecommendations === 'true',
                includePriceData: includePriceData === 'true',
                networkId: network,
                recommendationCriteria
            };

            const context = await this.marketDataService.getMarketContextForLLM(options);
            
            if (context.success) {
                const formattedPrompt = this.marketDataService.formatMarketDataForLLM(context);
                
                res.json({
                    success: true,
                    network: context.network,
                    timestamp: context.timestamp,
                    rawData: context.data,
                    formattedPrompt
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: context.error,
                    message: 'Failed to get market context for LLM'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Internal server error while getting LLM context'
            });
        }
    }

    /**
     * Get service status and health
     * GET /api/mcp/status
     */
    async getStatus(req, res) {
        try {
            const status = this.marketDataService.getStatus();
            
            res.json({
                success: true,
                status,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Internal server error while getting status'
            });
        }
    }

    /**
     * Get Sei-specific market data summary
     * GET /api/mcp/sei/summary
     */
    async getSeiMarketSummary(req, res) {
        try {
            const options = {
                includeTopPools: true,
                includeTokenRecommendations: true,
                networkId: null, // Use default Sei network
                recommendationCriteria: 'balanced'
            };

            const context = await this.marketDataService.getMarketContextForLLM(options);
            
            if (context.success) {
                res.json({
                    success: true,
                    network: context.network,
                    timestamp: context.timestamp,
                    summary: {
                        topPools: context.data.topPools?.data || 'No pool data available',
                        recommendations: context.data.tokenRecommendations?.data || 'No recommendations available'
                    }
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: context.error,
                    message: 'Failed to get Sei market summary'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Internal server error while getting Sei market summary'
            });
        }
    }

    /**
     * Format market data for agent consumption
     * POST /api/mcp/agent/context
     */
    async getAgentMarketContext(req, res) {
        try {
            const { 
                agentType = 'trading', 
                focusArea = 'general',
                network 
            } = req.body;

            let criteria = 'balanced';
            let includeRecommendations = true;
            let includePools = true;

            // Customize based on agent type and focus area
            switch (agentType) {
                case 'trading':
                    criteria = focusArea === 'conservative' ? 'safe' : 
                              focusArea === 'aggressive' ? 'high_risk_high_reward' : 'balanced';
                    break;
                case 'analysis':
                    criteria = 'stable';
                    break;
                case 'discovery':
                    criteria = 'growth';
                    break;
            }

            const options = {
                includeTopPools: includePools,
                includeTokenRecommendations: includeRecommendations,
                networkId: network,
                recommendationCriteria: criteria
            };

            const context = await this.marketDataService.getMarketContextForLLM(options);
            
            if (context.success) {
                res.json({
                    success: true,
                    agentType,
                    focusArea,
                    network: context.network,
                    timestamp: context.timestamp,
                    context: context.data,
                    formattedForAgent: this.formatContextForAgent(context, agentType, focusArea)
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: context.error,
                    message: 'Failed to get agent market context'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Internal server error while getting agent context'
            });
        }
    }

    /**
     * Format context specifically for agent consumption
     */
    formatContextForAgent(context, agentType, focusArea) {
        let prompt = `# Market Intelligence for ${agentType} Agent\n`;
        prompt += `**Focus Area:** ${focusArea}\n`;
        prompt += `**Network:** ${context.network}\n`;
        prompt += `**Data Timestamp:** ${context.timestamp}\n\n`;

        if (context.data.topPools?.success) {
            prompt += `## Current Market Pools\n${context.data.topPools.data}\n\n`;
        }

        if (context.data.tokenRecommendations?.success) {
            prompt += `## AI Token Analysis\n${context.data.tokenRecommendations.data}\n\n`;
        }

        prompt += `## Instructions for Agent\n`;
        switch (agentType) {
            case 'trading':
                prompt += `- Use this data to identify trading opportunities\n`;
                prompt += `- Focus on tokens with appropriate risk levels for ${focusArea} strategy\n`;
                prompt += `- Consider liquidity and volume before making recommendations\n`;
                break;
            case 'analysis':
                prompt += `- Analyze market trends and patterns from the data\n`;
                prompt += `- Provide insights on market stability and volatility\n`;
                prompt += `- Focus on price movements and volume analysis\n`;
                break;
            case 'discovery':
                prompt += `- Identify emerging tokens and new opportunities\n`;
                prompt += `- Look for high-growth potential assets\n`;
                prompt += `- Consider market momentum and volume spikes\n`;
                break;
        }

        return prompt;
    }
}

module.exports = MCPMarketDataController;
