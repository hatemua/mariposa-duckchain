/**
 * Utility functions for the Agent SDK
 */
export declare class Utils {
    /**
     * Convert a value to BigNumber
     */
    static toBigNumber(value: string | number | BigNumber): BigNumber;
    /**
     * Format a BigNumber for display
     */
    static formatAmount(amount: BigNumber, decimals?: number): string;
    /**
     * Convert from token units to display units
     */
    static fromTokenUnits(amount: BigNumber, decimals: number): BigNumber;
    /**
     * Convert from display units to token units
     */
    static toTokenUnits(amount: BigNumber, decimals: number): BigNumber;
    /**
     * Validate SEI address format
     */
    static isValidSeiAddress(address: string): boolean;
    /**
     * Validate Ethereum-style address format
     */
    static isValidEthAddress(address: string): boolean;
    /**
     * Calculate slippage amount
     */
    static calculateSlippage(amount: BigNumber, slippagePercent: number): BigNumber;
    /**
     * Calculate percentage difference
     */
    static calculatePercentageChange(oldValue: BigNumber, newValue: BigNumber): BigNumber;
    /**
     * Sleep for specified milliseconds
     */
    static sleep(ms: number): Promise<void>;
    /**
     * Retry a function with exponential backoff
     */
    static retry<T>(fn: () => Promise<T>, maxRetries?: number, baseDelay?: number): Promise<T>;
}
