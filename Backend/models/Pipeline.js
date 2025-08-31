const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  description: String,
  config: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

const ActionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  description: String,
  config: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  position: {
    x: Number,
    y: Number
  }
});

const ConnectionSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  type: { type: String, default: 'default' }
});

const PipelineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'paused', 'error'],
    default: 'active'
  },
  events: [EventSchema],
  actions: [ActionSchema],
  connections: [ConnectionSchema],
  lastExecuted: {
    type: Date,
    default: null
  },
  executionCount: {
    type: Number,
    default: 0
  },
  metadata: {
    agendaJobId: String,
    nextExecution: Date,
    executionHistory: [{
      timestamp: Date,
      status: String,
      result: mongoose.Schema.Types.Mixed,
      error: String
    }]
  }
}, {
  timestamps: true
});

// Index for efficient queries
PipelineSchema.index({ userId: 1, status: 1 });
PipelineSchema.index({ 'metadata.agendaJobId': 1 });

module.exports = mongoose.model('Pipeline', PipelineSchema);