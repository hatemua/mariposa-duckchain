import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Modal,
  StatusBar,
  Clipboard,
  Alert,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
// Uncomment when QR code library is available
// import QRCode from 'react-native-qrcode-svg';

const { width, height } = Dimensions.get('window');

interface BalanceCheckProps {
  visible: boolean;
  userAddress: string;
  requiredAmount: number;
  token: string;
  currentBalance: number;
  onBalanceReceived: () => void;
  onCancel: () => void;
  checkBalanceFunction: (address: string, token: string) => Promise<number>;
}

const InsufficientBalanceModal: React.FC<BalanceCheckProps> = ({
  visible,
  userAddress,
  requiredAmount,
  token,
  currentBalance,
  onBalanceReceived,
  onCancel,
  checkBalanceFunction,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [latestBalance, setLatestBalance] = useState(currentBalance);
  
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const balanceCheckRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      // Start animations
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
      ]).start();

      // Start pulse animation
      startPulseAnimation();
      
      // Start timer
      startTimer();
      
      // Start balance checking
      startBalanceChecking();
    } else {
      // Reset animations and timers
      resetComponent();
    }

    return () => {
      clearTimers();
    };
  }, [visible]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);
  };

  const startBalanceChecking = () => {
    setIsChecking(true);
    
    const checkBalance = async () => {
      try {
        const newBalance = await checkBalanceFunction(userAddress, token);
        setLatestBalance(newBalance);
        
        // Check if balance is sufficient now
        if (newBalance >= requiredAmount) {
          onBalanceReceived();
          return;
        }
      } catch (error) {
        console.error('Error checking balance:', error);
      }
    };

    // Check immediately
    checkBalance();
    
    // Then check every 5 seconds
    balanceCheckRef.current = setInterval(checkBalance, 5000);
  };

  const clearTimers = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (balanceCheckRef.current) {
      clearInterval(balanceCheckRef.current);
      balanceCheckRef.current = null;
    }
  };

  const resetComponent = () => {
    scaleAnim.setValue(0);
    fadeAnim.setValue(0);
    pulseAnim.setValue(1);
    setTimeElapsed(0);
    setIsChecking(false);
    setLatestBalance(currentBalance);
    clearTimers();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyAddress = async () => {
    try {
      await Clipboard.setString(userAddress);
      Alert.alert('Copied!', 'Address copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy address');
    }
  };

  const requiredAmountNeeded = requiredAmount - latestBalance;

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
            colors={['#FF6B6B', '#FF8E8E', '#FFA8A8']}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Warning Icon */}
            <View style={styles.warningContainer}>
              <Animated.View
                style={[
                  styles.warningCircle,
                  {
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              >
                <Text style={styles.warningIcon}>⚠️</Text>
              </Animated.View>
            </View>

            {/* Title */}
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Insufficient Balance</Text>
              <Text style={styles.subtitle}>
                You need more {token} to complete this transfer
              </Text>
            </View>

            {/* Balance Info */}
            <View style={styles.balanceContainer}>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>Current Balance:</Text>
                <Text style={styles.balanceValue}>
                  {latestBalance.toFixed(6)} {token}
                </Text>
              </View>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>Required:</Text>
                <Text style={styles.balanceValue}>
                  {requiredAmount.toFixed(6)} {token}
                </Text>
              </View>
              <View style={[styles.balanceRow, styles.needMoreRow]}>
                <Text style={styles.needMoreLabel}>Need More:</Text>
                <Text style={styles.needMoreValue}>
                  {requiredAmountNeeded.toFixed(6)} {token}
                </Text>
              </View>
            </View>

            {/* QR Code Section */}
            <View style={styles.qrSection}>
              <Text style={styles.qrTitle}>Send {token} to this address:</Text>
              
              {/* QR Code Placeholder - Uncomment when QR library is available */}
              <View style={styles.qrCodeContainer}>
                {/* <QRCode
                  value={userAddress}
                  size={150}
                  backgroundColor="white"
                  color="black"
                /> */}
                <View style={styles.qrPlaceholder}>
                  <Text style={styles.qrPlaceholderText}>QR Code</Text>
                  <Text style={styles.qrPlaceholderSubtext}>
                    {formatAddress(userAddress)}
                  </Text>
                </View>
              </View>

              {/* Address Display */}
              <TouchableOpacity 
                style={styles.addressContainer}
                onPress={copyAddress}
              >
                <Text style={styles.addressText}>{userAddress}</Text>
                <Text style={styles.copyText}>Tap to copy</Text>
              </TouchableOpacity>
            </View>

            {/* Status Section */}
            <View style={styles.statusContainer}>
              <View style={styles.statusRow}>
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.statusText}>
                  Waiting for balance... {formatTime(timeElapsed)}
                </Text>
              </View>
              
              {isChecking && (
                <Text style={styles.checkingText}>
                  Checking balance every 5 seconds
                </Text>
              )}
            </View>

            {/* Action Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>Cancel Transfer</Text>
            </TouchableOpacity>
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
    paddingHorizontal: 25,
    paddingVertical: 30,
    alignItems: 'center',
  },
  warningContainer: {
    marginBottom: 20,
  },
  warningCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  warningIcon: {
    fontSize: 28,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  balanceContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  balanceValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  needMoreRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: 10,
    marginTop: 10,
    marginBottom: 0,
  },
  needMoreLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  needMoreValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  qrSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 25,
  },
  qrTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  qrCodeContainer: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 15,
    marginBottom: 15,
  },
  qrPlaceholder: {
    width: 150,
    height: 150,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  qrPlaceholderText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  qrPlaceholderSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  addressContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  addressText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontFamily: 'monospace',
    marginBottom: 5,
  },
  copyText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 10,
    fontWeight: '500',
  },
  checkingText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 20,
  },
  cancelText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default InsufficientBalanceModal;