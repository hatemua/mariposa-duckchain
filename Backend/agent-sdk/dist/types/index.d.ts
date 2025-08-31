export interface AgentConfig {
    privateKey: string;
    address: string;
    network: SeiNetwork;
    rpcEndpoint: string;
    chainId: string;
    contractAddresses: ContractAddresses;
    gasSettings?: GasSettings;
}
export interface SeiNetwork {
    name: string;
    chainId: string;
    rpcEndpoint: string;
    restEndpoint: string;
    faucetEndpoint?: string;
    explorer: string;
}
export interface ContractAddresses {
    agenticRouter: string;
    swapRouter: string;
    factory: string;
    wsei: string;
    usdc: string;
    [tokenSymbol: string]: string;
}
export interface GasSettings {
    gasPrice: string;
    gasLimit: number;
    gasAdjustment: number;
}
export interface WalletBalance {
    address: string;
    balances: TokenBalance[];
    totalUsdValue: BigNumber;
    lastUpdated: Date;
}
export interface TokenBalance {
    symbol: string;
    address: string;
    amount: BigNumber;
    decimals: number;
    usdValue: BigNumber;
    usdPrice: BigNumber;
}
export interface NativeBalance {
    denom: string;
    amount: BigNumber;
    usdValue: BigNumber;
}
export interface TransactionConfig {
    gasLimit?: number;
    gasPrice?: string;
    memo?: string;
    timeoutHeight?: number;
}
export interface TransactionResult {
    txHash: string;
    height: number;
    gasUsed: number;
    gasWanted: number;
    events: TransactionEvent[];
    success: boolean;
    error?: string;
    timestamp: Date;
}
export interface TransactionEvent {
    type: string;
    attributes: {
        key: string;
        value: string;
    }[];
}
export interface SignedTransaction {
    txBytes: Uint8Array;
    signatures: any[];
    bodyBytes: Uint8Array;
    authInfoBytes: Uint8Array;
}
export interface SwapParams {
    tokenIn: string;
    tokenOut: string;
    amountIn: BigNumber;
    amountOutMin: BigNumber;
    deadline?: number;
    recipient?: string;
    slippageTolerance?: number;
}
export interface SwapResult extends TransactionResult {
    amountIn: BigNumber;
    amountOut: BigNumber;
    tokenIn: string;
    tokenOut: string;
    priceImpact: BigNumber;
    fee: BigNumber;
    route: SwapRoute[];
}
export interface SwapRoute {
    tokenIn: string;
    tokenOut: string;
    pool: string;
    fee: number;
    amountIn: BigNumber;
    amountOut: BigNumber;
}
export interface PoolInfo {
    address: string;
    token0: string;
    token1: string;
    fee: number;
    liquidity: BigNumber;
    sqrtPriceX96: BigNumber;
    tick: number;
    exists: boolean;
}
export interface ContractCall {
    contractAddress: string;
    method: string;
    args: any[];
    value?: BigNumber;
}
export interface ContractCallResult extends TransactionResult {
    returnValue?: any;
    logs: ContractLog[];
}
export interface ContractLog {
    address: string;
    topics: string[];
    data: string;
    decoded?: any;
}
export interface FeeEstimate {
    gasLimit: number;
    gasPrice: BigNumber;
    totalFee: BigNumber;
    platformFee: BigNumber;
    networkFee: BigNumber;
}
export interface PlatformFeeInfo {
    feeBps: number;
    feeRecipient: string;
    feeInUsd: BigNumber;
    feeInNative: BigNumber;
}
export interface TokenPrice {
    symbol: string;
    address: string;
    priceUsd: BigNumber;
    priceChange24h: BigNumber;
    volume24h: BigNumber;
    marketCap: BigNumber;
    lastUpdated: Date;
}
export interface MarketData {
    prices: Map<string, TokenPrice>;
    seiPrice: BigNumber;
    totalVolume24h: BigNumber;
    totalMarketCap: BigNumber;
    lastUpdated: Date;
}
export interface TradingStrategy {
    id: string;
    name: string;
    description: string;
    parameters: StrategyParameters;
    riskLevel: 'low' | 'medium' | 'high';
    active: boolean;
}
export interface StrategyParameters {
    maxSlippage: number;
    maxGasPrice: BigNumber;
    tradingPairs: string[];
    rebalanceThreshold: number;
    stopLossPercentage: number;
    takeProfitPercentage: number;
    maxPositionSize: BigNumber;
    [key: string]: any;
}
export interface PortfolioAllocation {
    [tokenSymbol: string]: {
        targetPercentage: number;
        currentPercentage: number;
        rebalanceNeeded: boolean;
    };
}
export interface NetworkStatus {
    connected: boolean;
    blockHeight: number;
    chainId: string;
    nodeInfo: NodeInfo;
    syncInfo: SyncInfo;
}
export interface NodeInfo {
    moniker: string;
    version: string;
    network: string;
    protocolVersion: string;
}
export interface SyncInfo {
    latestBlockHash: string;
    latestBlockHeight: number;
    latestBlockTime: Date;
    catchingUp: boolean;
}
export interface AgentError extends Error {
    code: string;
    details?: any;
    txHash?: string;
    blockHeight?: number;
}
export declare enum ErrorCodes {
    INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE",
    TRANSACTION_FAILED = "TRANSACTION_FAILED",
    INVALID_ADDRESS = "INVALID_ADDRESS",
    NETWORK_ERROR = "NETWORK_ERROR",
    CONTRACT_ERROR = "CONTRACT_ERROR",
    SLIPPAGE_EXCEEDED = "SLIPPAGE_EXCEEDED",
    DEADLINE_EXPIRED = "DEADLINE_EXPIRED",
    POOL_NOT_FOUND = "POOL_NOT_FOUND",
    INSUFFICIENT_LIQUIDITY = "INSUFFICIENT_LIQUIDITY",
    UNAUTHORIZED = "UNAUTHORIZED",
    INVALID_PARAMETERS = "INVALID_PARAMETERS"
}
export interface AgentEvent {
    type: EventType;
    timestamp: Date;
    data: any;
    txHash?: string;
    blockHeight?: number;
}
export declare enum EventType {
    SWAP_EXECUTED = "SWAP_EXECUTED",
    TRANSFER_COMPLETED = "TRANSFER_COMPLETED",
    BALANCE_UPDATED = "BALANCE_UPDATED",
    STRATEGY_UPDATED = "STRATEGY_UPDATED",
    ERROR_OCCURRED = "ERROR_OCCURRED",
    CONNECTION_STATUS_CHANGED = "CONNECTION_STATUS_CHANGED"
}
export interface AgenticRouterParams {
    swapSeiToToken: {
        tokenOut: string;
        amountOutMin: BigNumber;
        recipient: string;
        deadline: number;
    };
    swapTokenToToken: {
        tokenIn: string;
        tokenOut: string;
        amountIn: BigNumber;
        amountOutMin: BigNumber;
        recipient: string;
        deadline: number;
    };
    swapTokenToSei: {
        tokenIn: string;
        amountIn: BigNumber;
        amountOutMin: BigNumber;
        recipient: string;
        deadline: number;
    };
    transferWithFee: {
        token: string;
        from: string;
        to: string;
        amount: BigNumber;
    };
}
export type Address = string;
export type TokenSymbol = string;
export type ContractAddress = string;
export type TxHash = string;
export interface PaginationOptions {
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
}
export interface QueryOptions {
    pagination?: PaginationOptions;
    filters?: Record<string, any>;
}
export declare const SUPPORTED_NETWORKS: Record<string, SeiNetwork>;
export declare const DEFAULT_GAS_SETTINGS: GasSettings;
export declare const FEE_TIERS: {
    readonly LOWEST: 100;
    readonly LOW: 500;
    readonly MEDIUM: 3000;
    readonly HIGH: 10000;
};
export type FeeTier = typeof FEE_TIERS[keyof typeof FEE_TIERS];
