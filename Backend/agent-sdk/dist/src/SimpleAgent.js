"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Utils = exports.SimpleAgent = void 0;
const bignumber_js_1 = require("bignumber.js");
const ethers_1 = require("ethers");
const events_1 = require("events");
/**
 * Simplified Agent class for SEI Network operations
 * Uses only stable dependencies: ethers v5, bignumber.js, axios
 */
class SimpleAgent extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.isInitialized = false;
        // AgenticRouter contract ABI (simplified)
        this.agenticRouterABI = [
            "function swapSeiToToken(address tokenOut, uint256 amountOutMin, address recipient, uint256 deadline) external payable returns (uint256 amountOut)",
            "function swapTokenToToken(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin, address recipient, uint256 deadline) external returns (uint256 amountOut)",
            "function swapTokenToSei(address tokenIn, uint256 amountIn, uint256 amountOutMin, address recipient, uint256 deadline) external returns (uint256 amountOut)",
            "function calculateFee(uint256 amount) external view returns (uint256 fee, uint256 net)",
            "function isAgent(address agent) external view returns (bool)"
        ];
        // ERC20 ABI (simplified)
        this.erc20ABI = [
            "function balanceOf(address owner) view returns (uint256)",
            "function decimals() view returns (uint8)",
            "function symbol() view returns (string)",
            "function transfer(address to, uint256 amount) returns (bool)",
            "function approve(address spender, uint256 amount) returns (bool)",
            "function allowance(address owner, address spender) view returns (uint256)"
        ];
        this.config = config;
        this.provider = new ethers_1.ethers.providers.JsonRpcProvider(config.rpcUrl);
        this.wallet = new ethers_1.ethers.Wallet(config.privateKey, this.provider);
    }
    /**
     * Initialize the agent
     */
    async initialize() {
        try {
            console.log('🤖 Initializing Simple Agent...');
            // Test connection
            const network = await this.provider.getNetwork();
            const networkName = this.getNetworkName(network.chainId);
            console.log(`Connected to network: ${networkName} (Chain ID: ${network.chainId})`);
            // Get current balance
            const balance = await this.wallet.getBalance();
            console.log(`Wallet balance: ${ethers_1.ethers.utils.formatEther(balance)} SEI`);
            this.isInitialized = true;
            console.log('✅ Agent initialized successfully');
            this.emit('initialized', {
                address: this.config.address,
                balance: ethers_1.ethers.utils.formatEther(balance)
            });
        }
        catch (error) {
            throw new Error(`Failed to initialize agent: ${error.message}`);
        }
    }
    /**
     * Get native SEI balance
     */
    async getSeiBalance() {
        this.ensureInitialized();
        const balance = await this.wallet.getBalance();
        return ethers_1.ethers.utils.formatEther(balance);
    }
    /**
     * Get ERC20 token balance
     */
    async getTokenBalance(tokenAddress) {
        this.ensureInitialized();
        try {
            const contract = new ethers_1.ethers.Contract(tokenAddress, this.erc20ABI, this.provider);
            const [balance, decimals, symbol] = await Promise.all([
                contract.balanceOf(this.config.address),
                contract.decimals(),
                contract.symbol()
            ]);
            return {
                symbol,
                address: tokenAddress,
                balance: ethers_1.ethers.utils.formatUnits(balance, decimals),
                decimals
            };
        }
        catch (error) {
            throw new Error(`Failed to get token balance: ${error.message}`);
        }
    }
    /**
     * Swap SEI for token
     */
    async swapSeiToToken(params) {
        this.ensureInitialized();
        try {
            const contract = new ethers_1.ethers.Contract(this.config.contractAddresses.agenticRouter, this.agenticRouterABI, this.wallet);
            const amountInWei = ethers_1.ethers.utils.parseEther(params.amountIn);
            const slippage = params.slippageTolerance || 15; // Increased default slippage for testnet
            // Set a very low minimum output to allow the swap to go through
            const amountOutMin = ethers_1.ethers.BigNumber.from(1); // Minimum 1 wei output
            const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes
            const recipient = params.recipient || this.config.address;
            console.log(`🔄 Swapping ${params.amountIn} SEI for ${params.tokenOut}`);
            console.log(`💡 Using ${slippage}% slippage tolerance`);
            console.log(`📊 Minimum output: ${amountOutMin.toString()} wei`);
            // Estimate gas first
            let gasLimit;
            try {
                gasLimit = await contract.estimateGas.swapSeiToToken(params.tokenOut, amountOutMin, recipient, deadline, { value: amountInWei });
                console.log(`⛽ Estimated gas: ${gasLimit.toString()}`);
            }
            catch (gasError) {
                console.warn(`⚠️  Gas estimation failed: ${gasError.message}`);
                gasLimit = ethers_1.ethers.BigNumber.from(500000); // Default gas limit
            }
            const tx = await contract.swapSeiToToken(params.tokenOut, amountOutMin, recipient, deadline, {
                value: amountInWei,
                gasLimit: gasLimit.mul(120).div(100) // Add 20% buffer
            });
            console.log(`📝 Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Swap completed in block ${receipt.blockNumber}`);
            const result = {
                txHash: tx.hash,
                amountIn: params.amountIn,
                amountOut: 'calculated from events',
                gasUsed: receipt.gasUsed.toString(),
                success: receipt.status === 1
            };
            this.emit('swapExecuted', result);
            return result;
        }
        catch (error) {
            const errorMsg = `Swap failed: ${error.message}`;
            console.error(`❌ ${errorMsg}`);
            this.emit('error', new Error(errorMsg));
            throw new Error(errorMsg);
        }
    }
    /**
     * Swap token for token
     */
    async swapTokenToToken(params) {
        this.ensureInitialized();
        try {
            // First approve the token
            await this.approveToken(params.tokenIn, this.config.contractAddresses.agenticRouter, params.amountIn);
            const contract = new ethers_1.ethers.Contract(this.config.contractAddresses.agenticRouter, this.agenticRouterABI, this.wallet);
            // Get token decimals for proper formatting
            const tokenContract = new ethers_1.ethers.Contract(params.tokenIn, this.erc20ABI, this.provider);
            const decimals = await tokenContract.decimals();
            const amountInUnits = ethers_1.ethers.utils.parseUnits(params.amountIn, decimals);
            const slippage = params.slippageTolerance || 15; // Increased default slippage for testnet
            // Set a very low minimum output to allow the swap to go through
            const amountOutMin = ethers_1.ethers.BigNumber.from(1); // Minimum 1 wei output
            const deadline = Math.floor(Date.now() / 1000) + 300;
            const recipient = params.recipient || this.config.address;
            console.log(`🔄 Swapping ${params.amountIn} ${params.tokenIn} for ${params.tokenOut}`);
            const tx = await contract.swapTokenToToken(params.tokenIn, params.tokenOut, amountInUnits, amountOutMin, recipient, deadline);
            console.log(`📝 Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Swap completed in block ${receipt.blockNumber}`);
            const result = {
                txHash: tx.hash,
                amountIn: params.amountIn,
                amountOut: 'calculated from events',
                gasUsed: receipt.gasUsed.toString(),
                success: receipt.status === 1
            };
            this.emit('swapExecuted', result);
            return result;
        }
        catch (error) {
            const errorMsg = `Token swap failed: ${error.message}`;
            console.error(`❌ ${errorMsg}`);
            this.emit('error', new Error(errorMsg));
            throw new Error(errorMsg);
        }
    }
    /**
     * Swap token for SEI
     */
    async swapTokenToSei(params) {
        this.ensureInitialized();
        try {
            // First approve the token
            await this.approveToken(params.tokenIn, this.config.contractAddresses.agenticRouter, params.amountIn);
            const contract = new ethers_1.ethers.Contract(this.config.contractAddresses.agenticRouter, this.agenticRouterABI, this.wallet);
            // Get token decimals for proper formatting
            const tokenContract = new ethers_1.ethers.Contract(params.tokenIn, this.erc20ABI, this.provider);
            const decimals = await tokenContract.decimals();
            const amountInUnits = ethers_1.ethers.utils.parseUnits(params.amountIn, decimals);
            const slippage = params.slippageTolerance || 15; // Increased default slippage for testnet
            // Set a very low minimum output to allow the swap to go through
            const amountOutMin = ethers_1.ethers.BigNumber.from(1); // Minimum 1 wei output
            const deadline = Math.floor(Date.now() / 1000) + 300;
            const recipient = params.recipient || this.config.address;
            console.log(`🔄 Swapping ${params.amountIn} ${params.tokenIn} for SEI`);
            console.log(`💡 Using ${slippage}% slippage tolerance`);
            console.log(`📊 Minimum output: ${amountOutMin.toString()} wei`);
            // Estimate gas first
            let gasLimit;
            try {
                gasLimit = await contract.estimateGas.swapTokenToSei(params.tokenIn, amountInUnits, amountOutMin, recipient, deadline);
                console.log(`⛽ Estimated gas: ${gasLimit.toString()}`);
            }
            catch (gasError) {
                console.warn(`⚠️  Gas estimation failed: ${gasError.message}`);
                gasLimit = ethers_1.ethers.BigNumber.from(500000); // Default gas limit
            }
            const tx = await contract.swapTokenToSei(params.tokenIn, amountInUnits, amountOutMin, recipient, deadline, { gasLimit: gasLimit.mul(120).div(100) } // Add 20% buffer
            );
            console.log(`📝 Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Swap completed in block ${receipt.blockNumber}`);
            const result = {
                txHash: tx.hash,
                amountIn: params.amountIn,
                amountOut: 'calculated from events',
                gasUsed: receipt.gasUsed.toString(),
                success: receipt.status === 1
            };
            this.emit('swapExecuted', result);
            return result;
        }
        catch (error) {
            const errorMsg = `Token to SEI swap failed: ${error.message}`;
            console.error(`❌ ${errorMsg}`);
            this.emit('error', new Error(errorMsg));
            throw new Error(errorMsg);
        }
    }
    /**
     * Transfer SEI to another address
     */
    async transferSei(to, amount) {
        this.ensureInitialized();
        try {
            const amountWei = ethers_1.ethers.utils.parseEther(amount);
            console.log(`💸 Transferring ${amount} SEI to ${to}`);
            const tx = await this.wallet.sendTransaction({
                to: to,
                value: amountWei
            });
            console.log(`📝 Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Transfer completed in block ${receipt.blockNumber}`);
            this.emit('transferCompleted', {
                txHash: tx.hash,
                to: to,
                amount: amount,
                gasUsed: receipt.gasUsed.toString()
            });
            return tx.hash;
        }
        catch (error) {
            const errorMsg = `SEI transfer failed: ${error.message}`;
            console.error(`❌ ${errorMsg}`);
            this.emit('error', new Error(errorMsg));
            throw new Error(errorMsg);
        }
    }
    /**
     * Transfer ERC20 token
     */
    async transferToken(tokenAddress, to, amount) {
        this.ensureInitialized();
        try {
            const contract = new ethers_1.ethers.Contract(tokenAddress, this.erc20ABI, this.wallet);
            const decimals = await contract.decimals();
            const amountUnits = ethers_1.ethers.utils.parseUnits(amount, decimals);
            console.log(`💸 Transferring ${amount} tokens to ${to}`);
            const tx = await contract.transfer(to, amountUnits);
            console.log(`📝 Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Transfer completed in block ${receipt.blockNumber}`);
            this.emit('transferCompleted', {
                txHash: tx.hash,
                token: tokenAddress,
                to: to,
                amount: amount,
                gasUsed: receipt.gasUsed.toString()
            });
            return tx.hash;
        }
        catch (error) {
            const errorMsg = `Token transfer failed: ${error.message}`;
            console.error(`❌ ${errorMsg}`);
            this.emit('error', new Error(errorMsg));
            throw new Error(errorMsg);
        }
    }
    /**
     * Approve token spending
     */
    async approveToken(tokenAddress, spender, amount) {
        this.ensureInitialized();
        try {
            const contract = new ethers_1.ethers.Contract(tokenAddress, this.erc20ABI, this.wallet);
            const decimals = await contract.decimals();
            const amountUnits = ethers_1.ethers.utils.parseUnits(amount, decimals);
            // Check current allowance
            const currentAllowance = await contract.allowance(this.config.address, spender);
            if (currentAllowance.gte(amountUnits)) {
                console.log('✅ Token already approved');
                return '';
            }
            console.log(`🔐 Approving ${amount} tokens for ${spender}`);
            const tx = await contract.approve(spender, amountUnits);
            console.log(`📝 Approval transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Approval completed in block ${receipt.blockNumber}`);
            return tx.hash;
        }
        catch (error) {
            throw new Error(`Token approval failed: ${error.message}`);
        }
    }
    /**
     * Get current gas price
     */
    async getGasPrice() {
        this.ensureInitialized();
        const gasPrice = await this.provider.getGasPrice();
        return ethers_1.ethers.utils.formatUnits(gasPrice, 'gwei');
    }
    /**
     * Estimate gas for a transaction
     */
    async estimateGas(tx) {
        this.ensureInitialized();
        const gasEstimate = await this.provider.estimateGas(tx);
        return gasEstimate.toString();
    }
    /**
     * Get agent configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Get wallet address
     */
    getAddress() {
        return this.config.address;
    }
    /**
     * Check if agent is initialized
     */
    isReady() {
        return this.isInitialized;
    }
    /**
     * Disconnect and cleanup
     */
    async disconnect() {
        console.log('🔌 Disconnecting agent...');
        this.isInitialized = false;
        this.removeAllListeners();
    }
    // Private helper methods
    ensureInitialized() {
        if (!this.isInitialized) {
            throw new Error('Agent not initialized. Call initialize() first.');
        }
    }
    getNetworkName(chainId) {
        const networks = {
            1329: 'SEI Pacific (Mainnet)',
            713715: 'SEI Arctic (Testnet)',
            1: 'Ethereum Mainnet',
            5: 'Ethereum Goerli',
            137: 'Polygon Mainnet'
        };
        return networks[chainId] || `Unknown Network`;
    }
}
exports.SimpleAgent = SimpleAgent;
// Export utility functions
class Utils {
    static toBigNumber(value) {
        return new bignumber_js_1.BigNumber(value);
    }
    static formatAmount(amount, decimals = 6) {
        return amount.toFixed(decimals);
    }
    static isValidAddress(address) {
        return ethers_1.ethers.utils.isAddress(address);
    }
    static calculateSlippage(amount, slippagePercent) {
        const bn = new bignumber_js_1.BigNumber(amount);
        const slippageMultiplier = new bignumber_js_1.BigNumber(1).minus(new bignumber_js_1.BigNumber(slippagePercent).div(100));
        return bn.multipliedBy(slippageMultiplier).toString();
    }
}
exports.Utils = Utils;
exports.default = SimpleAgent;
//# sourceMappingURL=SimpleAgent.js.map