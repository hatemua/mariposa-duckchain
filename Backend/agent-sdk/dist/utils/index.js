"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Utils = void 0;
const bignumber_js_1 = require("bignumber.js");
/**
 * Utility functions for the Agent SDK
 */
class Utils {
    /**
     * Convert a value to BigNumber
     */
    static toBigNumber(value) {
        return new bignumber_js_1.BigNumber(value);
    }
    /**
     * Format a BigNumber for display
     */
    static formatAmount(amount, decimals = 6) {
        return amount.toFixed(decimals);
    }
    /**
     * Convert from token units to display units
     */
    static fromTokenUnits(amount, decimals) {
        return amount.dividedBy(new bignumber_js_1.BigNumber(10).pow(decimals));
    }
    /**
     * Convert from display units to token units
     */
    static toTokenUnits(amount, decimals) {
        return amount.multipliedBy(new bignumber_js_1.BigNumber(10).pow(decimals));
    }
    /**
     * Validate SEI address format
     */
    static isValidSeiAddress(address) {
        return /^sei[0-9a-z]{39}$/.test(address);
    }
    /**
     * Validate Ethereum-style address format
     */
    static isValidEthAddress(address) {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    }
    /**
     * Calculate slippage amount
     */
    static calculateSlippage(amount, slippagePercent) {
        const slippageMultiplier = new bignumber_js_1.BigNumber(1).minus(new bignumber_js_1.BigNumber(slippagePercent).div(100));
        return amount.multipliedBy(slippageMultiplier);
    }
    /**
     * Calculate percentage difference
     */
    static calculatePercentageChange(oldValue, newValue) {
        if (oldValue.isZero())
            return new bignumber_js_1.BigNumber(0);
        return newValue.minus(oldValue).dividedBy(oldValue).multipliedBy(100);
    }
    /**
     * Sleep for specified milliseconds
     */
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Retry a function with exponential backoff
     */
    static async retry(fn, maxRetries = 3, baseDelay = 1000) {
        let lastError = null;
        for (let i = 0; i <= maxRetries; i++) {
            try {
                return await fn();
            }
            catch (error) {
                lastError = error;
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
exports.Utils = Utils;
//# sourceMappingURL=index.js.map