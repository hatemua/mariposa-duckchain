const express = require('express');
const { body, query, param } = require('express-validator');
const enhancedTransferController = require('../controllers/enhancedTransferController');

const router = express.Router();

// Validation middleware
const validateTransferRequest = [
  body('message')
    .notEmpty()
    .withMessage('Transfer message is required')
    .isLength({ min: 5, max: 500 })
    .withMessage('Message must be between 5 and 500 characters'),
  body('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  body('agentId')
    .optional()
    .isMongoId()
    .withMessage('Invalid agent ID format')
];

const validateCompleteTransfer = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  body('providedArguments')
    .isObject()
    .withMessage('Provided arguments must be an object'),
  body('providedArguments.amount')
    .optional()
    .isFloat({ min: 0.000001 })
    .withMessage('Amount must be a positive number'),
  body('providedArguments.token')
    .optional()
    .isIn(['SEI', 'USDC', 'WETH', 'WBTC', 'USDT', 'iSEI', 'USDa', 'syUSD'])
    .withMessage('Invalid token symbol'),
  body('providedArguments.recipient')
    .optional()
    .notEmpty()
    .withMessage('Recipient cannot be empty')
];

const validateAddContact = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  body('name')
    .notEmpty()
    .withMessage('Contact name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('walletAddress')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid Ethereum wallet address format'),
  body('category')
    .optional()
    .isIn(['friend', 'family', 'business', 'other'])
    .withMessage('Invalid category'),
  body('phoneNumber')
    .optional()
    .isMobilePhone()
    .withMessage('Invalid phone number format'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format')
];

const validateUserQuery = [
  query('userId')
    .notEmpty()
    .withMessage('User ID is required')
];

const validateBalanceCheck = [
  query('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  query('token')
    .notEmpty()
    .withMessage('Token is required'),
  query('amount')
    .isFloat({ min: 0.000001 })
    .withMessage('Amount must be a positive number')
];

// Transfer processing routes
router.post('/process', validateTransferRequest, enhancedTransferController.processTransfer);
router.post('/complete', validateCompleteTransfer, enhancedTransferController.completeTransfer);
router.post('/execute', enhancedTransferController.executeTransfer);

// Balance and funding routes
router.get('/balance', validateBalanceCheck, enhancedTransferController.checkBalance);
router.post('/funding-qr', enhancedTransferController.generateFundingQR);

// Contact management routes
router.post('/contacts', validateAddContact, enhancedTransferController.addContact);
router.get('/contacts', validateUserQuery, enhancedTransferController.getContacts);
router.get('/contacts/search', validateUserQuery, enhancedTransferController.searchContacts);
router.put('/contacts/:contactId', 
  param('contactId').isInt().withMessage('Invalid contact ID'),
  enhancedTransferController.updateContact
);
router.delete('/contacts/:contactId',
  param('contactId').isInt().withMessage('Invalid contact ID'),
  enhancedTransferController.deleteContact
);

// Import/Export routes
router.post('/contacts/import', enhancedTransferController.importContacts);
router.get('/contacts/export', validateUserQuery, enhancedTransferController.exportContacts);

module.exports = router;
