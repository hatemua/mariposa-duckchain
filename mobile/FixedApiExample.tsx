import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { ApiCalls, debugNetworkInfo, testNetworkConnectivity } from './ApiErrorHandler';

const FixedApiExample: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkConnection();
    debugNetworkInfo(); // Log network debug info on startup
  }, []);

  const checkConnection = async () => {
    console.log('🔍 Checking network connectivity...');
    const connected = await testNetworkConnectivity();
    setIsConnected(connected);
    console.log('🌐 Network status:', connected ? 'Connected' : 'Disconnected');
  };

  const handleEnhancedIntentCall = async () => {
    setIsLoading(true);
    setLastResponse(null);

    try {
      console.log('🎯 Testing enhanced intent API...');
      
      const result = await ApiCalls.processEnhancedIntent(
        "Send 0.1 TON to Samir",
        "68b2464f83132f5576e8ea8d",
        "test-session-123"
      );

      console.log('📥 API Result:', result);
      setLastResponse(result);

      if (result?.success) {
        Alert.alert('Success!', 'API call completed successfully');
      } else {
        Alert.alert('API Error', result?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('❌ Unexpected error:', error);
      Alert.alert('Error', 'Unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransferCall = async () => {
    setIsLoading(true);
    setLastResponse(null);

    try {
      console.log('💸 Testing transfer API...');
      
      const result = await ApiCalls.processTransfer(
        "Send 0.1 TON to Samir",
        "68b2464f83132f5576e8ea8d"
      );

      console.log('📥 Transfer Result:', result);
      setLastResponse(result);

      if (result?.success) {
        Alert.alert('Success!', 'Transfer API call completed successfully');
      } else {
        Alert.alert('Transfer Error', result?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('❌ Transfer error:', error);
      Alert.alert('Error', 'Transfer error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBalanceCheck = async () => {
    setIsLoading(true);
    setLastResponse(null);

    try {
      console.log('💰 Testing balance check API...');
      
      const result = await ApiCalls.checkBalance(
        "0xf73f096Fe9ff8B6229c97d954B5cD2430443D6fB",
        "TON"
      );

      console.log('📥 Balance Result:', result);
      setLastResponse(result);

      if (result?.success) {
        Alert.alert('Success!', `Balance: ${result.data?.balance || 'N/A'} TON`);
      } else {
        Alert.alert('Balance Error', result?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('❌ Balance check error:', error);
      Alert.alert('Error', 'Balance check error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = () => {
    if (isConnected === null) return '#gray';
    return isConnected ? '#00D4AA' : '#FF6B6B';
  };

  const getStatusText = () => {
    if (isConnected === null) return 'Checking...';
    return isConnected ? 'Connected' : 'Disconnected';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>API Debug Tool</Text>
        
        {/* Connection Status */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={styles.statusText}>Status: {getStatusText()}</Text>
          <TouchableOpacity onPress={checkConnection} style={styles.refreshButton}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* API Test Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.testButton, styles.enhancedButton]} 
            onPress={handleEnhancedIntentCall}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Testing...' : 'Test Enhanced Intent API'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.testButton, styles.transferButton]} 
            onPress={handleTransferCall}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Testing...' : 'Test Transfer API'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.testButton, styles.balanceButton]} 
            onPress={handleBalanceCheck}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Testing...' : 'Test Balance Check'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Response Display */}
        {lastResponse && (
          <View style={styles.responseContainer}>
            <Text style={styles.responseTitle}>Last Response:</Text>
            <ScrollView style={styles.responseScroll}>
              <Text style={styles.responseText}>
                {JSON.stringify(lastResponse, null, 2)}
              </Text>
            </ScrollView>
          </View>
        )}

        {/* Debug Info */}
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>Debug Info:</Text>
          <Text style={styles.debugText}>• Check console logs for detailed info</Text>
          <Text style={styles.debugText}>• Make sure backend is running on port 5001</Text>
          <Text style={styles.debugText}>• Android emulator uses 10.0.2.2 for localhost</Text>
          <Text style={styles.debugText}>• iOS simulator uses localhost directly</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  card: {
    backgroundColor: 'white',
    margin: 20,
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
    marginBottom: 20,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusText: {
    fontSize: 16,
    color: '#2d3748',
    flex: 1,
  },
  refreshButton: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  refreshText: {
    color: '#4a5568',
    fontSize: 12,
    fontWeight: '600',
  },
  buttonContainer: {
    gap: 15,
    marginBottom: 25,
  },
  testButton: {
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
  },
  enhancedButton: {
    backgroundColor: '#667eea',
  },
  transferButton: {
    backgroundColor: '#00D4AA',
  },
  balanceButton: {
    backgroundColor: '#f093fb',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  responseContainer: {
    marginBottom: 25,
  },
  responseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 10,
  },
  responseScroll: {
    maxHeight: 200,
    backgroundColor: '#f7fafc',
    borderRadius: 10,
    padding: 15,
  },
  responseText: {
    fontSize: 12,
    color: '#4a5568',
    fontFamily: 'monospace',
  },
  debugContainer: {
    backgroundColor: '#e6fffa',
    borderRadius: 15,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#00D4AA',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#234e52',
    marginBottom: 10,
  },
  debugText: {
    fontSize: 14,
    color: '#285e61',
    marginBottom: 5,
  },
});

export default FixedApiExample;

/*
INTEGRATION GUIDE FOR FIXING THE API ERROR:

1. REPLACE YOUR CURRENT API CALLS:
   Instead of direct fetch calls, use the ApiCalls helper:
   
   // OLD (causes errors):
   const response = await fetch(`${API_BASE_URL}/api/enhanced-intent/process`, {...});
   
   // NEW (with proper error handling):
   const result = await ApiCalls.processEnhancedIntent(message, userId, sessionId);

2. UPDATE YOUR API_BASE_URL:
   The error might be caused by wrong URL. Use:
   - Android Emulator: http://10.0.2.2:5001
   - iOS Simulator: http://localhost:5001
   - Physical Device: http://YOUR_COMPUTER_IP:5001

3. ADD PROPER ERROR HANDLING:
   The new ApiCalls automatically handle:
   - Network errors
   - JSON parsing errors  
   - HTTP status errors
   - Response validation

4. DEBUG STEPS:
   - Use the FixedApiExample component to test connectivity
   - Check console logs for detailed error info
   - Ensure backend is running on port 5001
   - Test different endpoints individually

5. REPLACE IN YOUR APP.TSX:
   Replace the problematic API call around line 682 with:
   
   const result = await ApiCalls.processEnhancedIntent(
     transcribedText,
     "68b2464f83132f5576e8ea8d", 
     "session-456"
   );

This will fix the "Failed to process request" error and provide better debugging info.
*/