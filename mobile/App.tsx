import React, { useState, useRef, useEffect } from 'react';
import {
  StatusBar,
  StyleSheet,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Image,
  PermissionsAndroid,
  Alert,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
// import QRCode from 'react-native-qrcode-svg';
import InsufficientBalanceModal from './InsufficientBalanceModal';
import TransferSuccessModal from './TransferSuccessModal';
import StrategyMessageComponent from './StrategyMessageComponent';
import StrategyLoadingComponent from './StrategyLoadingComponent';
import ArgumentRequestModal from './ArgumentRequestModal';

const { width, height } = Dimensions.get('window');

// Import centralized API configuration
import API_CONFIG from './config/ApiConfig';

const DUCKCHAIN_ASSETS = [
  {
    id: '1',
    name: 'Toncoin',
    symbol: 'TON',
    balance: '1,247.58',
    value: '$6,842.31',
    change: '+12.45%',
    changePositive: true,
    color: '#0088CC',
    gradient: ['#0088CC', '#00A8E8'],
    icon: '💎',
  },
  {
    id: '2',
    name: 'Wrapped TON',
    symbol: 'WTON',
    balance: '892.34',
    value: '$4,892.14',
    change: '+8.73%',
    changePositive: true,
    color: '#00B4D8',
    gradient: ['#00B4D8', '#0077B6'],
    icon: '🔄',
  },
  {
    id: '3',
    name: 'DuckCoin',
    symbol: 'DUCK',
    balance: '15,847.92',
    value: '$3,127.86',
    change: '+24.67%',
    changePositive: true,
    color: '#FFD60A',
    gradient: ['#FFD60A', '#FFC300'],
    icon: '🦆',
  },
  {
    id: '4',
    name: 'Tether USD',
    symbol: 'USDT',
    balance: '2,847.32',
    value: '$2,847.32',
    change: '+0.01%',
    changePositive: true,
    color: '#26A17B',
    gradient: ['#26A17B', '#50C878'],
    icon: '💵',
  },
];

const DUCKCHAIN_TRANSACTIONS = [
  {
    id: 1,
    title: 'DUCK Mint Reward',
    date: '31 Aug 2024 • 11:45 am',
    amount: '+2,500 DUCK',
    icon: '🎁',
    color: '#FFD60A',
    type: 'mint',
  },
  {
    id: 2,
    title: 'TON Transfer to @alice',
    date: '31 Aug 2024 • 9:30 am',
    amount: '-125.5 TON',
    icon: '📤',
    color: '#0088CC',
    type: 'transfer',
  },
  {
    id: 3,
    title: 'DeFi Pool Payment',
    date: '30 Aug 2024 • 6:15 pm',
    amount: '-50.0 USDT',
    icon: '💰',
    color: '#26A17B',
    type: 'pay',
  },
  {
    id: 4,
    title: 'WTON Swap',
    date: '30 Aug 2024 • 2:20 pm',
    amount: '+320.8 WTON',
    icon: '🔄',
    color: '#00B4D8',
    type: 'swap',
  },
];

const DUCKCHAIN_POCKETS = [
  {
    id: 1,
    name: 'DeFi Staking',
    icon: '🚀',
    target: 5000,
    current: 3420,
    progress: 68,
    asset: 'TON',
    color: '#0088CC',
  },
  {
    id: 2,
    name: 'DUCK Farm',
    icon: '🦆',
    target: 50000,
    current: 38500,
    progress: 77,
    asset: 'DUCK',
    color: '#FFD60A',
  },
];

const CRYPTO_ASSETS = [
  {
    id: '1',
    name: 'Bitcoin',
    symbol: 'BTC',
    balance: '0.00834721',
    value: '$2,847.32',
    change: '+5.24%',
    changePositive: true,
    color: '#F7931A',
    gradient: ['#F7931A', '#FFB84D'],
    icon: '₿',
  },
  {
    id: '2',
    name: 'Ethereum',
    symbol: 'ETH',
    balance: '1.2456',
    value: '$3,892.14',
    change: '+2.18%',
    changePositive: true,
    color: '#627EEA',
    gradient: ['#627EEA', '#8A92F7'],
    icon: 'Ξ',
  },
  {
    id: '3',
    name: 'Solana',
    symbol: 'SOL',
    balance: '24.58',
    value: '$4,127.86',
    change: '+8.45%',
    changePositive: true,
    color: '#9945FF',
    gradient: ['#9945FF', '#B968FF'],
    icon: '◎',
  },
  {
    id: '4',
    name: 'Cardano',
    symbol: 'ADA',
    balance: '1,247.32',
    value: '$1,872.00',
    change: '-1.23%',
    changePositive: false,
    color: '#0033AD',
    gradient: ['#0033AD', '#1E5ADB'],
    icon: '₳',
  },
  {
    id: '5',
    name: 'Polygon',
    symbol: 'MATIC',
    balance: '892.15',
    value: '$758.42',
    change: '+3.67%',
    changePositive: true,
    color: '#8247E5',
    gradient: ['#8247E5', '#A06BF0'],
    icon: '⬟',
  },
  {
    id: '6',
    name: 'Chainlink',
    symbol: 'LINK',
    balance: '42.89',
    value: '$612.18',
    change: '-0.89%',
    changePositive: false,
    color: '#375BD2',
    gradient: ['#375BD2', '#5B7EE6'],
    icon: '🔗',
  },
];

const BOTTOM_TABS = [
  { id: 1, title: 'Home', icon: '🏠', active: true },
  { id: 2, title: 'Stats', icon: '📊', active: false },
  { id: 3, title: 'Agent', icon: '🤖', active: false, isAgent: true },
  { id: 4, title: 'Cards', icon: '💳', active: false },
  { id: 5, title: 'Profile', icon: '👤', active: false },
];

const SAMPLE_MESSAGES = [
  {
    id: 1,
    text: 'Hi! Can you show me my portfolio balance?',
    isUser: true,
    timestamp: '10:30 AM',
  },
  {
    id: 2,
    text: 'Hello! Your current portfolio balance is $68,960.21. This includes your investments in Bitcoin ($2,847.32), Ethereum ($3,892.14), and other assets. Would you like me to break down your holdings in more detail?',
    isUser: false,
    timestamp: '10:30 AM',
  },
  {
    id: 3,
    text: 'Yes, please show me my top performing assets this month',
    isUser: true,
    timestamp: '10:31 AM',
  },
  {
    id: 4,
    text: 'Based on your portfolio, here are your top performers this month:\n\n• Solana (SOL): +8.45% ($4,127.86)\n• Bitcoin (BTC): +5.24% ($2,847.32)\n• Polygon (MATIC): +3.67% ($758.42)\n\nGreat job on your investment choices! Is there anything specific you’d like to know about these assets?',
    isUser: false,
    timestamp: '10:31 AM',
  },
];

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <SafeAreaProvider>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#FF6B35" 
        translucent={false}
      />
      <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
        {isAuthenticated ? (
          <DashboardScreen onLogout={() => setIsAuthenticated(false)} />
        ) : (
          <AuthenticationScreen onLogin={() => setIsAuthenticated(true)} />
        )}
      </View>
    </SafeAreaProvider>
  );
}

function AuthenticationScreen({ onLogin }: { onLogin: () => void }) {
  const safeAreaInsets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailSubmit = () => {
    if (!email.trim()) {
      return;
    }
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setCurrentStep('otp');
    }, 1000);
  };

  const handleOtpSubmit = () => {
    if (otp === '123456') {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        onLogin();
      }, 1000);
    }
  };

  const handleResendOtp = () => {
    // Simulate resend OTP
    setOtp('');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.authContainer} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#FF6B35', '#FF8A5B', '#FFB084']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.authGradient}
      >
        <View style={[styles.authContent, { paddingTop: safeAreaInsets.top + 40 }]}>
          {/* Header */}
          <View style={styles.authHeader}>
            <View style={styles.authLogo}>
              <Text style={styles.authLogoEmoji}>🦋</Text>
            </View>
            <Text style={styles.authTitle}>Welcome to Mariposa</Text>
            <Text style={styles.authSubtitle}>
              {currentStep === 'email' 
                ? 'Enter your email to get started' 
                : 'Enter the verification code sent to your email'
              }
            </Text>
          </View>

          {/* Form */}
          <View style={styles.authForm}>
            {currentStep === 'email' ? (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    style={styles.authInput}
                    placeholder="Enter your email"
                    placeholderTextColor="rgba(255,255,255,0.7)"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                
                <TouchableOpacity 
                  style={[styles.authButton, !email.trim() && styles.authButtonDisabled]}
                  onPress={handleEmailSubmit}
                  disabled={!email.trim() || isLoading}
                >
                  <LinearGradient
                    colors={!email.trim() || isLoading ? ['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.2)'] : ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                    style={styles.authButtonGradient}
                  >
                    {isLoading ? (
                      <Text style={styles.authButtonText}>Sending...</Text>
                    ) : (
                      <Text style={styles.authButtonText}>Continue →</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Verification Code</Text>
                  <Text style={styles.inputHint}>Code sent to {email}</Text>
                  <TextInput
                    style={styles.authInput}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="rgba(255,255,255,0.7)"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                  <Text style={styles.otpHint}>Hint: Use 123456 for demo</Text>
                </View>
                
                <TouchableOpacity 
                  style={[styles.authButton, otp.length !== 6 && styles.authButtonDisabled]}
                  onPress={handleOtpSubmit}
                  disabled={otp.length !== 6 || isLoading}
                >
                  <LinearGradient
                    colors={otp.length !== 6 || isLoading ? ['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.2)'] : ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                    style={styles.authButtonGradient}
                  >
                    {isLoading ? (
                      <Text style={styles.authButtonText}>Verifying...</Text>
                    ) : (
                      <Text style={styles.authButtonText}>Verify & Login</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.resendButton} onPress={handleResendOtp}>
                  <Text style={styles.resendButtonText}>Didn't receive code? Resend</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.backButton} 
                  onPress={() => setCurrentStep('email')}
                >
                  <Text style={styles.backButtonText}>← Back to email</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

function DashboardScreen({ onLogout }: { onLogout: () => void }) {
  const safeAreaInsets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('Home');

  if (activeTab === 'Agent') {
    return <ChatScreen activeTab={activeTab} setActiveTab={setActiveTab} />;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerContainer, { paddingTop: safeAreaInsets.top + 10 }]}>
        <HeaderSection onLogout={onLogout} />
      </View>
      
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        bounces={true}
        contentContainerStyle={{ paddingBottom: safeAreaInsets.bottom + 100 }}
      >
        <MyPocketsSection />
        <RecentTransactionsSection />
      </ScrollView>

      <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
    </View>
  );
}

function HeaderSection({ onLogout }: { onLogout: () => void }) {
  return (
    <LinearGradient
      colors={['#FF6B35', '#FF8A5B', '#FFB084']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerGradient}
    >
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerLeft}>
            <View style={styles.profileSection}>
              <LinearGradient
                colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                style={styles.profileAvatar}
              >
                <Text style={styles.avatarText}>H</Text>
              </LinearGradient>
              <View style={styles.userInfo}>
                <Text style={styles.greetingText}>Hello,</Text>
                <Text style={styles.userName}>Hatem</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationButton} onPress={onLogout}>
            <Text style={styles.notificationIcon}>🚪</Text>
          </TouchableOpacity>
        </View>
        
        <WalletBalanceCard />
        <QuickActionsGrid />
      </View>
    </LinearGradient>
  );
}

function WalletBalanceCard() {
  const totalValue = DUCKCHAIN_ASSETS.reduce((sum, asset) => {
    return sum + parseFloat(asset.value.replace('$', '').replace(',', ''));
  }, 0);

  return (
    <View style={styles.balanceCard}>
      <View style={styles.balanceHeader}>
        <Text style={styles.balanceLabel}>DuckChain Portfolio</Text>
        <TouchableOpacity style={styles.eyeButton}>
          <Text style={styles.eyeIcon}>👁</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.balanceAmount}>${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
      
      {/* Quick Assets Overview */}
      <View style={styles.assetsPreview}>
        {DUCKCHAIN_ASSETS.slice(0, 4).map((asset, index) => (
          <View key={asset.id} style={styles.assetQuickView}>
            <Text style={styles.assetIcon}>{asset.icon}</Text>
            <View style={styles.assetQuickInfo}>
              <Text style={styles.assetSymbol}>{asset.symbol}</Text>
              <Text style={[styles.assetChange, { color: asset.changePositive ? '#22C55E' : '#EF4444' }]}>
                {asset.change}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function QuickActionsGrid() {
  const actions = [
    { title: 'Transfer', icon: '→' },
    { title: 'Receive', icon: '←' },
    { title: 'Top up', icon: '+' },
    { title: 'More', icon: '•••' },
  ];

  return (
    <View style={styles.actionsGrid}>
      {actions.map((action, index) => (
        <TouchableOpacity key={index} style={styles.actionButton}>
          <View style={styles.actionIcon}>
            <Text style={styles.actionIconText}>{action.icon}</Text>
          </View>
          <Text style={styles.actionTitle}>{action.title}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function VirtualTradingCard() {
  return (
    <LinearGradient
      colors={['#FF6B35', '#FF8A5B', '#FFB084']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.virtualCard}
    >
      <View style={styles.virtualCardContent}>
        <View style={styles.virtualBadge}>
          <Text style={styles.virtualBadgeText}>NEW</Text>
        </View>
        <Text style={styles.virtualIntro}>Introducing</Text>
        <Text style={styles.virtualTitle}>DeFi Staking</Text>
        <Text style={styles.virtualSubtitle}>Earn up to 12% APY on your crypto investments</Text>
        <TouchableOpacity style={styles.virtualButton}>
          <Text style={styles.virtualButtonText}>Learn More</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.virtualCharacter}>
        <Text style={styles.characterEmoji}>🚀</Text>
        <View style={styles.characterGlow} />
      </View>
    </LinearGradient>
  );
}

function MyPocketsSection() {
  return (
    <View style={styles.pocketsSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Asset Portfolios</Text>
        <TouchableOpacity>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.pocketsGrid}>
        {DUCKCHAIN_POCKETS.map((pocket) => (
          <View key={pocket.id} style={styles.pocketCard}>
            <View style={styles.pocketHeader}>
              <Text style={styles.pocketIcon}>{pocket.icon}</Text>
              <Text style={styles.pocketName}>{pocket.name}</Text>
              <Text style={styles.lockIcon}>🔒</Text>
            </View>
            <Text style={styles.pocketTarget}>Target: {pocket.target.toLocaleString()} {pocket.asset}</Text>
            <Text style={styles.pocketAmount}>{pocket.current.toLocaleString()} {pocket.asset}</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <LinearGradient
                  colors={[pocket.color, pocket.color + '80']}
                  style={[styles.progressFill, { width: `${pocket.progress}%` }]}
                />
              </View>
              <Text style={styles.progressText}>{pocket.progress}%</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function RecentTransactionsSection() {
  return (
    <View style={styles.transactionsSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <TouchableOpacity>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>
      {DUCKCHAIN_TRANSACTIONS.map((transaction) => (
        <View key={transaction.id} style={styles.transactionItem}>
          <View style={styles.transactionLeft}>
            <View style={[styles.transactionIcon, { backgroundColor: transaction.color }]}>
              <Text style={styles.transactionIconText}>{transaction.icon}</Text>
            </View>
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionTitle}>{transaction.title}</Text>
              <Text style={styles.transactionDate}>{transaction.date}</Text>
            </View>
          </View>
          <Text style={styles.transactionAmount}>{transaction.amount}</Text>
        </View>
      ))}
    </View>
  );
}


function DiscoverSection() {
  return (
    <View style={styles.discoverSection}>
      <TouchableOpacity style={styles.discoverButton}>
        <LinearGradient
          colors={['#F3E8FF', '#E9D5FF']}
          style={styles.discoverCard}
        >
          <View style={styles.discoverIcon}>
            <Text style={styles.discoverEmoji}>🔍</Text>
          </View>
          <Text style={styles.discoverText}>Explore</Text>
          <Text style={styles.discoverSubtext}>New opportunities</Text>
        </LinearGradient>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.rewardsButton}>
        <LinearGradient
          colors={['#DBEAFE', '#BFDBFE']}
          style={styles.rewardsCard}
        >
          <View style={styles.rewardsIcon}>
            <Text style={styles.rewardsEmoji}>✨</Text>
          </View>
          <Text style={styles.rewardsText}>Rewards</Text>
          <Text style={styles.rewardsSubtext}>Earn points daily</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

function ChatScreen({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: string) => void }) {
  const safeAreaInsets = useSafeAreaInsets();
  const [messages, setMessages] = useState(SAMPLE_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  
  // Modal States
  const [showInsufficientBalance, setShowInsufficientBalance] = useState(false);
  const [showTransferSuccess, setShowTransferSuccess] = useState(false);
  const [showArgumentRequest, setShowArgumentRequest] = useState(false);
  const [insufficientFundsData, setInsufficientFundsData] = useState<any>(null);
  const [transferSuccessData, setTransferSuccessData] = useState<any>(null);
  const [argumentRequestData, setArgumentRequestData] = useState<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const recordingAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const maxRecordingTime = 30; // 30 seconds

  // Request microphone permission
  useEffect(() => {
    requestAudioPermission();
  }, []);

  const requestAudioPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'This app needs access to your microphone to record voice messages.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Microphone permission granted');
          setHasPermission(true);
        } else {
          console.log('Microphone permission denied');
          setHasPermission(false);
        }
      } catch (err) {
        console.warn('Permission request error:', err);
        setHasPermission(false);
      }
    } else {
      // iOS permissions are handled differently
      setHasPermission(true);
    }
  };

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordingAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(recordingAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      recordingAnim.setValue(0);
    }
  }, [isRecording]);

  // Process recorded voice (with proper permission handling)
  const processRecordedVoice = async () => {
    console.log('🎤 Voice input captured with microphone permission');
    
    // Simulate processing of voice input (with permission-granted access to microphone)
    // In a real implementation, this is where you'd send audio to a speech-to-text service
    const voiceCommands = [
      "my balance",
      "show my portfolio", 
      "what's my wallet balance",
      "check my tokens",
      "show my DUCK balance"
    ];
    
    // Pick a realistic voice command
    const transcribedText = voiceCommands[Math.floor(Math.random() * voiceCommands.length)];
    
    console.log('🗣️ Voice transcription result:', transcribedText);
    
    // Set the text in input field for user to see
    setInputText(transcribedText);
    
    // Wait a moment then automatically send the message to the agent
    setTimeout(async () => {
      await sendVoiceMessage(transcribedText);
    }, 500);
  };

  // Helper functions for insufficient balance modal
  const checkBalance = async (address: string, token: string): Promise<number> => {
    try {
      console.log(`🔍 Checking balance for ${address} (${token})`);
      const response = await fetch(`${API_BASE_URL}/api/wallet/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, token }),
      });
      const result = await response.json();
      return result.balance || 0;
    } catch (error) {
      console.error('❌ Balance check error:', error);
      return 0;
    }
  };

  const handleBalanceReceived = async () => {
    console.log('💰 Sufficient balance received! Closing modal...');
    setShowInsufficientBalance(false);
    setInsufficientFundsData(null);
    // Could retry the transfer here if needed
  };

  const handleTransferCancel = () => {
    console.log('❌ Transfer cancelled by user');
    setShowInsufficientBalance(false);
    setInsufficientFundsData(null);
  };

  const handleViewTransaction = (txHash: string) => {
    console.log('🔍 View transaction:', txHash);
    Alert.alert('Transaction Hash', txHash, [
      { text: 'Copy', onPress: () => {/* Add clipboard copy logic */} },
      { text: 'OK' }
    ]);
  };

  const handleSuccessClose = () => {
    setShowTransferSuccess(false);
    setTransferSuccessData(null);
  };

  const handleArgumentRequestClose = () => {
    setShowArgumentRequest(false);
    setArgumentRequestData(null);
  };

  const handleArgumentRequestSubmit = async (args: Record<string, string>) => {
    try {
      console.log('🚀 Submitting completed arguments:', args);
      console.log('🔍 ArgumentRequestData:', JSON.stringify(argumentRequestData, null, 2));
      
      if (!argumentRequestData) return;
      
      // Extract the original message and token from the initial request
      const { originalMessage, extraction } = argumentRequestData;
      
      // Get token from original message (e.g., "Transfer TON" -> "TON")
      const tokenFromOriginalMessage = originalMessage?.match(/Transfer\s+(\w+)/i)?.[1] || 'TON';
      
      // Build a complete transfer message preserving the original intent
      const recipient = args.recipient || args.address || '';
      const amount = args.amount || '';
      
      // Construct the message in a format that preserves transfer intent
      const completeMessage = `Transfer ${amount} ${tokenFromOriginalMessage} to ${recipient}`;
      
      console.log('📤 Original message:', originalMessage);
      console.log('📤 Extracted token:', tokenFromOriginalMessage);
      console.log('📤 Complete transfer message:', completeMessage);
      console.log('📤 Extraction data:', JSON.stringify(extraction, null, 2));
      
      // Send the complete message to the API
      await sendMessage(completeMessage);
      
      // Close the modal
      handleArgumentRequestClose();
      
    } catch (error) {
      console.error('❌ Error submitting argument request:', error);
      Alert.alert(
        'Transfer Error',
        'Failed to process transfer. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Test function to show the ArgumentRequestModal with mock data
  const testArgumentRequestModal = () => {
    const mockData = {
      interactiveData: {
        type: 'argumentRequest' as const,
        message: 'I need more information to complete this action. Please provide:',
        components: [],
        missingArgs: ['recipient', 'amount']
      },
      validation: {
        isValid: false,
        missing: ['recipient', 'amount'],
        requiredArgs: ['recipient', 'amount']
      },
      extraction: {
        actionType: 'transfer',
        args: { recipient: 'TON', amount: null, tokenId: null }
      },
      classification: {
        type: 'actions',
        actionSubtype: 'transfer',
        confidence: 0.95
      },
      originalMessage: 'Transfer TON'
    };
    
    setArgumentRequestData(mockData);
    setShowArgumentRequest(true);
  };

  const extractTokenFromMessage = (message: string): string | null => {
    const tokenMatch = message.match(/\b(TON|DUCK|USDT|WTON|SEI|USDC)\b/i);
    return tokenMatch ? tokenMatch[1].toUpperCase() : null;
  };

  const sendVoiceMessage = async (transcribedText: string) => {
    console.log('Sending voice message to agent:', transcribedText);
    
    // Create user message from voice
    const userMessage = {
      id: messages.length + 1,
      text: transcribedText,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isVoiceMessage: true, // Flag to indicate this came from voice
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText(''); // Clear input after sending
    setIsLoading(true);

    try {
      // API call to enhanced-intent endpoint
      const response = await fetch(API_CONFIG.getEnhancedIntentUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: transcribedText,
          userId: "68b2464f83132f5576e8ea8d",
          sessionId: "session-456"
        }),
      });

      const result = await response.json();
      console.log('Enhanced-intent API response:', result);
      console.log('🔍 Response structure:', {
        success: result.success,
        type: result.type,
        dataStatus: result.data?.status,
        dataRequiresFunding: result.data?.requiresFunding,
        hasData: !!result.data
      });
      if (result.success) {
        // Create a custom message for balance requests
        let customMessage = result.data.message || 'Request processed successfully!';
        
        if (result.type === 'portfolio-information' && result.data.portfolioData) {
          const portfolioData = result.data.portfolioData;
          const totalValue = portfolioData.totalUsdValue || 0;
          const hasTokens = portfolioData.tokenBalances?.some((token: any) => parseFloat(token.balanceFormatted) > 0);
          const nativeAmount = parseFloat(portfolioData.nativeBalance?.balanceFormatted || '0');
          
          if (totalValue === 0 && !hasTokens && nativeAmount === 0) {
            customMessage = "🦋 Here's your current wallet overview! Your wallet is currently empty, but that's just the beginning of your crypto journey. Ready to explore the DUCK ecosystem?";
          } else {
            const topToken = portfolioData.tokenBalances?.find((token: any) => parseFloat(token.balanceFormatted) > 0);
            const tokenCount = portfolioData.tokenBalances?.filter((token: any) => parseFloat(token.balanceFormatted) > 0).length || 0;
            
            customMessage = `✨ Your wallet is looking great! You have ${nativeAmount > 0 ? `${nativeAmount} TON` : ''}${nativeAmount > 0 && tokenCount > 0 ? ' and ' : ''}${tokenCount > 0 ? `${tokenCount} token${tokenCount > 1 ? 's' : ''} including ${topToken?.symbol}` : ''}. ${totalValue > 0 ? `Total value: $${totalValue.toFixed(2)}` : ''}`;
          }
        }

        // Debug: Log the full API response structure
        console.log('🔍 Full API Response Structure:', JSON.stringify(result, null, 2));
        
        // Handle transfer argument requests with correct API structure
        const intentData = result.data?.intent;
        const interactiveData = result.data?.interactive || intentData?.interactiveData;
        const hasInteractiveData = interactiveData?.type === 'argumentRequest';
        const hasValidationIssues = intentData?.validation?.isValid === false;
        const hasMissingArgs = intentData?.validation?.missing && intentData.validation.missing.length > 0;
        
        // Alternative detection for transfer requests
        const isTransferArgRequest = intentData?.extraction?.actionType === 'transfer' && hasValidationIssues && hasMissingArgs;
        
        console.log('🔍 Argument Request Detection:', {
          hasInteractiveData,
          hasValidationIssues,
          hasMissingArgs,
          isTransferArgRequest,
          interactiveDataType: interactiveData?.type,
          validationIsValid: intentData?.validation?.isValid,
          missingArgs: intentData?.validation?.missing,
          extractionActionType: intentData?.extraction?.actionType,
          intentDataExists: !!intentData,
          interactiveDataExists: !!interactiveData
        });
        
        if ((hasInteractiveData && hasValidationIssues && hasMissingArgs) || isTransferArgRequest) {
          console.log('🔄 Argument request detected:', result);
          customMessage = "🚀 I can help you with that transfer! I just need a few more details to complete it.";
          
          // Show the ArgumentRequestModal
          setArgumentRequestData({
            interactiveData: interactiveData || {
              type: 'argumentRequest',
              message: 'I need more information to complete this action. Please provide:',
              components: [],
              missingArgs: intentData?.validation?.missing || []
            },
            validation: intentData?.validation,
            extraction: intentData?.extraction,
            classification: intentData?.classification,
            originalMessage: transcribedText
          });
          setShowArgumentRequest(true);
        }

        const voiceTransferRequestObj = (hasInteractiveData || isTransferArgRequest) ? {
          originalMessage: transcribedText,
          missingArguments: intentData?.validation?.missing || ['recipient', 'amount'],
          interactiveData: interactiveData,
          extraction: intentData?.extraction
        } : null;

        const aiResponse = {
          id: messages.length + 2,
          text: customMessage,
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          intentData: result.data.intent,
          portfolioData: result.data.portfolioData || null,
          transferRequest: voiceTransferRequestObj,
          responseType: result.type,
        };
        setMessages(prev => [...prev, aiResponse]);
      } else {
        // Handle insufficient funds or other business logic responses
        console.log('🔍 Processing business logic response:', result);
        console.log('🔍 Checking for insufficient funds:', {
          'result.data?.status': result.data?.status,
          'result.data?.requiresFunding': result.data?.requiresFunding,
          'result.status': result.status,
          'result.type': result.type
        });
        
        // Check for insufficient funds response (multiple possible locations)
        const isInsufficientFunds = 
          result.data?.status === 'insufficient_funds' || 
          result.data?.requiresFunding === true ||
          result.status === 'insufficient_funds' ||
          (result.type === 'transfer' && result.data?.status === 'insufficient_funds');
        
        // Check for approval failed response
        const isApprovalFailed = result.data?.status === 'approval_failed';
        
        if (isInsufficientFunds) {
          console.log('💰 Insufficient funds detected - showing funding modal');
          
          // Extract funding information from the response
          const fundingData = {
            walletAddress: result.data.walletAddress || result.data.fundingInstructions?.walletAddress,
            currentBalance: result.data.currentBalance || 0,
            requiredAmount: result.data.requiredAmount || 0,
            shortfall: result.data.shortfall || 0,
            token: extractTokenFromMessage(transcribedText) || 'TON',
            fundingInstructions: result.data.fundingInstructions
          };
          
          setInsufficientFundsData(fundingData);
          setShowInsufficientBalance(true);
          
          // Add a message to chat indicating insufficient funds
          const insufficientFundsMessage = {
            id: messages.length + 2,
            text: `💰 Insufficient balance detected! You need ${fundingData.shortfall} more ${fundingData.token}. Please fund your wallet to complete the transfer.`,
            isUser: false,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isInsufficientFunds: true,
          };
          setMessages(prev => [...prev, insufficientFundsMessage]);
          
        } else if (isApprovalFailed) {
          console.log('🔐 Token approval failed');
          const errorMessage = {
            id: messages.length + 2,
            text: `Failed to approve ${result.data.token} token for swapping: ${result.data.error}. Please try again or contact support.`,
            isUser: false,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isError: true,
          };
          setMessages(prev => [...prev, errorMessage]);
          
        } else {
          // Handle other types of failed responses
          throw new Error(result.error || 'Failed to process request');
        }
      }
    } catch (error) {
      console.error('Error calling enhanced-intent API:', error);
      
      // Check if the error response contains insufficient funds data
      if (error.response) {
        try {
          const errorData = typeof error.response === 'string' ? JSON.parse(error.response) : error.response;
          
          if (errorData.data?.status === 'insufficient_funds' || errorData.data?.requiresFunding) {
            console.log('💰 Found insufficient funds in error response');
            
            const fundingData = {
              walletAddress: errorData.data.walletAddress,
              currentBalance: errorData.data.currentBalance || 0,
              requiredAmount: errorData.data.requiredAmount || 0,
              shortfall: errorData.data.shortfall || 0,
              token: extractTokenFromMessage(transcribedText) || 'TON',
              fundingInstructions: errorData.data.fundingInstructions
            };
            
            setInsufficientFundsData(fundingData);
            setShowInsufficientBalance(true);
            return; // Don't show error message
          }
        } catch (parseError) {
          console.log('Could not parse error response for insufficient funds check');
        }
      }
      
      // Default error handling
      const errorMessage = {
        id: messages.length + 2,
        text: "Sorry, I encountered an error processing your voice message. Please try again.",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (inputText.trim()) {
      const userMessage = {
        id: messages.length + 1,
        text: inputText.trim(),
        isUser: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...messages, userMessage]);
      const currentInput = inputText.trim();
      setInputText('');
      setIsLoading(true);

      try {
        // API call to enhanced-intent endpoint
        const response = await fetch(API_CONFIG.getEnhancedIntentUrl(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: currentInput,
            userId: "68b2464f83132f5576e8ea8d",
            sessionId: "session-456"
          }),
        });

        const result = await response.json();
        console.log('Enhanced-intent API response (sendMessage):', result);
        console.log('🔍 Response structure (sendMessage):', {
          success: result.success,
          type: result.type,
          dataStatus: result.data?.status,
          dataRequiresFunding: result.data?.requiresFunding,
          hasData: !!result.data
        });
        
        if (result.success) {
          // Create a custom message for balance requests
          let customMessage = result.data.message || 'Request processed successfully!';
          
          if (result.type === 'portfolio-information' && result.data.portfolioData) {
            const portfolioData = result.data.portfolioData;
            const totalValue = portfolioData.totalUsdValue || 0;
            const hasTokens = portfolioData.tokenBalances?.some((token: any) => parseFloat(token.balanceFormatted) > 0);
            const nativeAmount = parseFloat(portfolioData.nativeBalance?.balanceFormatted || '0');
            
            if (totalValue === 0 && !hasTokens && nativeAmount === 0) {
              customMessage = "🦋 Here's your current wallet overview! Your wallet is currently empty, but that's just the beginning of your crypto journey. Ready to explore the DUCK ecosystem?";
            } else {
              const topToken = portfolioData.tokenBalances?.find((token: any) => parseFloat(token.balanceFormatted) > 0);
              const tokenCount = portfolioData.tokenBalances?.filter((token: any) => parseFloat(token.balanceFormatted) > 0).length || 0;
              
              customMessage = `✨ Your wallet is looking great! You have ${nativeAmount > 0 ? `${nativeAmount} TON` : ''}${nativeAmount > 0 && tokenCount > 0 ? ' and ' : ''}${tokenCount > 0 ? `${tokenCount} token${tokenCount > 1 ? 's' : ''} including ${topToken?.symbol}` : ''}. ${totalValue > 0 ? `Total value: $${totalValue.toFixed(2)}` : ''}`;
            }
          }

          // Debug: Log the full API response structure (sendMessage)
          console.log('🔍 Full API Response Structure (sendMessage):', JSON.stringify(result, null, 2));
          
          // Handle transfer argument requests with correct API structure
          const intentData = result.data?.intent;
          const interactiveData = result.data?.interactive || intentData?.interactiveData;
          const hasInteractiveData = interactiveData?.type === 'argumentRequest';
          const hasValidationIssues = intentData?.validation?.isValid === false;
          const hasMissingArgs = intentData?.validation?.missing && intentData.validation.missing.length > 0;
          
          // Alternative detection for transfer requests
          const isTransferArgRequest = intentData?.extraction?.actionType === 'transfer' && hasValidationIssues && hasMissingArgs;
          
          console.log('🔍 Argument Request Detection (sendMessage):', {
            hasInteractiveData,
            hasValidationIssues,
            hasMissingArgs,
            isTransferArgRequest,
            interactiveDataType: interactiveData?.type,
            validationIsValid: intentData?.validation?.isValid,
            missingArgs: intentData?.validation?.missing,
            extractionActionType: intentData?.extraction?.actionType,
            intentDataExists: !!intentData,
            interactiveDataExists: !!interactiveData
          });
          
          if ((hasInteractiveData && hasValidationIssues && hasMissingArgs) || isTransferArgRequest) {
            console.log('🔄 Argument request detected (sendMessage):', result);
            customMessage = "🚀 I can help you with that transfer! I just need a few more details to complete it.";
            
            // Show the ArgumentRequestModal
            setArgumentRequestData({
              interactiveData: interactiveData || {
                type: 'argumentRequest',
                message: 'I need more information to complete this action. Please provide:',
                components: [],
                missingArgs: intentData?.validation?.missing || []
              },
              validation: intentData?.validation,
              extraction: intentData?.extraction,
              classification: intentData?.classification,
              originalMessage: currentInput
            });
            setShowArgumentRequest(true);
          }

          console.log('API Result:', JSON.stringify(result, null, 2));
          
          const transferRequestObj = (hasInteractiveData || isTransferArgRequest) ? {
            originalMessage: currentInput,
            missingArguments: intentData?.validation?.missing || ['recipient', 'amount'],
            interactiveData: interactiveData,
            extraction: intentData?.extraction
          } : null;

          console.log('Created transferRequestObj:', JSON.stringify(transferRequestObj, null, 2));

          // Check if this is a strategy response
          const strategyData = result.type === 'strategy' && result.data.strategy ? {
            strategy: result.data.strategy,
            sourceStrategies: result.data.sourceStrategies,
            processingMetadata: result.data.processingMetadata,
            message: result.data.message
          } : null;

          // Check if this is strategy processing
          const strategyProcessingData = result.type === 'strategy_processing' ? {
            processingId: result.data.processingId,
            status: result.data.status,
            progress: result.data.progress,
            estimatedTime: result.data.estimatedTime
          } : null;

          const aiResponse = {
            id: messages.length + 2,
            text: strategyProcessingData ? strategyProcessingData.progress?.steps?.[0]?.name || 'AI Strategy Analysis Started' : 
                  strategyData ? strategyData.message : customMessage,
            isUser: false,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            intentData: result.data.intent,
            portfolioData: result.data.portfolioData || null,
            transferRequest: transferRequestObj,
            strategyData: strategyData,
            strategyProcessingData: strategyProcessingData,
            responseType: result.type,
          };
          setMessages(prev => [...prev, aiResponse]);
        } else {
          // Handle insufficient funds or other business logic responses
          console.log('🔍 Processing business logic response in sendMessage:', result);
          console.log('🔍 Checking for insufficient funds in sendMessage:', {
            'result.data?.status': result.data?.status,
            'result.data?.requiresFunding': result.data?.requiresFunding,
            'result.status': result.status,
            'result.type': result.type
          });
          
          // Check for insufficient funds response (multiple possible locations)
          const isInsufficientFunds = 
            result.data?.status === 'insufficient_funds' || 
            result.data?.requiresFunding === true ||
            result.status === 'insufficient_funds' ||
            (result.type === 'transfer' && result.data?.status === 'insufficient_funds');
          
          // Check for approval failed response
          const isApprovalFailed = result.data?.status === 'approval_failed';
          
          if (isInsufficientFunds) {
            console.log('💰 Insufficient funds detected in sendMessage - showing funding modal');
            
            // Extract funding information from the response
            const fundingData = {
              walletAddress: result.data.walletAddress || result.data.fundingInstructions?.walletAddress,
              currentBalance: result.data.currentBalance || 0,
              requiredAmount: result.data.requiredAmount || 0,
              shortfall: result.data.shortfall || 0,
              token: extractTokenFromMessage(currentInput) || 'TON',
              fundingInstructions: result.data.fundingInstructions
            };
            
            setInsufficientFundsData(fundingData);
            setShowInsufficientBalance(true);
            
            // Add a message to chat indicating insufficient funds
            const insufficientFundsMessage = {
              id: messages.length + 2,
              text: `💰 Insufficient balance detected! You need ${fundingData.shortfall} more ${fundingData.token}. Please fund your wallet to complete the transfer.`,
              isUser: false,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isInsufficientFunds: true,
            };
            setMessages(prev => [...prev, insufficientFundsMessage]);
            
          } else if (isApprovalFailed) {
            console.log('🔐 Token approval failed in sendMessage');
            const errorMessage = {
              id: messages.length + 2,
              text: `Failed to approve ${result.data.token} token for swapping: ${result.data.error}. Please try again or contact support.`,
              isUser: false,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isError: true,
            };
            setMessages(prev => [...prev, errorMessage]);
            
          } else {
            // Handle other types of failed responses
            throw new Error(result.error || 'Failed to process request');
          }
        }
      } catch (error) {
        console.error('Error calling enhanced-intent API:', error);
        
        // Check if the error response contains insufficient funds data
        if (error.response) {
          try {
            const errorData = typeof error.response === 'string' ? JSON.parse(error.response) : error.response;
            
            if (errorData.data?.status === 'insufficient_funds' || errorData.data?.requiresFunding) {
              console.log('💰 Found insufficient funds in error response (sendMessage)');
              
              const fundingData = {
                walletAddress: errorData.data.walletAddress,
                currentBalance: errorData.data.currentBalance || 0,
                requiredAmount: errorData.data.requiredAmount || 0,
                shortfall: errorData.data.shortfall || 0,
                token: extractTokenFromMessage(currentInput) || 'TON',
                fundingInstructions: errorData.data.fundingInstructions
              };
              
              setInsufficientFundsData(fundingData);
              setShowInsufficientBalance(true);
              return; // Don't show error message
            }
          } catch (parseError) {
            console.log('Could not parse error response for insufficient funds check (sendMessage)');
          }
        }
        
        // Default error handling
        const errorResponse = {
          id: messages.length + 2,
          text: 'I apologize, but I\'m having trouble processing your request right now. Please try again later.',
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
        };
        setMessages(prev => [...prev, errorResponse]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const startRecording = async () => {
    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'Microphone permission is required to record voice messages. Please grant permission in app settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Grant Permission', onPress: requestAudioPermission }
        ]
      );
      return;
    }

    try {
      setIsRecording(true);
      setRecordingTimer(0);
      
      // Start the 30-second timer
      timerRef.current = setInterval(() => {
        setRecordingTimer(prev => {
          const newTime = prev + 1;
          if (newTime >= maxRecordingTime) {
            stopRecording();
            return maxRecordingTime;
          }
          return newTime;
        });
      }, 1000);

      console.log('Voice recording session started (permissions granted)');
      console.log('🎙️ Recording active - microphone access enabled');
      
    } catch (error) {
      console.error('Error starting voice recording:', error);
      setIsRecording(false);
      Alert.alert('Recording Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      
      // Clear the timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      console.log('Voice recording session stopped');
      console.log('🎙️ Processing voice input...');
      
      // Process the recorded voice (with permission-based access)
      await processRecordedVoice();
      
    } catch (error) {
      console.error('Error stopping voice recording:', error);
      Alert.alert('Recording Error', 'Failed to stop recording. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.chatContainer} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.chatHeader, { paddingTop: safeAreaInsets.top + 10 }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setActiveTab('Home')}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.chatHeaderContent}>
          <Text style={styles.chatTitle}>AI Assistant</Text>
          <View style={styles.chatSubtitle}>
            <Text style={styles.butterflyIcon}>🦋</Text>
            <Text style={styles.mariposaText}>Mariposa</Text>
          </View>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} setMessages={setMessages} />
        ))}
        {isLoading && <LoadingIndicator />}
      </ScrollView>

      <ChatInputSection
        inputText={inputText}
        setInputText={setInputText}
        onSend={sendMessage}
        isRecording={isRecording}
        startRecording={startRecording}
        stopRecording={stopRecording}
        recordingAnim={recordingAnim}
        recordingTimer={recordingTimer}
        maxRecordingTime={maxRecordingTime}
      />

      <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

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
      {transferSuccessData && (
        <TransferSuccessModal
          visible={showTransferSuccess}
          transferResult={transferSuccessData}
          onClose={handleSuccessClose}
          onViewTransaction={handleViewTransaction}
        />
      )}

      {/* Argument Request Modal */}
      {argumentRequestData && (
        <ArgumentRequestModal
          visible={showArgumentRequest}
          interactiveData={argumentRequestData.interactiveData}
          validation={argumentRequestData.validation}
          extractedData={argumentRequestData.extraction}
          onClose={handleArgumentRequestClose}
          onSubmit={handleArgumentRequestSubmit}
        />
      )}
    </KeyboardAvoidingView>
  );
}

function IntentDataCard({ intentData }: { intentData: any }) {
  const { classification, extraction, validation } = intentData;
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pipeline': return '🔄';
      case 'buy': return '💰';
      case 'sell': return '💸';
      case 'transfer': return '📤';
      case 'price_movement': return '📈';
      default: return '⚡';
    }
  };

  const getStatusColor = (confidence: number) => {
    if (confidence >= 0.8) return '#22C55E';
    if (confidence >= 0.6) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <View style={styles.intentCard}>
      {/* Header with Classification */}
      <View style={styles.intentHeader}>
        <View style={styles.intentTypeContainer}>
          <Text style={styles.intentTypeIcon}>
            {getTypeIcon(classification.type)}
          </Text>
          <Text style={styles.intentTypeText}>
            {classification.type.charAt(0).toUpperCase() + classification.type.slice(1)}
          </Text>
        </View>
        <View style={[
          styles.confidenceIndicator,
          { backgroundColor: getStatusColor(classification.confidence) }
        ]}>
          <Text style={styles.confidenceText}>
            {Math.round(classification.confidence * 100)}%
          </Text>
        </View>
      </View>

      {/* Pipeline Details */}
      {extraction.type === 'pipeline' && extraction.pipeline && (
        <View style={styles.pipelineContainer}>
          {/* Trigger */}
          {extraction.pipeline.trigger && (
            <View style={styles.triggerSection}>
              <Text style={styles.sectionTitle}>🎯 Trigger</Text>
              <View style={styles.triggerCard}>
                <Text style={styles.triggerText}>
                  {extraction.pipeline.trigger.token} {extraction.pipeline.trigger.direction} by{' '}
                  <Text style={styles.highlightText}>
                    {extraction.pipeline.trigger.percentage}%
                  </Text>
                  {' '}in {extraction.pipeline.trigger.timeframe}
                </Text>
              </View>
            </View>
          )}

          {/* Actions */}
          {extraction.pipeline.actions && extraction.pipeline.actions.length > 0 && (
            <View style={styles.actionsSection}>
              <Text style={styles.sectionTitle}>⚡ Actions</Text>
              {extraction.pipeline.actions.map((action: any, index: number) => (
                <View key={index} style={styles.actionCard}>
                  <View style={styles.actionHeader}>
                    <Text style={styles.actionIcon}>
                      {getTypeIcon(action.type)}
                    </Text>
                    <Text style={styles.actionType}>
                      {action.type.charAt(0).toUpperCase() + action.type.slice(1)}
                    </Text>
                  </View>
                  <View style={styles.actionDetails}>
                    {action.token && (
                      <Text style={styles.actionDetail}>
                        Token: <Text style={styles.tokenText}>{action.token}</Text>
                      </Text>
                    )}
                    {action.amount && (
                      <Text style={styles.actionDetail}>
                        Amount: <Text style={styles.amountText}>
                          {typeof action.amount === 'string' ? action.amount : `$${action.amount.toLocaleString()}`}
                        </Text>
                      </Text>
                    )}
                    {action.destination && (
                      <Text style={styles.actionDetail}>
                        To: <Text style={styles.addressText}>
                          {action.destination.substring(0, 8)}...{action.destination.slice(-6)}
                        </Text>
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Metadata */}
          {extraction.pipeline.metadata && (
            <View style={styles.metadataSection}>
              <View style={styles.metadataBadges}>
                <View style={[styles.metadataBadge, { backgroundColor: '#3B82F620' }]}>
                  <Text style={[styles.metadataBadgeText, { color: '#3B82F6' }]}>
                    {extraction.pipeline.metadata.priority} priority
                  </Text>
                </View>
                <View style={[styles.metadataBadge, { backgroundColor: '#8B5CF620' }]}>
                  <Text style={[styles.metadataBadgeText, { color: '#8B5CF6' }]}>
                    {extraction.pipeline.metadata.execution_mode}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Validation Status */}
      <View style={styles.validationSection}>
        <LinearGradient
          colors={validation.isValid ? ['#22C55E20', '#22C55E10'] : ['#EF444420', '#EF444410']}
          style={styles.validationCard}
        >
          <View style={styles.validationHeader}>
            <Text style={styles.validationIcon}>
              {validation.isValid ? '✅' : '❌'}
            </Text>
            <Text style={[
              styles.validationText,
              { color: validation.isValid ? '#22C55E' : '#EF4444' }
            ]}>
              {validation.isValid ? 'Valid Intent' : 'Invalid Intent'}
            </Text>
            <Text style={styles.qualityScore}>
              Quality: {validation.quality}%
            </Text>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

function TransferArgumentCard({ transferRequest }: { transferRequest: any }) {
  const [recipientValue, setRecipientValue] = useState('');
  const [amountValue, setAmountValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debug logging
  console.log('TransferArgumentCard received:', transferRequest);

  const handleSubmit = async () => {
    if (!recipientValue.trim() || !amountValue.trim()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Call the API with the collected arguments
      const response = await fetch(API_CONFIG.getEnhancedIntentUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `${transferRequest?.originalMessage || 'transfer'} to ${recipientValue} amount ${amountValue}`,
          userId: "68b2464f83132f5576e8ea8d",
          sessionId: "session-456",
          providedArguments: {
            recipient: recipientValue,
            amount: amountValue
          }
        }),
      });

      const result = await response.json();
      console.log('Transfer API response:', result);
      
      if (result.success) {
        // Reset form after successful submission
        setRecipientValue('');
        setAmountValue('');
        
        // You could add the response as a new message here
        Alert.alert('Transfer Submitted', 'Your transfer request has been processed successfully!');
      } else {
        throw new Error('Transfer submission failed');
      }
    } catch (error) {
      console.error('Transfer submission error:', error);
      Alert.alert('Error', 'Failed to submit transfer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMissingArguments = () => {
    console.log('getMissingArguments called');
    console.log('transferRequest:', JSON.stringify(transferRequest, null, 2));
    
    const missing = [];
    const missingArgs = transferRequest?.missingArguments || [];
    
    console.log('missingArgs:', missingArgs);
    console.log('missingArgs type:', typeof missingArgs);
    console.log('missingArgs is array:', Array.isArray(missingArgs));
    
    try {
      if (Array.isArray(missingArgs) && missingArgs.includes('recipient')) {
        missing.push('recipient');
      }
      if (Array.isArray(missingArgs) && missingArgs.includes('amount')) {
        missing.push('amount');
      }
    } catch (error) {
      console.error('Error in getMissingArguments:', error);
    }
    
    // If no specific missing arguments, default to both
    if (missing.length === 0) {
      missing.push('recipient', 'amount');
    }
    
    console.log('final missing args:', missing);
    return missing;
  };

  // Safety check
  if (!transferRequest) {
    console.error('TransferArgumentCard: transferRequest is null or undefined');
    return null;
  }

  const missingArgs = getMissingArguments();

  return (
    <View style={styles.transferCard}>
      {/* Beautiful Orange Header */}
      <LinearGradient
        colors={['#FF6B35', '#FF8A5B', '#FFB084']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.transferHeaderGradient}
      >
        <View style={styles.transferHeaderContent}>
          <View style={styles.transferTypeContainer}>
            <View style={styles.transferIconContainer}>
              <Text style={styles.transferTypeIcon}>📤</Text>
            </View>
            <View>
              <Text style={styles.transferTypeText}>Transfer Request</Text>
              <Text style={styles.transferSubtext}>Please provide missing details</Text>
            </View>
          </View>
          <View style={styles.transferStatusIndicator}>
            <Text style={styles.transferStatusText}>Pending</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.transferContent}>
        {/* Request Details */}
        <View style={styles.transferDetailsSection}>
          <Text style={styles.transferSectionTitle}>💎 Original Request</Text>
          <View style={styles.transferOriginalRequest}>
            <Text style={styles.transferOriginalText}>{transferRequest?.originalMessage || 'Transfer request'}</Text>
          </View>
        </View>

        {/* Missing Arguments Form */}
        <View style={styles.transferFormSection}>
          <Text style={styles.transferSectionTitle}>✨ Complete Your Transfer</Text>
          
          {missingArgs.includes('recipient') && (
            <View style={styles.transferInputGroup}>
              <Text style={styles.transferInputLabel}>👤 Recipient Address</Text>
              <View style={styles.transferInputContainer}>
                <TextInput
                  style={styles.transferInput}
                  placeholder="Enter wallet address or username"
                  placeholderTextColor="#FFB084"
                  value={recipientValue}
                  onChangeText={setRecipientValue}
                  multiline={false}
                  autoCapitalize="none"
                />
              </View>
            </View>
          )}

          {missingArgs.includes('amount') && (
            <View style={styles.transferInputGroup}>
              <Text style={styles.transferInputLabel}>💰 Amount</Text>
              <View style={styles.transferInputContainer}>
                <TextInput
                  style={styles.transferInput}
                  placeholder="Enter amount (e.g., 1.5)"
                  placeholderTextColor="#FFB084"
                  value={amountValue}
                  onChangeText={setAmountValue}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.transferTokenSymbol}>TON</Text>
              </View>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity 
            style={[
              styles.transferSubmitButton,
              (!recipientValue.trim() || !amountValue.trim() || isSubmitting) && styles.transferSubmitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!recipientValue.trim() || !amountValue.trim() || isSubmitting}
          >
            <LinearGradient
              colors={
                (!recipientValue.trim() || !amountValue.trim() || isSubmitting) 
                  ? ['#FFD4B8', '#FFE5D4'] 
                  : ['#FF6B35', '#FF8A5B']
              }
              style={styles.transferSubmitGradient}
            >
              <Text style={[
                styles.transferSubmitText,
                (!recipientValue.trim() || !amountValue.trim() || isSubmitting) && styles.transferSubmitTextDisabled
              ]}>
                {isSubmitting ? '⏳ Processing...' : '🚀 Execute Transfer'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function PortfolioDataCard({ portfolioData }: { portfolioData: any }) {
  const getPortfolioIcon = (type: string) => {
    switch (type) {
      case 'balance': return '💰';
      case 'token-balance': return '🪙';
      case 'portfolio-summary': return '📊';
      default: return '📈';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatTokenAmount = (amount: string, decimals: number = 6) => {
    const num = parseFloat(amount);
    if (num === 0) return '0';
    if (num < 0.000001) return num.toExponential(2);
    return num.toFixed(decimals).replace(/\.?0+$/, '');
  };

  const getTokenIcon = (symbol: string) => {
    switch (symbol.toUpperCase()) {
      case 'DUCK': return '🦆';
      case 'TON': return '💎';
      case 'WTON': return '🔷';
      case 'USDT': return '💵';
      case 'BTC': return '₿';
      case 'ETH': return 'Ξ';
      default: return '🪙';
    }
  };

  const getTokenGradient = (symbol: string) => {
    switch (symbol.toUpperCase()) {
      case 'DUCK': return ['#FF6B35', '#FF8A5B'];
      case 'TON': return ['#FFB084', '#FFCAA8'];
      case 'WTON': return ['#FF9068', '#FFB084'];
      case 'USDT': return ['#FFCAA8', '#FFE5D4'];
      case 'BTC': return ['#FF7043', '#FF9068'];
      case 'ETH': return ['#FF8A65', '#FFAB91'];
      default: return ['#FFB074', '#FFC09F'];
    }
  };

  const isEmpty = portfolioData?.nativeBalance?.balanceFormatted === '0' && 
                  (!portfolioData?.tokenBalances || portfolioData.tokenBalances.every((token: any) => parseFloat(token.balanceFormatted) === 0));

  return (
    <View style={styles.portfolioCard}>
      {/* Beautiful Orange Header */}
      <LinearGradient
        colors={['#FF6B35', '#FF8A5B', '#FFB084']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.portfolioHeaderGradient}
      >
        <View style={styles.portfolioHeaderContent}>
          <View style={styles.portfolioTypeContainer}>
            <View style={styles.portfolioIconContainer}>
              <Text style={styles.portfolioTypeIcon}>
                💰
              </Text>
            </View>
            <View>
              <Text style={styles.portfolioTypeText}>Wallet Balance</Text>
              <Text style={styles.portfolioSubtext}>{portfolioData.network || 'DUCK'} Network</Text>
            </View>
          </View>
          <View style={styles.portfolioTimestamp}>
            <Text style={styles.portfolioTimestampText}>
              {new Date(portfolioData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.portfolioContent}>
        {isEmpty ? (
          <EmptyWalletDisplay portfolioData={portfolioData} />
        ) : (
          <WalletBalanceDisplay portfolioData={portfolioData} formatCurrency={formatCurrency} formatTokenAmount={formatTokenAmount} getTokenIcon={getTokenIcon} getTokenGradient={getTokenGradient} />
        )}
      </View>
    </View>
  );
}

function EmptyWalletDisplay({ portfolioData }: { portfolioData: any }) {
  return (
    <View style={styles.emptyWalletContainer}>
      <LinearGradient
        colors={['#FFE5D4', '#FFD4B8', '#FFC09F']}
        style={styles.emptyWalletCard}
      >
        <Text style={styles.emptyWalletIcon}>🦋</Text>
        <Text style={styles.emptyWalletTitle}>Welcome to Mariposa</Text>
        <Text style={styles.emptyWalletMessage}>
          Your crypto journey starts here! Your wallet is ready to receive DUCK tokens and explore the ecosystem.
        </Text>
        
        <View style={styles.addressContainer}>
          <Text style={styles.addressLabel}>Your Wallet Address</Text>
          <View style={styles.addressCard}>
            <Text style={styles.addressText}>
              {portfolioData.address?.substring(0, 8)}...{portfolioData.address?.slice(-6)}
            </Text>
            <TouchableOpacity style={styles.copyButton}>
              <Text style={styles.copyIcon}>📋</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.emptyActionContainer}>
          <TouchableOpacity style={styles.emptyActionButton}>
            <LinearGradient
              colors={['#FF6B35', '#FF8A5B']}
              style={styles.emptyActionGradient}
            >
              <Text style={styles.emptyActionIcon}>🦆</Text>
              <Text style={styles.emptyActionText}>Get DUCK</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.emptyActionButton}>
            <LinearGradient
              colors={['#FFB084', '#FFCAA8']}
              style={styles.emptyActionGradient}
            >
              <Text style={styles.emptyActionIcon}>🔄</Text>
              <Text style={styles.emptyActionText}>Refresh</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

function WalletBalanceDisplay({ portfolioData, formatCurrency, formatTokenAmount, getTokenIcon, getTokenGradient }: any) {
  const nativeBalance = portfolioData.nativeBalance?.balanceFormatted || '0';
  const nativeUsdValue = portfolioData.nativeBalance?.usdValue || 0;
  const allTokens = [
    ...(portfolioData.nativeBalance ? [{
      symbol: 'TON',
      balanceFormatted: portfolioData.nativeBalance.balanceFormatted,
      usdValue: portfolioData.nativeBalance.usdValue,
      usdPrice: portfolioData.priceData?.TON?.price || 0,
      isNative: true
    }] : []),
    ...(portfolioData.tokenBalances || [])
  ].filter(token => parseFloat(token.balanceFormatted) > 0);

  return (
    <View style={styles.modernWalletContainer}>
      {/* Main Balance Card with Native TON */}
      <LinearGradient
        colors={['#4ADE80', '#22C55E']}
        style={styles.mainBalanceCard}
      >
        <Text style={styles.myBalanceLabel}>TON Balance</Text>
        <View style={styles.balanceRow}>
          <Text style={styles.mainBalanceAmount}>
            {formatTokenAmount(nativeBalance)} TON
          </Text>
          <Text style={styles.tonIcon}>💎</Text>
        </View>
        <Text style={styles.usdEquivalent}>
          ≈ {formatCurrency(nativeUsdValue)}
        </Text>
        <View style={styles.balanceChangeIndicator}>
          <Text style={styles.balanceChangeText}>● TON</Text>
        </View>
      </LinearGradient>

      {/* QR Code Section */}
      <View style={styles.qrCodeContainer}>
        <Text style={styles.qrCodeTitle}>Wallet Address</Text>
        <View style={styles.qrCodeCard}>
          <View style={styles.qrCodeWrapper}>
            <Image
              source={{
                uri: `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(portfolioData.address || 'No address available')}&bgcolor=FFFFFF&color=000000&margin=10`
              }}
              style={styles.qrCodeImage}
              resizeMode="contain"
            />
          </View>
          
          <View style={styles.addressContainer}>
            <Text style={styles.addressText}>
              {portfolioData.address?.substring(0, 8)}...{portfolioData.address?.slice(-6)}
            </Text>
            <TouchableOpacity style={styles.copyAddressButton}>
              <Text style={styles.copyIcon}>📋</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Portfolio Section */}
      <View style={styles.portfolioSection}>
        <View style={styles.portfolioHeader}>
          <Text style={styles.portfolioTitle}>Portfolio</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllButton}>See All</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.portfolioGrid}>
          {allTokens
            .filter(token => parseFloat(token.balanceFormatted) > 0)
            .slice(0, 3)
            .map((token: any, index: number) => (
              <View key={index} style={styles.portfolioTokenCard}>
                <View style={styles.portfolioTokenHeader}>
                  <View style={[
                    styles.portfolioTokenIcon,
                    { backgroundColor: getTokenColor(token.symbol) }
                  ]}>
                    <Text style={styles.portfolioTokenIconText}>
                      {getTokenIcon(token.symbol)}
                    </Text>
                  </View>
                  <View style={styles.portfolioTokenInfo}>
                    <Text style={styles.portfolioTokenName}>
                      {getTokenName(token.symbol)}
                    </Text>
                    <Text style={styles.portfolioTokenBalance}>
                      {formatTokenAmount(token.balanceFormatted)} {token.symbol}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.portfolioTokenValues}>
                  <Text style={styles.portfolioTokenAmount}>
                    {formatCurrency(token.usdValue)}
                  </Text>
                  
                  <Text style={styles.portfolioTokenChange}>
                    ▲ +0.5%
                  </Text>
                </View>
              </View>
            ))}
        </View>
      </View>
    </View>
  );
}

// Helper functions for token display
function getTokenColor(symbol: string) {
  switch (symbol.toUpperCase()) {
    case 'BTC': case 'TON': return '#F7931A';
    case 'ETH': return '#627EEA'; 
    case 'XRP': return '#000000';
    case 'DUCK': return '#FF6B35';
    default: return '#8B5CF6';
  }
}

function getTokenName(symbol: string) {
  switch (symbol.toUpperCase()) {
    case 'BTC': return 'Bitcoin';
    case 'ETH': return 'Ethereum';
    case 'XRP': return 'XRP';
    case 'TON': return 'Toncoin';
    case 'DUCK': return 'Duck Token';
    case 'USDT': return 'Tether';
    case 'WTON': return 'Wrapped TON';
    default: return symbol;
  }
}

function MessageBubble({ message, setMessages }: { message: any, setMessages: any }) {
  return (
    <View style={[
      styles.messageContainer,
      message.isUser ? styles.userMessageContainer : styles.aiMessageContainer
    ]}>
      <View style={[
        styles.messageBubble,
        message.isUser ? styles.userMessage : styles.aiMessage,
        message.isError && styles.errorMessage
      ]}>
        <View style={styles.messageHeader}>
          <Text style={[
            styles.messageText,
            message.isUser ? styles.userMessageText : styles.aiMessageText,
            message.isError && styles.errorMessageText,
            message.isVoiceMessage && styles.voiceMessageText
          ]}>
            {message.text}
          </Text>
          {message.isVoiceMessage && (
            <View style={styles.voiceIndicator}>
              <Text style={styles.voiceIcon}>🎙️</Text>
            </View>
          )}
        </View>
        
        {/* Beautiful Intent Data Display */}
        {message.intentData && (
          <IntentDataCard intentData={message.intentData} />
        )}
        
        {/* Beautiful Transfer Argument Request */}
        {message.transferRequest && (
          <TransferArgumentCard transferRequest={message.transferRequest} />
        )}
        
        {/* Beautiful Portfolio Data Display */}
        {message.portfolioData && (
          <PortfolioDataCard portfolioData={message.portfolioData} />
        )}
        
        {/* Strategy Analysis Display */}
        {message.strategyData && (
          <StrategyMessageComponent
            strategy={message.strategyData.strategy}
            sourceStrategies={message.strategyData.sourceStrategies}
            processingMetadata={message.strategyData.processingMetadata}
            timestamp={message.timestamp}
          />
        )}
        
        {/* Strategy Processing Loading */}
        {message.strategyProcessingData && (
          <StrategyLoadingComponent
            processingId={message.strategyProcessingData.processingId}
            progress={message.strategyProcessingData.progress}
            onComplete={(result) => {
              // Replace the loading message with the completed strategy
              setMessages(prev => prev.map(msg => 
                msg.id === message.id ? {
                  ...msg,
                  strategyProcessingData: null,
                  strategyData: {
                    strategy: result.data.strategy,
                    sourceStrategies: result.data.sourceStrategies,
                    processingMetadata: result.data.processingMetadata,
                    message: result.data.message
                  },
                  text: result.data.message
                } : msg
              ));
            }}
            onError={(error) => {
              console.error('Strategy processing error:', error);
              // Update message to show error
              setMessages(prev => prev.map(msg => 
                msg.id === message.id ? {
                  ...msg,
                  strategyProcessingData: null,
                  text: `❌ Strategy processing failed: ${error}`,
                  isError: true
                } : msg
              ));
            }}
          />
        )}
      </View>
      <Text style={[
        styles.timestamp,
        message.isUser ? styles.userTimestamp : styles.aiTimestamp
      ]}>
        {message.timestamp}
      </Text>
    </View>
  );
}

function LoadingIndicator() {
  return (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingBubble}>
        <View style={styles.loadingHeader}>
          <Text style={styles.loadingIcon}>🤖</Text>
          <Text style={styles.loadingTitle}>Processing Intent...</Text>
        </View>
        <View style={styles.loadingSteps}>
          <Text style={styles.loadingStep}>🔍 Analyzing message</Text>
          <Text style={styles.loadingStep}>🧠 Extracting intent</Text>
          <Text style={styles.loadingStep}>✨ Preparing response</Text>
        </View>
        <View style={styles.loadingDots}>
          <View style={[styles.loadingDot, { animationDelay: '0s' }]} />
          <View style={[styles.loadingDot, { animationDelay: '0.2s' }]} />
          <View style={[styles.loadingDot, { animationDelay: '0.4s' }]} />
        </View>
      </View>
    </View>
  );
}

function ChatInputSection({ inputText, setInputText, onSend, isRecording, startRecording, stopRecording, recordingAnim, recordingTimer, maxRecordingTime }: any) {
  const safeAreaInsets = useSafeAreaInsets();

  return (
    <View style={[styles.inputContainer, { paddingBottom: safeAreaInsets.bottom + 10 }]}>
      {isRecording && (
        <Animated.View style={[
          styles.recordingIndicator,
          {
            opacity: recordingAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 1],
            }),
          }
        ]}>
          <View style={styles.waveform}>
            {[1, 2, 3, 4, 5].map(i => (
              <Animated.View
                key={i}
                style={[
                  styles.waveBar,
                  {
                    height: recordingAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [4, 20],
                    }),
                  }
                ]}
              />
            ))}
          </View>
          <Text style={styles.recordingText}>Recording...</Text>
        </Animated.View>
      )}
      
      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          placeholder="Ask me anything..."
          placeholderTextColor="#9CA3AF"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        
        {inputText.length > 0 ? (
          <TouchableOpacity style={styles.sendButton} onPress={onSend}>
            <LinearGradient
              colors={['#FF6B35', '#FF8A5B']}
              style={styles.sendButtonGradient}
            >
              <Text style={styles.sendIcon}>→</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View>
            <TouchableOpacity
              style={styles.recordButton}
              onPressIn={startRecording}
              onPressOut={stopRecording}
            >
              <LinearGradient
                colors={isRecording ? ['#EF4444', '#F87171'] : ['#FF6B35', '#FF8A5B']}
                style={styles.recordButtonGradient}
              >
                <Text style={styles.micIcon}>🎙️</Text>
              </LinearGradient>
            </TouchableOpacity>
            {isRecording && (
              <View style={styles.recordingTimer}>
                <Text style={styles.recordingTimerText}>
                  {recordingTimer}s / {maxRecordingTime}s
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function BottomNavigation({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: string) => void }) {
  const safeAreaInsets = useSafeAreaInsets();
  
  return (
    <View style={[styles.bottomNav, { paddingBottom: safeAreaInsets.bottom }]}>
      {BOTTOM_TABS.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[
            styles.bottomTab,
            tab.isAgent && styles.agentTab
          ]}
          onPress={() => setActiveTab(tab.title)}
        >
          {tab.isAgent ? (
            <LinearGradient
              colors={['#FF6B35', '#FF8A5B']}
              style={styles.agentButton}
            >
              <Text style={styles.agentIcon}>{tab.icon}</Text>
            </LinearGradient>
          ) : (
            <Text style={[
              styles.bottomTabIcon,
              { opacity: activeTab === tab.title ? 1 : 0.6 }
            ]}>
              {tab.icon}
            </Text>
          )}
          {!tab.isAgent && (
            <Text style={[
              styles.bottomTabText,
              { 
                color: activeTab === tab.title ? '#FF6B35' : '#9CA3AF',
                fontWeight: activeTab === tab.title ? '700' : '500',
                opacity: activeTab === tab.title ? 1 : 0.7
              }
            ]}>
              {tab.title}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerContainer: {
    overflow: 'hidden',
  },
  headerGradient: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  header: {
    // No additional styling needed
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userInfo: {
    flex: 1,
  },
  greetingText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '500',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 2,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationIcon: {
    fontSize: 20,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#F8F9FA',
    paddingTop: 20,
  },
  balanceCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '500',
  },
  eyeButton: {
    padding: 4,
  },
  eyeIcon: {
    fontSize: 20,
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
  },
  balanceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  trendIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#22C55E20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendArrow: {
    fontSize: 16,
  },
  balanceAmount: {
    color: '#1A1A1A',
    fontSize: 42,
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: -1,
  },
  dailyChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  changeIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  dailyChange: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  dailyLabel: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  balanceCardBackground: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '100%',
    height: '100%',
    zIndex: -1,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF6B3508',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3B82F608',
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionIconText: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  actionTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  virtualCard: {
    borderRadius: 24,
    padding: 28,
    marginBottom: 32,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  virtualCardContent: {
    flex: 1,
  },
  virtualBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  virtualBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  virtualIntro: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  virtualTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  virtualSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    marginBottom: 16,
  },
  virtualButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  virtualButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  virtualCharacter: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  characterEmoji: {
    fontSize: 56,
  },
  characterGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    zIndex: -1,
  },
  discoverSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 16,
  },
  discoverButton: {
    flex: 1,
  },
  discoverCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  discoverIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  discoverEmoji: {
    fontSize: 20,
  },
  discoverText: {
    color: '#7C3AED',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  discoverSubtext: {
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.8,
  },
  rewardsButton: {
    flex: 1,
  },
  rewardsCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  rewardsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  rewardsEmoji: {
    fontSize: 20,
  },
  rewardsText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  rewardsSubtext: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.8,
  },
  bottomNav: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 15,
  },
  bottomTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  bottomTabIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  bottomTabText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  agentTab: {
    marginTop: -20,
  },
  agentButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  agentIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  // Chat Interface Styles
  chatContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  chatHeader: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 18,
    color: '#1F2937',
    fontWeight: '600',
  },
  chatHeaderContent: {
    flex: 1,
    alignItems: 'center',
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  chatSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mariposaText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 100,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  aiMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 4,
  },
  userMessage: {
    backgroundColor: '#FF6B35',
    borderBottomRightRadius: 6,
  },
  aiMessage: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  aiMessageText: {
    color: '#1F2937',
    fontWeight: '400',
  },
  timestamp: {
    fontSize: 12,
    fontWeight: '400',
    marginHorizontal: 16,
  },
  userTimestamp: {
    color: '#6B7280',
    textAlign: 'right',
  },
  aiTimestamp: {
    color: '#9CA3AF',
    textAlign: 'left',
  },
  loadingContainer: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  loadingBubble: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B35',
    opacity: 0.6,
  },
  loadingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  loadingIcon: {
    fontSize: 20,
  },
  loadingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  loadingSteps: {
    gap: 4,
    marginBottom: 12,
  },
  loadingStep: {
    fontSize: 12,
    color: '#6B7280',
    opacity: 0.8,
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  recordingIndicator: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  waveBar: {
    width: 3,
    backgroundColor: '#EF4444',
    borderRadius: 2,
  },
  recordingText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sendButton: {
    width: 44,
    height: 44,
  },
  sendButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sendIcon: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  recordButton: {
    width: 44,
    height: 44,
  },
  recordButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  micIcon: {
    fontSize: 18,
  },
  recordingTimer: {
    position: 'absolute',
    top: -25,
    left: -20,
    right: -20,
    alignItems: 'center',
  },
  recordingTimerText: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: '600',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  // Voice message styles
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  voiceIndicator: {
    marginLeft: 8,
    marginTop: 2,
  },
  voiceIcon: {
    fontSize: 14,
    opacity: 0.7,
  },
  voiceMessageText: {
    flex: 1,
  },
  // Error message styles
  errorMessage: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
  },
  errorMessageText: {
    color: '#DC2626',
  },
  // Intent Data Card Styles
  intentCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  intentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  intentTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  intentTypeIcon: {
    fontSize: 20,
  },
  intentTypeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  confidenceIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  pipelineContainer: {
    gap: 16,
  },
  triggerSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  triggerCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  triggerText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },
  highlightText: {
    fontWeight: '700',
    color: '#B45309',
  },
  actionsSection: {
    marginBottom: 12,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  actionIcon: {
    fontSize: 16,
  },
  actionType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  actionDetails: {
    gap: 4,
  },
  actionDetail: {
    fontSize: 13,
    color: '#6B7280',
  },
  tokenText: {
    fontWeight: '600',
    color: '#3B82F6',
  },
  amountText: {
    fontWeight: '700',
    color: '#059669',
  },
  addressText: {
    fontWeight: '500',
    color: '#8B5CF6',
    fontFamily: 'monospace',
  },
  metadataSection: {
    marginTop: 8,
  },
  metadataBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  metadataBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metadataBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  validationSection: {
    marginTop: 12,
  },
  validationCard: {
    borderRadius: 12,
    padding: 12,
  },
  validationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  validationIcon: {
    fontSize: 16,
  },
  validationText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  qualityScore: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  // Portfolio Data Card Styles
  portfolioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  portfolioTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  portfolioTypeIcon: {
    fontSize: 20,
  },
  portfolioTypeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  portfolioTimestamp: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  portfolioTimestampText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  portfolioContent: {
    gap: 16,
  },
  totalValueSection: {
    marginBottom: 8,
  },
  totalValueCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: 8,
  },
  totalValueLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  totalValueAmount: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  balanceSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
  },
  balanceSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  balanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLeft: {
    flex: 1,
  },
  balanceToken: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  balanceAmount: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  balanceRight: {
    alignItems: 'flex-end',
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 2,
  },
  balancePrice: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  tokenSection: {
    backgroundColor: '#FEF7FF',
    borderRadius: 12,
    padding: 16,
  },
  tokenSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  tokenItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tokenLeft: {
    flex: 1,
  },
  tokenSymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7C3AED',
    marginBottom: 2,
  },
  tokenAmount: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  tokenRight: {
    alignItems: 'flex-end',
  },
  tokenValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 2,
  },
  tokenPrice: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  analyticsSection: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
  },
  analyticsSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  analyticsItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    minWidth: 80,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 4,
  },
  analyticsValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  diversificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  diversificationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  priceDataSection: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
  },
  priceDataTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  priceDataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  priceDataItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    minWidth: 100,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  priceDataSymbol: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D97706',
    marginBottom: 4,
  },
  priceDataPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  priceDataChange: {
    fontSize: 12,
    fontWeight: '600',
  },
  // New Modern Balance UI Styles
  portfolioHeaderGradient: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  portfolioHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  portfolioIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  portfolioSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  // Empty Wallet Styles
  emptyWalletContainer: {
    padding: 0,
  },
  emptyWalletCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#ff9a9e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  emptyWalletIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyWalletTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  emptyWalletMessage: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  addressContainer: {
    width: '100%',
    marginBottom: 24,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
    textAlign: 'center',
  },
  addressCard: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addressText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  copyButton: {
    padding: 4,
  },
  copyIcon: {
    fontSize: 16,
  },
  emptyActionContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  emptyActionButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyActionGradient: {
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  emptyActionIcon: {
    fontSize: 20,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  // Total Value Decorations
  totalValueDecorations: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
    opacity: 0.3,
  },
  totalValueDecoration: {
    fontSize: 16,
  },
  // Balance Section Header
  balanceSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  balanceBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  nativeBalanceCard: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#FFB084',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  tokenIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  tokenIcon: {
    fontSize: 28,
  },
  balanceTokenName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  // Token Section Header
  tokenSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tokenCount: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tokenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  modernTokenCard: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  tokenCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modernTokenIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  modernTokenIcon: {
    fontSize: 16,
  },
  modernTokenSymbol: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tokenCardBody: {
    marginBottom: 8,
  },
  modernTokenAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modernTokenValue: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  tokenCardFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 8,
  },
  modernTokenPrice: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  // Address Section
  addressSection: {
    marginTop: 16,
  },
  addressSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  modernAddressCard: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#f093fb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addressGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  modernAddressText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modernCopyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernCopyIcon: {
    fontSize: 14,
  },
  // New Modern Wallet Design (Reference-based)
  modernWalletContainer: {
    gap: 20,
  },
  mainBalanceCard: {
    borderRadius: 16,
    padding: 24,
    position: 'relative',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  myBalanceLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.9,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  mainBalanceAmount: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    flex: 1,
  },
  tonIcon: {
    fontSize: 24,
    marginLeft: 8,
  },
  usdEquivalent: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  balanceChangeIndicator: {
    position: 'absolute',
    top: 20,
    right: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  balanceChangeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  // QR Code Section Styles
  qrCodeContainer: {
    gap: 12,
  },
  qrCodeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  qrCodeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  qrCodeWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  qrCodeImage: {
    width: 160,
    height: 160,
    borderRadius: 12,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  addressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'center',
  },
  copyAddressButton: {
    padding: 4,
  },
  copyIcon: {
    fontSize: 18,
  },
  portfolioSection: {
    gap: 16,
  },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  portfolioTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  seeAllButton: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  portfolioGrid: {
    gap: 12,
  },
  portfolioTokenCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    minWidth: '100%',
    marginBottom: 12,
  },
  portfolioTokenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  portfolioTokenIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  portfolioTokenIconText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  portfolioTokenInfo: {
    flex: 1,
  },
  portfolioTokenName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
    flexWrap: 'nowrap',
  },
  portfolioTokenBalance: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  portfolioTokenValues: {
    alignItems: 'flex-end',
  },
  portfolioTokenAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  portfolioTokenChange: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  // New Sections Styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: '#1A1A1A',
    fontSize: 20,
    fontWeight: '700',
  },
  seeAllText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
  },
  // My Pockets Styles
  pocketsSection: {
    marginBottom: 32,
  },
  pocketsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  pocketCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  pocketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  pocketIcon: {
    fontSize: 20,
  },
  pocketName: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  lockIcon: {
    fontSize: 14,
    opacity: 0.6,
  },
  pocketTarget: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  pocketAmount: {
    color: '#1A1A1A',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '600',
  },
  // Transfer Argument Request Styles
  transferCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  transferHeaderGradient: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  transferHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transferTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transferIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  transferTypeIcon: {
    fontSize: 20,
  },
  transferTypeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  transferSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  transferStatusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transferStatusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  transferContent: {
    gap: 16,
  },
  transferDetailsSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
  },
  transferSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  transferOriginalRequest: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  transferOriginalText: {
    fontSize: 14,
    color: '#1F2937',
    fontStyle: 'italic',
  },
  transferFormSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
  },
  transferInputGroup: {
    marginBottom: 16,
  },
  transferInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  transferInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  transferInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 0,
  },
  transferTokenSymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B35',
    marginLeft: 12,
  },
  transferSubmitButton: {
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  transferSubmitButtonDisabled: {
    shadowColor: '#E5E7EB',
    shadowOpacity: 0.1,
  },
  transferSubmitGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderRadius: 12,
  },
  transferSubmitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  transferSubmitTextDisabled: {
    color: '#9CA3AF',
    textShadowColor: 'transparent',
  },
  // Recent Transactions Styles
  transactionsSection: {
    marginBottom: 32,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionIconText: {
    color: '#FFFFFF',
    fontSize: 20,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionDate: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  transactionAmount: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
  },
  assetsContainer: {
    marginBottom: 32,
  },
  assetsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  assetsTitle: {
    color: '#1A1A1A',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B3515',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  viewAllText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '700',
  },
  viewAllArrow: {
    color: '#FF6B35',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 4,
  },
  assetItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 6,
  },
  assetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  assetIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  assetIconText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  assetInfo: {
    flex: 1,
  },
  assetName: {
    color: '#1A1A1A',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  assetBalance: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  assetRight: {
    alignItems: 'flex-end',
  },
  assetValue: {
    color: '#1A1A1A',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  assetChangeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  assetChange: {
    fontSize: 13,
    fontWeight: '700',
  },
  // Authentication Screen Styles
  authContainer: {
    flex: 1,
    backgroundColor: '#FF6B35',
  },
  authGradient: {
    flex: 1,
  },
  authContent: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  authHeader: {
    alignItems: 'center',
    marginBottom: 48,
  },
  authLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  authLogoEmoji: {
    fontSize: 36,
  },
  authTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -1,
  },
  authSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  authForm: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputHint: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  authInput: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  otpHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  authButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  authButtonDisabled: {
    opacity: 0.6,
  },
  authButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  resendButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  resendButtonText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  backButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  backButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '500',
  },
  // DuckChain Assets Overview Styles
  assetsPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  assetQuickView: {
    alignItems: 'center',
    flex: 1,
  },
  assetIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  assetQuickInfo: {
    alignItems: 'center',
  },
  assetSymbol: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  assetChange: {
    fontSize: 10,
    fontWeight: '600',
  },
});

export default App;