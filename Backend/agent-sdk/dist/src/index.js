"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Utils = exports.SimpleAgent = void 0;
// Export simplified Agent class (stable, no complex dependencies)
var SimpleAgent_1 = require("./SimpleAgent");
Object.defineProperty(exports, "SimpleAgent", { enumerable: true, get: function () { return SimpleAgent_1.SimpleAgent; } });
Object.defineProperty(exports, "Utils", { enumerable: true, get: function () { return SimpleAgent_1.Utils; } });
// Export types
__exportStar(require("../types"), exports);
// Import for default export
const SimpleAgent_2 = require("./SimpleAgent");
// Main entry point for the SDK
exports.default = SimpleAgent_2.SimpleAgent;
//# sourceMappingURL=index.js.map