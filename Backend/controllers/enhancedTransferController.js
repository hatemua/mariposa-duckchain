const EnhancedTransferService = require('../services/enhancedTransferService');
const ContactsService = require('../services/contactsService');
const { validationResult } = require('express-validator');

class EnhancedTransferController {
  constructor() {
    this.transferService = new EnhancedTransferService();
    this.contactsService = new ContactsService();
  }

  /**
   * Process transfer request with enhanced validation
   * @route POST /api/transfer/process
   */
  processTransfer = async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { message, userId, agentId } = req.body;

      console.log('🚀 Processing enhanced transfer request...');
      console.log('📝 Message:', message);
      console.log('👤 User ID:', userId);

      const result = await this.transferService.processTransferRequest(message, userId, agentId);

      res.json({
        success: result.success,
        status: result.status,
        data: result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Enhanced transfer processing error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        status: 'processing_error'
      });
    }
  };

  /**
   * Complete transfer with user-provided missing arguments
   * @route POST /api/transfer/complete
   */
  completeTransfer = async (req, res) => {
    try {
      const { userId, transferId, providedArguments } = req.body;

      // Validate provided arguments
      if (!providedArguments || typeof providedArguments !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Missing or invalid provided arguments'
        });
      }

      // Create complete transfer message from provided arguments
      const { amount, token, recipient, memo } = providedArguments;
      
      let completeMessage = `transfer ${amount} ${token} to ${recipient}`;
      if (memo) {
        completeMessage += ` memo: ${memo}`;
      }

      // Process the complete transfer
      const result = await this.transferService.processTransferRequest(completeMessage, userId);

      res.json({
        success: result.success,
        status: result.status,
        data: result,
        completedWith: providedArguments,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Transfer completion error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * Execute confirmed transfer
   * @route POST /api/transfer/execute
   */
  executeTransfer = async (req, res) => {
    try {
      const { userId, transferDetails } = req.body;

      console.log('💸 Executing confirmed transfer...');

      const result = await this.transferService.executeTransfer(transferDetails, userId);

      res.json({
        success: result.success,
        execution: result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Transfer execution error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        status: 'execution_error'
      });
    }
  };

  /**
   * Add new contact
   * @route POST /api/transfer/contacts
   */
  addContact = async (req, res) => {
    try {
      const { userId, name, walletAddress, category, phoneNumber, email, notes } = req.body;

      const result = await this.contactsService.addContact({
        userId,
        name,
        walletAddress,
        category,
        phoneNumber,
        email,
        notes
      });

      res.json({
        success: result.success,
        data: result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Add contact error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * Get user contacts
   * @route GET /api/transfer/contacts
   */
  getContacts = async (req, res) => {
    try {
      const { userId } = req.query;
      const { category } = req.query;

      const contacts = await this.contactsService.getUserContacts(userId, category);
      const stats = await this.contactsService.getContactStats(userId);

      res.json({
        success: true,
        contacts: contacts,
        stats: stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Get contacts error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * Search contacts
   * @route GET /api/transfer/contacts/search
   */
  searchContacts = async (req, res) => {
    try {
      const { userId, query } = req.query;

      const result = await this.contactsService.findContact(query, userId);
      const similar = await this.contactsService.searchSimilarContacts(query, userId);

      res.json({
        success: true,
        exactMatch: result.success ? result.contact : null,
        similarContacts: similar,
        query: query,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Search contacts error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * Update contact
   * @route PUT /api/transfer/contacts/:contactId
   */
  updateContact = async (req, res) => {
    try {
      const { contactId } = req.params;
      const { userId } = req.body;
      const updateData = req.body;

      // Remove userId from update data
      delete updateData.userId;

      const result = await this.contactsService.updateContact(contactId, updateData, userId);

      res.json({
        success: result.success,
        data: result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Update contact error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * Delete contact
   * @route DELETE /api/transfer/contacts/:contactId
   */
  deleteContact = async (req, res) => {
    try {
      const { contactId } = req.params;
      const { userId } = req.body;

      const result = await this.contactsService.deleteContact(contactId, userId);

      res.json({
        success: result.success,
        data: result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Delete contact error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * Check wallet balance for transfer
   * @route GET /api/transfer/balance
   */
  checkBalance = async (req, res) => {
    try {
      const { userId, token, amount } = req.query;

      const result = await this.transferService.checkWalletBalance(
        userId, 
        token, 
        parseFloat(amount)
      );

      res.json({
        success: result.success,
        balance: result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Balance check error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * Generate funding QR code
   * @route POST /api/transfer/funding-qr
   */
  generateFundingQR = async (req, res) => {
    try {
      const { userId, token, amount } = req.body;

      const fundingInfo = await this.transferService.generateFundingInstructions(
        userId,
        token,
        amount,
        0 // Current balance (will be fetched internally)
      );

      res.json({
        success: true,
        fundingInfo: fundingInfo,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Funding QR generation error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * Import contacts from JSON
   * @route POST /api/transfer/contacts/import
   */
  importContacts = async (req, res) => {
    try {
      const { userId, contacts } = req.body;

      const result = await this.contactsService.importContacts(userId, contacts);

      res.json({
        success: result.success,
        import: result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Import contacts error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * Export contacts to JSON
   * @route GET /api/transfer/contacts/export
   */
  exportContacts = async (req, res) => {
    try {
      const { userId } = req.query;

      const contacts = await this.contactsService.exportContacts(userId);

      res.json({
        success: true,
        contacts: contacts,
        count: contacts.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Export contacts error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };
}

module.exports = new EnhancedTransferController();
