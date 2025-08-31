const fs = require('fs');
const path = require('path');

class TokenValidationService {
  constructor() {
    this.tokenList = null;
    this.loadTokenList();
  }

  loadTokenList() {
    try {
      const tokenListPath = path.join(__dirname, '..', 'tokeLists.json');
      const tokenListData = fs.readFileSync(tokenListPath, 'utf8');
      const rawTokens = JSON.parse(tokenListData);
      
      // Convert array format to expected format and add DuckChain tokens
      const duckChainTokens = [
        {
          id: "0x7F9308E8d724e724EC31395f3af52e0593BB2e3f",
          name: "Wrapped TON",
          symbol: "WTON",
          address: "0x7F9308E8d724e724EC31395f3af52e0593BB2e3f",
          decimals: 18,
          verified: true,
          network: "DuckChain"
        },
        {
          id: "0xdA65892eA771d3268610337E9964D916028B7dAD", 
          name: "Duck Token",
          symbol: "DUCK",
          address: "0xdA65892eA771d3268610337E9964D916028B7dAD",
          decimals: 18,
          verified: true,
          network: "DuckChain"
        },
        {
          id: "native",
          name: "TON",
          symbol: "TON", 
          address: "native",
          decimals: 18,
          verified: true,
          network: "DuckChain"
        },
        {
          id: "0x4b75ad7855b2b3fe5b0482c2aa796efe808fd44e",
          name: "USD Coin",
          symbol: "USDT",
          address: "0x4b75ad7855b2b3fe5b0482c2aa796efe808fd44e",
          decimals: 6,
          verified: true,
          network: "DuckChain"
        }
      ];
      
      // Convert existing tokens to expected format
      const formattedTokens = Array.isArray(rawTokens) ? rawTokens.map(token => ({
        ...token,
        address: token.id || token.address
      })) : [];
      
      // Combine all tokens
      this.tokenList = { 
        tokens: [...duckChainTokens, ...formattedTokens]
      };
      
      console.log(`✅ Loaded ${this.tokenList.tokens.length} tokens from token list (including ${duckChainTokens.length} DuckChain tokens)`);
    } catch (error) {
      console.error('❌ Failed to load token list:', error.message);
      this.tokenList = { tokens: [] };
    }
  }

  /**
   * Find token by symbol or address
   * @param {string} tokenIdentifier - Token symbol or address
   * @returns {Object|null} Token info or null if not found
   */
  findToken(tokenIdentifier) {
    if (!this.tokenList || !this.tokenList.tokens) {
      return null;
    }

    const identifier = tokenIdentifier.toLowerCase().trim();
    
    // Check if it's an address (starts with 0x)
    if (identifier.startsWith('0x')) {
      return this.tokenList.tokens.find(token => 
        token.address.toLowerCase() === identifier
      ) || null;
    }
    
    // Check if it's a symbol
    const bySymbol = this.tokenList.tokens.find(token => 
      token.symbol.toLowerCase() === identifier
    );
    
    if (bySymbol) {
      return bySymbol;
    }
    
    // Check if it's a partial match for symbol
    const partialMatch = this.tokenList.tokens.find(token => 
      token.symbol.toLowerCase().includes(identifier) ||
      token.name.toLowerCase().includes(identifier)
    );
    
    return partialMatch || null;
  }

  /**
   * Validate swap parameters and resolve token addresses
   * @param {string} fromToken - Source token symbol or address
   * @param {string} toToken - Destination token symbol or address
   * @returns {Object} Validation result with resolved tokens
   */
  validateSwapTokens(fromToken, toToken) {
    const result = {
      isValid: false,
      fromTokenInfo: null,
      toTokenInfo: null,
      errors: [],
      suggestions: []
    };

    // Find from token
    const fromTokenInfo = this.findToken(fromToken);
    if (!fromTokenInfo) {
      result.errors.push(`Token "${fromToken}" not found in SEI-EVM network`);
      const suggestions = this.suggestSimilarTokens(fromToken);
      if (suggestions.length > 0) {
        result.suggestions.push(`Did you mean: ${suggestions.join(', ')}?`);
      }
    } else {
      result.fromTokenInfo = fromTokenInfo;
    }

    // Find to token
    const toTokenInfo = this.findToken(toToken);
    if (!toTokenInfo) {
      result.errors.push(`Token "${toToken}" not found in SEI-EVM network`);
      const suggestions = this.suggestSimilarTokens(toToken);
      if (suggestions.length > 0) {
        result.suggestions.push(`Did you mean: ${suggestions.join(', ')}?`);
      }
    } else {
      result.toTokenInfo = toTokenInfo;
    }

    // Check if tokens are the same
    if (fromTokenInfo && toTokenInfo && fromTokenInfo.address === toTokenInfo.address) {
      result.errors.push('Cannot swap the same token');
    }

    // Check if both tokens are valid
    result.isValid = fromTokenInfo && toTokenInfo && fromTokenInfo.address !== toTokenInfo.address;

    return result;
  }

  /**
   * Suggest similar tokens based on partial match
   * @param {string} query - Token query
   * @returns {Array} Array of suggested token symbols
   */
  suggestSimilarTokens(query) {
    if (!this.tokenList || !this.tokenList.tokens) {
      return [];
    }

    const queryLower = query.toLowerCase();
    const suggestions = [];

    this.tokenList.tokens.forEach(token => {
      const symbolLower = token.symbol.toLowerCase();
      const nameLower = token.name.toLowerCase();
      
      // Exact matches first
      if (symbolLower === queryLower || nameLower === queryLower) {
        suggestions.unshift(token.symbol);
      }
      // Partial matches
      else if (symbolLower.includes(queryLower) || nameLower.includes(queryLower)) {
        suggestions.push(token.symbol);
      }
      // Similar length matches (typos)
      else if (Math.abs(symbolLower.length - queryLower.length) <= 1 && 
               this.calculateSimilarity(symbolLower, queryLower) > 0.6) {
        suggestions.push(token.symbol);
      }
    });

    return suggestions.slice(0, 3); // Return max 3 suggestions
  }

  /**
   * Calculate similarity between two strings (simple Levenshtein distance)
   * @param {string} str1 
   * @param {string} str2 
   * @returns {number} Similarity ratio (0-1)
   */
  calculateSimilarity(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = Array(len1 + 1).fill().map(() => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + 1
          );
        }
      }
    }

    const maxLen = Math.max(len1, len2);
    return maxLen === 0 ? 1 : (maxLen - matrix[len1][len2]) / maxLen;
  }

  /**
   * Get all available tokens
   * @returns {Array} Array of all tokens
   */
  getAllTokens() {
    return this.tokenList ? this.tokenList.tokens : [];
  }

  /**
   * Get tokens by category/tag
   * @param {string} tag - Token tag to filter by
   * @returns {Array} Array of filtered tokens
   */
  getTokensByTag(tag) {
    if (!this.tokenList || !this.tokenList.tokens) {
      return [];
    }

    return this.tokenList.tokens.filter(token => 
      token.tags && token.tags.includes(tag)
    );
  }

  /**
   * Check if token is native SEI
   * @param {string} tokenIdentifier - Token symbol or address
   * @returns {boolean} True if token is native SEI
   */
  isNativeSEI(tokenIdentifier) {
    const token = this.findToken(tokenIdentifier);
    return token && token.symbol === 'SEI' && token.address === '0x0000000000000000000000000000000000000000';
  }

  /**
   * Get formatted token info for LLM context
   * @returns {string} Formatted token list for LLM
   */
  getTokenListForLLM() {
    if (!this.tokenList || !this.tokenList.tokens) {
      return 'No tokens available';
    }

    const tokenInfo = this.tokenList.tokens.map(token => {
      const tags = token.tags ? ` (${token.tags.join(', ')})` : '';
      return `${token.symbol} - ${token.name}${tags}`;
    }).join('\n');

    return `Available tokens on SEI-EVM network:\n${tokenInfo}`;
  }
}

module.exports = new TokenValidationService();