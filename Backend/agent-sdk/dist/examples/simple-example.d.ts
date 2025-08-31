/**
 * Simple Agent SDK Example
 *
 * This example uses only stable dependencies:
 * - ethers v5 (stable and well-tested)
 * - bignumber.js (for decimal precision)
 * - axios (for HTTP requests)
 *
 * No complex Cosmos or SEI-specific libraries that cause compatibility issues
 */
import { SimpleAgent } from '../src/SimpleAgent';
declare function runSimpleExample(privateKey: string, address: string): Promise<void>;
declare function setupEventListeners(agent: SimpleAgent): void;
declare function demonstrateUtilities(): void;
export declare function createSimpleAgent(privateKey: string, address: string): SimpleAgent;
export { runSimpleExample, setupEventListeners, demonstrateUtilities };
