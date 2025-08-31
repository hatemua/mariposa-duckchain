const QRCode = require('qrcode');
const crypto = require('crypto');

class QRCodeService {
  constructor() {
    this.defaultOptions = {
      width: 256,
      height: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    };
  }

  /**
   * Generate QR code for wallet address with optional payment details
   * @param {string} walletAddress - Wallet address
   * @param {string} token - Token symbol (optional)
   * @param {number} amount - Amount to request (optional)
   * @param {string} memo - Payment memo (optional)
   * @returns {Object} QR code data
   */
  async generateWalletQR(walletAddress, token = null, amount = null, memo = null) {
    try {
      // Create payment URI following EIP-681 standard for Ethereum payments
      let paymentURI = `ethereum:${walletAddress}`;
      
      const params = [];
      
      if (token && token !== 'SEI') {
        // For ERC-20 tokens, we'd need the contract address
        // This is simplified - in production you'd have a token registry
        const tokenContracts = {
          'USDC': '0x3894085Ef7Ff0f0aeDf52E2A2704928d259f9a3A',
          'WETH': '0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7',
          'WBTC': '0x1C7D4B196Cb0C7B01d743Fbc6116a902379C7238'
        };
        
        if (tokenContracts[token]) {
          paymentURI = `ethereum:${tokenContracts[token]}`;
          params.push(`function=transfer(address,uint256)`);
          params.push(`address=${walletAddress}`);
          if (amount) {
            // Convert amount to wei for tokens (assuming 18 decimals)
            const amountWei = (amount * Math.pow(10, 18)).toString();
            params.push(`uint256=${amountWei}`);
          }
        }
      } else if (amount && token === 'SEI') {
        // For native SEI payments
        const amountWei = (amount * Math.pow(10, 18)).toString();
        params.push(`value=${amountWei}`);
      }

      if (memo) {
        params.push(`data=${encodeURIComponent(memo)}`);
      }

      if (params.length > 0) {
        paymentURI += `?${params.join('&')}`;
      }

      // Generate QR code as data URL
      const qrCodeDataURL = await QRCode.toDataURL(paymentURI, {
        ...this.defaultOptions,
        type: 'image/png'
      });

      // Generate QR code as SVG for better scalability
      const qrCodeSVG = await QRCode.toString(paymentURI, {
        type: 'svg',
        width: this.defaultOptions.width,
        color: this.defaultOptions.color
      });

      return {
        success: true,
        paymentURI: paymentURI,
        qrCodeDataURL: qrCodeDataURL,
        qrCodeSVG: qrCodeSVG,
        walletAddress: walletAddress,
        token: token,
        amount: amount,
        memo: memo,
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      };

    } catch (error) {
      console.error('❌ Error generating wallet QR code:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate QR code for generic text/data
   * @param {string} data - Data to encode
   * @param {Object} options - QR code options
   * @returns {Object} QR code result
   */
  async generateTextQR(data, options = {}) {
    try {
      const qrOptions = { ...this.defaultOptions, ...options };
      
      const qrCodeDataURL = await QRCode.toDataURL(data, {
        ...qrOptions,
        type: 'image/png'
      });

      const qrCodeSVG = await QRCode.toString(data, {
        type: 'svg',
        width: qrOptions.width,
        color: qrOptions.color
      });

      return {
        success: true,
        data: data,
        qrCodeDataURL: qrCodeDataURL,
        qrCodeSVG: qrCodeSVG,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error generating text QR code:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate QR code for SEI network specific payment
   * @param {string} recipient - Recipient address
   * @param {number} amount - Amount in SEI
   * @param {string} memo - Transaction memo
   * @returns {Object} SEI payment QR code
   */
  async generateSeiPaymentQR(recipient, amount, memo = null) {
    try {
      // Create SEI-specific payment format
      const seiPayment = {
        network: 'sei-evm',
        chainId: 1329,
        to: recipient,
        value: amount,
        memo: memo,
        timestamp: Date.now()
      };

      const paymentJSON = JSON.stringify(seiPayment);
      
      // Generate QR with SEI branding colors
      const qrCodeDataURL = await QRCode.toDataURL(paymentJSON, {
        width: 300,
        height: 300,
        margin: 3,
        color: {
          dark: '#D32F2F', // SEI red
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H'
      });

      return {
        success: true,
        paymentData: seiPayment,
        paymentJSON: paymentJSON,
        qrCodeDataURL: qrCodeDataURL,
        network: 'sei-evm',
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error generating SEI payment QR:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate QR code for agent wallet funding
   * @param {string} agentWalletAddress - Agent's wallet address
   * @param {string} userId - User ID
   * @param {string} token - Token to fund
   * @param {number} amount - Amount needed
   * @returns {Object} Funding QR code
   */
  async generateAgentFundingQR(agentWalletAddress, userId, token, amount) {
    try {
      // Create funding request data
      const fundingRequest = {
        type: 'agent_funding',
        agentWallet: agentWalletAddress,
        userId: userId,
        token: token,
        amount: amount,
        purpose: 'transfer_funding',
        requestId: crypto.randomBytes(16).toString('hex'),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() // 6 hours
      };

      // Generate both simple address QR and detailed funding QR
      const addressQR = await this.generateWalletQR(agentWalletAddress, token, amount, `Agent funding for ${userId}`);
      
      const fundingDataJSON = JSON.stringify(fundingRequest);
      const fundingQR = await QRCode.toDataURL(fundingDataJSON, {
        width: 350,
        height: 350,
        margin: 4,
        color: {
          dark: '#1976D2', // Blue for funding
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H'
      });

      return {
        success: true,
        fundingRequest: fundingRequest,
        simpleAddressQR: addressQR,
        detailedFundingQR: {
          qrCodeDataURL: fundingQR,
          data: fundingDataJSON
        },
        instructions: [
          `Send ${amount} ${token} to agent wallet`,
          `Address: ${agentWalletAddress}`,
          'Scan QR code with compatible wallet',
          'Transaction will be monitored automatically'
        ]
      };

    } catch (error) {
      console.error('❌ Error generating agent funding QR:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate contact sharing QR code
   * @param {Object} contact - Contact information
   * @returns {Object} Contact QR code
   */
  async generateContactQR(contact) {
    try {
      const contactData = {
        type: 'contact_share',
        name: contact.name,
        walletAddress: contact.walletAddress,
        category: contact.category,
        network: 'sei-evm',
        sharedAt: new Date().toISOString()
      };

      const contactJSON = JSON.stringify(contactData);
      
      const qrCodeDataURL = await QRCode.toDataURL(contactJSON, {
        width: 250,
        height: 250,
        margin: 2,
        color: {
          dark: '#4CAF50', // Green for contacts
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      return {
        success: true,
        contactData: contactData,
        qrCodeDataURL: qrCodeDataURL,
        shareableText: `Contact: ${contact.name}\nWallet: ${contact.walletAddress}`
      };

    } catch (error) {
      console.error('❌ Error generating contact QR:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate and parse QR code data
   * @param {string} qrData - QR code data string
   * @returns {Object} Parsed QR data
   */
  parseQRData(qrData) {
    try {
      // Try to parse as JSON first
      try {
        const parsed = JSON.parse(qrData);
        return {
          success: true,
          type: 'json',
          data: parsed,
          format: parsed.type || 'unknown'
        };
      } catch (jsonError) {
        // Not JSON, try other formats
      }

      // Check if it's an Ethereum payment URI
      if (qrData.startsWith('ethereum:')) {
        const uri = new URL(qrData);
        return {
          success: true,
          type: 'ethereum_payment',
          address: uri.pathname,
          params: Object.fromEntries(uri.searchParams),
          original: qrData
        };
      }

      // Check if it's a plain wallet address
      if (/^0x[a-fA-F0-9]{40}$/.test(qrData)) {
        return {
          success: true,
          type: 'wallet_address',
          address: qrData
        };
      }

      // Fallback to plain text
      return {
        success: true,
        type: 'text',
        data: qrData
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: qrData
      };
    }
  }
}

module.exports = QRCodeService;
