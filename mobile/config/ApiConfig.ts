// Centralized API Configuration
// Change the IP address here once and it will be applied everywhere

const API_CONFIG = {
  // Update this IP address when your backend server IP changes
  BASE_IP: '192.168.1.17',
  PORT: '5001',
  
  // Computed base URL
  get BASE_URL() {
    return `http://${this.BASE_IP}:${this.PORT}`;
  },
  
  // API Endpoints
  ENDPOINTS: {
    ENHANCED_INTENT: '/api/enhanced-intent/process',
    STRATEGY_PROGRESS: '/api/strategy/progress',
    STRATEGY_RESULT: '/api/strategy/result', 
    STRATEGY_STATUS: '/api/strategy/status',
    AGENTS: '/api/agents',
    WALLET_BALANCE: '/api/wallet/balance',
  },
  
  // Helper methods for common endpoints
  getEnhancedIntentUrl() {
    return `${this.BASE_URL}${this.ENDPOINTS.ENHANCED_INTENT}`;
  },
  
  getStrategyProgressUrl(processingId: string) {
    return `${this.BASE_URL}${this.ENDPOINTS.STRATEGY_PROGRESS}/${processingId}`;
  },
  
  getStrategyResultUrl(processingId: string) {
    return `${this.BASE_URL}${this.ENDPOINTS.STRATEGY_RESULT}/${processingId}`;
  },
  
  getStrategyStatusUrl(processingId: string) {
    return `${this.BASE_URL}${this.ENDPOINTS.STRATEGY_STATUS}/${processingId}`;
  },
};

export default API_CONFIG;

// Export convenience methods
export const { BASE_URL, ENDPOINTS } = API_CONFIG;
export const getApiUrl = (endpoint: string) => `${BASE_URL}${endpoint}`;