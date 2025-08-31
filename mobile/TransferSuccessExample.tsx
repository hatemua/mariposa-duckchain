import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import TransferSuccessModal from './TransferSuccessModal';

// Example usage component
const TransferSuccessExample: React.FC = () => {
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Your actual transfer result data
  const transferResult = {
    "success": true,
    "type": "transfer",
    "data": {
      "success": true,
      "status": "executed",
      "transferDetails": {
        "from": "0xf73f096Fe9ff8B6229c97d954B5cD2430443D6fB",
        "to": "0xc86a17ffbfc3d463a407b45d35d0cf7b525b6be7",
        "amount": 0.1,
        "token": "TON",
        "recipient": {
          "name": "Samir",
          "address": "0xc86a17ffbfc3d463a407b45d35d0cf7b525b6be7",
          "category": "personal"
        }
      },
      "transactionHash": "0x6587d6269cc2805a5af8992a1c5b083587fa58232d8da6d5e41ea5fbe6525600",
      "executionResult": {
        "success": true,
        "transactionHash": "0x6587d6269cc2805a5af8992a1c5b083587fa58232d8da6d5e41ea5fbe6525600",
        "transferDetails": {
          "fromUserId": "68b2464f83132f5576e8ea8d",
          "toAddress": "0xc86a17ffbfc3d463a407b45d35d0cf7b525b6be7",
          "amount": 0.1,
          "token": "TON",
          "recipientName": "Samir"
        },
        "timestamp": "2025-08-31T00:52:26.707Z",
        "status": "completed"
      }
    },
    "timestamp": "2025-08-31T00:52:26.707Z"
  };

  const handleViewTransaction = (txHash: string) => {
    // You can customize this based on your blockchain explorer
    // For example, for Ethereum/DuckChain:
    const explorerUrl = `https://explorer.duckchain.io/tx/${txHash}`;
    
    Linking.canOpenURL(explorerUrl)
      .then(supported => {
        if (supported) {
          Linking.openURL(explorerUrl);
        } else {
          Alert.alert(
            'Transaction Hash',
            txHash,
            [
              { text: 'Copy', onPress: () => {/* Copy to clipboard logic */} },
              { text: 'OK' }
            ]
          );
        }
      })
      .catch(err => console.error('Error opening URL:', err));
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    // You can add additional logic here, like navigating to another screen
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.testButton}
        onPress={() => setShowSuccessModal(true)}
      >
        <Text style={styles.testButtonText}>Show Transfer Success</Text>
      </TouchableOpacity>

      <TransferSuccessModal
        visible={showSuccessModal}
        transferResult={transferResult}
        onClose={handleCloseModal}
        onViewTransaction={handleViewTransaction}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  testButton: {
    backgroundColor: '#00D4AA',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TransferSuccessExample;

// =====================================================
// INTEGRATION GUIDE
// =====================================================

/*
HOW TO USE THIS COMPONENT IN YOUR APP:

1. Import the component:
   import TransferSuccessModal from './TransferSuccessModal';

2. Add state to control modal visibility:
   const [showSuccessModal, setShowSuccessModal] = useState(false);

3. Show the modal after a successful transfer:
   // After your transfer API call succeeds:
   if (transferResponse.success) {
     setTransferResult(transferResponse);
     setShowSuccessModal(true);
   }

4. Add the modal to your JSX:
   <TransferSuccessModal
     visible={showSuccessModal}
     transferResult={transferResult}
     onClose={() => setShowSuccessModal(false)}
     onViewTransaction={(txHash) => {
       // Open blockchain explorer or copy hash
       const explorerUrl = `https://explorer.duckchain.io/tx/${txHash}`;
       Linking.openURL(explorerUrl);
     }}
   />

FEATURES:
✓ Beautiful gradient background matching your app's design
✓ Smooth animations (scale, fade, bounce effects)
✓ Animated checkmark with growing circle effect
✓ Clean typography with proper hierarchy
✓ Clickable transaction hash with "View" button
✓ Recipient name and address display
✓ Amount and token formatting
✓ Timestamp formatting
✓ Two action buttons: "View Transaction" and "Done"
✓ Responsive design that works on different screen sizes
✓ Proper TypeScript interfaces
✓ Customizable onViewTransaction handler

CUSTOMIZATION:
- Change gradient colors in the LinearGradient component
- Modify button styles and colors
- Adjust animation timings and effects
- Add more transaction details if needed
- Customize the blockchain explorer URL
*/