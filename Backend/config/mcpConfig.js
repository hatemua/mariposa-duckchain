/**
 * MCP (Model Context Protocol) Configuration
 * Configuration for market data integration
 */

const path = require('path');

const mcpConfig = {
    // MCP Server Configuration
    server: {
        // Path to the market-mcp server
        path: path.join(__dirname, '../../market-mcp/dist/index.js'),
        
        // Server connection settings
        connection: {
            timeout: 30000, // 30 seconds
            retryAttempts: 3,
            retryDelay: 5000 // 5 seconds
        }
    },

    // Network Configuration
    networks: {
        // Default network for operations
        default: 'sei',
        
        // Supported networks mapping
        supported: {
            'sei': {
                id: 'sei',
                name: 'Sei Network',
                isDefault: true,
                isEVM: true
            },
            'eth': {
                id: 'eth',
                name: 'Ethereum',
                isDefault: false,
                isEVM: true
            },
            'bsc': {
                id: 'bsc',
                name: 'Binance Smart Chain',
                isDefault: false,
                isEVM: true
            },
            'polygon': {
                id: 'polygon',
                name: 'Polygon',
                isDefault: false,
                isEVM: true
            },
            'arbitrum': {
                id: 'arbitrum',
                name: 'Arbitrum',
                isDefault: false,
                isEVM: true
            }
        }
    },

    // Cache Configuration
    cache: {
        // Cache timeout in milliseconds
        timeout: 60000, // 1 minute

        // Maximum cache size per category
        maxSize: {
            networks: 100,
            pools: 500,
            prices: 1000,
            recommendations: 50
        },

        // Cache cleanup interval
        cleanupInterval: 300000 // 5 minutes
    },

    // API Configuration
    api: {
        // Rate limiting
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100 // limit each IP to 100 requests per windowMs
        },

        // Request timeout
        timeout: 15000, // 15 seconds

        // Default pagination
        pagination: {
            defaultPage: 1,
            defaultLimit: 10,
            maxLimit: 100
        }
    },

    // Token Recommendation Settings
    recommendations: {
        // Default criteria for recommendations
        defaultCriteria: 'balanced',
        
        // Available criteria
        availableCriteria: [
            'safe',
            'growth', 
            'stable',
            'balanced',
            'high_risk_high_reward'
        ],

        // Default count of recommendations
        defaultCount: 3,
        maxCount: 5,

        // Minimum requirements for recommendations
        minimumRequirements: {
            liquidityUSD: 10000,
            volume24h: 1000
        }
    },

    // LLM Context Configuration
    llmContext: {
        // Default options for LLM context
        defaultOptions: {
            includeTopPools: true,
            includeTokenRecommendations: true,
            includePriceData: false,
            recommendationCriteria: 'balanced'
        },

        // Maximum context size
        maxContextSize: 50000, // characters

        // Context refresh interval
        refreshInterval: 300000 // 5 minutes
    },

    // Agent Integration Settings
    agentIntegration: {
        // Types of agents that can use market data
        supportedAgentTypes: [
            'trading',
            'analysis', 
            'discovery',
            'arbitrage',
            'dca',
            'momentum'
        ],

        // Context customization per agent type
        agentContextMap: {
            trading: {
                criteria: 'balanced',
                includeRisk: true,
                includeVolume: true
            },
            analysis: {
                criteria: 'stable',
                includeRisk: true,
                includeHistorical: true
            },
            discovery: {
                criteria: 'growth',
                includeNew: true,
                includeVolume: true
            },
            arbitrage: {
                criteria: 'high_risk_high_reward',
                includeMultipleNetworks: true,
                includePrices: true
            }
        }
    },

    // Sei Network Specific Configuration
    seiNetwork: {
        // Sei-specific settings
        chainId: 'pacific-1', // Sei mainnet
        
        // Native token information
        nativeToken: {
            symbol: 'SEI',
            decimals: 6,
            name: 'Sei'
        },

        // Common DEXes on Sei
        dexes: [
            'DragonSwap',
            'SeiSwap',
            'AstroSwap'
        ],

        // Priority tokens for Sei network
        priorityTokens: [
            'SEI',
            'USDC',
            'USDT',
            'WBTC',
            'ETH'
        ]
    },

    // Monitoring and Health Checks
    monitoring: {
        // Health check interval
        healthCheckInterval: 60000, // 1 minute

        // Performance metrics
        collectMetrics: true,
        
        // Error tracking
        trackErrors: true,
        maxErrorHistory: 100
    },

    // Development Settings
    development: {
        // Enable debug logging
        debugMode: process.env.NODE_ENV === 'development',
        
        // Mock data when MCP server is unavailable
        useMockData: false,
        
        // Verbose logging
        verboseLogging: process.env.MCP_VERBOSE === 'true'
    }
};

module.exports = mcpConfig;
