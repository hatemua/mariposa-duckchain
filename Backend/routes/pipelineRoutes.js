const express = require('express');
const router = express.Router();
const Pipeline = require('../models/Pipeline');
const { protect } = require('../middleware/auth');
const pipelineExecutionService = require('../services/pipelineExecutionService');

// Create a new pipeline
router.post('/', async (req, res) => {  // Removed protect middleware for testing
  try {
    const {
      name,
      events,
      actions,
      connections,
      status = 'active',
      userId
    } = req.body;

    // For testing: use provided userId or default test user
    const finalUserId = userId || '507f1f77bcf86cd799439011';  // Default ObjectId for testing

    const pipeline = new Pipeline({
      name,
      userId: finalUserId,
      status,
      events,
      actions,
      connections
    });

    const savedPipeline = await pipeline.save();
    
    res.status(201).json({
      success: true,
      data: savedPipeline,
      message: 'Pipeline created successfully'
    });
  } catch (error) {
    console.error('Error creating pipeline:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating pipeline',
      error: error.message
    });
  }
});

// Schedule pipeline execution
router.post('/schedule', async (req, res) => {  // Removed protect middleware for testing
  try {
    const { pipelineId, pipeline } = req.body;

    // Schedule pipeline with Agenda
    const jobId = await pipelineExecutionService.schedulePipeline(pipelineId, pipeline);
    
    // Update pipeline with job ID
    await Pipeline.findByIdAndUpdate(pipelineId, {
      'metadata.agendaJobId': jobId,
      'metadata.nextExecution': new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Pipeline scheduled successfully',
      jobId
    });
  } catch (error) {
    console.error('Error scheduling pipeline:', error);
    res.status(500).json({
      success: false,
      message: 'Error scheduling pipeline',
      error: error.message
    });
  }
});

// Get user's pipelines
router.get('/', async (req, res) => {  // Removed protect middleware for testing
  try {
    // For testing: get all pipelines
    const pipelines = await Pipeline.find({})
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: pipelines,
      count: pipelines.length
    });
  } catch (error) {
    console.error('Error fetching pipelines:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pipelines',
      error: error.message
    });
  }
});

// Get specific pipeline
router.get('/:id', protect, async (req, res) => {
  try {
    const pipeline = await Pipeline.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        message: 'Pipeline not found'
      });
    }

    res.status(200).json({
      success: true,
      data: pipeline
    });
  } catch (error) {
    console.error('Error fetching pipeline:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pipeline',
      error: error.message
    });
  }
});

// Update pipeline status
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const pipeline = await Pipeline.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { status },
      { new: true }
    );

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        message: 'Pipeline not found'
      });
    }

    // Handle agenda job based on status
    if (status === 'paused' && pipeline.metadata.agendaJobId) {
      await pipelineExecutionService.pausePipeline(pipeline.metadata.agendaJobId);
    } else if (status === 'active' && pipeline.metadata.agendaJobId) {
      await pipelineExecutionService.resumePipeline(pipeline.metadata.agendaJobId);
    }

    res.status(200).json({
      success: true,
      data: pipeline,
      message: 'Pipeline status updated successfully'
    });
  } catch (error) {
    console.error('Error updating pipeline status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating pipeline status',
      error: error.message
    });
  }
});

// Delete pipeline
router.delete('/:id', protect, async (req, res) => {
  try {
    const pipeline = await Pipeline.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        message: 'Pipeline not found'
      });
    }

    // Cancel agenda job if exists
    if (pipeline.metadata.agendaJobId) {
      await pipelineExecutionService.cancelPipeline(pipeline.metadata.agendaJobId);
    }

    res.status(200).json({
      success: true,
      message: 'Pipeline deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting pipeline:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting pipeline',
      error: error.message
    });
  }
});

module.exports = router;