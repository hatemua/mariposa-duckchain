const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500,
    default: ''
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  seiAddress: {
    type: String,
    index: true,
    sparse: true
  },
  seiPrivateKey: {
    type: String,
    select: false // Don't return this field by default for security
  },
  duckAddress: {
    type: String,
    index: true,
    sparse: true
  },
  duckPrivateKey: {
    type: String,
    select: false // Don't return this field by default for security
  },
  agentUuid: {
    type: String,
    unique: true,
    sparse: true
  },
  agentType: {
    type: String,
    enum: ['general', 'trading', 'defi', 'nft'],
    default: 'general'
  },
  configuration: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastInteraction: {
    type: Date,
    default: Date.now
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

// Index for efficient querying
agentSchema.index({ createdAt: -1 });

// Update the updatedAt field before saving
agentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to get agent information
agentSchema.methods.getInfo = function() {
  return {
    name: this.name,
    description: this.description,
    seiAddress: this.seiAddress,
    duckAddress: this.duckAddress,
    agentType: this.agentType,
    configuration: this.configuration,
    createdAt: this.createdAt
  };
};

// Static method to find all agents
agentSchema.statics.getAllAgents = async function() {
  return await this.find()
    .sort({ createdAt: -1 })
    .select('-__v -seiPrivateKey -duckPrivateKey');
};

module.exports = mongoose.model('Agent', agentSchema); 