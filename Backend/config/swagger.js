const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mariposa Backend API',
      version: '1.0.0',
      description: 'A comprehensive Node.js Express API with MongoDB, authentication, and AI-powered crypto DCA expert agent',
      contact: {
        name: 'API Support',
        email: 'support@mariposa.com'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: 'http://localhost:5001',
        description: 'Development server'
      },
      {
        url: 'https://api.mariposa.com',
        description: 'Production server'
      }
    ],
    components: {
      schemas: {
        User: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            id: {
              type: 'string',
              description: 'User ID'
            },
            name: {
              type: 'string',
              description: 'User name',
              maxLength: 50
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            password: {
              type: 'string',
              minLength: 6,
              description: 'User password'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              default: 'user',
              description: 'User role'
            },
            isActive: {
              type: 'boolean',
              default: true,
              description: 'Whether user is active'
            },
            avatar: {
              type: 'string',
              description: 'User avatar URL'
            }
          }
        },
        Product: {
          type: 'object',
          required: ['name', 'description', 'price', 'category', 'brand', 'countInStock', 'createdBy'],
          properties: {
            id: {
              type: 'string',
              description: 'Product ID'
            },
            name: {
              type: 'string',
              description: 'Product name',
              maxLength: 100
            },
            description: {
              type: 'string',
              description: 'Product description',
              maxLength: 500
            },
            price: {
              type: 'number',
              minimum: 0,
              description: 'Product price'
            },
            category: {
              type: 'string',
              enum: ['electronics', 'clothing', 'books', 'home', 'sports', 'other'],
              description: 'Product category'
            },
            brand: {
              type: 'string',
              description: 'Product brand'
            },
            countInStock: {
              type: 'number',
              minimum: 0,
              description: 'Stock count'
            },
            rating: {
              type: 'number',
              minimum: 0,
              maximum: 5,
              default: 0,
              description: 'Product rating'
            },
            numReviews: {
              type: 'number',
              default: 0,
              description: 'Number of reviews'
            },
            images: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Product images'
            },
            isFeatured: {
              type: 'boolean',
              default: false,
              description: 'Whether product is featured'
            },
            isActive: {
              type: 'boolean',
              default: true,
              description: 'Whether product is active'
            },
            createdBy: {
              type: 'string',
              description: 'User ID who created the product'
            }
          }
        },
        AIResponse: {
          type: 'object',
          properties: {
            analysis: {
              type: 'string',
              description: 'AI analysis of the user situation'
            },
            strategy: {
              type: 'string',
              description: 'Recommended DCA strategy'
            },
            actionPlan: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  step: {
                    type: 'number',
                    description: 'Step number'
                  },
                  action: {
                    type: 'string',
                    description: 'Action description'
                  },
                  priority: {
                    type: 'string',
                    enum: ['high', 'medium', 'low'],
                    description: 'Action priority'
                  },
                                     timeframe: {
                     type: 'string',
                     enum: ['immediate', 'short-term', 'long-term'],
                     description: 'Action timeframe'
                   },
                   ref: {
                     type: 'string',
                     description: 'Unique reference ID for bot execution'
                   },
                   dexAction: {
                     type: 'string',
                     enum: ['swap', 'add_liquidity', 'remove_liquidity', 'stake', 'setup'],
                     description: 'DEX action type'
                   },
                   tokenPair: {
                     type: 'string',
                     description: 'Token pair for the action'
                   },
                   amount: {
                     type: 'string',
                     description: 'Amount or percentage for the action'
                   },
                   network: {
                     type: 'string',
                     description: 'Blockchain network',
                     example: 'sei'
                   }
              }
            }
          },
          riskAssessment: {
            type: 'string',
            description: 'Risk analysis'
          },
          recommendations: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'List of recommendations'
          },
          marketInsights: {
            type: 'string',
            description: 'Current market insights'
          },
          nextSteps: {
            type: 'string',
            description: 'What the user should do next'
          }
        },
        IntelligentAgentRequest: {
          type: 'object',
          required: ['message'],
          properties: {
            message: {
              type: 'string',
              description: 'Natural language description of investment goals and preferences',
              example: 'I want to start a conservative DCA strategy with $2000 monthly investing in Bitcoin and Ethereum for long-term holding. I prefer low-risk accumulation.',
              minLength: 10,
              maxLength: 2000
            },
            userId: {
              type: 'string',
              description: 'User ID (optional, defaults to anonymous)',
              example: 'user123'
            }
          }
        },
        ExtractedAgentParameters: {
          type: 'object',
          properties: {
            agentName: {
              type: 'string',
              description: 'AI-generated agent name based on user message',
              example: 'Conservative BTC-ETH DCA Agent'
            },
            description: {
              type: 'string',
              description: 'AI-generated description of the strategy',
              example: 'Conservative DCA strategy for long-term Bitcoin and Ethereum accumulation'
            },
            primaryStrategy: {
              type: 'string',
              enum: ['DCA', 'momentum_trading', 'swing_trading', 'hodl', 'arbitrage', 'scalping', 'memecoin', 'yield_farming', 'spot_trading', 'futures_trading', 'custom'],
              description: 'AI-selected primary trading strategy',
              example: 'DCA'
            },
            riskTolerance: {
              type: 'string',
              enum: ['conservative', 'moderate', 'aggressive'],
              description: 'AI-detected risk tolerance from user message',
              example: 'conservative'
            },
            defaultBudget: {
              type: 'number',
              description: 'AI-extracted or suggested budget amount in USD',
              example: 2000
            },
            frequency: {
              type: 'string',
              enum: ['daily', 'weekly', 'monthly'],
              description: 'AI-recommended investment frequency',
              example: 'monthly'
            },
            preferredTokens: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['BTC', 'ETH', 'SEI', 'USDC', 'USDT', 'DAI']
              },
              description: 'AI-selected preferred tokens for trading',
              example: ['BTC', 'ETH', 'SEI']
            },
            maxPositionSize: {
              type: 'number',
              description: 'AI-calculated maximum position size in USD',
              example: 4000
            },
            stopLossPercentage: {
              type: 'number',
              description: 'AI-recommended stop loss percentage',
              example: 10
            },
            takeProfitPercentage: {
              type: 'number',
              description: 'AI-recommended take profit percentage',
              example: 20
            },
            customPrompt: {
              type: 'string',
              description: 'Custom instructions extracted from user message',
              example: 'Focus on long-term accumulation with conservative risk management'
            },
            extractedIntent: {
              type: 'string',
              description: 'AI-understanding of what the user wants to achieve',
              example: 'Long-term wealth building through systematic crypto accumulation'
            },
            suggestedActions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  action: {
                    type: 'string',
                    description: 'Specific action description',
                    example: 'BUY $1200 worth of BTC for long-term holding'
                  },
                  actionType: {
                    type: 'string',
                    enum: ['BUY', 'SELL', 'HOLD', 'STAKE', 'SWAP', 'FARM', 'LEND', 'BORROW', 'BRIDGE', 'MINT', 'BURN'],
                    description: 'Type of trading action',
                    example: 'BUY'
                  },
                  tokenPair: {
                    type: 'string',
                    description: 'Trading pair for the action',
                    example: 'USDC/BTC'
                  },
                  percentage: {
                    type: 'string',
                    description: 'Percentage of budget for this action',
                    example: '60%'
                  },
                  priority: {
                    type: 'string',
                    enum: ['high', 'medium', 'low'],
                    description: 'Action priority level',
                    example: 'high'
                  },
                  reasoning: {
                    type: 'string',
                    description: 'AI explanation for why this action is recommended',
                    example: 'Bitcoin as primary store of value for conservative strategy'
                  }
                }
              },
              description: 'AI-generated list of specific actions to take'
            },
            marketInsights: {
              type: 'string',
              description: 'AI analysis of current market conditions relevant to the strategy',
              example: 'Current market conditions favor long-term accumulation strategies'
            },
            riskAssessment: {
              type: 'string',
              description: 'AI assessment of the strategy risk level',
              example: 'Conservative risk approach suitable for steady wealth building'
            }
          }
        },
        AgentMemoryReference: {
          type: 'object',
          properties: {
            defaultAgentMemory: {
              type: 'string',
              description: 'Memory ID for the default agent interaction',
              example: 'memory_id_1'
            },
            agentMemory: {
              type: 'string',
              description: 'Memory ID for the newly created agent',
              example: 'memory_id_2'
            }
          }
        },
        IntelligentAgentResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                agent: {
                  $ref: '#/components/schemas/Agent'
                },
                extractedParameters: {
                  $ref: '#/components/schemas/ExtractedAgentParameters'
                },
                memories: {
                  $ref: '#/components/schemas/AgentMemoryReference'
                },
                suggestedActions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      action: {
                        type: 'string',
                        example: 'BUY $1200 worth of BTC for long-term holding'
                      },
                      actionType: {
                        type: 'string',
                        example: 'BUY'
                      },
                      tokenPair: {
                        type: 'string',
                        example: 'USDC/BTC'
                      },
                      percentage: {
                        type: 'string',
                        example: '60%'
                      },
                      priority: {
                        type: 'string',
                        example: 'high'
                      },
                      reasoning: {
                        type: 'string',
                        example: 'Bitcoin as primary store of value'
                      }
                    }
                  }
                },
                marketInsights: {
                  type: 'string',
                  example: 'Current market conditions favor long-term accumulation strategies'
                },
                riskAssessment: {
                  type: 'string',
                  example: 'Conservative risk approach suitable for steady wealth building'
                },
                message: {
                  type: 'string',
                  example: 'Intelligent DCA agent created successfully using AI analysis'
                },
                note: {
                  type: 'string',
                  description: 'Optional note when fallback analysis is used',
                  example: 'Created using fallback analysis due to AI service issues'
                }
              }
            }
          }
        },
        Agent: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Agent ID',
              example: '60d5ecb54b5d4c001f3a8b25'
            },
            name: {
              type: 'string',
              description: 'Agent name',
              example: 'Conservative BTC-ETH DCA Agent'
            },
            description: {
              type: 'string',
              description: 'Agent description',
              example: 'Conservative DCA strategy for long-term accumulation'
            },
            userId: {
              type: 'string',
              description: 'User ID who owns the agent',
              example: 'user123'
            },
            primaryStrategy: {
              type: 'string',
              enum: ['DCA', 'momentum_trading', 'swing_trading', 'hodl', 'arbitrage', 'scalping', 'memecoin', 'yield_farming', 'spot_trading', 'futures_trading', 'custom'],
              description: 'Primary trading strategy',
              example: 'DCA'
            },
            configuration: {
              type: 'object',
              properties: {
                defaultBudget: {
                  type: 'number',
                  description: 'Default budget amount in USD',
                  example: 2000
                },
                frequency: {
                  type: 'string',
                  enum: ['daily', 'weekly', 'monthly'],
                  description: 'Investment frequency',
                  example: 'monthly'
                },
                riskTolerance: {
                  type: 'string',
                  enum: ['conservative', 'moderate', 'aggressive'],
                  description: 'Risk tolerance level',
                  example: 'conservative'
                },
                preferredTokens: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['BTC', 'ETH', 'SEI', 'USDC', 'USDT', 'DAI']
                  },
                  description: 'Preferred tokens for trading',
                  example: ['BTC', 'ETH', 'SEI']
                },
                maxPositionSize: {
                  type: 'number',
                  description: 'Maximum position size in USD',
                  example: 4000
                },
                stopLossPercentage: {
                  type: 'number',
                  description: 'Stop loss percentage',
                  example: 10
                },
                takeProfitPercentage: {
                  type: 'number',
                  description: 'Take profit percentage',
                  example: 20
                },
                customPrompt: {
                  type: 'string',
                  description: 'Custom strategy instructions',
                  example: 'Focus on long-term accumulation'
                }
              }
            }
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the agent is active',
              example: true
            },
            isApproved: {
              type: 'boolean',
              description: 'Whether the agent is approved to begin work',
              example: false
            },
            canBeginWork: {
              type: 'boolean',
              description: 'Whether the agent can begin trading work',
              example: false
            },
            walletId: {
              type: 'string',
              description: 'Associated wallet ID',
              example: '60d5ecb54b5d4c001f3a8b26'
            },
            walletAddress: {
              type: 'string',
              description: 'Associated wallet address',
              example: '0xE4c28c59FD0EFa18cB3b19F986cF16BB07214a88'
            },
            totalInteractions: {
              type: 'number',
              description: 'Total number of interactions',
              example: 0
            },
            totalBudgetManaged: {
              type: 'number',
              description: 'Total budget managed by agent',
              example: 0
            },
            lastInteraction: {
              type: 'string',
              format: 'date-time',
              description: 'Last interaction timestamp'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Agent creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Agent last update timestamp'
            }
          }
        },
        GeneratedStrategy: {
          type: 'object',
          properties: {
            agentName: {
              type: 'string',
              description: 'AI-generated agent name',
              example: 'MemeCoin Alpha Hunter'
            },
            description: {
              type: 'string',
              description: 'Strategy description',
              example: 'Aggressive memecoin strategy focusing on emerging tokens'
            },
            primaryStrategy: {
              type: 'string',
              enum: ['DCA', 'momentum_trading', 'swing_trading', 'hodl', 'arbitrage', 'scalping', 'memecoin', 'yield_farming', 'spot_trading', 'futures_trading', 'custom'],
              description: 'Primary trading strategy',
              example: 'memecoin'
            },
            riskTolerance: {
              type: 'string',
              enum: ['conservative', 'moderate', 'aggressive'],
              description: 'Risk tolerance level',
              example: 'aggressive'
            },
            defaultBudget: {
              type: 'number',
              description: 'Suggested budget amount',
              example: 2000
            },
            frequency: {
              type: 'string',
              enum: ['daily', 'weekly', 'monthly'],
              description: 'Optimal trading frequency',
              example: 'daily'
            },
            portfolioAllocation: {
              type: 'object',
              description: 'Token allocation strategy',
              additionalProperties: {
                type: 'object',
                properties: {
                  symbol: {
                    type: 'string',
                    example: 'DOGE'
                  },
                  percentage: {
                    type: 'string',
                    example: '40%'
                  },
                  reasoning: {
                    type: 'string',
                    example: 'Established memecoin with strong community'
                  }
                }
              }
            },
            maxPositionSize: {
              type: 'number',
              description: 'Maximum position size',
              example: 4000
            },
            stopLossPercentage: {
              type: 'number',
              description: 'Stop loss percentage',
              example: 15
            },
            takeProfitPercentage: {
              type: 'number',
              description: 'Take profit percentage',
              example: 50
            },
            portfolioManagementPlan: {
              type: 'object',
              properties: {
                initialSetup: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      step: {
                        type: 'number',
                        example: 1
                      },
                      action: {
                        type: 'string',
                        example: 'Buy initial DOGE position'
                      },
                      actionType: {
                        type: 'string',
                        enum: ['BUY', 'SELL', 'HOLD', 'STAKE', 'SWAP', 'FARM', 'LEND', 'BORROW', 'BRIDGE', 'MINT', 'BURN'],
                        example: 'BUY'
                      },
                      tokenPair: {
                        type: 'string',
                        example: 'USDC/DOGE'
                      },
                      percentage: {
                        type: 'string',
                        example: '40%'
                      },
                      priority: {
                        type: 'string',
                        enum: ['high', 'medium', 'low'],
                        example: 'high'
                      },
                      reasoning: {
                        type: 'string',
                        example: 'Establish core memecoin position'
                      }
                    }
                  }
                },
                monitoringFrequency: {
                  type: 'string',
                  example: 'hourly'
                },
                rebalancingRules: {
                  type: 'object',
                  description: 'Rules for portfolio rebalancing'
                }
              }
            },
            marketInsights: {
              type: 'string',
              description: 'Current market analysis'
            },
            riskAssessment: {
              type: 'string',
              description: 'Risk analysis for the strategy'
            },
            strategyAdvantages: {
              type: 'string',
              description: 'Strategy advantages'
            },
            potentialDrawbacks: {
              type: 'string',
              description: 'Potential strategy limitations'
            },
            successMetrics: {
              type: 'string',
              description: 'Success measurement criteria'
            }
          }
        },
        ApprovalStatus: {
          type: 'object',
          properties: {
            isApproved: {
              type: 'boolean',
              description: 'Whether the agent is approved',
              example: false
            },
            canBeginWork: {
              type: 'boolean',
              description: 'Whether the agent can begin work',
              example: false
            },
            requiresApproval: {
              type: 'boolean',
              description: 'Whether approval is required',
              example: true
            },
            note: {
              type: 'string',
              description: 'Additional approval information',
              example: 'Agent requires approval before starting work'
            }
          }
        },
        WalletInfo: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'Wallet address',
              example: '0xE4c28c59FD0EFa18cB3b19F986cF16BB07214a88'
            },
            walletId: {
              type: 'string',
              description: 'Wallet ID',
              example: '60d5ecb54b5d4c001f3a8b26'
            },
            network: {
              type: 'string',
              description: 'Blockchain network',
              example: 'sei'
            },
            status: {
              type: 'string',
              enum: ['created', 'pending', 'failed'],
              description: 'Wallet creation status',
              example: 'created'
            }
          }
        },
        CryptoPrice: {
          type: 'object',
          properties: {
            price: {
              type: 'number',
              description: 'Current price'
            },
            change24h: {
              type: 'number',
              description: '24-hour price change percentage'
            },
            marketCap: {
              type: 'number',
              description: 'Market capitalization'
            },
            network: {
              type: 'string',
              description: 'Blockchain network',
              example: 'sei'
            },
            type: {
              type: 'string',
              enum: ['native', 'wrapped', 'stablecoin'],
              description: 'Token type'
            }
          }
        },
        EnhancedIntentRequest: {
          type: 'object',
          required: ['message'],
          properties: {
            message: {
              type: 'string',
              description: 'Natural language message to analyze and extract pipeline actions from',
              example: 'when TON increases by 15% in 1 hour, buy $1000 worth of DUCK and immediately transfer 1% of my total balance to my cold wallet 0x123abc',
              minLength: 1,
              maxLength: 1000
            },
            userId: {
              type: 'string',
              description: 'Optional user ID for context and personalization',
              example: 'user123'
            },
            sessionId: {
              type: 'string',
              description: 'Optional session ID for tracking conversation context',
              example: 'session-456'
            }
          }
        },
        PipelineTrigger: {
          type: 'object',
          description: 'Pipeline trigger definition',
          properties: {
            type: {
              type: 'string',
              enum: ['price_movement', 'price_target', 'balance_threshold', 'portfolio_value', 'time_based', 'technical_indicator'],
              description: 'Type of trigger that initiates the pipeline'
            },
            token: {
              type: 'string',
              description: 'Token symbol for price-based triggers',
              example: 'TON'
            },
            direction: {
              type: 'string',
              enum: ['increase', 'decrease', 'above', 'below'],
              description: 'Direction of price movement or comparison'
            },
            percentage: {
              type: 'number',
              description: 'Percentage change for price movement triggers',
              example: 15
            },
            target_price: {
              type: 'number',
              description: 'Target price for price target triggers',
              example: 0.45
            },
            threshold_amount: {
              type: 'number',
              description: 'Threshold amount for balance triggers',
              example: 10000
            },
            timeframe: {
              type: 'string',
              description: 'Time window for the trigger condition',
              example: '1h'
            },
            comparison_type: {
              type: 'string',
              enum: ['crosses', 'reaches'],
              description: 'How the price comparison is evaluated'
            }
          }
        },
        PipelineAction: {
          type: 'object',
          description: 'Individual action within a pipeline',
          properties: {
            type: {
              type: 'string',
              enum: ['buy', 'sell', 'swap', 'transfer', 'stake', 'unstake', 'add_liquidity', 'remove_liquidity', 'notify'],
              description: 'Type of action to perform'
            },
            token: {
              type: 'string',
              description: 'Token symbol for the action',
              example: 'DUCK'
            },
            from_token: {
              type: 'string',
              description: 'Source token for swap actions',
              example: 'USDC'
            },
            to_token: {
              type: 'string',
              description: 'Target token for swap actions',
              example: 'SEI'
            },
            amount: {
              oneOf: [
                { type: 'string' },
                { type: 'number' }
              ],
              description: 'Amount for the action (can be percentage, number, or "all")',
              example: '1%'
            },
            destination: {
              type: 'string',
              description: 'Destination address for transfer actions',
              example: '0x123abc'
            },
            denomination: {
              type: 'string',
              description: 'Currency denomination for amount',
              example: 'USD'
            },
            order_type: {
              type: 'string',
              enum: ['market', 'limit'],
              description: 'Order type for trading actions'
            },
            message: {
              type: 'string',
              description: 'Message content for notify actions',
              example: 'Pipeline executed successfully'
            },
            execution: {
              type: 'string',
              enum: ['immediate', 'delayed'],
              description: 'Execution timing for the action'
            }
          }
        },
        PipelineCondition: {
          type: 'object',
          description: 'Condition that must be met for pipeline execution',
          properties: {
            type: {
              type: 'string',
              description: 'Type of condition'
            },
            token: {
              type: 'string',
              description: 'Token symbol for the condition'
            },
            value: {
              type: 'number',
              description: 'Threshold value for the condition'
            }
          }
        },
        PipelineMetadata: {
          type: 'object',
          description: 'Additional pipeline configuration and metadata',
          properties: {
            priority: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
              description: 'Pipeline execution priority'
            },
            execution_mode: {
              type: 'string',
              enum: ['sequential', 'parallel'],
              description: 'How actions should be executed'
            },
            error_handling: {
              type: 'string',
              description: 'Error handling strategy'
            },
            max_retries: {
              type: 'number',
              description: 'Maximum retry attempts'
            }
          }
        },
        PipelineStructure: {
          type: 'object',
          description: 'Complete pipeline structure extracted from user message',
          properties: {
            trigger: {
              $ref: '#/components/schemas/PipelineTrigger'
            },
            actions: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/PipelineAction'
              },
              description: 'Ordered list of actions to execute'
            },
            conditions: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/PipelineCondition'
              },
              description: 'Conditions that must be met'
            },
            metadata: {
              $ref: '#/components/schemas/PipelineMetadata'
            }
          }
        },
        IntentClassification: {
          type: 'object',
          description: 'Classification result for the user message',
          properties: {
            type: {
              type: 'string',
              enum: ['actions', 'pipeline', 'strategy', 'information', 'feedbacks'],
              description: 'Primary classification type'
            },
            actionSubtype: {
              type: 'string',
              enum: ['balance', 'transfer', 'swap', 'stake', 'createAgent', 'deployContract', 'associateToken', 'createTopic', 'sendMessage', 'workflow', 'other'],
              description: 'Specific action subtype'
            },
            confidence: {
              type: 'number',
              minimum: 0.1,
              maximum: 1.0,
              description: 'Confidence score for the classification',
              example: 0.95
            },
            reasoning: {
              type: 'string',
              description: 'Detailed explanation of the classification decision',
              example: 'Detected sophisticated pipeline patterns with conditional logic and multiple actions'
            }
          }
        },
        PipelineValidation: {
          type: 'object',
          description: 'Validation results for extracted pipeline',
          properties: {
            isValid: {
              type: 'boolean',
              description: 'Whether the pipeline is valid and complete'
            },
            missing: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'List of missing required elements'
            },
            resolved: {
              type: 'object',
              description: 'Successfully validated and resolved elements'
            },
            errors: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'List of validation errors'
            },
            warnings: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'List of validation warnings'
            },
            quality: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              description: 'Pipeline quality score (0-100)',
              example: 85
            },
            pipelineType: {
              type: 'string',
              description: 'Type of pipeline workflow',
              example: 'advanced_workflow'
            }
          }
        },
        InteractiveComponent: {
          type: 'object',
          description: 'Interactive UI component for missing information',
          properties: {
            type: {
              type: 'string',
              enum: ['input', 'combobox', 'textarea'],
              description: 'Type of UI component'
            },
            label: {
              type: 'string',
              description: 'Component label'
            },
            placeholder: {
              type: 'string',
              description: 'Placeholder text'
            },
            validation: {
              type: 'string',
              description: 'Validation requirements'
            },
            options: {
              type: 'array',
              items: {
                type: 'object'
              },
              description: 'Available options for selection components'
            }
          }
        },
        InteractiveData: {
          type: 'object',
          description: 'Interactive components for collecting missing information',
          properties: {
            type: {
              type: 'string',
              description: 'Type of interactive request',
              example: 'argumentRequest'
            },
            message: {
              type: 'string',
              description: 'Message to display to user',
              example: 'I need more information to complete this action. Please provide:'
            },
            components: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/InteractiveComponent'
              },
              description: 'List of interactive components'
            },
            missingArgs: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'List of missing argument names'
            }
          }
        },
        EnhancedIntentExtraction: {
          type: 'object',
          description: 'Extracted information from user message',
          properties: {
            type: {
              type: 'string',
              description: 'Type of extraction (pipeline or actions)',
              example: 'pipeline'
            },
            pipeline: {
              $ref: '#/components/schemas/PipelineStructure'
            },
            actionType: {
              type: 'string',
              description: 'Action type for non-pipeline messages'
            },
            args: {
              type: 'object',
              description: 'Extracted arguments for actions'
            },
            originalMessage: {
              type: 'string',
              description: 'Original user message'
            },
            error: {
              type: 'string',
              description: 'Error message if extraction failed'
            }
          }
        },
        EnhancedIntentResponse: {
          type: 'object',
          description: 'Complete response from enhanced intent processing',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the request was successful',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                classification: {
                  $ref: '#/components/schemas/IntentClassification'
                },
                extraction: {
                  $ref: '#/components/schemas/EnhancedIntentExtraction'
                },
                validation: {
                  $ref: '#/components/schemas/PipelineValidation'
                },
                interactiveData: {
                  $ref: '#/components/schemas/InteractiveData'
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Processing timestamp'
                },
                userId: {
                  type: 'string',
                  description: 'User ID from request'
                }
              }
            },
            error: {
              type: 'string',
              description: 'Error message if processing failed'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Response timestamp'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  msg: {
                    type: 'string',
                    description: 'Error message'
                  },
                  param: {
                    type: 'string',
                    description: 'Parameter that caused the error'
                  }
                }
              }
            }
          }
        }
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    paths: {
      '/api/enhanced-intent/process': {
        post: {
          summary: 'Process enhanced intent',
          description: 'Analyzes natural language messages to extract actionable intents and pipeline structures for crypto trading automation',
          tags: ['Enhanced Intent'],
          security: [
            {
              bearerAuth: []
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/EnhancedIntentRequest'
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Successfully processed intent',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/EnhancedIntentResponse'
                  }
                }
              }
            },
            '400': {
              description: 'Bad request - invalid input parameters',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            },
            '401': {
              description: 'Unauthorized - invalid or missing authentication token',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        }
      },
      '/api/agents/duck': {
        post: {
          summary: 'Create a new DUCK agent',
          description: 'Creates a new DUCK agent and automatically creates or retrieves user based on email',
          tags: ['DUCK Agents'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'email'],
                  properties: {
                    name: {
                      type: 'string',
                      description: 'Agent name'
                    },
                    description: {
                      type: 'string',
                      description: 'Agent description'
                    },
                    email: {
                      type: 'string',
                      format: 'email',
                      description: 'User email (required for DUCK agents)'
                    },
                    agentType: {
                      type: 'string',
                      enum: ['general', 'trading', 'defi', 'nft'],
                      default: 'general',
                      description: 'Type of agent'
                    },
                    configuration: {
                      type: 'object',
                      description: 'Agent configuration'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'DUCK agent created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean',
                        example: true
                      },
                      message: {
                        type: 'string',
                        example: 'DUCK agent created successfully'
                      },
                      data: {
                        type: 'object',
                        properties: {
                          agent: {
                            type: 'object'
                          },
                          address: {
                            type: 'string'
                          },
                          user: {
                            type: 'object',
                            properties: {
                              _id: {
                                type: 'string'
                              },
                              name: {
                                type: 'string'
                              },
                              email: {
                                type: 'string'
                              },
                              duckAddress: {
                                type: 'string'
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Bad request - validation error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        },
        get: {
          summary: 'Get all DUCK agents or agents for a specific user',
          tags: ['DUCK Agents'],
          parameters: [
            {
              in: 'query',
              name: 'userId',
              schema: {
                type: 'string'
              },
              description: 'Filter agents by user ID'
            }
          ],
          responses: {
            '200': {
              description: 'List of DUCK agents',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean'
                      },
                      count: {
                        type: 'number'
                      },
                      data: {
                        type: 'array',
                        items: {
                          type: 'object'
                        }
                      }
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        }
      },
      '/api/agents/duck/tokens': {
        get: {
          summary: 'Get supported DUCK tokens',
          tags: ['DUCK Agents'],
          responses: {
            '200': {
              description: 'List of supported tokens',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean'
                      },
                      data: {
                        type: 'object',
                        additionalProperties: {
                          type: 'string'
                        }
                      }
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        }
      },
      '/api/agents/duck/{id}': {
        get: {
          summary: 'Get a specific DUCK agent by ID',
          tags: ['DUCK Agents'],
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: {
                type: 'string'
              },
              description: 'Agent ID'
            }
          ],
          responses: {
            '200': {
              description: 'DUCK agent details',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean'
                      },
                      data: {
                        type: 'object'
                      }
                    }
                  }
                }
              }
            },
            '404': {
              description: 'Agent not found',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        },
        put: {
          summary: 'Update a DUCK agent',
          tags: ['DUCK Agents'],
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: {
                type: 'string'
              },
              description: 'Agent ID'
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string'
                    },
                    description: {
                      type: 'string'
                    },
                    configuration: {
                      type: 'object'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Agent updated successfully'
            },
            '404': {
              description: 'Agent not found'
            },
            '500': {
              description: 'Server error'
            }
          }
        },
        delete: {
          summary: 'Delete a DUCK agent',
          tags: ['DUCK Agents'],
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: {
                type: 'string'
              },
              description: 'Agent ID'
            }
          ],
          responses: {
            '200': {
              description: 'Agent deleted successfully'
            },
            '404': {
              description: 'Agent not found'
            },
            '500': {
              description: 'Server error'
            }
          }
        }
      },
      '/api/agents/duck/{id}/swap': {
        post: {
          summary: 'Execute a DUCK token swap',
          tags: ['DUCK Agents'],
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: {
                type: 'string'
              },
              description: 'Agent ID'
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['fromToken', 'toToken', 'amount'],
                  properties: {
                    fromToken: {
                      type: 'string',
                      description: 'Source token symbol (e.g., DUCK, USDC)'
                    },
                    toToken: {
                      type: 'string',
                      description: 'Target token symbol (e.g., USDC, WETH)'
                    },
                    amount: {
                      type: 'number',
                      description: 'Amount to swap'
                    },
                    slippageTolerance: {
                      type: 'number',
                      default: 15,
                      description: 'Slippage tolerance percentage'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Swap executed successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean'
                      },
                      message: {
                        type: 'string'
                      },
                      data: {
                        type: 'object',
                        properties: {
                          transactionHash: {
                            type: 'string'
                          },
                          amountIn: {
                            type: 'string'
                          },
                          amountOut: {
                            type: 'string'
                          },
                          gasUsed: {
                            type: 'string'
                          },
                          fromToken: {
                            type: 'string'
                          },
                          toToken: {
                            type: 'string'
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Bad request - validation error'
            },
            '404': {
              description: 'Agent not found'
            },
            '500': {
              description: 'Server error'
            }
          }
        }
      },
      '/api/agents/duck/{id}/transfer': {
        post: {
          summary: 'Execute a DUCK token transfer',
          tags: ['DUCK Agents'],
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: {
                type: 'string'
              },
              description: 'Agent ID'
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['token', 'to', 'amount'],
                  properties: {
                    token: {
                      type: 'string',
                      description: 'Token symbol (e.g., DUCK, USDC)'
                    },
                    to: {
                      type: 'string',
                      description: 'Recipient address'
                    },
                    amount: {
                      type: 'number',
                      description: 'Amount to transfer'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Transfer executed successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean'
                      },
                      message: {
                        type: 'string'
                      },
                      data: {
                        type: 'object',
                        properties: {
                          transactionHash: {
                            type: 'string'
                          },
                          token: {
                            type: 'string'
                          },
                          to: {
                            type: 'string'
                          },
                          amount: {
                            type: 'number'
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Bad request - validation error'
            },
            '404': {
              description: 'Agent not found'
            },
            '500': {
              description: 'Server error'
            }
          }
        }
      }
    }
  },
  apis: ['./routes/*.js', './index.js'], // Path to the API files
};

const specs = swaggerJSDoc(options);

module.exports = specs; 