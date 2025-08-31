import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Modal,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

interface TransferResult {
  success: boolean;
  type: string;
  data: {
    success: boolean;
    status: string;
    transferDetails: {
      from: string;
      to: string;
      amount: number;
      token: string;
      recipient: {
        name: string;
        address: string;
        category: string;
      };
    };
    transactionHash: string;
    executionResult: {
      success: boolean;
      transactionHash: string;
      transferDetails: {
        fromUserId: string;
        toAddress: string;
        amount: number;
        token: string;
        recipientName: string;
      };
      timestamp: string;
      status: string;
    };
  };
  timestamp: string;
}

interface TransferSuccessModalProps {
  visible: boolean;
  transferResult: TransferResult;
  onClose: () => void;
  onViewTransaction?: (txHash: string) => void;
}

const TransferSuccessModal: React.FC<TransferSuccessModalProps> = ({
  visible,
  transferResult,
  onClose,
  onViewTransaction,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkmarkAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Start animations
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(200),
        Animated.timing(checkmarkAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(bounceAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      checkmarkAnim.setValue(0);
      bounceAnim.setValue(0);
    }
  }, [visible]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatAmount = (amount: number, token: string) => {
    return `${amount} ${token}`;
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!transferResult) return null;

  const { data } = transferResult;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.5)" barStyle="light-content" />
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          <LinearGradient
            colors={['#00D4AA', '#00B4D8', '#0077B6']}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Success Checkmark */}
            <View style={styles.checkmarkContainer}>
              <Animated.View
                style={[
                  styles.checkmarkCircle,
                  {
                    transform: [
                      {
                        scale: checkmarkAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0, 1.2, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text style={styles.checkmark}>✓</Text>
              </Animated.View>
            </View>

            {/* Success Title */}
            <Animated.View
              style={[
                styles.titleContainer,
                {
                  transform: [
                    {
                      translateY: bounceAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                  opacity: bounceAnim,
                },
              ]}
            >
              <Text style={styles.successTitle}>Transfer Successful!</Text>
              <Text style={styles.successSubtitle}>
                Your transaction has been completed
              </Text>
            </Animated.View>

            {/* Transfer Details */}
            <Animated.View
              style={[
                styles.detailsContainer,
                {
                  opacity: bounceAnim,
                },
              ]}
            >
              {/* Amount */}
              <View style={styles.amountContainer}>
                <Text style={styles.amountLabel}>Amount Sent</Text>
                <Text style={styles.amountValue}>
                  {formatAmount(data.transferDetails.amount, data.transferDetails.token)}
                </Text>
              </View>

              {/* Recipient */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>To</Text>
                <View style={styles.recipientContainer}>
                  <Text style={styles.recipientName}>
                    {data.transferDetails.recipient.name}
                  </Text>
                  <Text style={styles.recipientAddress}>
                    {formatAddress(data.transferDetails.to)}
                  </Text>
                </View>
              </View>

              {/* From */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>From</Text>
                <Text style={styles.detailValue}>
                  {formatAddress(data.transferDetails.from)}
                </Text>
              </View>

              {/* Transaction Hash */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Transaction Hash</Text>
                <TouchableOpacity
                  onPress={() => onViewTransaction?.(data.transactionHash)}
                  style={styles.hashContainer}
                >
                  <Text style={styles.hashValue}>
                    {formatAddress(data.transactionHash)}
                  </Text>
                  <Text style={styles.viewText}>View</Text>
                </TouchableOpacity>
              </View>

              {/* Timestamp */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Completed At</Text>
                <Text style={styles.detailValue}>
                  {formatDate(data.timestamp)}
                </Text>
              </View>
            </Animated.View>

            {/* Action Buttons */}
            <Animated.View
              style={[
                styles.buttonContainer,
                {
                  opacity: bounceAnim,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.viewTransactionButton}
                onPress={() => onViewTransaction?.(data.transactionHash)}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.viewTransactionText}>View Transaction</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.doneButton}
                onPress={onClose}
              >
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </Animated.View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: width * 0.9,
    maxWidth: 400,
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  gradient: {
    paddingHorizontal: 30,
    paddingVertical: 40,
    alignItems: 'center',
  },
  checkmarkContainer: {
    marginBottom: 20,
  },
  checkmarkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  checkmark: {
    fontSize: 36,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  detailsContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 25,
    marginBottom: 30,
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: 25,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  amountLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 5,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  detailLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  recipientContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  recipientName: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  recipientAddress: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  hashContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  hashValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    marginRight: 8,
  },
  viewText: {
    fontSize: 12,
    color: '#00D4AA',
    fontWeight: 'bold',
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
  },
  viewTransactionButton: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 15,
  },
  viewTransactionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
  },
  doneText: {
    color: '#0077B6',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TransferSuccessModal;