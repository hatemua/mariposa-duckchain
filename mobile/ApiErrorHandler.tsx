import { Alert, Platform } from 'react-native';
import API_CONFIG from './config/ApiConfig';

// Use centralized API configuration
export const API_BASE_URL = API_CONFIG.BASE_URL;

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Array<{ msg: string; param: string }>;
  timestamp?: string;
}

/**
 * Enhanced API call with proper error handling and logging
 * Distinguishes between network errors and business logic responses
 */
export const makeApiCall = async <T = any>(
  endpoint: string,
  options: RequestInit = {},
  showErrorAlert: boolean = true
): Promise<ApiResponse<T> | null> => {
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  
  try {
    console.log('🚀 Making API call to:', fullUrl);
    console.log('📤 Request options:', JSON.stringify(options, null, 2));

    // Set default headers
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    console.log('📋 Final request:', JSON.stringify(requestOptions, null, 2));

    const response = await fetch(fullUrl, requestOptions);
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));

    // Parse response regardless of status code (HTTP 200 can still contain business logic failures)
    const responseText = await response.text();
    console.log('📥 Raw response text:', responseText);

    if (!responseText) {
      console.warn('⚠️ Empty response body');
      if (!response.ok) {
        const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        if (showErrorAlert) {
          Alert.alert('API Error', errorMessage, [{ text: 'OK' }]);
        }
        return { success: false, error: errorMessage };
      }
      return { success: true, data: null as T };
    }

    let result: ApiResponse<T>;
    try {
      result = JSON.parse(responseText);
      console.log('✅ Parsed response:', JSON.stringify(result, null, 2));
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError);
      console.error('📄 Response text that failed to parse:', responseText);
      
      if (showErrorAlert) {
        Alert.alert(
          'Parse Error',
          'Failed to parse server response. Please try again.',
          [{ text: 'OK' }]
        );
      }

      return {
        success: false,
        error: 'Failed to parse server response'
      };
    }

    // Check for HTTP errors only if we couldn't parse a valid response
    if (!response.ok && !result) {
      console.error('❌ HTTP Error:', response.status, response.statusText);
      const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      if (showErrorAlert) {
        Alert.alert('API Error', errorMessage, [{ text: 'OK' }]);
      }

      return {
        success: false,
        error: errorMessage
      };
    }

    // IMPORTANT: Don't treat business logic failures (like insufficient funds) as errors
    // The response contains valid data that the UI needs to handle
    if (!result.success) {
      console.log('ℹ️ Business logic response (not an error):', result);
      
      // Check for specific business logic scenarios that shouldn't show error alerts
      const isBusinessLogicResponse = 
        (result.data as any)?.status === 'insufficient_funds' ||
        (result.data as any)?.requiresFunding === true ||
        (result as any)?.status === 'insufficient_funds' ||
        (result as any)?.type === 'transfer';

      if (isBusinessLogicResponse) {
        console.log('💰 Insufficient funds response - this is expected business logic, not an error');
        // Don't show error alert for business logic responses
      } else if (showErrorAlert && result.error) {
        // Only show alerts for actual errors, not business logic responses
        Alert.alert('Error', result.error, [{ text: 'OK' }]);
      }
    }

    return result;

  } catch (error: any) {
    console.error('❌ Network/Fetch Error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      cause: error.cause
    });

    const errorMessage = error.message || 'Network error occurred';
    
    if (showErrorAlert) {
      Alert.alert(
        'Network Error',
        `Failed to connect to server: ${errorMessage}`,
        [
          { text: 'Retry', onPress: () => makeApiCall(endpoint, options, showErrorAlert) },
          { text: 'Cancel' }
        ]
      );
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Specific API calls for the app
 */
export const ApiCalls = {
  /**
   * Process enhanced intent message
   */
  processEnhancedIntent: async (message: string, userId: string, sessionId?: string) => {
    return makeApiCall<any>('/api/enhanced-intent/process', {
      method: 'POST',
      body: JSON.stringify({
        message,
        userId,
        sessionId: sessionId || `session-${Date.now()}`
      })
    });
  },

  /**
   * Process transfer request
   */
  processTransfer: async (message: string, userId: string) => {
    return makeApiCall<any>('/api/prompt/router', {
      method: 'POST',
      body: JSON.stringify({
        message,
        userId
      })
    });
  },

  /**
   * Check wallet balance
   */
  checkBalance: async (address: string, token: string) => {
    return makeApiCall<{ balance: number }>('/api/wallet/balance', {
      method: 'POST',
      body: JSON.stringify({
        address,
        token
      })
    }, false); // Don't show alert for balance checks
  },

  /**
   * Health check
   */
  healthCheck: async () => {
    return makeApiCall<any>('/api/enhanced-intent/health', {
      method: 'GET'
    }, false);
  }
};

/**
 * Test network connectivity
 */
export const testNetworkConnectivity = async (): Promise<boolean> => {
  try {
    const result = await ApiCalls.healthCheck();
    return result?.success || false;
  } catch (error) {
    return false;
  }
};

/**
 * Debug helper to log all network details
 */
export const debugNetworkInfo = () => {
  console.log('🌐 Network Debug Info:');
  console.log('📱 Platform:', Platform.OS);
  console.log('🔗 API Base URL:', API_BASE_URL);
  console.log('🏠 Expected Backend URL:', API_BASE_URL);
  console.log('⚙️ Suggestions:');
  console.log(`  - Current Configuration: ${API_CONFIG.BASE_URL}`);
  console.log('  - To change IP: Update API_CONFIG.BASE_IP in config/ApiConfig.ts');
  console.log('  - Current IP: ' + API_CONFIG.BASE_IP);
  console.log('  - Make sure backend is running on port 5001');
  console.log('  - Check firewall settings if using physical device');
};