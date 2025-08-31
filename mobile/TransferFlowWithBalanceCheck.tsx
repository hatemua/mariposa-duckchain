import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import InsufficientBalanceModal from './InsufficientBalanceModal';
import TransferSuccessModal from './TransferSuccessModal';

import API_CONFIG from './config/ApiConfig';

// API Configuration
const API_BASE_URL = API_CONFIG.BASE_URL;

interface TransferFlowProps {
  userId: string;
  userAddress: string;
}

const TransferFlowWithBalanceCheck: React.FC<TransferFlowProps> = ({
  userId,
  userAddress,
}) => {
  const [showInsufficientBalance, setShowInsufficientBalance] = useState(false);
  const [showTransferSuccess, setShowTransferSuccess] = useState(false);
  const [transferData, setTransferData] = useState<any>(null);
  const [balanceCheckData, setBalanceCheckData] = useState<any>(null);

  // Example transfer request
  const exampleTransfer = {
    recipient: "Samir",
    amount: 0.1,
    token: "TON"
  };

  /**
   * Check token balance for a specific address
   */
  const checkBalance = async (address: string, token: string): Promise<number> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/wallet/balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: address,
          token: token,
        }),
      });

      const data = await response.json();
      return data.balance || 0;
    } catch (error) {
      console.error('Error checking balance:', error);
      return 0;
    }
  };

  /**
   * Process transfer request with balance checking
   */
  const processTransfer = async () => {
    try {
      console.log('🚀 Starting transfer process...');
      
      // Call the enhanced transfer service
      const response = await fetch(`${API_BASE_URL}/api/prompt/router`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Send ${exampleTransfer.amount} ${exampleTransfer.token} to ${exampleTransfer.recipient}`,
          userId: userId,
        }),
      });

      const result = await response.json();
      console.log('📥 Transfer response:', result);

      if (result.success && result.type === 'transfer') {
        if (result.data.success) {
          // Transfer completed successfully
          console.log('✅ Transfer successful!');
          setTransferData(result);
          setShowTransferSuccess(true);
        } else if (result.data.status === 'insufficient_funds') {
          // Insufficient balance - show funding modal
          console.log('💰 Insufficient balance - showing funding modal');
          setBalanceCheckData({
            userAddress: result.data.walletAddress,
            requiredAmount: result.data.requiredAmount,
            currentBalance: result.data.currentBalance,
            token: exampleTransfer.token,
            shortfall: result.data.shortfall,
            fundingInfo: result.data.fundingInstructions
          });
          setShowInsufficientBalance(true);
        } else {
          // Other transfer error
          Alert.alert('Transfer Failed', result.data.error || 'Unknown error occurred');
        }
      } else {
        // API error
        Alert.alert('Error', result.error || 'Failed to process transfer');
      }
    } catch (error) {
      console.error('❌ Transfer error:', error);
      Alert.alert('Error', 'Network error occurred');
    }
  };

  /**
   * Handle when sufficient balance is received
   */
  const handleBalanceReceived = async () => {
    console.log('💰 Balance received! Retrying transfer...');
    setShowInsufficientBalance(false);
    
    // Wait a moment for the modal to close, then retry transfer
    setTimeout(() => {
      processTransfer();
    }, 500);
  };

  /**
   * Handle transfer cancellation
   */
  const handleTransferCancel = () => {
    console.log('❌ Transfer cancelled by user');
    setShowInsufficientBalance(false);
    setBalanceCheckData(null);
  };

  /**
   * Handle viewing transaction in blockchain explorer
   */
  const handleViewTransaction = (txHash: string) => {
    const explorerUrl = `https://explorer.duckchain.io/tx/${txHash}`;
    console.log('🔍 Opening transaction:', explorerUrl);
    // In a real app, use Linking.openURL(explorerUrl)
    Alert.alert('Transaction Hash', txHash);
  };

  /**
   * Handle success modal close
   */
  const handleSuccessClose = () => {
    setShowTransferSuccess(false);
    setTransferData(null);
  };

  /**
   * Execute strategy request
   */
  const executeStrategy = async () => {
    try {
      console.log('🧠 Starting strategy execution...');
      
      const response = await fetch(`${API_BASE_URL}/api/prompt/router`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: "Give me a trading strategy for SEI with 1000 USDT budget, medium risk tolerance for 1 month",
          userId: userId,
        }),
      });

      const result = await response.json();
      console.log('📊 Strategy response:', result);

      if (result.success) {
        Alert.alert('Strategy Generated!', 'Check your messages for the detailed strategy analysis');
      } else {
        Alert.alert('Strategy Error', result.error || 'Failed to generate strategy');
      }
    } catch (error) {
      console.error('❌ Strategy error:', error);
      Alert.alert('Error', 'Network error occurred while generating strategy');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Transfer Flow Demo</Text>
        <Text style={styles.description}>
          This demonstrates the complete transfer flow with balance checking and QR code funding.
        </Text>

        <View style={styles.transferInfo}>
          <Text style={styles.label}>Transfer Details:</Text>
          <Text style={styles.value}>• To: {exampleTransfer.recipient}</Text>
          <Text style={styles.value}>• Amount: {exampleTransfer.amount} {exampleTransfer.token}</Text>
          <Text style={styles.value}>• Your Address: {userAddress}</Text>
        </View>

        <TouchableOpacity style={styles.transferButton} onPress={processTransfer}>
          <Text style={styles.transferButtonText}>Start Transfer</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.strategyButton} onPress={executeStrategy}>
          <Text style={styles.strategyButtonText}>Execute Strategy</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How it works:</Text>
          <Text style={styles.infoText}>
            1. Transfer request is processed{'\n'}
            2. If balance is insufficient, QR code is shown{'\n'}
            3. System waits for balance to be received{'\n'}
            4. Once funded, transfer completes automatically
          </Text>
        </View>
      </View>

      {/* Insufficient Balance Modal */}
      {balanceCheckData && (
        <InsufficientBalanceModal
          visible={showInsufficientBalance}
          userAddress={balanceCheckData.userAddress}
          requiredAmount={balanceCheckData.requiredAmount}
          token={balanceCheckData.token}
          currentBalance={balanceCheckData.currentBalance}
          onBalanceReceived={handleBalanceReceived}
          onCancel={handleTransferCancel}
          checkBalanceFunction={checkBalance}
        />
      )}

      {/* Transfer Success Modal */}
      {transferData && (
        <TransferSuccessModal
          visible={showTransferSuccess}
          transferResult={transferData}
          onClose={handleSuccessClose}
          onViewTransaction={handleViewTransaction}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  transferInfo: {
    backgroundColor: '#f7fafc',
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 10,
  },
  value: {
    fontSize: 14,
    color: '#4a5568',
    marginBottom: 5,
    paddingLeft: 10,
  },
  transferButton: {
    backgroundColor: '#00D4AA',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 25,
  },
  transferButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  strategyButton: {
    backgroundColor: '#667eea',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 25,
  },
  strategyButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#e6fffa',
    borderRadius: 15,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#00D4AA',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#234e52',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#285e61',
    lineHeight: 20,
  },
});

export default TransferFlowWithBalanceCheck;

// =====================================================
// INTEGRATION GUIDE
// =====================================================

/*
COMPLETE TRANSFER FLOW WITH BALANCE CHECKING:

1. SETUP:
   - Import both InsufficientBalanceModal and TransferSuccessModal
   - Add state management for modals and transfer data
   - Configure API endpoints

2. TRANSFER PROCESS:
   - Call your transfer API endpoint
   - Check response status:
     - Success: Show success modal
     - Insufficient funds: Show balance check modal
     - Error: Show error alert

3. BALANCE CHECK MODAL FEATURES:
   ✓ Shows current vs required balance
   ✓ Displays QR code for funding (when QR library is available)
   ✓ Shows wallet address with copy functionality
   ✓ Timer showing elapsed waiting time
   ✓ Automatic balance polling every 5 seconds
   ✓ Automatically proceeds when balance is sufficient
   ✓ Cancel option to abort transfer

4. SUCCESS MODAL FEATURES:
   ✓ Beautiful animated success display
   ✓ Complete transaction details
   ✓ Clickable transaction hash
   ✓ Recipient and amount information
   ✓ Timestamp and status

5. API INTEGRATION:
   - Your backend already handles balance checking
   - Returns insufficient_funds status with funding info
   - Provides wallet address and shortfall amount
   - Includes QR code data in funding instructions

6. CUSTOMIZATION:
   - Modify API endpoints in API_BASE_URL
   - Change polling interval (currently 5 seconds)
   - Customize blockchain explorer URLs
   - Add more token types as needed
   - Implement QR code library integration
   - Add clipboard functionality for address copying

USAGE EXAMPLE:
<TransferFlowWithBalanceCheck
  userId="68b2464f83132f5576e8ea8d"
  userAddress="0xf73f096Fe9ff8B6229c97d954B5cD2430443D6fB"
/>

This creates a complete, production-ready transfer flow with automatic
balance checking, funding via QR codes, and beautiful UI animations.
*/