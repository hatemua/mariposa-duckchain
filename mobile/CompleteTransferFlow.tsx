import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { ApiCalls } from './ApiErrorHandler';
import InsufficientBalanceModal from './InsufficientBalanceModal';
import TransferSuccessModal from './TransferSuccessModal';

interface CompleteTransferFlowProps {
  userId: string;
}

const CompleteTransferFlow: React.FC<CompleteTransferFlowProps> = ({ userId }) => {
  const [showInsufficientBalance, setShowInsufficientBalance] = useState(false);
  const [showTransferSuccess, setShowTransferSuccess] = useState(false);
  const [transferData, setTransferData] = useState<any>(null);
  const [insufficientFundsData, setInsufficientFundsData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Example transfer message
  const transferMessage = "Send 100 TON to Samir";

  /**
   * Check balance for a specific address and token
   */
  const checkBalance = async (address: string, token: string): Promise<number> => {
    try {
      console.log(`🔍 Checking balance for ${address} (${token})`);
      const result = await ApiCalls.checkBalance(address, token);
      
      if (result?.success && typeof result.data?.balance === 'number') {
        console.log(`💰 Balance: ${result.data.balance} ${token}`);
        return result.data.balance;
      }
      
      console.warn('⚠️ Could not get balance, returning 0');
      return 0;
    } catch (error) {
      console.error('❌ Balance check error:', error);
      return 0;
    }
  };

  /**
   * Process the transfer request
   */
  const handleTransfer = async () => {
    setIsProcessing(true);
    console.log('🚀 Starting transfer process...');

    try {
      // Call the enhanced intent API with transfer message
      const result = await ApiCalls.processEnhancedIntent(transferMessage, userId);
      
      console.log('📥 Enhanced Intent Result:', result);

      if (!result) {
        Alert.alert('Error', 'Failed to process transfer request');
        return;
      }

      // Check if the result indicates insufficient funds
      if (!result.success && result.data?.status === 'insufficient_funds') {
        console.log('💰 Insufficient funds detected - showing funding modal');
        
        // Extract funding information from the response
        const fundingData = {
          walletAddress: result.data.walletAddress,
          currentBalance: result.data.currentBalance,
          requiredAmount: result.data.requiredAmount,
          shortfall: result.data.shortfall,
          fundingInstructions: result.data.fundingInstructions,
          token: extractTokenFromMessage(transferMessage) || 'TON'
        };
        
        setInsufficientFundsData(fundingData);
        setShowInsufficientBalance(true);
        return;
      }

      // Check if it's a successful transfer
      if (result.success && result.data?.success) {
        console.log('✅ Transfer successful!');
        setTransferData(result);
        setShowTransferSuccess(true);
        return;
      }

      // Check for other transfer results
      if (result.type === 'transfer') {
        if (result.data?.status === 'executed') {
          console.log('✅ Transfer executed successfully!');
          setTransferData(result);
          setShowTransferSuccess(true);
        } else if (result.data?.status === 'insufficient_funds') {
          console.log('💰 Insufficient funds in transfer result');
          // Handle insufficient funds from transfer data
          const fundingData = {
            walletAddress: result.data.transferDetails?.from || result.data.walletAddress,
            currentBalance: result.data.currentBalance || 0,
            requiredAmount: result.data.transferDetails?.amount || result.data.requiredAmount,
            shortfall: result.data.shortfall,
            token: result.data.transferDetails?.token || 'TON'
          };
          
          setInsufficientFundsData(fundingData);
          setShowInsufficientBalance(true);
        } else {
          Alert.alert('Transfer Error', result.data?.error || 'Transfer failed');
        }
      } else {
        // Handle other types of responses or errors
        Alert.alert('Error', result.error || 'Unexpected response from server');
      }

    } catch (error) {
      console.error('❌ Transfer error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Extract token from transfer message
   */
  const extractTokenFromMessage = (message: string): string | null => {
    const tokenMatch = message.match(/\b(TON|DUCK|USDT|WTON|SEI|USDC)\b/i);
    return tokenMatch ? tokenMatch[1].toUpperCase() : null;
  };

  /**
   * Handle when sufficient balance is received
   */
  const handleBalanceReceived = async () => {
    console.log('💰 Sufficient balance received! Retrying transfer...');
    setShowInsufficientBalance(false);
    setInsufficientFundsData(null);
    
    // Wait a moment for the modal to close, then retry transfer
    setTimeout(() => {
      handleTransfer();
    }, 500);
  };

  /**
   * Handle transfer cancellation
   */
  const handleTransferCancel = () => {
    console.log('❌ Transfer cancelled by user');
    setShowInsufficientBalance(false);
    setInsufficientFundsData(null);
  };

  /**
   * Handle viewing transaction in blockchain explorer
   */
  const handleViewTransaction = (txHash: string) => {
    const explorerUrl = `https://explorer.duckchain.io/tx/${txHash}`;
    console.log('🔍 Opening transaction:', explorerUrl);
    Alert.alert(
      'Transaction Hash', 
      txHash,
      [
        { text: 'Copy', onPress: () => {/* Implement clipboard copy */} },
        { text: 'OK' }
      ]
    );
  };

  /**
   * Handle success modal close
   */
  const handleSuccessClose = () => {
    setShowTransferSuccess(false);
    setTransferData(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Complete Transfer Flow</Text>
        <Text style={styles.description}>
          This demonstrates the complete transfer flow with proper handling of insufficient funds.
        </Text>

        <View style={styles.transferInfo}>
          <Text style={styles.label}>Transfer Details:</Text>
          <Text style={styles.value}>• Message: "{transferMessage}"</Text>
          <Text style={styles.value}>• User ID: {userId}</Text>
          <Text style={styles.value}>• Status: {isProcessing ? 'Processing...' : 'Ready'}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.transferButton, isProcessing && styles.disabledButton]} 
          onPress={handleTransfer}
          disabled={isProcessing}
        >
          <Text style={styles.transferButtonText}>
            {isProcessing ? 'Processing Transfer...' : 'Start Transfer'}
          </Text>
        </TouchableOpacity>

        <View style={styles.flowSteps}>
          <Text style={styles.flowTitle}>Transfer Flow:</Text>
          <Text style={styles.flowStep}>1. ✅ Call enhanced-intent API</Text>
          <Text style={styles.flowStep}>2. 🔍 Check response type</Text>
          <Text style={styles.flowStep}>3. 💰 If insufficient funds → Show QR code</Text>
          <Text style={styles.flowStep}>4. ⏳ Wait for funding</Text>
          <Text style={styles.flowStep}>5. 🔄 Auto-retry transfer</Text>
          <Text style={styles.flowStep}>6. ✅ Show success modal</Text>
        </View>

        <View style={styles.responseTypes}>
          <Text style={styles.responseTitle}>Expected Response Types:</Text>
          <View style={styles.responseItem}>
            <Text style={styles.responseLabel}>Success:</Text>
            <Text style={styles.responseValue}>success: true, data.success: true</Text>
          </View>
          <View style={styles.responseItem}>
            <Text style={styles.responseLabel}>Insufficient Funds:</Text>
            <Text style={styles.responseValue}>success: false, data.status: "insufficient_funds"</Text>
          </View>
          <View style={styles.responseItem}>
            <Text style={styles.responseLabel}>Transfer Executed:</Text>
            <Text style={styles.responseValue}>type: "transfer", data.status: "executed"</Text>
          </View>
        </View>
      </View>

      {/* Insufficient Balance Modal */}
      {insufficientFundsData && (
        <InsufficientBalanceModal
          visible={showInsufficientBalance}
          userAddress={insufficientFundsData.walletAddress}
          requiredAmount={insufficientFundsData.requiredAmount}
          token={insufficientFundsData.token}
          currentBalance={insufficientFundsData.currentBalance}
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
  disabledButton: {
    backgroundColor: '#a0aec0',
  },
  transferButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  flowSteps: {
    backgroundColor: '#e6fffa',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#00D4AA',
  },
  flowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#234e52',
    marginBottom: 10,
  },
  flowStep: {
    fontSize: 14,
    color: '#285e61',
    marginBottom: 5,
    paddingLeft: 10,
  },
  responseTypes: {
    backgroundColor: '#fff5f5',
    borderRadius: 15,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#f56565',
  },
  responseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#742a2a',
    marginBottom: 15,
  },
  responseItem: {
    marginBottom: 10,
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#822727',
    marginBottom: 2,
  },
  responseValue: {
    fontSize: 12,
    color: '#a53f3f',
    fontFamily: 'monospace',
    paddingLeft: 10,
  },
});

export default CompleteTransferFlow;

/*
INTEGRATION GUIDE:

This component properly handles your API response structure:

1. SUCCESS RESPONSE (success: true):
   - Shows TransferSuccessModal
   - Displays transaction details

2. INSUFFICIENT FUNDS (success: false, status: "insufficient_funds"):
   - Shows InsufficientBalanceModal with QR code
   - Uses your actual API data:
     • walletAddress: "0xf73f096Fe9ff8B6229c97d954B5cD2430443D6fB"
     • currentBalance: 0.68894
     • requiredAmount: 100
     • shortfall: 99.31106

3. ERROR HANDLING:
   - Network errors show alerts
   - Business logic responses (insufficient funds) don't trigger error alerts
   - Proper logging for debugging

4. USAGE:
   <CompleteTransferFlow userId="68b2464f83132f5576e8ea8d" />

This will fix the error where insufficient funds was being treated as an API error
instead of a valid business logic response that should trigger the funding UI.
*/