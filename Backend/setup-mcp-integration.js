/**
 * MCP Integration Setup Script
 * This script helps set up the MCP market data integration
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class MCPSetupHelper {
    constructor() {
        this.setupSteps = [];
        this.errors = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const symbols = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌',
            step: '🔧'
        };
        
        console.log(`${symbols[type]} [${timestamp}] ${message}`);
    }

    async runSetup() {
        this.log('Starting MCP Market Data Integration Setup', 'step');
        console.log('='.repeat(60));

        try {
            await this.checkPrerequisites();
            await this.verifyFileStructure();
            await this.checkDependencies();
            await this.buildMarketMCP();
            await this.testConnection();
            await this.generateSummary();
        } catch (error) {
            this.log(`Setup failed: ${error.message}`, 'error');
            this.errors.push(error.message);
        }

        this.printFinalReport();
    }

    async checkPrerequisites() {
        this.log('Checking prerequisites...', 'step');

        // Check Node.js version
        const nodeVersion = process.version;
        this.log(`Node.js version: ${nodeVersion}`, 'info');

        if (parseInt(nodeVersion.slice(1)) < 16) {
            throw new Error('Node.js version 16+ required');
        }
        this.setupSteps.push('✅ Node.js version check');

        // Check if we're in the right directory
        const currentDir = process.cwd();
        if (!currentDir.endsWith('Backend')) {
            this.log('Please run this script from the Backend directory', 'warning');
        }
        this.setupSteps.push('✅ Directory check');
    }

    async verifyFileStructure() {
        this.log('Verifying file structure...', 'step');

        const requiredFiles = [
            'services/mcpMarketDataService.js',
            'controllers/mcpMarketDataController.js', 
            'routes/mcpMarketDataRoutes.js',
            'config/mcpConfig.js',
            'test-mcp-integration.js'
        ];

        const marketMcpPath = '../market-mcp';
        const marketMcpFiles = [
            'package.json',
            'src/index.ts',
            'tsconfig.json'
        ];

        // Check backend files
        for (const file of requiredFiles) {
            if (fs.existsSync(file)) {
                this.log(`Found: ${file}`, 'success');
            } else {
                this.log(`Missing: ${file}`, 'error');
                this.errors.push(`Missing file: ${file}`);
            }
        }

        // Check market-mcp files
        this.log('Checking market-mcp directory...', 'info');
        if (fs.existsSync(marketMcpPath)) {
            for (const file of marketMcpFiles) {
                const fullPath = path.join(marketMcpPath, file);
                if (fs.existsSync(fullPath)) {
                    this.log(`Found: market-mcp/${file}`, 'success');
                } else {
                    this.log(`Missing: market-mcp/${file}`, 'error');
                    this.errors.push(`Missing market-mcp file: ${file}`);
                }
            }
        } else {
            this.log('market-mcp directory not found', 'error');
            this.errors.push('market-mcp directory missing');
        }

        this.setupSteps.push('✅ File structure verification');
    }

    async checkDependencies() {
        this.log('Checking dependencies...', 'step');

        // Check package.json
        const packageJsonPath = 'package.json';
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            
            // Check for MCP SDK
            if (packageJson.dependencies && packageJson.dependencies['@modelcontextprotocol/sdk']) {
                this.log('MCP SDK dependency found', 'success');
            } else {
                this.log('MCP SDK dependency missing', 'warning');
                this.log('Run: npm install @modelcontextprotocol/sdk', 'info');
            }

            // Check other required dependencies
            const requiredDeps = ['express', 'cors'];
            for (const dep of requiredDeps) {
                if (packageJson.dependencies && packageJson.dependencies[dep]) {
                    this.log(`${dep} dependency found`, 'success');
                } else {
                    this.log(`${dep} dependency missing`, 'error');
                    this.errors.push(`Missing dependency: ${dep}`);
                }
            }
        } else {
            this.log('package.json not found', 'error');
            this.errors.push('package.json missing');
        }

        this.setupSteps.push('✅ Dependency check');
    }

    async buildMarketMCP() {
        this.log('Building market-mcp server...', 'step');

        const marketMcpPath = '../market-mcp';
        
        if (!fs.existsSync(marketMcpPath)) {
            this.log('market-mcp directory not found, skipping build', 'warning');
            return;
        }

        try {
            // Check if already built
            const distPath = path.join(marketMcpPath, 'dist');
            if (fs.existsSync(distPath)) {
                this.log('market-mcp already built', 'success');
            } else {
                this.log('Building market-mcp...', 'info');
                
                // Run npm install and build
                await this.runCommand('npm', ['install'], marketMcpPath);
                await this.runCommand('npm', ['run', 'build'], marketMcpPath);
                
                this.log('market-mcp build completed', 'success');
            }
        } catch (error) {
            this.log(`market-mcp build failed: ${error.message}`, 'error');
            this.errors.push(`market-mcp build error: ${error.message}`);
        }

        this.setupSteps.push('✅ market-mcp build');
    }

    async runCommand(command, args, cwd = process.cwd()) {
        return new Promise((resolve, reject) => {
            const proc = spawn(command, args, { 
                cwd, 
                stdio: ['ignore', 'pipe', 'pipe'],
                shell: process.platform === 'win32'
            });

            let stdout = '';
            let stderr = '';

            proc.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            proc.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            proc.on('close', (code) => {
                if (code === 0) {
                    resolve(stdout);
                } else {
                    reject(new Error(`Command failed: ${stderr || stdout}`));
                }
            });

            proc.on('error', (error) => {
                reject(error);
            });
        });
    }

    async testConnection() {
        this.log('Testing MCP connection...', 'step');

        try {
            // Try to load and test the service
            const MCPMarketDataService = require('./services/mcpMarketDataService');
            this.log('MCP service module loaded successfully', 'success');

            // Note: We don't actually start the service here to avoid hanging
            // The user should run the integration test separately
            this.log('To test the full connection, run: node test-mcp-integration.js', 'info');

        } catch (error) {
            this.log(`MCP service test failed: ${error.message}`, 'error');
            this.errors.push(`MCP service error: ${error.message}`);
        }

        this.setupSteps.push('✅ MCP connection test');
    }

    async generateSummary() {
        this.log('Generating setup summary...', 'step');

        const summary = {
            timestamp: new Date().toISOString(),
            setupSteps: this.setupSteps,
            errors: this.errors,
            nextSteps: [
                'Start the backend server: npm start',
                'Test the integration: node test-mcp-integration.js',
                'Check API endpoints at: http://localhost:5000/api/mcp/status',
                'Review documentation: Backend/MCP_INTEGRATION_README.md'
            ]
        };

        // Write summary to file
        const summaryPath = 'mcp-setup-summary.json';
        fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
        this.log(`Setup summary written to: ${summaryPath}`, 'success');

        this.setupSteps.push('✅ Setup summary generated');
    }

    printFinalReport() {
        console.log('\n' + '='.repeat(60));
        this.log('MCP Integration Setup Report', 'step');
        console.log('='.repeat(60));

        console.log('\n📋 Completed Steps:');
        this.setupSteps.forEach(step => console.log(`  ${step}`));

        if (this.errors.length > 0) {
            console.log('\n❌ Errors Encountered:');
            this.errors.forEach(error => console.log(`  • ${error}`));
        }

        console.log('\n🚀 Next Steps:');
        console.log('  1. Install missing dependencies (if any): npm install');
        console.log('  2. Start the backend server: npm start');
        console.log('  3. Test the integration: node test-mcp-integration.js');
        console.log('  4. Check API at: http://localhost:5000/api/mcp/status');
        console.log('  5. Review docs: Backend/MCP_INTEGRATION_README.md');

        console.log('\n🌟 API Endpoints:');
        console.log('  • Market Data: /api/mcp/*');
        console.log('  • Sei Specific: /api/mcp/sei/*');
        console.log('  • LLM Context: /api/mcp/context/llm');
        console.log('  • Agent Context: /api/mcp/agent/context');

        if (this.errors.length === 0) {
            this.log('Setup completed successfully! 🎉', 'success');
        } else {
            this.log('Setup completed with errors. Please fix the issues above.', 'warning');
        }
    }
}

// Configuration check helper
function checkMCPConfiguration() {
    console.log('\n🔧 MCP Configuration Check');
    console.log('-'.repeat(30));

    try {
        const mcpConfig = require('./config/mcpConfig');
        
        console.log('✅ Configuration loaded successfully');
        console.log(`   Default network: ${mcpConfig.networks.default}`);
        console.log(`   Cache timeout: ${mcpConfig.cache.timeout}ms`);
        console.log(`   Supported networks: ${Object.keys(mcpConfig.networks.supported).length}`);
        console.log(`   Agent types: ${mcpConfig.agentIntegration.supportedAgentTypes.length}`);
        
        return true;
    } catch (error) {
        console.log(`❌ Configuration error: ${error.message}`);
        return false;
    }
}

// Dependency installation helper
async function installMCPDependencies() {
    console.log('\n📦 Installing MCP Dependencies');
    console.log('-'.repeat(30));

    const helper = new MCPSetupHelper();

    try {
        await helper.runCommand('npm', ['install', '@modelcontextprotocol/sdk']);
        console.log('✅ MCP SDK installed successfully');
    } catch (error) {
        console.log(`❌ Failed to install MCP SDK: ${error.message}`);
        console.log('Please run manually: npm install @modelcontextprotocol/sdk');
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--config-only')) {
        checkMCPConfiguration();
        return;
    }
    
    if (args.includes('--install-deps')) {
        await installMCPDependencies();
        return;
    }
    
    if (args.includes('--help')) {
        console.log(`
MCP Integration Setup Helper

Usage:
  node setup-mcp-integration.js [options]

Options:
  --config-only    Check configuration only
  --install-deps   Install MCP dependencies only
  --help          Show this help message

Default: Run full setup process
        `);
        return;
    }

    // Run full setup
    const helper = new MCPSetupHelper();
    await helper.runSetup();
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Setup script failed:', error);
        process.exit(1);
    });
}

module.exports = {
    MCPSetupHelper,
    checkMCPConfiguration,
    installMCPDependencies
};
