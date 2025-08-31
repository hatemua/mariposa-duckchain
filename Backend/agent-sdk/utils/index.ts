import { BigNumber } from 'bignumber.js';

/**
 * Utility functions for the Agent SDK
 */
export class Utils {
  /**
   * Convert a value to BigNumber
   */
  static toBigNumber(value: string | number | BigNumber): BigNumber {
    return new BigNumber(value);
  }

  /**
   * Format a BigNumber for display
   */
  static formatAmount(amount: BigNumber, decimals: number = 6): string {
    return amount.toFixed(decimals);
  }

  /**
   * Convert from token units to display units
   */
  static fromTokenUnits(amount: BigNumber, decimals: number): BigNumber {
    return amount.dividedBy(new BigNumber(10).pow(decimals));
  }

  /**
   * Convert from display units to token units
   */
  static toTokenUnits(amount: BigNumber, decimals: number): BigNumber {
    return amount.multipliedBy(new BigNumber(10).pow(decimals));
  }

  /**
   * Validate SEI address format
   */
  static isValidSeiAddress(address: string): boolean {
    return /^sei[0-9a-z]{39}$/.test(address);
  }

  /**
   * Validate Ethereum-style address format
   */
  static isValidEthAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Calculate slippage amount
   */
  static calculateSlippage(amount: BigNumber, slippagePercent: number): BigNumber {
    const slippageMultiplier = new BigNumber(1).minus(new BigNumber(slippagePercent).div(100));
    return amount.multipliedBy(slippageMultiplier);
  }

  /**
   * Calculate percentage difference
   */
  static calculatePercentageChange(oldValue: BigNumber, newValue: BigNumber): BigNumber {
    if (oldValue.isZero()) return new BigNumber(0);
    return newValue.minus(oldValue).dividedBy(oldValue).multipliedBy(100);
  }

  /**
   * Sleep for specified milliseconds
   */
  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry a function with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (i === maxRetries) {
          throw lastError;
        }
        
        const delay = baseDelay * Math.pow(2, i);
        await Utils.sleep(delay);
      }
    }
    
    throw lastError;
  }
} 