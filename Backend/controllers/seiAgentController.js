const seiAgentService = require('../services/seiAgentService');
const Agent = require('../models/Agent');
const User = require('../models/User');

/**
 * Create a new SEI agent
 * @route POST /api/agents/sei
 * @access Public (should be protected in production)
 */
exports.createSeiAgent = async (req, res) => {
  try {
    const {
      name,
      description,
      userId,
      agentType = 'general',
      configuration = {}
    } = req.body;

    console.log(`🚀 Creating SEI agent: ${name} for user: ${userId}`);

    // Validate required fields
    if (!name || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Name and userId are required'
      });
    }

    // Find existing user or create if using email as userId (for OTP flow)
    let user;
    
    if (userId.includes('@')) {
      // This is an email address from OTP verification
      console.log(`🔍 Looking for user by email: ${userId}`);
      user = await User.findOne({ email: userId });
      
      if (!user) {
        // Create new user with email
        console.log(`👤 Creating new user for email: ${userId}`);
        user = await User.create({
          name: userId.split('@')[0],
          email: userId,
          userType: 'human',
          isActive: true,
          createdAt: new Date()
        });
        console.log(`✅ User created with ID: ${user._id}`);
      } else {
        console.log(`✅ Found existing user: ${user._id}`);
      }
    } else {
      // This is a proper MongoDB ObjectId
      user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
    }

    // Use the actual user._id for agent creation
    const actualUserId = user._id.toString();

    // Check if agent name already exists for this user
    const existingAgent = await Agent.findOne({ 
      name, 
      userId: actualUserId, 
      isActive: true 
    });
    if (existingAgent) {
      return res.status(400).json({
        success: false,
        message: 'Agent with this name already exists for this user'
      });
    }

    // Create the agent
    const result = await seiAgentService.createAgent({
      name,
      description,
      userId: actualUserId,
      agentType,
      configuration
    });

    // Update user with wallet address - ensure both fields are set
    if (result.address) {
      const updateResult = await User.findByIdAndUpdate(user._id, {
        seiAddress: result.address,
        walletAddress: result.address, // For compatibility
        lastUpdated: new Date()
      }, { new: true }); // Return updated document
      
      console.log(`💼 Updated user ${user._id} with SEI wallet: ${result.address}`);
      console.log(`✅ User seiAddress set: ${updateResult.seiAddress}`);
      console.log(`✅ User walletAddress set: ${updateResult.walletAddress}`);
    }

    res.status(201).json({
      success: true,
      message: 'SEI agent created successfully',
      data: {
        agent: result.agent,
        address: result.address,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          seiAddress: result.address,
          walletAddress: result.address
        }
      }
    });

  } catch (error) {
    console.error('❌ Error creating SEI agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create SEI agent',
      error: error.message
    });
  }
};

/**
 * Get all SEI agents for a user
 * @route GET /api/agents/sei
 * @access Public
 */
exports.getSeiAgents = async (req, res) => {
  try {
    const { userId } = req.query;

    let agents;
    if (userId) {
      agents = await Agent.find({ 
        userId,
        seiAddress: { $exists: true },
        isActive: true 
      })
      .sort({ createdAt: -1 })
      .select('-seiPrivateKey -__v')
      .populate('userId', 'name email');
    } else {
      agents = await Agent.find({ 
        seiAddress: { $exists: true },
        isActive: true 
      })
      .sort({ createdAt: -1 })
      .select('-seiPrivateKey -__v')
      .populate('userId', 'name email');
    }

    res.json({
      success: true,
      count: agents.length,
      data: agents
    });

  } catch (error) {
    console.error('❌ Error fetching SEI agents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SEI agents',
      error: error.message
    });
  }
};

/**
 * Get a single SEI agent by ID
 * @route GET /api/agents/sei/:id
 * @access Public
 */
exports.getSeiAgent = async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id)
      .select('-seiPrivateKey -__v')
      .populate('userId', 'name email');

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    if (!agent.seiAddress) {
      return res.status(400).json({
        success: false,
        message: 'Agent is not a SEI agent'
      });
    }

    res.json({
      success: true,
      data: agent
    });

  } catch (error) {
    console.error('❌ Error fetching SEI agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SEI agent',
      error: error.message
    });
  }
};

/**
 * Execute a token swap
 * @route POST /api/agents/sei/:id/swap
 * @access Public
 */
exports.executeSwap = async (req, res) => {
  try {
    const { id: agentId } = req.params;
    const {
      fromToken,
      toToken,
      amount,
      slippageTolerance = 15
    } = req.body;

    console.log(`🔄 Swap request for agent ${agentId}: ${amount} ${fromToken} → ${toToken}`);

    // Validate required fields
    if (!fromToken || !toToken || !amount) {
      return res.status(400).json({
        success: false,
        message: 'fromToken, toToken, and amount are required'
      });
    }

    // Verify agent exists and is a SEI agent
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    if (!agent.seiAddress) {
      return res.status(400).json({
        success: false,
        message: 'Agent is not a SEI agent'
      });
    }

    // Execute the swap
    const result = await seiAgentService.executeSwap(agentId, {
      fromToken,
      toToken,
      amount: parseFloat(amount),
      slippageTolerance
    });

    res.json({
      success: true,
      message: 'Swap executed successfully',
      data: result
    });

  } catch (error) {
    console.error('❌ Error executing swap:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute swap',
      error: error.message
    });
  }
};

/**
 * Execute a token transfer
 * @route POST /api/agents/sei/:id/transfer
 * @access Public
 */
exports.executeTransfer = async (req, res) => {
  try {
    const { id: agentId } = req.params;
    const {
      token,
      to,
      amount
    } = req.body;

    console.log(`💸 Transfer request for agent ${agentId}: ${amount} ${token} → ${to}`);

    // Validate required fields
    if (!token || !to || !amount) {
      return res.status(400).json({
        success: false,
        message: 'token, to, and amount are required'
      });
    }

    // Verify agent exists and is a SEI agent
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    if (!agent.seiAddress) {
      return res.status(400).json({
        success: false,
        message: 'Agent is not a SEI agent'
      });
    }

    // Execute the transfer
    const result = await seiAgentService.executeTransfer(agentId, {
      token,
      to,
      amount: parseFloat(amount)
    });

    res.json({
      success: true,
      message: 'Transfer executed successfully',
      data: result
    });

  } catch (error) {
    console.error('❌ Error executing transfer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute transfer',
      error: error.message
    });
  }
};

/**
 * Get agent balance
 * @route GET /api/agents/sei/:id/balance
 * @access Public
 */
exports.getAgentBalance = async (req, res) => {
  try {
    const { id: agentId } = req.params;

    console.log(`💰 Balance request for agent ${agentId}`);

    // Verify agent exists and is a SEI agent
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    if (!agent.seiAddress) {
      return res.status(400).json({
        success: false,
        message: 'Agent is not a SEI agent'
      });
    }

    // Get the balance
    const result = await seiAgentService.getAgentBalance(agentId);

    res.json({
      success: true,
      message: 'Balance retrieved successfully',
      data: result
    });

  } catch (error) {
    console.error('❌ Error getting agent balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get agent balance',
      error: error.message
    });
  }
};

/**
 * Get supported tokens
 * @route GET /api/agents/sei/tokens
 * @access Public
 */
exports.getSupportedTokens = async (req, res) => {
  try {
    const tokens = seiAgentService.getSupportedTokens();

    res.json({
      success: true,
      data: tokens
    });

  } catch (error) {
    console.error('❌ Error getting supported tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get supported tokens',
      error: error.message
    });
  }
};

/**
 * Update a SEI agent
 * @route PUT /api/agents/sei/:id
 * @access Public
 */
exports.updateSeiAgent = async (req, res) => {
  try {
    const { name, description, configuration } = req.body;
    
    let agent = await Agent.findById(req.params.id);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    if (!agent.seiAddress) {
      return res.status(400).json({
        success: false,
        message: 'Agent is not a SEI agent'
      });
    }
    
    // Update fields
    if (name) agent.name = name;
    if (description !== undefined) agent.description = description;
    if (configuration) {
      agent.configuration = { ...agent.configuration, ...configuration };
    }
    
    agent.updatedAt = Date.now();
    
    await agent.save();
    
    // Return sanitized agent data
    const sanitizedAgent = {
      _id: agent._id,
      name: agent.name,
      description: agent.description,
      userId: agent.userId,
      seiAddress: agent.seiAddress,
      configuration: agent.configuration,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt
    };
    
    res.json({
      success: true,
      data: sanitizedAgent
    });

  } catch (error) {
    console.error('❌ Error updating SEI agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update SEI agent',
      error: error.message
    });
  }
};

/**
 * Delete a SEI agent
 * @route DELETE /api/agents/sei/:id
 * @access Public
 */
exports.deleteSeiAgent = async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    if (!agent.seiAddress) {
      return res.status(400).json({
        success: false,
        message: 'Agent is not a SEI agent'
      });
    }

    // Disconnect agent from service cache
    await seiAgentService.disconnectAgent(req.params.id);
    
    // Soft delete - mark as inactive
    agent.isActive = false;
    agent.updatedAt = Date.now();
    await agent.save();
    
    res.json({
      success: true,
      message: 'SEI agent deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting SEI agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete SEI agent',
      error: error.message
    });
  }
};
