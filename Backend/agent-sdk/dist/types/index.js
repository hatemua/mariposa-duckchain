"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FEE_TIERS = exports.DEFAULT_GAS_SETTINGS = exports.SUPPORTED_NETWORKS = exports.EventType = exports.ErrorCodes = void 0;
var ErrorCodes;
(function (ErrorCodes) {
    ErrorCodes["INSUFFICIENT_BALANCE"] = "INSUFFICIENT_BALANCE";
    ErrorCodes["TRANSACTION_FAILED"] = "TRANSACTION_FAILED";
    ErrorCodes["INVALID_ADDRESS"] = "INVALID_ADDRESS";
    ErrorCodes["NETWORK_ERROR"] = "NETWORK_ERROR";
    ErrorCodes["CONTRACT_ERROR"] = "CONTRACT_ERROR";
    ErrorCodes["SLIPPAGE_EXCEEDED"] = "SLIPPAGE_EXCEEDED";
    ErrorCodes["DEADLINE_EXPIRED"] = "DEADLINE_EXPIRED";
    ErrorCodes["POOL_NOT_FOUND"] = "POOL_NOT_FOUND";
    ErrorCodes["INSUFFICIENT_LIQUIDITY"] = "INSUFFICIENT_LIQUIDITY";
    ErrorCodes["UNAUTHORIZED"] = "UNAUTHORIZED";
    ErrorCodes["INVALID_PARAMETERS"] = "INVALID_PARAMETERS";
})(ErrorCodes || (exports.ErrorCodes = ErrorCodes = {}));
var EventType;
(function (EventType) {
    EventType["SWAP_EXECUTED"] = "SWAP_EXECUTED";
    EventType["TRANSFER_COMPLETED"] = "TRANSFER_COMPLETED";
    EventType["BALANCE_UPDATED"] = "BALANCE_UPDATED";
    EventType["STRATEGY_UPDATED"] = "STRATEGY_UPDATED";
    EventType["ERROR_OCCURRED"] = "ERROR_OCCURRED";
    EventType["CONNECTION_STATUS_CHANGED"] = "CONNECTION_STATUS_CHANGED";
})(EventType || (exports.EventType = EventType = {}));
// ========== Constants ==========
exports.SUPPORTED_NETWORKS = {
    mainnet: {
        name: 'SEI Mainnet',
        chainId: 'pacific-1',
        rpcEndpoint: 'https://rpc.sei.io',
        restEndpoint: 'https://rest.sei.io',
        explorer: 'https://seistream.app'
    },
    testnet: {
        name: 'SEI Testnet',
        chainId: 'atlantic-2',
        rpcEndpoint: 'https://rpc.atlantic-2.seinetwork.io',
        restEndpoint: 'https://rest.atlantic-2.seinetwork.io',
        faucetEndpoint: 'https://faucet.sei.io',
        explorer: 'https://seistream.app'
    },
    devnet: {
        name: 'SEI Devnet',
        chainId: 'arctic-1',
        rpcEndpoint: 'https://rpc.arctic-1.seinetwork.io',
        restEndpoint: 'https://rest.arctic-1.seinetwork.io',
        faucetEndpoint: 'https://faucet.sei.io',
        explorer: 'https://seistream.app'
    }
};
exports.DEFAULT_GAS_SETTINGS = {
    gasPrice: '0.1usei',
    gasLimit: 500000,
    gasAdjustment: 1.5
};
exports.FEE_TIERS = {
    LOWEST: 100,
    LOW: 500,
    MEDIUM: 3000,
    HIGH: 10000 // 1%
};
//# sourceMappingURL=index.js.map