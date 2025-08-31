# DuckChain Swap Service - API Testing Guide

## 🎯 Overview

Complete swap functionality has been implemented for DuckChain with iZiSwap integration. This guide shows how to test all swap features.

## 🚀 Quick Start

### 1. Test Swap via Enhanced Intent API

**Endpoint:** `POST /api/enhanced-intent/process`

**Example Request:**
```json
{
  "message": "Swap 100 WTON for DUCK",
  "userId": "68b2464f83132f5576e8ea8d",
  "sessionId": "session-123"
}
```

## 📊 Supported Swap Messages

### Basic Swaps
```
"Swap 100 WTON for DUCK"
"Exchange 50 DUCK to WTON" 
"Convert 25 WTON to DUCK"
"Trade my DUCK for WTON"
```

### Advanced Swaps
```
"Swap 100 WTON for DUCK with 1% slippage"
"Exchange 50 DUCK to WTON with 0.5% slippage tolerance"
"Convert all my WTON to DUCK"
```

## 🔄 Expected API Responses

### 1. Successful Swap
```json
{
  "success": true,
  "type": "swap",
  "data": {
    "status": "executed",
    "swapDetails": {
      "from": {
        "token": "WTON",
        "amount": 100
      },
      "to": {
        "token": "DUCK", 
        "estimatedAmount": "100000"
      },
      "slippage": 0.5
    },
    "transactionHash": "0x1234...5678",
    "balances": {
      "WTON": "900.123456",
      "DUCK": "100000.654321"
    },
    "message": "✅ Successfully swapped 100 WTON for DUCK!"
  },
  "timestamp": "2025-08-31T01:23:48.386Z"
}
```

### 2. Insufficient Balance
```json
{
  "success": false,
  "type": "swap",
  "data": {
    "status": "insufficient_funds",
    "currentBalance": 50.5,
    "requiredAmount": 100,
    "shortfall": 49.5,
    "token": "WTON",
    "walletAddress": "0xf73f096Fe9ff8B6229c97d954B5cD2430443D6fB",
    "swapDetails": {
      "fromToken": "WTON",
      "toToken": "DUCK",
      "amount": 100
    },
    "requiresFunding": true
  }
}
```

### 3. Token Approval Needed
```json
{
  "success": false,
  "type": "swap", 
  "data": {
    "status": "approval_needed",
    "token": "WTON",
    "amount": 100,
    "currentAllowance": "0",
    "requiresApproval": true
  }
}
```

### 4. Missing Arguments
```json
{
  "success": false,
  "type": "argumentRequest",
  "data": {
    "intent": {
      "type": "action",
      "subtype": "swap",
      "originalMessage": "swap some tokens",
      "missingArguments": ["fromToken", "toToken", "amount"]
    },
    "interactiveData": {
      "type": "argumentRequest",
      "message": "I need more information to complete this swap.",
      "components": [
        {
          "type": "select",
          "label": "From Token", 
          "options": [
            {"value": "WTON", "label": "WTON"},
            {"value": "DUCK", "label": "DUCK"}
          ]
        }
      ]
    }
  }
}
```

## 🧪 Testing Scenarios

### Test Case 1: Successful WTON to DUCK Swap
```bash
curl -X POST http://localhost:5001/api/enhanced-intent/process \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Swap 10 WTON for DUCK",
    "userId": "68b2464f83132f5576e8ea8d"
  }'
```

### Test Case 2: Insufficient Balance
```bash
curl -X POST http://localhost:5001/api/enhanced-intent/process \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Swap 1000000 WTON for DUCK", 
    "userId": "68b2464f83132f5576e8ea8d"
  }'
```

### Test Case 3: Missing Arguments
```bash
curl -X POST http://localhost:5001/api/enhanced-intent/process \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I want to swap some tokens",
    "userId": "68b2464f83132f5576e8ea8d"
  }'
```

### Test Case 4: Custom Slippage
```bash
curl -X POST http://localhost:5001/api/enhanced-intent/process \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Swap 50 DUCK to WTON with 2% slippage",
    "userId": "68b2464f83132f5576e8ea8d"
  }'
```

## 🏗️ Architecture Overview

### Backend Services
```
1. DuckSwapService (/services/duckSwapService.js)
   - Handles iZiSwap contract interactions
   - Token balance checking
   - Swap execution with ethers v6
   
2. EnhancedSwapIntentService (/services/enhancedSwapIntentService.js) 
   - Natural language processing for swaps
   - Argument extraction and validation
   - Balance and approval checking

3. PromptRouterController (/controllers/promptRouterController.js)
   - Routes swap actions to appropriate services
   - Integrates with enhanced-intent processing
```

### Frontend Components  
```
1. SwapSuccessModal.tsx
   - Beautiful swap completion UI
   - Animated token exchange visualization
   - Transaction details and balances

2. SwapIntegrationExample.tsx
   - Complete swap demo with all features
   - Handles all response types
   - Shows best practices

3. InsufficientBalanceModal.tsx (reused)
   - QR code funding for insufficient balance
   - Real-time balance monitoring
```

## 🔧 Contract Integration

### iZiSwap Router Contract
- **Address:** `0x3EF68D3f7664b2805D4E88381b64868a56f88bC4`
- **Functions Used:**
  - `swapX2Y()` - Token X to Token Y swaps
  - `swapY2X()` - Token Y to Token X swaps
  - `swapAmount()` - Multi-hop swaps
  - `swapDesire()` - Exact output swaps

### Token Addresses
```
WTON: 0x7F9308E8d724e724EC31395f3af52e0593BB2e3f
DUCK: 0xdA65892eA771d3268610337E9964D916028B7dAD
```

### Fee Tiers
```
LOW: 500 (0.05%)
MEDIUM: 3000 (0.3%) - Default
HIGH: 10000 (1%)
```

## 🎨 Mobile App Integration

### Basic Integration in App.tsx
```typescript
import SwapIntegrationExample from './SwapIntegrationExample';

// Add to your component:
<SwapIntegrationExample userId="68b2464f83132f5576e8ea8d" />
```

### Handle Swap Results
```typescript
// In your existing API call handling:
const result = await ApiCalls.processEnhancedIntent(message, userId);

if (result.type === 'swap' && result.data.status === 'executed') {
  setSwapSuccessData(result);
  setShowSwapSuccess(true);
} else if (result.data?.status === 'insufficient_funds') {
  setInsufficientFundsData(result.data);
  setShowInsufficientBalance(true);
}
```

## 🚦 Status Codes

### Swap Statuses
- `executed` - Swap completed successfully
- `insufficient_funds` - User needs more tokens
- `approval_needed` - Token approval required  
- `execution_failed` - Swap transaction failed
- `processing_failed` - General processing error

### Transfer Integration
- All existing transfer functionality remains unchanged
- Swaps and transfers work seamlessly together
- Same insufficient balance handling for both

## 🐛 Troubleshooting

### Common Issues

1. **"Unsupported token" Error**
   - Check token symbol is WTON, DUCK, or TON
   - Verify contract addresses are correct

2. **"Insufficient funds" Always Shows**
   - Check user has active DuckChain agent
   - Verify wallet has actual token balance
   - Ensure RPC endpoint is working

3. **"Approval needed" Loop**
   - Check approval transaction succeeded
   - Verify contract address in approval

4. **Gas Estimation Fails**
   - Check pool exists for token pair
   - Verify slippage is reasonable (0.1% - 50%)
   - Ensure enough native TON for gas

### Debug Steps
```bash
# Check agent exists
curl -X GET http://localhost:5001/api/agents/68b2464f83132f5576e8ea8d

# Check balance
curl -X POST http://localhost:5001/api/wallet/balance \
  -d '{"address": "0x...", "token": "WTON"}'

# Test swap service directly
node -e "
const swap = require('./services/duckSwapService');
swap.getTokenBalance('0x...', 'WTON').then(console.log);
"
```

## ✅ Testing Checklist

- [ ] WTON → DUCK swap works
- [ ] DUCK → WTON swap works  
- [ ] Insufficient balance shows QR modal
- [ ] Token approval flow works
- [ ] Success modal displays correctly
- [ ] Transaction hashes are valid
- [ ] Balance updates after swap
- [ ] Slippage tolerance respected
- [ ] Gas estimation reasonable
- [ ] Error handling works properly

## 🚀 Production Deployment

### Environment Variables
```bash
# Add to .env
DUCK_RPC_URL=https://rpc.duckchain.io
SWAP_ROUTER_ADDRESS=0x3EF68D3f7664b2805D4E88381b64868a56f88bC4
WTON_ADDRESS=0x7F9308E8d724e724EC31395f3af52e0593BB2e3f  
DUCK_ADDRESS=0xdA65892eA771d3268610337E9964D916028B7dAD
```

### Pre-deployment Tests
1. Test with real DuckChain tokens
2. Verify contract addresses on DuckChain explorer
3. Test gas estimation with current network fees
4. Validate all UI components render correctly
5. Test error scenarios thoroughly

The swap functionality is now fully integrated and ready for production! 🎉