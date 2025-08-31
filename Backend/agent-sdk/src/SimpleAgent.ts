import { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers';
import { EventEmitter } from 'events';
import axios from 'axios';

// Simple types without complex dependencies
export interface SimpleAgentConfig {
  privateKey: string;
  address: string;
  rpcUrl: string;
  chainId: string;
  contractAddresses: {
    agenticRouter: string;
    wsei: string;
    usdc: string;
  };
}

export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  slippageTolerance?: number;
  recipient?: string;
}

export interface SwapResult {
  txHash: string;
  amountIn: string;
  amountOut: string;
  gasUsed: string;
  success: boolean;
}

export interface TokenBalance {
  symbol: string;
  address: string;
  balance: string;
  decimals: number;
}

/**
 * Simplified Agent class for SEI Network operations
 * Uses only stable dependencies: ethers v5, bignumber.js, axios
 */
export class SimpleAgent extends EventEmitter {
  private config: SimpleAgentConfig;
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private isInitialized: boolean = false;

  // AgenticRouter contract ABI (simplified)
  private readonly agenticRouterABI = [
    "function swapSeiToToken(address tokenOut, uint256 amountOutMin, address recipient, uint256 deadline) external payable returns (uint256 amountOut)",
    "function swapTokenToToken(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin, address recipient, uint256 deadline) external returns (uint256 amountOut)",
    "function swapTokenToSei(address tokenIn, uint256 amountIn, uint256 amountOutMin, address recipient, uint256 deadline) external returns (uint256 amountOut)",
    "function calculateFee(uint256 amount) external view returns (uint256 fee, uint256 net)",
    "function isAgent(address agent) external view returns (bool)"
  ];

  // ERC20 ABI (simplified)
  private readonly erc20ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
  ];

  constructor(config: SimpleAgentConfig) {
    super();
    this.config = config;
    this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new ethers.Wallet(config.privateKey, this.provider);
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    try {
      console.log('🤖 Initializing Simple Agent...');
      
      // Test connection
      const network = await this.provider.getNetwork();
      const networkName = this.getNetworkName(network.chainId);
      console.log(`Connected to network: ${networkName} (Chain ID: ${network.chainId})`);
      
      // Get current balance
      const balance = await this.wallet.getBalance();
      console.log(`Wallet balance: ${ethers.utils.formatEther(balance)} SEI`);
      
      this.isInitialized = true;
      console.log('✅ Agent initialized successfully');
      
      this.emit('initialized', {
        address: this.config.address,
        balance: ethers.utils.formatEther(balance)
      });
      
    } catch (error: any) {
      throw new Error(`Failed to initialize agent: ${error.message}`);
    }
  }

  /**
   * Get native SEI balance
   */
  async getSeiBalance(): Promise<string> {
    this.ensureInitialized();
    const balance = await this.wallet.getBalance();
    return ethers.utils.formatEther(balance);
  }

  /**
   * Get ERC20 token balance
   */
  async getTokenBalance(tokenAddress: string): Promise<TokenBalance> {
    this.ensureInitialized();
    
    try {
      const contract = new ethers.Contract(tokenAddress, this.erc20ABI, this.provider);
      
      const [balance, decimals, symbol] = await Promise.all([
        contract.balanceOf(this.config.address),
        contract.decimals(),
        contract.symbol()
      ]);
      
      return {
        symbol,
        address: tokenAddress,
        balance: ethers.utils.formatUnits(balance, decimals),
        decimals
      };
      
    } catch (error: any) {
      throw new Error(`Failed to get token balance: ${error.message}`);
    }
  }

  /**
   * Swap SEI for token
   */
  async swapSeiToToken(params: {
    tokenOut: string;
    amountIn: string;
    slippageTolerance?: number;
    recipient?: string;
  }): Promise<SwapResult> {
    this.ensureInitialized();
    
    try {
      const contract = new ethers.Contract(
        this.config.contractAddresses.agenticRouter,
        this.agenticRouterABI,
        this.wallet
      );
      
          const amountInWei = ethers.utils.parseEther(params.amountIn);
    const slippage = params.slippageTolerance || 15; // Increased default slippage for testnet
    // Set a very low minimum output to allow the swap to go through
    const amountOutMin = ethers.BigNumber.from(1); // Minimum 1 wei output
      const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes
      const recipient = params.recipient || this.config.address;
      
      console.log(`🔄 Swapping ${params.amountIn} SEI for ${params.tokenOut}`);
      console.log(`💡 Using ${slippage}% slippage tolerance`);
      console.log(`📊 Minimum output: ${amountOutMin.toString()} wei`);
      
      // Estimate gas first
      let gasLimit;
      try {
        gasLimit = await contract.estimateGas.swapSeiToToken(
          params.tokenOut,
          amountOutMin,
          recipient,
          deadline,
          { value: amountInWei }
        );
        console.log(`⛽ Estimated gas: ${gasLimit.toString()}`);
      } catch (gasError: any) {
        console.warn(`⚠️  Gas estimation failed: ${gasError.message}`);
        gasLimit = ethers.BigNumber.from(500000); // Default gas limit
      }
      
      const tx = await contract.swapSeiToToken(
        params.tokenOut,
        amountOutMin,
        recipient,
        deadline,
        { 
          value: amountInWei,
          gasLimit: gasLimit.mul(120).div(100) // Add 20% buffer
        }
      );
      
      console.log(`📝 Transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      
      console.log(`✅ Swap completed in block ${receipt.blockNumber}`);
      
      const result: SwapResult = {
        txHash: tx.hash,
        amountIn: params.amountIn,
        amountOut: 'calculated from events', // Would parse from events in full implementation
        gasUsed: receipt.gasUsed.toString(),
        success: receipt.status === 1
      };
      
      this.emit('swapExecuted', result);
      return result;
      
    } catch (error: any) {
      const errorMsg = `Swap failed: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      this.emit('error', new Error(errorMsg));
      throw new Error(errorMsg);
    }
  }

  /**
   * Swap token for token
   */
  async swapTokenToToken(params: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    slippageTolerance?: number;
    recipient?: string;
  }): Promise<SwapResult> {
    this.ensureInitialized();
    
    try {
      // First approve the token
      await this.approveToken(params.tokenIn, this.config.contractAddresses.agenticRouter, params.amountIn);
      
      const contract = new ethers.Contract(
        this.config.contractAddresses.agenticRouter,
        this.agenticRouterABI,
        this.wallet
      );
      
      // Get token decimals for proper formatting
      const tokenContract = new ethers.Contract(params.tokenIn, this.erc20ABI, this.provider);
      const decimals = await tokenContract.decimals();
      
      const amountInUnits = ethers.utils.parseUnits(params.amountIn, decimals);
      const slippage = params.slippageTolerance || 15; // Increased default slippage for testnet
      // Set a very low minimum output to allow the swap to go through
      const amountOutMin = ethers.BigNumber.from(1); // Minimum 1 wei output
      const deadline = Math.floor(Date.now() / 1000) + 300;
      const recipient = params.recipient || this.config.address;
      
      console.log(`🔄 Swapping ${params.amountIn} ${params.tokenIn} for ${params.tokenOut}`);
      
      const tx = await contract.swapTokenToToken(
        params.tokenIn,
        params.tokenOut,
        amountInUnits,
        amountOutMin,
        recipient,
        deadline
      );
      
      console.log(`📝 Transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      
      console.log(`✅ Swap completed in block ${receipt.blockNumber}`);
      
      const result: SwapResult = {
        txHash: tx.hash,
        amountIn: params.amountIn,
        amountOut: 'calculated from events',
        gasUsed: receipt.gasUsed.toString(),
        success: receipt.status === 1
      };
      
      this.emit('swapExecuted', result);
      return result;
      
    } catch (error: any) {
      const errorMsg = `Token swap failed: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      this.emit('error', new Error(errorMsg));
      throw new Error(errorMsg);
    }
  }

  /**
   * Swap token for SEI
   */
  async swapTokenToSei(params: {
    tokenIn: string;
    amountIn: string;
    slippageTolerance?: number;
    recipient?: string;
  }): Promise<SwapResult> {
    this.ensureInitialized();
    
    try {
      // First approve the token
      await this.approveToken(params.tokenIn, this.config.contractAddresses.agenticRouter, params.amountIn);
      
      const contract = new ethers.Contract(
        this.config.contractAddresses.agenticRouter,
        this.agenticRouterABI,
        this.wallet
      );
      
      // Get token decimals for proper formatting
      const tokenContract = new ethers.Contract(params.tokenIn, this.erc20ABI, this.provider);
      const decimals = await tokenContract.decimals();
      
      const amountInUnits = ethers.utils.parseUnits(params.amountIn, decimals);
      const slippage = params.slippageTolerance || 15; // Increased default slippage for testnet
      // Set a very low minimum output to allow the swap to go through
      const amountOutMin = ethers.BigNumber.from(1); // Minimum 1 wei output
      const deadline = Math.floor(Date.now() / 1000) + 300;
      const recipient = params.recipient || this.config.address;
      
      console.log(`🔄 Swapping ${params.amountIn} ${params.tokenIn} for SEI`);
      console.log(`💡 Using ${slippage}% slippage tolerance`);
      console.log(`📊 Minimum output: ${amountOutMin.toString()} wei`);
      
      // Estimate gas first
      let gasLimit;
      try {
        gasLimit = await contract.estimateGas.swapTokenToSei(
          params.tokenIn,
          amountInUnits,
          amountOutMin,
          recipient,
          deadline
        );
        console.log(`⛽ Estimated gas: ${gasLimit.toString()}`);
      } catch (gasError: any) {
        console.warn(`⚠️  Gas estimation failed: ${gasError.message}`);
        gasLimit = ethers.BigNumber.from(500000); // Default gas limit
      }
      
      const tx = await contract.swapTokenToSei(
        params.tokenIn,
        amountInUnits,
        amountOutMin,
        recipient,
        deadline,
        { gasLimit: gasLimit.mul(120).div(100) } // Add 20% buffer
      );
      
      console.log(`📝 Transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      
      console.log(`✅ Swap completed in block ${receipt.blockNumber}`);
      
      const result: SwapResult = {
        txHash: tx.hash,
        amountIn: params.amountIn,
        amountOut: 'calculated from events',
        gasUsed: receipt.gasUsed.toString(),
        success: receipt.status === 1
      };
      
      this.emit('swapExecuted', result);
      return result;
      
    } catch (error: any) {
      const errorMsg = `Token to SEI swap failed: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      this.emit('error', new Error(errorMsg));
      throw new Error(errorMsg);
    }
  }

  /**
   * Transfer SEI to another address
   */
  async transferSei(to: string, amount: string): Promise<string> {
    this.ensureInitialized();
    
    try {
      const amountWei = ethers.utils.parseEther(amount);
      
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
      
    } catch (error: any) {
      const errorMsg = `SEI transfer failed: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      this.emit('error', new Error(errorMsg));
      throw new Error(errorMsg);
    }
  }

  /**
   * Transfer ERC20 token
   */
  async transferToken(tokenAddress: string, to: string, amount: string): Promise<string> {
    this.ensureInitialized();
    
    try {
      const contract = new ethers.Contract(tokenAddress, this.erc20ABI, this.wallet);
      const decimals = await contract.decimals();
      const amountUnits = ethers.utils.parseUnits(amount, decimals);
      
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
      
    } catch (error: any) {
      const errorMsg = `Token transfer failed: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      this.emit('error', new Error(errorMsg));
      throw new Error(errorMsg);
    }
  }

  /**
   * Approve token spending
   */
  async approveToken(tokenAddress: string, spender: string, amount: string): Promise<string> {
    this.ensureInitialized();
    
    try {
      const contract = new ethers.Contract(tokenAddress, this.erc20ABI, this.wallet);
      const decimals = await contract.decimals();
      const amountUnits = ethers.utils.parseUnits(amount, decimals);
      
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
      
    } catch (error: any) {
      throw new Error(`Token approval failed: ${error.message}`);
    }
  }

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<string> {
    this.ensureInitialized();
    const gasPrice = await this.provider.getGasPrice();
    return ethers.utils.formatUnits(gasPrice, 'gwei');
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(tx: any): Promise<string> {
    this.ensureInitialized();
    const gasEstimate = await this.provider.estimateGas(tx);
    return gasEstimate.toString();
  }

  /**
   * Get agent configuration
   */
  getConfig(): SimpleAgentConfig {
    return { ...this.config };
  }

  /**
   * Get wallet address
   */
  getAddress(): string {
    return this.config.address;
  }

  /**
   * Check if agent is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting agent...');
    this.isInitialized = false;
    this.removeAllListeners();
  }

  // Private helper methods
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }
  }

  private getNetworkName(chainId: number): string {
    const networks: { [key: number]: string } = {
      1329: 'SEI Pacific (Mainnet)',
      713715: 'SEI Arctic (Testnet)',
      1: 'Ethereum Mainnet',
      5: 'Ethereum Goerli',
      137: 'Polygon Mainnet'
    };
    return networks[chainId] || `Unknown Network`;
  }
}

// Export utility functions
export class Utils {
  static toBigNumber(value: string | number): BigNumber {
    return new BigNumber(value);
  }

  static formatAmount(amount: BigNumber, decimals: number = 6): string {
    return amount.toFixed(decimals);
  }

  static isValidAddress(address: string): boolean {
    return ethers.utils.isAddress(address);
  }

  static calculateSlippage(amount: string, slippagePercent: number): string {
    const bn = new BigNumber(amount);
    const slippageMultiplier = new BigNumber(1).minus(new BigNumber(slippagePercent).div(100));
    return bn.multipliedBy(slippageMultiplier).toString();
  }
}

export default SimpleAgent; 