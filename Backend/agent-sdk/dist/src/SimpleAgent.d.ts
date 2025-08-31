/// <reference types="node" />
import { EventEmitter } from 'events';
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
export declare class SimpleAgent extends EventEmitter {
    private config;
    private provider;
    private wallet;
    private isInitialized;
    private readonly agenticRouterABI;
    private readonly erc20ABI;
    constructor(config: SimpleAgentConfig);
    /**
     * Initialize the agent
     */
    initialize(): Promise<void>;
    /**
     * Get native SEI balance
     */
    getSeiBalance(): Promise<string>;
    /**
     * Get ERC20 token balance
     */
    getTokenBalance(tokenAddress: string): Promise<TokenBalance>;
    /**
     * Swap SEI for token
     */
    swapSeiToToken(params: {
        tokenOut: string;
        amountIn: string;
        slippageTolerance?: number;
        recipient?: string;
    }): Promise<SwapResult>;
    /**
     * Swap token for token
     */
    swapTokenToToken(params: {
        tokenIn: string;
        tokenOut: string;
        amountIn: string;
        slippageTolerance?: number;
        recipient?: string;
    }): Promise<SwapResult>;
    /**
     * Swap token for SEI
     */
    swapTokenToSei(params: {
        tokenIn: string;
        amountIn: string;
        slippageTolerance?: number;
        recipient?: string;
    }): Promise<SwapResult>;
    /**
     * Transfer SEI to another address
     */
    transferSei(to: string, amount: string): Promise<string>;
    /**
     * Transfer ERC20 token
     */
    transferToken(tokenAddress: string, to: string, amount: string): Promise<string>;
    /**
     * Approve token spending
     */
    approveToken(tokenAddress: string, spender: string, amount: string): Promise<string>;
    /**
     * Get current gas price
     */
    getGasPrice(): Promise<string>;
    /**
     * Estimate gas for a transaction
     */
    estimateGas(tx: any): Promise<string>;
    /**
     * Get agent configuration
     */
    getConfig(): SimpleAgentConfig;
    /**
     * Get wallet address
     */
    getAddress(): string;
    /**
     * Check if agent is initialized
     */
    isReady(): boolean;
    /**
     * Disconnect and cleanup
     */
    disconnect(): Promise<void>;
    private ensureInitialized;
    private getNetworkName;
}
export declare class Utils {
    static toBigNumber(value: string | number): BigNumber;
    static formatAmount(amount: BigNumber, decimals?: number): string;
    static isValidAddress(address: string): boolean;
    static calculateSlippage(amount: string, slippagePercent: number): string;
}
export default SimpleAgent;
