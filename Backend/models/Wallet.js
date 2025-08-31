const mongoose = require('mongoose');
const CryptoJS = require('crypto-js');

const walletSchema = new mongoose.Schema({
  // Owner can be either an agent or a user
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  ownerType: {
    type: String,
    enum: ['agent', 'user'],
    required: true
  },
  // Legacy fields for backward compatibility
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    default: null
  },
  agentName: {
    type: String,
    default: null
  },
  // User specific fields
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  userName: {
    type: String,
    default: null
  },
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  encryptedPrivateKey: {
    type: String,
    required: true
  },
  walletClass: {
    type: String,
    enum: ['trading', 'staking', 'defi', 'memecoin', 'arbitrage'],
    default: 'trading'
  },
  network: {
    type: String,
    default: 'sei',
    enum: ['sei', 'ethereum', 'polygon', 'bsc', 'arbitrum']
  },
  chainId: {
    type: Number,
    default: 1329 // SEI mainnet
  },
  isSmartContractEnabled: {
    type: Boolean,
    default: true // All SEI EVM wallets can interact with smart contracts
  },
  balance: {
    native: {
      type: Number,
      default: 0
    },
    tokens: [{
      symbol: String,
      contractAddress: String, // SEI EVM token contract address
      amount: Number,
      decimals: {
        type: Number,
        default: 18
      },
      usdValue: Number,
      lastUpdated: {
        type: Date,
        default: Date.now
      }
    }]
  },
  portfolioValue: {
    current: {
      type: Number,
      default: 0
    },
    initial: {
      type: Number,
      default: 0
    },
    peak: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  tradingHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    action: {
      type: String,
      enum: ['BUY', 'SELL', 'SWAP', 'STAKE', 'UNSTAKE', 'FARM', 'HARVEST', 'TRANSFER']
    },
    tokenPair: String,
    amount: Number,
    price: Number,
    txHash: String,
    contractAddress: String, // Smart contract used for the transaction
    gasUsed: String, // Gas used for the transaction
    feeAmount: Number, // Fee charged by AgenticRouter
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    }
  }],
  riskMetrics: {
    maxDrawdown: {
      type: Number,
      default: 0
    },
    volatility: {
      type: Number,
      default: 0
    },
    sharpeRatio: {
      type: Number,
      default: 0
    },
    winRate: {
      type: Number,
      default: 0
    }
  },
  seiMetadata: {
    isAgentRegistered: {
      type: Boolean,
      default: false // Whether this wallet is registered with AgenticRouter contract
    },
    registrationTxHash: String, // Transaction hash of agent registration
    agenticRouterAddress: String, // Address of the AgenticRouter contract
    lastNetworkSync: {
      type: Date,
      default: null // Last time wallet was synced with SEI network
    },
    totalGasUsed: {
      type: String,
      default: '0' // Total gas used by this wallet
    },
    totalFeesGenerated: {
      type: Number,
      default: 0 // Total fees generated for the protocol
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Validation and setup before saving
walletSchema.pre('save', function(next) {
  // Set legacy fields based on owner type for backward compatibility
  if (this.ownerType === 'agent') {
    this.agentId = this.ownerId;
    this.agentName = this.agentName || 'Agent Wallet';
    this.userId = null;
    this.userName = null;
  } else if (this.ownerType === 'user') {
    this.userId = this.ownerId;
    this.userName = this.userName || 'User Wallet';
    this.agentId = null;
    this.agentName = null;
  }

  // Encrypt private key before saving
  if (this.isModified('encryptedPrivateKey') && !this.encryptedPrivateKey.startsWith('encrypted:')) {
    const encryptionKey = process.env.WALLET_ENCRYPTION_KEY || 'default-key-change-in-production';
    this.encryptedPrivateKey = 'encrypted:' + CryptoJS.AES.encrypt(this.encryptedPrivateKey, encryptionKey).toString();
  }
  this.updatedAt = Date.now();
  next();
});

// Method to decrypt private key
walletSchema.methods.getPrivateKey = function() {
  const encryptionKey = process.env.WALLET_ENCRYPTION_KEY || 'default-key-change-in-production';
  if (this.encryptedPrivateKey.startsWith('encrypted:')) {
    const encryptedData = this.encryptedPrivateKey.replace('encrypted:', '');
    const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
  return this.encryptedPrivateKey; // Fallback for unencrypted (shouldn't happen)
};

// Method to update portfolio value
walletSchema.methods.updatePortfolioValue = function(newValue) {
  this.portfolioValue.current = newValue;
  if (newValue > this.portfolioValue.peak) {
    this.portfolioValue.peak = newValue;
  }
  this.portfolioValue.lastUpdated = new Date();
  this.markModified('portfolioValue');
};

// Method to add trading history with SEI EVM details
walletSchema.methods.addTrade = function(tradeData) {
  // Add SEI EVM specific fields if not present
  const trade = {
    ...tradeData,
    contractAddress: tradeData.contractAddress || null,
    gasUsed: tradeData.gasUsed || '0',
    feeAmount: tradeData.feeAmount || 0
  };
  
  this.tradingHistory.push(trade);
  // Keep only last 100 trades to prevent bloat
  if (this.tradingHistory.length > 100) {
    this.tradingHistory = this.tradingHistory.slice(-100);
  }
  this.markModified('tradingHistory');
  
  // Update SEI metadata
  if (trade.gasUsed && trade.gasUsed !== '0') {
    const currentGas = BigInt(this.seiMetadata.totalGasUsed || '0');
    const newGas = BigInt(trade.gasUsed);
    this.seiMetadata.totalGasUsed = (currentGas + newGas).toString();
  }
  
  if (trade.feeAmount && trade.feeAmount > 0) {
    this.seiMetadata.totalFeesGenerated += trade.feeAmount;
  }
  
  this.markModified('seiMetadata');
};

// Method to calculate portfolio performance
walletSchema.methods.calculatePerformance = function() {
  const { current, initial } = this.portfolioValue;
  if (initial === 0) return { roi: 0, pnl: 0 };
  
  const roi = ((current - initial) / initial) * 100;
  const pnl = current - initial;
  
  return { roi, pnl };
};

// Method to update agent registration status
walletSchema.methods.updateAgentRegistration = function(registrationTxHash, agenticRouterAddress) {
  this.seiMetadata.isAgentRegistered = true;
  this.seiMetadata.registrationTxHash = registrationTxHash;
  this.seiMetadata.agenticRouterAddress = agenticRouterAddress;
  this.markModified('seiMetadata');
};

// Method to update network sync status
walletSchema.methods.updateNetworkSync = function() {
  this.seiMetadata.lastNetworkSync = new Date();
  this.markModified('seiMetadata');
};

// Method to get SEI network status
walletSchema.methods.getSeiStatus = function() {
  return {
    isRegistered: this.seiMetadata.isAgentRegistered,
    network: this.network,
    chainId: this.chainId,
    smartContractEnabled: this.isSmartContractEnabled,
    lastSync: this.seiMetadata.lastNetworkSync,
    totalGasUsed: this.seiMetadata.totalGasUsed,
    totalFeesGenerated: this.seiMetadata.totalFeesGenerated
  };
};

// Method to get wallet class based on strategy
walletSchema.statics.getWalletClass = function(strategy) {
  const classMap = {
    'DCA': 'trading',
    'hodl': 'trading',
    'momentum_trading': 'trading',
    'swing_trading': 'trading',
    'scalping': 'trading',
    'spot_trading': 'trading',
    'futures_trading': 'trading',
    'memecoin': 'memecoin',
    'yield_farming': 'defi',
    'arbitrage': 'arbitrage',
    'custom': 'trading'
  };
  return classMap[strategy] || 'trading';
};

// Static method to create wallet for user
walletSchema.statics.createForUser = function(userId, userName, walletData, initialBalance = 0) {
  return new this({
    ownerId: userId,
    ownerType: 'user',
    userId: userId,
    userName: userName,
    walletAddress: walletData.address,
    encryptedPrivateKey: walletData.privateKey,
    walletClass: 'trading',
    network: 'sei',
    portfolioValue: {
      initial: initialBalance,
      current: initialBalance,
      peak: initialBalance
    }
  });
};

// Static method to create wallet for agent (legacy support)
walletSchema.statics.createForAgent = function(agentId, agentName, walletData, initialBalance = 0) {
  return new this({
    ownerId: agentId,
    ownerType: 'agent',
    agentId: agentId,
    agentName: agentName,
    walletAddress: walletData.address,
    encryptedPrivateKey: walletData.privateKey,
    walletClass: this.getWalletClass('trading'),
    network: 'sei',
    portfolioValue: {
      initial: initialBalance,
      current: initialBalance,
      peak: initialBalance
    }
  });
};

module.exports = mongoose.model('Wallet', walletSchema); 