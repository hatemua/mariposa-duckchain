/**
 * Wallet Generation Script
 * 
 * Generates a new wallet for testing purposes
 */

const { ethers } = require('ethers');

function generateWallet() {
  console.log('🔑 Generating new SEI testnet wallet...\n');
  
  const wallet = ethers.Wallet.createRandom();
  
  console.log('✅ Wallet Generated Successfully!');
  console.log('=' .repeat(50));
  console.log(`🔐 Private Key: ${wallet.privateKey}`);
  console.log(`📍 Address: ${wallet.address}`);
  console.log(`🔤 Mnemonic: ${wallet.mnemonic.phrase}`);
  console.log('=' .repeat(50));
  
  console.log('\n📋 Next Steps:');
  console.log('1. 💰 Send testnet SEI to this address');
  console.log('2. 🌐 Get testnet SEI from: https://faucet.seinetwork.io/');
  console.log('3. 🔄 Use this wallet for testing swaps');
  
  console.log('\n⚠️  SECURITY WARNINGS:');
  console.log('• 🔒 Save the private key securely');
  console.log('• 🚫 Never use this on mainnet with real funds');
  console.log('• 📝 This is for testnet testing only');
  
  return {
    privateKey: wallet.privateKey,
    address: wallet.address,
    mnemonic: wallet.mnemonic.phrase
  };
}

// Run if called directly
if (require.main === module) {
  generateWallet();
}

module.exports = { generateWallet }; 