const duckAgentService = require('../services/duckAgentService');
const Agent = require('../models/Agent');
const User = require('../models/User');

/**
 * Create a new DUCK agent
 * @route POST /api/agents/duck
 * @access Public (should be protected in production)
 */
exports.createDuckAgent = async (req, res) => {
  try {
    const {
      name,
      description,
      email,
      agentType = 'general',
      configuration = {}
    } = req.body;

    console.log(`🦆 Creating DUCK agent: ${name} for email: ${email}`);

    // Validate required fields - email is required for DUCK agents
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Find existing user or create new one based on email
    let user;
    
    console.log(`🔍 Looking for user by email: ${email}`);
    user = await User.findOne({ email: email });
    
    if (!user) {
      // Create new user with email
      console.log(`👤 Creating new user for email: ${email}`);
      user = await User.create({
        name: email.split('@')[0],
        email: email,
        userType: 'human',
        isActive: true,
        createdAt: new Date()
      });
      console.log(`✅ User created with ID: ${user._id}`);
    } else {
      console.log(`✅ Found existing user: ${user._id}`);
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
    const result = await duckAgentService.createAgent({
      name,
      description,
      userId: actualUserId,
      agentType,
      configuration
    });

    // Update user with wallet address - ensure both fields are set
    if (result.address) {
      const updateResult = await User.findByIdAndUpdate(user._id, {
        duckAddress: result.address,
        walletAddress: result.address, // For compatibility
        lastUpdated: new Date()
      }, { new: true }); // Return updated document
      
      console.log(`💼 Updated user ${user._id} with DUCK wallet: ${result.address}`);
      console.log(`✅ User duckAddress set: ${updateResult.duckAddress}`);
      console.log(`✅ User walletAddress set: ${updateResult.walletAddress}`);
    }

    res.status(201).json({
      success: true,
      message: 'DUCK agent created successfully',
      data: {
        agent: result.agent,
        address: result.address,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          duckAddress: result.address,
          walletAddress: result.address
        }
      }
    });

  } catch (error) {
    console.error('❌ Error creating DUCK agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create DUCK agent',
      error: error.message
    });
  }
};

/**
 * Get all DUCK agents for a user
 * @route GET /api/agents/duck
 * @access Public
 */
exports.getDuckAgents = async (req, res) => {
  try {
    const { userId } = req.query;

    let agents;
    if (userId) {
      agents = await Agent.find({ 
        userId,
        duckAddress: { $exists: true },
        isActive: true 
      })
      .sort({ createdAt: -1 })
      .select('-duckPrivateKey -__v')
      .populate('userId', 'name email');
    } else {
      agents = await Agent.find({ 
        duckAddress: { $exists: true },
        isActive: true 
      })
      .sort({ createdAt: -1 })
      .select('-duckPrivateKey -__v')
      .populate('userId', 'name email');
    }

    res.json({
      success: true,
      count: agents.length,
      data: agents
    });

  } catch (error) {
    console.error('❌ Error fetching DUCK agents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch DUCK agents',
      error: error.message
    });
  }
};

/**
 * Get a single DUCK agent by ID
 * @route GET /api/agents/duck/:id
 * @access Public
 */
exports.getDuckAgent = async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id)
      .select('-duckPrivateKey -__v')
      .populate('userId', 'name email');

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    if (!agent.duckAddress) {
      return res.status(400).json({
        success: false,
        message: 'Agent is not a DUCK agent'
      });
    }

    res.json({
      success: true,
      data: agent
    });

  } catch (error) {
    console.error('❌ Error fetching DUCK agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch DUCK agent',
      error: error.message
    });
  }
};

/**
 * Execute a token swap
 * @route POST /api/agents/duck/:id/swap
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

    console.log(`🔄 Swap request for DUCK agent ${agentId}: ${amount} ${fromToken} → ${toToken}`);

    // Validate required fields
    if (!fromToken || !toToken || !amount) {
      return res.status(400).json({
        success: false,
        message: 'fromToken, toToken, and amount are required'
      });
    }

    // Verify agent exists and is a DUCK agent
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    if (!agent.duckAddress) {
      return res.status(400).json({
        success: false,
        message: 'Agent is not a DUCK agent'
      });
    }

    // Execute the swap
    const result = await duckAgentService.executeSwap(agentId, {
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
 * @route POST /api/agents/duck/:id/transfer
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

    console.log(`💸 Transfer request for DUCK agent ${agentId}: ${amount} ${token} → ${to}`);

    // Validate required fields
    if (!token || !to || !amount) {
      return res.status(400).json({
        success: false,
        message: 'token, to, and amount are required'
      });
    }

    // Verify agent exists and is a DUCK agent
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    if (!agent.duckAddress) {
      return res.status(400).json({
        success: false,
        message: 'Agent is not a DUCK agent'
      });
    }

    // Execute the transfer
    const result = await duckAgentService.executeTransfer(agentId, {
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
 * Get agent balance using email
 * @route GET /api/agents/duck/balance?email=user@example.com
 * @access Public
 */
exports.getAgentBalance = async (req, res) => {
  try {
    const { email } = req.query;

    console.log(`💰 Balance request for DUCK agent with email: ${email}`);

    // Validate email parameter
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email parameter is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email'
      });
    }
    console.log(`✅ Found user: ${user._id}`);
    // Find DUCK agent for this user
    const agent = await Agent.findOne({ 
      userId: user._id,
      duckAddress: { $exists: true },
      isActive: true 
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'No active DUCK agent found for this user'
      });
    }

    if (!agent.duckAddress) {
      return res.status(400).json({
        success: false,
        message: 'Agent is not a DUCK agent'
      });
    }

    // Get the balance
    const result = await duckAgentService.getAgentBalance(agent._id);

    res.json({
      success: true,
      message: 'Balance retrieved successfully',
      data: {
        ...result,
        agent: {
          _id: agent._id,
          name: agent.name,
          description: agent.description,
          duckAddress: agent.duckAddress
        },
        user: {
          _id: user._id,
          name: user.name,
          email: user.email
        }
      }
    });

  } catch (error) {
    console.error('❌ Error getting DUCK agent balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get DUCK agent balance',
      error: error.message
    });
  }
};

/**
 * Get supported tokens
 * @route GET /api/agents/duck/tokens
 * @access Public
 */
exports.getSupportedTokens = async (req, res) => {
  try {
    const tokens = duckAgentService.getSupportedTokens();

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
 * Update a DUCK agent
 * @route PUT /api/agents/duck/:id
 * @access Public
 */
exports.updateDuckAgent = async (req, res) => {
  try {
    const { name, description, configuration } = req.body;
    
    let agent = await Agent.findById(req.params.id);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    if (!agent.duckAddress) {
      return res.status(400).json({
        success: false,
        message: 'Agent is not a DUCK agent'
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
      duckAddress: agent.duckAddress,
      configuration: agent.configuration,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt
    };
    
    res.json({
      success: true,
      data: sanitizedAgent
    });

  } catch (error) {
    console.error('❌ Error updating DUCK agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update DUCK agent',
      error: error.message
    });
  }
};

/**
 * Delete a DUCK agent
 * @route DELETE /api/agents/duck/:id
 * @access Public
 */
exports.deleteDuckAgent = async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    if (!agent.duckAddress) {
      return res.status(400).json({
        success: false,
        message: 'Agent is not a DUCK agent'
      });
    }

    // Disconnect agent from service cache
    await duckAgentService.disconnectAgent(req.params.id);
    
    // Soft delete - mark as inactive
    agent.isActive = false;
    agent.updatedAt = Date.now();
    await agent.save();
    
    res.json({
      success: true,
      message: 'DUCK agent deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting DUCK agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete DUCK agent',
      error: error.message
    });
  }
};