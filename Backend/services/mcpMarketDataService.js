/**
 * MCP Market Data Service
 * Connects to the market-mcp server to provide real-time market data for LLMs and agents
 */

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class MCPMarketDataService {
    constructor() {
        this.client = null;
        this.transport = null;
        this.serverProcess = null;
        this.isConnected = false;
        this.mcpServerPath = path.resolve(__dirname, '../../market-mcp/dist/index.js');
        this.supportedNetworks = [];
        this.seiNetworkId = 'sei-evm'; // Correct GeckoTerminal network ID
        this.useHttpMode = false;
        this.httpBaseUrl = null;
        this.isInitializing = false; // Prevent recursive initialization
        this.httpPort = 3001; // Default HTTP port
        
        // Network mapping dictionary - maps user input to GeckoTerminal API network codes
        this.networkMappings = {
            // SEI Network variations
            'sei': 'sei-evm',
            'sei-network': 'sei-evm', 
            'sei-evm': 'sei-evm',
            'seinetwork': 'sei-evm',
            'sei evm': 'sei-evm',
            'sei_evm': 'sei-evm',
            'sei network': 'sei-evm',
            
            // Ethereum variations
            'ethereum': 'eth',
            'eth': 'eth',
            'ether': 'eth',
            'ethereum mainnet': 'eth',
            'eth mainnet': 'eth',
            
            // Binance Smart Chain variations
            'bsc': 'bsc',
            'binance': 'bsc',
            'binance smart chain': 'bsc',
            'bnb': 'bsc',
            'bnb chain': 'bsc',
            'binance chain': 'bsc',
            
            // Polygon variations
            'polygon': 'polygon_pos',
            'matic': 'polygon_pos',
            'polygon pos': 'polygon_pos',
            'polygon matic': 'polygon_pos',
            'poly': 'polygon_pos',
            
            // Arbitrum variations
            'arbitrum': 'arbitrum',
            'arb': 'arbitrum',
            'arbitrum one': 'arbitrum',
            'arbitrum mainnet': 'arbitrum',
            
            // Optimism variations
            'optimism': 'optimism',
            'op': 'optimism',
            'optimistic': 'optimism',
            
            // Avalanche variations
            'avalanche': 'avax',
            'avax': 'avax',
            'avalanche c-chain': 'avax',
            'avax c-chain': 'avax',
            
            // Fantom variations
            'fantom': 'ftm',
            'ftm': 'ftm',
            'fantom opera': 'ftm',
            
            // Solana variations (if supported)
            'solana': 'solana',
            'sol': 'solana',
            
            // Base variations
            'base': 'base',
            'base mainnet': 'base',
            'coinbase base': 'base',
            
            // Cronos variations
            'cronos': 'cro',
            'cro': 'cro',
            'crypto.com': 'cro',
            
            // Additional popular networks
            'moonbeam': 'glmr',
            'moonriver': 'movr',
            'harmony': 'one',
            'one': 'one',
            'celo': 'celo',
            'aurora': 'aurora',
            'metis': 'metis',
            'boba': 'boba',
            'fuse': 'fuse',
            'gnosis': 'xdai',
            'xdai': 'xdai',
            'kava': 'kava',
            'evmos': 'evmos',
            'osmosis': 'osmosis'
        };
        
        // Cache for frequently accessed data
        this.networkCache = new Map();
        this.poolCache = new Map();
        this.priceCache = new Map();
        this.cacheTimeout = 60000; // 1 minute cache
        
        // Validate paths before initialization
        this.validatePaths();
        
        // Initialize connection
        this.initialize();
    }

    validatePaths() {
        // Ensure mcpServerPath is properly set
        if (!this.mcpServerPath) {
            this.mcpServerPath = path.resolve(__dirname, '../../market-mcp/dist/index.js');
        }
        
        // Validate MCP server path
        if (!this.mcpServerPath || typeof this.mcpServerPath !== 'string') {
            throw new Error('MCP server path is not defined or is not a string');
        }
        
        console.log(`🔍 Checking MCP server path: ${this.mcpServerPath}`);
        
        if (!fs.existsSync(this.mcpServerPath)) {
            console.warn(`⚠️ MCP server file not found at: ${this.mcpServerPath}`);
            console.log('📂 Available files in market-mcp/dist:');
            
            const distDir = path.dirname(this.mcpServerPath);
            if (fs.existsSync(distDir)) {
                const files = fs.readdirSync(distDir);
                files.forEach(file => console.log(`   - ${file}`));
            } else {
                console.log(`   Directory does not exist: ${distDir}`);
            }
            
            throw new Error(`MCP server file not found at: ${this.mcpServerPath}`);
        }
        
        console.log(`✅ MCP server path validated: ${this.mcpServerPath}`);
    }

    async initialize() {
        if (this.isInitializing) {
            console.log('⚠️  Initialization already in progress, skipping...');
            return;
        }

        this.isInitializing = true;

        try {
            console.log('🚀 Initializing MCP Market Data Service with stdio transport...');
            await this.connectToMCPServer();
            await this.loadSupportedNetworks();
            console.log('✅ MCP Market Data Service initialized successfully with stdio transport');
        } catch (error) {
            console.error('❌ Failed to initialize MCP Market Data Service with stdio:', error.message);
            console.error('❌ Full initialization error:', error);
            
            // Set basic defaults for limited mode
            this.isConnected = false;
            this.useHttpMode = false;
            this.supportedNetworks = [
                { id: 'sei-network', name: 'Sei Network' }
            ];
            
            console.log('⚠️  Service will operate in limited mode without MCP server connection');
        } finally {
            this.isInitializing = false;
        }
    }

    async connectToMCPServer() {
        try {
            console.log('🔧 Connecting to MCP server via stdio protocol...');
            
            // Ensure path is validated
            if (!this.mcpServerPath || typeof this.mcpServerPath !== 'string') {
                throw new Error('MCP server path is not properly configured');
            }
            
            console.log(`📂 MCP server path: ${this.mcpServerPath}`);
            
            console.log('🔗 Creating MCP transport and client...');
            
            // Let StdioClientTransport handle the process spawning
            this.transport = new StdioClientTransport({
                command: 'node',
                args: [this.mcpServerPath],
                env: {
                    ...Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== 'PORT')),
                    NODE_ENV: 'production',
                    MCP_STDIO_MODE: 'true'
                },
                cwd: path.dirname(this.mcpServerPath)
            });

            // Try to capture stderr from the MCP server to see URL logs
            if (this.transport.process && this.transport.process.stderr) {
                this.transport.process.stderr.on('data', (data) => {
                    const message = data.toString().trim();
                    if (message.includes('[GECKO URL]') || message.includes('🌐')) {
                        console.log(`📡 [MCP SERVER] ${message}`);
                    }
                });
            }

            this.client = new Client({
                name: 'mariposa-backend',
                version: '1.0.0'
            }, {
                capabilities: {
                    tools: {}
                }
            });

            // Connect to the MCP server with timeout
            console.log('🔗 Connecting to MCP server via stdio...');
            
            const connectionTimeout = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('MCP connection timeout after 15 seconds')), 15000);
            });
            
            const connectionPromise = this.client.connect(this.transport);
            
            await Promise.race([connectionPromise, connectionTimeout]);
            
            this.isConnected = true;
            this.useHttpMode = false;
            
            console.log('✅ Connected to MCP Market Data Server via stdio protocol');
            
            // Wait a moment for the server to be fully ready
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.error('❌ Failed to connect to MCP server via stdio:', error.message);
            console.error('❌ Full error:', error);
            throw new Error(`Failed to connect to MCP server: ${error.message}`);
        }
    }

    async initializeHttpMode() {
        console.log('🔧 Initializing HTTP mode...');
        
        // Clean up any existing server process first
        await this.cleanupServerProcess();
        
        // Use fixed port 3001 for MCP server
        this.httpPort = 3001;
        this.httpBaseUrl = `http://localhost:${this.httpPort}`;
        
        // Start the MCP server in HTTP mode
        await this.startHttpServer();
        
        // Configure for HTTP API calls
        this.useHttpMode = true;
        this.isConnected = true;
        
        // Load supported networks in HTTP mode
        await this.loadSupportedNetworksHttp();
        
        console.log('✅ HTTP mode initialized successfully');
    }

    async findAvailablePort(startPort) {
        const net = require('net');
        
        for (let port = startPort; port <= startPort + 10; port++) {
            if (await this.isPortAvailable(port)) {
                return port;
            }
        }
        throw new Error('No available ports found');
    }

    async isPortAvailable(port) {
        return new Promise((resolve) => {
            const net = require('net');
            const server = net.createServer();
            
            server.listen(port, () => {
                server.once('close', () => {
                    resolve(true);
                });
                server.close();
            });
            
            server.on('error', () => {
                resolve(false);
            });
        });
    }

    async cleanupServerProcess() {
        if (this.serverProcess) {
            try {
                this.serverProcess.kill('SIGTERM');
                await new Promise(resolve => setTimeout(resolve, 1000));
                if (!this.serverProcess.killed) {
                    this.serverProcess.kill('SIGKILL');
                }
            } catch (error) {
                console.log('⚠️  Error cleaning up server process:', error.message);
            }
            this.serverProcess = null;
        }
    }

    async startHttpServer() {
        // Check if the server is already running on the selected port
        try {
            const fetch = require('node-fetch');
            const response = await fetch(`${this.httpBaseUrl}/api/health`);
            if (response.ok) {
                console.log(`📡 MCP HTTP server is already running on port ${this.httpPort}`);
                return;
            }
        } catch (error) {
            // Server not running, need to start it
        }

        console.log(`🚀 Starting MCP HTTP server on port ${this.httpPort}...`);
        
        // Start the server process for HTTP mode
        this.serverProcess = spawn('node', [this.mcpServerPath], {
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: process.platform === 'win32',
            env: {
                // Don't inherit PORT from parent process to avoid conflicts
                ...Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== 'PORT')),
                NODE_ENV: 'production',
                PORT: this.httpPort.toString()
            },
            cwd: path.dirname(this.mcpServerPath)
        });

        this.serverProcess.on('error', (error) => {
            console.error('❌ MCP HTTP server process error:', error.message);
        });

        this.serverProcess.on('exit', (code, signal) => {
            if (code !== 0 && code !== null) {
                console.error(`❌ MCP HTTP server exited with code ${code}`);
            }
        });

        this.serverProcess.stderr.on('data', (data) => {
            const message = data.toString().trim();
            if (message) {
                // Filter out common startup messages to reduce noise
                if (!message.includes('Market MCP server running') && 
                    !message.includes('Express server running')) {
                    console.log('📟 MCP HTTP server:', message);
                }
            }
        });

        this.serverProcess.stdout.on('data', (data) => {
            const message = data.toString().trim();
            if (message) {
                console.log('📟 MCP HTTP stdout:', message);
            }
        });

        // Wait for the server to start with better error handling
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`HTTP server start timeout on port ${this.httpPort}`));
            }, 15000);

            const checkServer = async () => {
                try {
                    const fetch = require('node-fetch');
                    const response = await fetch(`${this.httpBaseUrl}/api/health`);
                    if (response.ok) {
                        clearTimeout(timeout);
                        console.log(`✅ MCP HTTP server started successfully on port ${this.httpPort}`);
                        resolve();
                    } else {
                        setTimeout(checkServer, 1000);
                    }
                } catch (error) {
                    // Still waiting for server to start
                    setTimeout(checkServer, 1000);
                }
            };

            // Initial delay to let the server start
            setTimeout(checkServer, 3000);
        });
    }

    async loadSupportedNetworksHttp() {
        try {
            const fetch = require('node-fetch');
            const response = await fetch(`${this.httpBaseUrl}/api/networks`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const networks = await response.json();
            this.supportedNetworks = networks;
            
            // Check if sei-network is supported
            const seiNetwork = networks.find(n => 
                n.id === 'sei-network' || 
                n.id.toLowerCase().includes('sei') || 
                n.name.toLowerCase().includes('sei')
            );
            
            if (seiNetwork) {
                this.seiNetworkId = seiNetwork.id;
                console.log(`🌐 Found Sei network: ${seiNetwork.id} (${seiNetwork.name})`);
            } else {
                console.warn('⚠️  Sei network not found in supported networks');
            }
            
        } catch (error) {
            console.error('Failed to load supported networks in HTTP mode:', error.message);
            // Set default networks if HTTP fails
            this.supportedNetworks = [
                { id: 'sei-network', name: 'Sei Network' }
            ];
        }
    }

    async loadSupportedNetworks() {
        try {
            const response = await this.callTool('get_networks', {});
            const networksText = response.content[0].text;
            
            // Parse networks from the response text
            const networks = this.parseNetworksFromText(networksText);
            this.supportedNetworks = networks;
            
            // Check if sei-network is supported and set the correct network ID
            const seiNetwork = networks.find(n => 
                n.id === 'sei-network' || 
                n.id.toLowerCase().includes('sei') || 
                n.name.toLowerCase().includes('sei')
            );
            
            if (seiNetwork) {
                this.seiNetworkId = seiNetwork.id;
                console.log(`🌐 Found Sei network: ${seiNetwork.id} (${seiNetwork.name})`);
            } else {
                console.warn('⚠️  Sei network not found in supported networks');
            }
            
        } catch (error) {
            console.error('Failed to load supported networks:', error.message);
        }
    }

    parseNetworksFromText(text) {
        const networks = [];
        const lines = text.split('\n');
        
        for (const line of lines) {
            if (line.trim().startsWith('- ')) {
                const match = line.match(/- ([^:]+): (.+)/);
                if (match) {
                    networks.push({
                        id: match[1].trim(),
                        name: match[2].trim()
                    });
                }
            }
        }
        
        return networks;
    }

    async callTool(toolName, args) {
        if (!this.isConnected) {
            throw new Error('MCP client is not connected');
        }

        try {
            if (this.useHttpMode) {
                // Use HTTP API calls to the market-mcp server
                return await this.callHttpAPI(toolName, args);
            } else {
                // Use MCP protocol
                console.log(`🔧 [MCP] Calling tool: ${toolName} with args:`, args);
                
                const response = await this.client.callTool({
                    name: toolName,
                    arguments: args || {}
                });
                
                console.log(`✅ [MCP] Tool ${toolName} completed successfully`);
                return response;
            }
        } catch (error) {
            console.error(`❌ [MCP] Tool ${toolName} failed:`, error.message);
            throw new Error(`Tool call failed: ${error.message}`);
        }
    }

    async callHttpAPI(toolName, args) {
        const fetch = require('node-fetch');
        
        try {
            let url, options, response, data;
            
            switch (toolName) {
                case 'get_networks':
                    console.log('🌐 [MCP] Calling get_networks via HTTP API');
                    url = `${this.httpBaseUrl}/api/networks`;
                    options = { method: 'GET' };
                    break;
                    
                case 'recommend_tokens':
                    console.log('🤖 [MCP] Calling recommend_tokens via HTTP API with args:', args);
                    url = `${this.httpBaseUrl}/api/recommend-tokens`;
                    console.log(`🌐 [MCP URL] [RECOMMEND_TOKENS] ${url}`);
                    options = {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(args)
                    };
                    break;
                    
                // Since the market-mcp server doesn't expose all tools as HTTP endpoints,
                // we need to use MCP protocol for these tools or implement them differently
                case 'get_network_pools':
                    console.log('📊 [MCP] get_network_pools via MCP protocol simulation');
                    return await this.callMCPViaMCPProtocol(toolName, args);
                    
                case 'get_pool_data':
                    console.log('🏊 [MCP] get_pool_data via MCP protocol simulation');
                    return await this.callMCPViaMCPProtocol(toolName, args);
                    
                case 'get_token_prices':
                    console.log('💰 [MCP] get_token_prices via MCP protocol simulation');
                    return await this.callMCPViaMCPProtocol(toolName, args);
                    
                case 'search_pools':
                    console.log('🔍 [MCP] search_pools via MCP protocol simulation');
                    return await this.callMCPViaMCPProtocol(toolName, args);
                    
                case 'get_ohlcv_data':
                    console.log('📈 [MCP] get_ohlcv_data via MCP protocol simulation');
                    return await this.callMCPViaMCPProtocol(toolName, args);
                    
                default:
                    console.warn(`⚠️ [MCP] Unknown tool: ${toolName}`);
                    return {
                        content: [{
                            type: 'text',
                            text: `Unknown tool: ${toolName}`
                        }]
                    };
            }
            
            response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            data = await response.json();
            
            // Convert HTTP response to MCP format
            // For recommend_tokens, preserve the JSON structure for better parsing
            if (toolName === 'recommend_tokens') {
                return {
                    content: [{
                        type: 'text',
                        text: typeof data === 'string' ? data : JSON.stringify(data, null, 2)
                    }],
                    rawData: data // Preserve original JSON for token recommendations
                };
            }
            
            return {
                content: [{
                    type: 'text',
                    text: typeof data === 'string' ? data : JSON.stringify(data, null, 2)
                }]
            };
            
        } catch (error) {
            console.error(`❌ [MCP] HTTP API call failed for ${toolName}:`, error.message);
            throw new Error(`HTTP API call failed: ${error.message}`);
        }
    }

    /**
     * Call MCP tools via MCP protocol (for tools not exposed as HTTP endpoints)
     */
    async callMCPViaMCPProtocol(toolName, args) {
        try {
            // Since the market-mcp server runs on stdio and we can't easily connect to it via MCP protocol
            // from HTTP mode, we'll create direct API calls to GeckoTerminal
            return await this.callGeckoTerminalDirectly(toolName, args);
        } catch (error) {
            console.error(`❌ [MCP] MCP protocol call failed for ${toolName}:`, error.message);
            throw error;
        }
    }

    /**
     * Direct GeckoTerminal API calls for tools not exposed via HTTP
     */
    async callGeckoTerminalDirectly(toolName, args) {
        const fetch = require('node-fetch');
        const baseUrl = 'https://api.geckoterminal.com/api/v2';
        const headers = {
            'Accept': 'application/json;version=20230302',
            'User-Agent': 'MarketMCP/1.0.0'
        };

        // Helper function to log GeckoTerminal URLs
        const logGeckoURL = (url, context) => {
            console.log(`🌐 [GECKO URL] [${context}] ${url}`);
        };

        try {
            let url, response, data;

            switch (toolName) {
                case 'get_network_pools':
                    const { network, page = 1 } = args;
                    console.log(`🌊 [MCP] Fetching pools for network: ${network}, page: ${page}`);
                    url = `${baseUrl}/networks/${network}/pools?page=${page}&include=base_token,quote_token,dex`;
                    logGeckoURL(url, `NETWORK_POOLS[${network}][P${page}]`);
                    response = await fetch(url, { headers });
                    
                    if (!response.ok) {
                        throw new Error(`Failed to fetch pools for network ${network}: ${response.statusText}`);
                    }
                    
                    data = await response.json();
                    
                    // Format like the MCP server does
                    let result = 'Pools:\n\n';
                    data.data.forEach(pool => {
                        result += `${pool.attributes.name} (${pool.attributes.address})\n`;
                        result += `  Reserve: $${pool.attributes.reserve_in_usd || 'N/A'}\n`;
                        if (pool.attributes.volume_usd && pool.attributes.volume_usd.h24) {
                            result += `  24h Volume: $${pool.attributes.volume_usd.h24}\n`;
                        }
                        result += '\n';
                    });
                    
                    return {
                        content: [{
                            type: 'text',
                            text: result
                        }]
                    };

                case 'search_pools':
                    const { query, network: searchNetwork } = args;
                    console.log(`🔍 [MCP] Searching pools for: ${query}${searchNetwork ? ` on ${searchNetwork}` : ''}`);
                    url = `${baseUrl}/search/pools?query=${encodeURIComponent(query)}&include=base_token,quote_token,dex`;
                    if (searchNetwork) {
                        url += `&network=${searchNetwork}`;
                    }
                    logGeckoURL(url, `SEARCH_POOLS[${query}]`);
                    response = await fetch(url, { headers });
                    
                    if (!response.ok) {
                        throw new Error(`Failed to search pools: ${response.statusText}`);
                    }
                    
                    data = await response.json();
                    
                    let searchResult = `Search results for "${query}":\n\n`;
                    data.data.forEach(pool => {
                        searchResult += `${pool.attributes.name} (${pool.attributes.address})\n`;
                        searchResult += `  Network: ${pool.relationships?.network?.data?.id || 'Unknown'}\n`;
                        searchResult += `  Reserve: $${pool.attributes.reserve_in_usd || 'N/A'}\n\n`;
                    });
                    
                    return {
                        content: [{
                            type: 'text',
                            text: searchResult
                        }]
                    };

                case 'get_token_prices':
                    const { network: priceNetwork, token_addresses } = args;
                    console.log(`💰 [MCP] Fetching token prices for ${token_addresses.length} tokens on ${priceNetwork}`);
                    const addresses = token_addresses.join(',');
                    url = `${baseUrl}/simple/networks/${priceNetwork}/token_price/${addresses}?include_24hr_vol=true&include_24hr_price_change=true`;
                    logGeckoURL(url, `TOKEN_PRICES[${token_addresses.length} tokens]`);
                    response = await fetch(url, { headers });
                    
                    if (!response.ok) {
                        throw new Error(`Failed to fetch token prices: ${response.statusText}`);
                    }
                    
                    data = await response.json();
                    
                    let priceResult = 'Token Prices:\n\n';
                    const tokenPrices = data.data[0]?.attributes?.token_prices || {};
                    Object.entries(tokenPrices).forEach(([address, price]) => {
                        priceResult += `${address}: $${price}\n`;
                    });
                    
                    return {
                        content: [{
                            type: 'text',
                            text: priceResult
                        }]
                    };

                default:
                    throw new Error(`Unknown tool for direct GeckoTerminal call: ${toolName}`);
            }
        } catch (error) {
            console.error(`❌ [MCP] Direct GeckoTerminal call failed for ${toolName}:`, error.message);
            throw error;
        }
    }

    // Cache management methods
    getCachedData(key) {
        const cached = this.networkCache.get(key) || 
                      this.poolCache.get(key) || 
                      this.priceCache.get(key);
        
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }

    setCachedData(key, data, cacheType = 'network') {
        const cacheMap = cacheType === 'pool' ? this.poolCache : 
                        cacheType === 'price' ? this.priceCache : this.networkCache;
        
        cacheMap.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Normalize network name from user input to GeckoTerminal API code
     * @param {string} userInput - Network name as provided by user
     * @returns {string} Normalized network code for GeckoTerminal API
     */
    normalizeNetworkName(userInput) {
        if (!userInput || typeof userInput !== 'string') {
            console.log('🔄 No network specified, using default SEI network');
            return this.seiNetworkId;
        }

        // Convert to lowercase and trim spaces for matching
        const normalizedInput = userInput.toLowerCase().trim();
        
        // Direct match in mappings
        if (this.networkMappings[normalizedInput]) {
            const mappedNetwork = this.networkMappings[normalizedInput];
            console.log(`✅ Network mapping: "${userInput}" → "${mappedNetwork}"`);
            return mappedNetwork;
        }
        
        // Try partial matching for flexible input
        for (const [key, value] of Object.entries(this.networkMappings)) {
            if (normalizedInput.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedInput)) {
                console.log(`✅ Partial network mapping: "${userInput}" → "${value}" (matched with "${key}")`);
                return value;
            }
        }
        
        // Try to match against supported networks from API
        const directMatch = this.supportedNetworks.find(network => 
            network.id.toLowerCase() === normalizedInput ||
            network.name.toLowerCase() === normalizedInput ||
            network.name.toLowerCase().includes(normalizedInput) ||
            normalizedInput.includes(network.name.toLowerCase())
        );
        
        if (directMatch) {
            console.log(`✅ Direct API match: "${userInput}" → "${directMatch.id}"`);
            return directMatch.id;
        }
        
        // If no match found, log warning and return default
        console.warn(`⚠️ Unknown network "${userInput}". Available networks:`, Object.keys(this.networkMappings).slice(0, 10).join(', '));
        console.log(`🔄 Using default network: ${this.seiNetworkId}`);
        return this.seiNetworkId;
    }

    /**
     * Extract network name from user message
     * @param {string} message - User message
     * @returns {string|null} Extracted network name or null
     */
    extractNetworkFromMessage(message) {
        if (!message) return null;
        
        const messageLower = message.toLowerCase();
        
        // Look for common patterns
        const networkPatterns = [
            /(?:on|from|in|for)\s+([a-zA-Z0-9\-_\s]+?)(?:\s+network|\s+chain|\s+blockchain|$)/,
            /([a-zA-Z0-9\-_\s]+?)(?:-evm|-network|-chain)/,
            /tokens?\s+(?:on|from|in)\s+([a-zA-Z0-9\-_\s]+)/
        ];
        
        for (const pattern of networkPatterns) {
            const match = messageLower.match(pattern);
            if (match && match[1]) {
                const extractedNetwork = match[1].trim();
                if (this.networkMappings[extractedNetwork] || extractedNetwork.length > 2) {
                    console.log(`🎯 Extracted network from message: "${extractedNetwork}"`);
                    return extractedNetwork;
                }
            }
        }
        
        // Check for direct mentions of known networks
        for (const networkKey of Object.keys(this.networkMappings)) {
            if (messageLower.includes(networkKey.toLowerCase())) {
                console.log(`🎯 Found network mention: "${networkKey}"`);
                return networkKey;
            }
        }
        
        return null;
    }

    // ===============================
    // PUBLIC API METHODS
    // ===============================

    /**
     * Get all supported blockchain networks
     */
    async getNetworks() {
        try {
            const cacheKey = 'all_networks';
            const cached = this.getCachedData(cacheKey);
            if (cached) return cached;

            const response = await this.callTool('get_networks', {});
            const result = {
                success: true,
                data: this.supportedNetworks,
                raw: response.content[0].text
            };

            this.setCachedData(cacheKey, result);
            return result;
        } catch (error) {
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }

    /**
     * Get top pools for Sei network or specified network
     */
    async getSeiPools(page = 1, networkName = null) {
        try {
            const normalizedNetwork = networkName ? this.normalizeNetworkName(networkName) : this.seiNetworkId;
            const cacheKey = `${normalizedNetwork}_pools_${page}`;
            const cached = this.getCachedData(cacheKey);
            if (cached) return cached;

            console.log(`🌊 Getting pools for network: ${normalizedNetwork} (page ${page})`);

            const response = await this.callTool('get_network_pools', {
                network: normalizedNetwork,
                page
            });

            const result = {
                success: true,
                network: normalizedNetwork,
                data: response.content[0].text,
                page
            };

            this.setCachedData(cacheKey, result, 'pool');
            return result;
        } catch (error) {
            const normalizedNetwork = networkName ? this.normalizeNetworkName(networkName) : this.seiNetworkId;
            return {
                success: false,
                error: error.message,
                network: normalizedNetwork,
                data: null
            };
        }
    }

    /**
     * Get detailed pool data for a specific pool
     */
    async getPoolData(poolAddress, networkId = null) {
        try {
            const network = networkId || this.seiNetworkId;
            const cacheKey = `pool_${network}_${poolAddress}`;
            const cached = this.getCachedData(cacheKey);
            if (cached) return cached;

            const response = await this.callTool('get_pool_data', {
                network,
                pool_address: poolAddress
            });

            const result = {
                success: true,
                network,
                poolAddress,
                data: response.content[0].text
            };

            this.setCachedData(cacheKey, result, 'pool');
            return result;
        } catch (error) {
            return {
                success: false,
                error: error.message,
                network: networkId || this.seiNetworkId,
                poolAddress,
                data: null
            };
        }
    }

    /**
     * Get OHLCV data for technical analysis
     */
    async getOHLCVData(poolAddress, timeframe = 'hour', aggregate = '1', networkId = null) {
        try {
            const network = networkId || this.seiNetworkId;
            
            const response = await this.callTool('get_ohlcv_data', {
                network,
                pool_address: poolAddress,
                timeframe,
                aggregate
            });

            return {
                success: true,
                network,
                poolAddress,
                timeframe,
                data: response.content[0].text
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                network: networkId || this.seiNetworkId,
                poolAddress,
                data: null
            };
        }
    }

    /**
     * Get current token prices
     */
    async getTokenPrices(tokenAddresses, networkId = null) {
        try {
            const network = networkId || this.seiNetworkId;
            const cacheKey = `prices_${network}_${tokenAddresses.join(',')}`;
            const cached = this.getCachedData(cacheKey);
            if (cached) return cached;

            const response = await this.callTool('get_token_prices', {
                network,
                token_addresses: tokenAddresses
            });

            const result = {
                success: true,
                network,
                tokens: tokenAddresses,
                data: response.content[0].text
            };

            this.setCachedData(cacheKey, result, 'price');
            return result;
        } catch (error) {
            return {
                success: false,
                error: error.message,
                network: networkId || this.seiNetworkId,
                tokens: tokenAddresses,
                data: null
            };
        }
    }

    /**
     * Search for pools by token symbol or address
     */
    async searchPools(query, networkId = null) {
        try {
            const args = { query };
            if (networkId) {
                args.network = networkId;
            }

            const response = await this.callTool('search_pools', args);

            return {
                success: true,
                query,
                network: networkId,
                data: response.content[0].text
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                query,
                network: networkId,
                data: null
            };
        }
    }

    /**
     * Get AI-powered token recommendations
     */
    async getTokenRecommendations(criteria = 'balanced', count = 3, networkId = null) {
        try {
            const normalizedNetwork = networkId ? this.normalizeNetworkName(networkId) : this.seiNetworkId;
            
            console.log(`🤖 [TOKEN RECOMMENDATIONS] Getting token recommendations for network: ${normalizedNetwork} (criteria: ${criteria}, count: ${count})`);
            console.log(`🌐 [TOKEN RECOMMENDATIONS] This will trigger multiple GeckoTerminal API calls...`);
            
            const response = await this.callTool('recommend_tokens', {
                network: normalizedNetwork,
                criteria,
                count
            });

            // Use raw data if available (from HTTP API), otherwise use text content
            const tokenData = response.rawData || response.content[0].text;
            
            console.log('🔍 [TOKEN RECOMMENDATIONS] Response type:', typeof tokenData);
            console.log('🔍 [TOKEN RECOMMENDATIONS] Has rawData:', !!response.rawData);

            return {
                success: true,
                network: normalizedNetwork,
                criteria,
                count,
                data: tokenData
            };
        } catch (error) {
            const normalizedNetwork = networkId ? this.normalizeNetworkName(networkId) : this.seiNetworkId;
            return {
                success: false,
                error: error.message,
                network: normalizedNetwork,
                criteria,
                data: null
            };
        }
    }

    // ===============================
    // LLM CONTEXT METHODS
    // ===============================

    /**
     * Comprehensive Network Pipeline with automatic network detection
     * Follows proper data flow: networks -> verify network -> pools -> recommendations
     */
    async getSEINetworkPipeline(options = {}) {
        const {
            criteria = 'balanced',
            count = 5,
            includeDetailedPools = true,
            includeTokenSearch = true,
            networkName = null,
            userMessage = null
        } = options;

        // Determine target network
        let targetNetwork = networkName;
        if (!targetNetwork && userMessage) {
            targetNetwork = this.extractNetworkFromMessage(userMessage);
        }
        if (!targetNetwork) {
            targetNetwork = 'sei'; // Default to SEI
        }
        
        const normalizedNetwork = this.normalizeNetworkName(targetNetwork);

        console.log(`🚀 [NETWORK PIPELINE] Starting comprehensive ${normalizedNetwork.toUpperCase()} network data pipeline...`);
        
        const pipeline = {
            timestamp: new Date().toISOString(),
            steps: [],
            success: false,
            data: {},
            errors: [],
            targetNetwork: normalizedNetwork
        };

        try {
            // Step 1: Get all networks and verify target network
            console.log(`📍 [NETWORK PIPELINE] Step 1: Finding ${normalizedNetwork} network...`);
            const networksResponse = await this.callTool('get_networks', {});
            const networksData = this.parseNetworksFromText(networksResponse.content[0].text);
            
            // Find target network specifically  
            const targetNetworkData = networksData.find(n => 
                n.id === normalizedNetwork || 
                n.id.toLowerCase().includes(normalizedNetwork.toLowerCase()) || 
                n.name.toLowerCase().includes(normalizedNetwork.toLowerCase())
            );
            
            let networkData = targetNetworkData;
            if (!networkData) {
                console.warn(`⚠️ ${normalizedNetwork} network not found in API, using normalized name anyway`);
                // Create a mock network object for consistency
                networkData = { 
                    id: normalizedNetwork, 
                    name: `${normalizedNetwork.charAt(0).toUpperCase() + normalizedNetwork.slice(1)} Network` 
                };
                pipeline.steps.push({
                    step: 1,
                    name: 'Find Target Network',
                    status: 'success',
                    data: networkData,
                    note: 'Network not found in API list, using normalized name'
                });
            } else {
                console.log(`✅ [NETWORK PIPELINE] Found ${normalizedNetwork} network: ${networkData.id} (${networkData.name})`);
                pipeline.steps.push({
                    step: 1,
                    name: 'Find Target Network',
                    status: 'success',
                    data: networkData
                });
            }
            
            // Step 2: Get network pools
            console.log(`🌊 [NETWORK PIPELINE] Step 2: Fetching ${normalizedNetwork} network pools...`);
            const poolsResponse = await this.callTool('get_network_pools', {
                network: networkData.id,
                page: 1
            });
            
            pipeline.steps.push({
                step: 2,
                name: `Get ${normalizedNetwork.toUpperCase()} Pools`,
                status: 'success',
                data: poolsResponse.content[0].text
            });

            // Step 3: Get token recommendations using AI
            console.log(`🤖 [NETWORK PIPELINE] Step 3: Getting AI token recommendations for ${normalizedNetwork}...`);
            const recommendationsResponse = await this.callTool('recommend_tokens', {
                network: networkData.id,
                criteria,
                count
            });
            
            pipeline.steps.push({
                step: 3,
                name: 'AI Token Recommendations',
                status: 'success',
                data: recommendationsResponse.content[0].text
            });

            // Step 4: Search for specific network token data
            if (includeTokenSearch) {
                const searchQuery = normalizedNetwork.includes('sei') ? 'SEI' : normalizedNetwork.toUpperCase();
                console.log(`🔍 [NETWORK PIPELINE] Step 4: Searching ${searchQuery} token data...`);
                try {
                    const tokenSearchResponse = await this.callTool('search_pools', {
                        query: searchQuery,
                        network: networkData.id
                    });
                    
                    pipeline.steps.push({
                        step: 4,
                        name: `${searchQuery} Token Search`,
                        status: 'success',
                        data: tokenSearchResponse.content[0].text
                    });
                } catch (searchError) {
                    console.warn(`⚠️ [NETWORK PIPELINE] ${searchQuery} token search failed:`, searchError.message);
                    pipeline.steps.push({
                        step: 4,
                        name: `${searchQuery} Token Search`,
                        status: 'failed',
                        error: searchError.message
                    });
                }
            }

            // Compile final data
            pipeline.data = {
                network: networkData,
                pools: pipeline.steps.find(s => s.name.includes('Pools'))?.data,
                recommendations: pipeline.steps.find(s => s.name === 'AI Token Recommendations')?.data,
                tokenData: pipeline.steps.find(s => s.name.includes('Token Search'))?.data
            };
            
            pipeline.success = true;
            console.log(`🎉 [NETWORK PIPELINE] Pipeline completed successfully for ${normalizedNetwork}!`);
            
            return pipeline;

        } catch (error) {
            console.error('❌ [SEI PIPELINE] Pipeline failed:', error.message);
            pipeline.errors.push(error.message);
            pipeline.success = false;
            return pipeline;
        }
    }

    /**
     * Get comprehensive market context for LLMs
     */
    async getMarketContextForLLM(options = {}) {
        const {
            includeTopPools = true,
            includeTokenRecommendations = true,
            includePriceData = false,
            networkId = null,
            recommendationCriteria = 'balanced'
        } = options;

        const context = {
            timestamp: new Date().toISOString(),
            network: networkId || this.seiNetworkId,
            data: {}
        };

        try {
            // Get top pools
            if (includeTopPools) {
                const pools = await this.getSeiPools(1);
                context.data.topPools = pools;
            }

            // Get token recommendations
            if (includeTokenRecommendations) {
                const recommendations = await this.getTokenRecommendations(recommendationCriteria, 5, networkId);
                context.data.tokenRecommendations = recommendations;
            }

            context.success = true;
            return context;
        } catch (error) {
            context.success = false;
            context.error = error.message;
            return context;
        }
    }

    /**
     * Format market data for LLM consumption
     */
    formatMarketDataForLLM(marketData) {
        let prompt = `# Real-time Market Data Context\n\n`;
        prompt += `**Network:** ${marketData.network}\n`;
        prompt += `**Last Updated:** ${marketData.timestamp}\n\n`;

        if (marketData.data.topPools && marketData.data.topPools.success) {
            prompt += `## Top Pools\n${marketData.data.topPools.data}\n\n`;
        }

        if (marketData.data.tokenRecommendations && marketData.data.tokenRecommendations.success) {
            prompt += `## Token Recommendations\n${marketData.data.tokenRecommendations.data}\n\n`;
        }

        prompt += `---\n`;
        prompt += `*This market data is provided via MCP (Model Context Protocol) and is updated in real-time.*\n`;

        return prompt;
    }

    /**
     * Get current network status and health
     */
    getStatus() {
        return {
            connected: this.isConnected,
            mode: this.useHttpMode ? 'HTTP' : 'stdio',
            seiNetworkId: this.seiNetworkId,
            supportedNetworksCount: this.supportedNetworks.length,
            httpBaseUrl: this.httpBaseUrl || null,
            cacheSize: {
                networks: this.networkCache.size,
                pools: this.poolCache.size,
                prices: this.priceCache.size
            }
        };
    }

    /**
     * Disconnect from MCP server
     */
    async disconnect() {
        try {
            if (this.client && this.isConnected && !this.useHttpMode) {
                await this.client.close();
                console.log('🔌 Disconnected from MCP Market Data Server (stdio)');
            }
            
            if (this.useHttpMode) {
                console.log('🔌 Disconnecting from HTTP mode');
                // Clean up server process if in HTTP mode
                await this.cleanupServerProcess();
            }
            
            this.isConnected = false;
            
        } catch (error) {
            console.error('⚠️ Error during disconnect:', error.message);
        }
    }
}

module.exports = MCPMarketDataService;
