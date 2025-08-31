const { validationResult } = require('express-validator');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const WalletService = require('../services/walletService');

// Helper function to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password
    });

    // Create token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Create token
    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Public (should be protected in production)
const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Public (should be protected in production)
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Public (should be protected in production)
const updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Public (should be protected in production)
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Register user with wallet
// @route   POST /api/users/register-with-wallet
// @access  Public
// Create user with auto-generated SEI EVM wallet
const createUserWithSeiWallet = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { 
      name, 
      email, 
      userType = 'human',
      password = null,
      preferences = {},
      initialBalance = 0 // SEI (virtual balance for tracking)
    } = req.body;

    console.log('\n👤 CREATING USER WITH AUTO-GENERATED SEI EVM WALLET');
    console.log('═'.repeat(60));
    console.log('📧 Email:', email);
    console.log('👤 Name:', name);
    console.log('🔗 User Type:', userType);
    console.log('💰 Initial Balance:', initialBalance, 'SEI');

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    console.log('✅ USER VALIDATION PASSED');

    // Create SEI EVM wallet
    console.log('🔄 Creating SEI EVM wallet...');
    const walletData = await WalletService.generateWallet({
      name: name,
      primaryStrategy: preferences.defaultStrategy || 'DCA'
    });

    console.log('✅ SEI EVM WALLET CREATED');
    console.log('📱 Wallet Address:', walletData.address);
    console.log('🌊 Network: SEI EVM (Chain ID: 1329)');

    // Create user data
    const userData = {
      name,
      email,
      userType,
      walletAddress: walletData.address, // Use SEI EVM address
      preferences: preferences && Object.keys(preferences).length > 0 ? {
        defaultStrategy: preferences.defaultStrategy || 'DCA',
        riskTolerance: preferences.riskTolerance || 'moderate',
        preferredTokens: preferences.preferredTokens || ['SEI', 'WSEI', 'USDC', 'WETH', 'WBTC'],
        notifications: {
          email: preferences.notifications?.email !== false,
          portfolio: preferences.notifications?.portfolio !== false,
          trades: preferences.notifications?.trades || false
        }
      } : {
        defaultStrategy: 'DCA',
        riskTolerance: 'moderate',
        preferredTokens: ['SEI', 'WSEI', 'USDC', 'WETH', 'WBTC'],
        notifications: {
          email: true,
          portfolio: true,
          trades: false
        }
      }
    };

    // Password is optional for all users
    if (password && password.length >= 6) {
      userData.password = password;
    }

    const user = new User(userData);
    const savedUser = await user.save();

    console.log('✅ USER CREATED');
    console.log('🆔 User ID:', savedUser._id);

    // Create wallet for the user with SEI EVM credentials
    const savedWallet = await WalletService.createUserWallet(
      savedUser._id,
      savedUser.name,
      walletData,
      initialBalance // Initial balance in SEI
    );

    console.log('✅ SEI EVM WALLET CREATED AND ENCRYPTED');
    console.log('🆔 Wallet ID:', savedWallet._id);
    console.log('📱 Wallet Address:', savedWallet.walletAddress);

    // Update user with wallet information
    savedUser.walletId = savedWallet._id;
    savedUser.walletAddress = savedWallet.walletAddress;
    await savedUser.save();

    console.log('✅ USER-WALLET LINK ESTABLISHED');

    // Generate token for human users
    let token = null;
    if (userType === 'human') {
      token = generateToken(savedUser._id);
    }

    console.log('🎉 USER REGISTRATION WITH SEI EVM WALLET COMPLETED');
    console.log('═'.repeat(60));

    const responseData = {
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        userType: savedUser.userType,
        walletAddress: savedUser.walletAddress,
        walletId: savedUser.walletId,
        createdAt: savedUser.createdAt
      },
      wallet: {
        id: savedWallet._id,
        address: savedWallet.walletAddress,
        network: savedWallet.network,
        chainId: savedWallet.chainId,
        walletClass: savedWallet.walletClass,
        balance: savedWallet.balance,
        portfolioValue: savedWallet.portfolioValue,
        seiStatus: savedWallet.getSeiStatus(),
        isActive: savedWallet.isActive
      },
      sei: {
        network: 'sei-evm',
        chainId: 1329,
        rpcUrl: process.env.SEI_RPC_URL || 'https://evm-rpc.sei-apis.com',
        initialBalance: initialBalance
      }
    };

    if (token) {
      responseData.token = token;
    }

    res.status(201).json({
      success: true,
      data: responseData,
      message: `${userType === 'human' ? 'User' : 'Agent'} registered successfully with SEI EVM wallet`
    });

  } catch (error) {
    console.error('❌ USER-SEI-WALLET REGISTRATION ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register user with SEI EVM wallet',
      error: error.message
    });
  }
};

const registerUserWithWallet = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { 
      name, 
      email, 
      walletAddress, 
      privateKey, 
      userType = 'human',
      password = null,
      preferences = {} 
    } = req.body;

    // If no wallet credentials provided, create with auto-generated SEI EVM wallet
    if (!walletAddress || !privateKey || 
        walletAddress === '0x0000000000000000000000000000000000000000' ||
        privateKey === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      console.log('🔄 No valid wallet credentials provided, creating SEI EVM wallet...');
      return createUserWithSeiWallet(req, res);
    }

    console.log('\n👤 REGISTERING USER WITH PROVIDED WALLET');
    console.log('═'.repeat(60));
    console.log('📧 Email:', email);
    console.log('👤 Name:', name);
    console.log('🔗 User Type:', userType);
    console.log('📱 Wallet Address:', walletAddress);

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Check if wallet address already exists
    const existingWallet = await Wallet.findOne({ walletAddress });
    if (existingWallet) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address is already registered'
      });
    }

    // Validate wallet address format (basic SEI address validation)
    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address format'
      });
    }

    // Validate private key format (basic validation)
    if (!privateKey || privateKey.length < 32) {
      return res.status(400).json({
        success: false,
        message: 'Invalid private key format'
      });
    }

    console.log('✅ VALIDATION PASSED');

    // Create user first
    const userData = {
      name,
      email,
      userType,
      walletAddress,
      preferences: preferences && Object.keys(preferences).length > 0 ? {
        defaultStrategy: preferences.defaultStrategy || 'DCA',
        riskTolerance: preferences.riskTolerance || 'moderate',
        preferredTokens: preferences.preferredTokens || ['WETH', 'WBTC', 'SEI', 'USDC'],
        notifications: {
          email: preferences.notifications?.email !== false,
          portfolio: preferences.notifications?.portfolio !== false,
          trades: preferences.notifications?.trades || false
        }
      } : {
        defaultStrategy: 'DCA',
        riskTolerance: 'moderate',
        preferredTokens: ['WETH', 'WBTC', 'SEI', 'USDC'],
        notifications: {
          email: true,
          portfolio: true,
          trades: false
        }
      }
    };

    // Password is optional for all users
    if (password && password.length >= 6) {
      userData.password = password;
    }

    const user = new User(userData);
    const savedUser = await user.save();

    console.log('✅ USER CREATED');
    console.log('🆔 User ID:', savedUser._id);

    // Create wallet for the user
    const walletData = {
      address: walletAddress,
      privateKey: privateKey
    };

    const wallet = Wallet.createForUser(
      savedUser._id,
      savedUser.name,
      walletData,
      0 // Initial balance
    );

    const savedWallet = await wallet.save();

    console.log('✅ WALLET CREATED AND ENCRYPTED');
    console.log('🆔 Wallet ID:', savedWallet._id);
    console.log('📱 Wallet Address:', savedWallet.walletAddress);

    // Update user with wallet information
    savedUser.walletId = savedWallet._id;
    savedUser.walletAddress = savedWallet.walletAddress;
    await savedUser.save();

    console.log('✅ USER-WALLET LINK ESTABLISHED');

    // Generate token for human users
    let token = null;
    if (userType === 'human') {
      token = generateToken(savedUser._id);
    }

    console.log('🎉 USER REGISTRATION WITH WALLET COMPLETED');
    console.log('═'.repeat(60));

    const responseData = {
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        userType: savedUser.userType,
        walletAddress: savedUser.walletAddress,
        walletId: savedUser.walletId,
        createdAt: savedUser.createdAt
      },
      wallet: {
        id: savedWallet._id,
        address: savedWallet.walletAddress,
        network: savedWallet.network,
        walletClass: savedWallet.walletClass,
        balance: savedWallet.balance,
        portfolioValue: savedWallet.portfolioValue,
        isActive: savedWallet.isActive
      }
    };

    if (token) {
      responseData.token = token;
    }

    res.status(201).json({
      success: true,
      data: responseData,
      message: `${userType === 'human' ? 'User' : 'Agent'} registered successfully with encrypted wallet`
    });

  } catch (error) {
    console.error('❌ USER-WALLET REGISTRATION ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register user with wallet',
      error: error.message
    });
  }
};

// @desc    Get user with wallet information
// @route   GET /api/users/:id/wallet
// @access  Public (should be protected in production)
const getUserWithWallet = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('\n📊 FETCHING USER WITH WALLET INFO');
    console.log('🆔 User ID:', id);

    const user = await User.findById(id)
      .populate('walletId')
      .populate('agentId')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('✅ USER FOUND');
    console.log('👤 Name:', user.name);
    console.log('🔗 User Type:', user.userType);
    console.log('📱 Wallet:', user.walletAddress ? 'Connected' : 'Not connected');

    res.json({
      success: true,
      data: {
        user: user,
        hasWallet: !!user.walletId,
        walletConnected: !!user.walletAddress
      }
    });

  } catch (error) {
    console.error('❌ GET USER WITH WALLET ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user with wallet information',
      error: error.message
    });
  }
};

// @desc    Get user by email
// @route   GET /api/users/by-email/:email
// @access  Public
const getUserByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email parameter is required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: user
      }
    });

  } catch (error) {
    console.error('Get user by email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user',
      error: error.message
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  registerUserWithWallet,
  createUserWithSeiWallet,
  getUserWithWallet,
  getUserByEmail
};