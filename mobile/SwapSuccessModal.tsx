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

interface SwapResult {
  success: boolean;
  type: string;
  data: {
    success: boolean;
    status: string;
    swapDetails: {
      from: {
        token: string;
        amount: number;
      };
      to: {
        token: string;
        estimatedAmount: string;
      };
      slippage: number;
      quote: {
        fromToken: any;
        toToken: any;
        route: string[];
        fees: number[];
        priceImpact: string;
        gasEstimate: string;
      };
    };
    transactionHash: string;
    executionResult: any;
    balances: {
      [key: string]: string;
    };
    message: string;
  };
  timestamp: string;
}

interface SwapSuccessModalProps {
  visible: boolean;
  swapResult: SwapResult;
  onClose: () => void;
  onViewTransaction?: (txHash: string) => void;
}

const SwapSuccessModal: React.FC<SwapSuccessModalProps> = ({
  visible,
  swapResult,
  onClose,
  onViewTransaction,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkmarkAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const swapIconAnim = useRef(new Animated.Value(0)).current;

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
        Animated.loop(
          Animated.sequence([
            Animated.timing(swapIconAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(swapIconAnim, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();
    } else {
      // Reset animations
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      checkmarkAnim.setValue(0);
      bounceAnim.setValue(0);
      swapIconAnim.setValue(0);
    }
  }, [visible]);

  const formatAmount = (amount: number | string, token: string, decimals = 6) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${num.toFixed(decimals)} ${token}`;
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getTokenIcon = (token: string) => {
    switch (token.toUpperCase()) {
      case 'WTON': return '🪙';
      case 'DUCK': return '🦆';
      case 'TON': return '💎';
      default: return '🪙';
    }
  };

  const getTokenColor = (token: string) => {
    switch (token.toUpperCase()) {
      case 'WTON': return '#00D4AA';
      case 'DUCK': return '#FF6B35';
      case 'TON': return '#0088CC';
      default: return '#8B5CF6';
    }
  };

  if (!swapResult) return null;

  const { data } = swapResult;

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
            colors={['#667eea', '#764ba2', '#6B73FF']}
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
              <Text style={styles.successTitle}>Swap Completed!</Text>
              <Text style={styles.successSubtitle}>
                Your tokens have been successfully swapped
              </Text>
            </Animated.View>

            {/* Swap Details */}
            <Animated.View
              style={[
                styles.swapContainer,
                {
                  opacity: bounceAnim,
                },
              ]}
            >
              {/* From Token */}
              <View style={[styles.tokenCard, { backgroundColor: getTokenColor(data.swapDetails.from.token) + '20' }]}>
                <View style={styles.tokenHeader}>
                  <Text style={styles.tokenIcon}>{getTokenIcon(data.swapDetails.from.token)}</Text>
                  <Text style={styles.tokenSymbol}>{data.swapDetails.from.token}</Text>
                </View>
                <Text style={styles.tokenAmount}>
                  -{data.swapDetails.from.amount}
                </Text>
                <Text style={styles.tokenLabel}>Sent</Text>
              </View>

              {/* Swap Animation Arrow */}
              <Animated.View
                style={[
                  styles.swapArrow,
                  {
                    transform: [
                      {
                        rotate: swapIconAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text style={styles.swapIcon}>🔄</Text>
              </Animated.View>

              {/* To Token */}
              <View style={[styles.tokenCard, { backgroundColor: getTokenColor(data.swapDetails.to.token) + '20' }]}>
                <View style={styles.tokenHeader}>
                  <Text style={styles.tokenIcon}>{getTokenIcon(data.swapDetails.to.token)}</Text>
                  <Text style={styles.tokenSymbol}>{data.swapDetails.to.token}</Text>
                </View>
                <Text style={styles.tokenAmount}>
                  +{parseFloat(data.swapDetails.to.estimatedAmount).toFixed(6)}
                </Text>
                <Text style={styles.tokenLabel}>Received</Text>
              </View>
            </Animated.View>

            {/* Transaction Details */}
            <Animated.View
              style={[
                styles.detailsContainer,
                {
                  opacity: bounceAnim,
                },
              ]}
            >
              <Text style={styles.detailsTitle}>Transaction Details</Text>

              {/* Slippage */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Slippage Tolerance</Text>
                <Text style={styles.detailValue}>{data.swapDetails.slippage}%</Text>
              </View>

              {/* Price Impact */}
              {data.swapDetails.quote?.priceImpact && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Price Impact</Text>
                  <Text style={styles.detailValue}>{data.swapDetails.quote.priceImpact}%</Text>
                </View>
              )}

              {/* Gas Estimate */}
              {data.swapDetails.quote?.gasEstimate && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Gas Used</Text>
                  <Text style={styles.detailValue}>{data.swapDetails.quote.gasEstimate}</Text>
                </View>
              )}

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
                  {formatDate(swapResult.timestamp)}
                </Text>
              </View>
            </Animated.View>

            {/* Updated Balances */}
            {data.balances && (
              <Animated.View
                style={[
                  styles.balancesContainer,
                  {
                    opacity: bounceAnim,
                  },
                ]}
              >
                <Text style={styles.balancesTitle}>Updated Balances</Text>
                {Object.entries(data.balances).map(([token, balance]) => (
                  <View key={token} style={styles.balanceRow}>
                    <Text style={styles.balanceToken}>{getTokenIcon(token)} {token}</Text>
                    <Text style={styles.balanceAmount}>{parseFloat(balance).toFixed(6)}</Text>
                  </View>
                ))}
              </Animated.View>
            )}

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
                  <Text style={styles.viewTransactionText}>View on Explorer</Text>
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
  swapContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
  },
  tokenCard: {
    width: '100%',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginVertical: 5,
  },
  tokenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tokenIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  tokenSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tokenAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  tokenLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  swapArrow: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  swapIcon: {
    fontSize: 24,
  },
  detailsContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  balancesContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 25,
  },
  balancesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceToken: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: 14,
    color: '#FFFFFF',
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
    color: '#667eea',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SwapSuccessModal;