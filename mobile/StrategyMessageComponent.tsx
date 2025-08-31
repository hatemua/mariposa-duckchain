import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

interface StrategyData {
  strategyName: string;
  approach: 'conservative' | 'balanced' | 'aggressive';
  riskPercentage: number;
  confidenceScore: number;
  timeFrame: string;
  allocation: { [key: string]: string };
  rebalancingActions: Array<{
    trigger: string;
    action: string;
    frequency: string;
    threshold: string;
  }>;
  immediateActions: Array<{
    step: number;
    action: string;
    amount?: string;
  }>;
  entryStrategy: string;
  exitStrategy: string;
  riskManagement: string;
  expectedReturn: string;
  keyMetrics: string[];
  dataNeeded: string[];
  marketConditions: string;
  reasoning: string;
  sourceStrategies?: string[];
}

interface ProcessingMetadata {
  layer1: {
    complexity: string;
    analysisDepth: string;
    timeHorizon: string;
    riskAnalysisLevel: string;
    reasoning: string;
  };
  layer2: string;
  layer3: string;
}

interface StrategyMessageProps {
  strategy: StrategyData;
  sourceStrategies: number;
  processingMetadata: ProcessingMetadata;
  timestamp: string;
}

const { width } = Dimensions.get('window');

export default function StrategyMessageComponent({
  strategy,
  sourceStrategies,
  processingMetadata,
  timestamp,
}: StrategyMessageProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('overview');

  const getTokenColor = (token: string) => {
    const colors: { [key: string]: string } = {
      WTON: '#4CAF50',
      DUCK: '#2196F3',
      TON: '#9C27B0',
      USDT: '#FF9800',
    };
    return colors[token] || '#757575';
  };

  const getApproachColor = () => {
    switch (strategy?.approach) {
      case 'conservative': return '#4CAF50';
      case 'balanced': return '#FF9800';
      case 'aggressive': return '#F44336';
      default: return '#757575';
    }
  };


  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const getIconEmoji = (iconName: string) => {
    const iconMap: { [key: string]: string } = {
      'dashboard': '📊',
      'pie-chart': '🥧',
      'play-arrow': '▶️',
      'sync': '🔄',
      'analytics': '📈',
      'security': '🛡️',
      'expand-less': '🔼',
      'expand-more': '🔽',
      'trending-up': '📈',
      'schedule': '⏰',
      'psychology': '🧠',
      'show-chart': '📊',
      'data-usage': '💾',
    };
    return iconMap[iconName] || '•';
  };

  const renderSectionHeader = (title: string, icon: string, section: string) => (
    <TouchableOpacity
      style={styles.sectionHeader}
      onPress={() => toggleSection(section)}
    >
      <View style={styles.sectionHeaderLeft}>
        <Text style={styles.sectionIcon}>{getIconEmoji(icon)}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.expandIcon}>
        {expandedSection === section ? '🔼' : '🔽'}
      </Text>
    </TouchableOpacity>
  );


  return (
    <View style={styles.container}>
      {/* Strategy Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <Text style={styles.aiIcon}>🧠</Text>
          <Text style={styles.aiLabel}>AI Strategy Analysis</Text>
        </View>
        <Text style={styles.strategyTitle}>{strategy.strategyName}</Text>
        
        <View style={styles.headerStats}>
          <View style={styles.statBox}>
            <Text style={styles.statIcon}>📈</Text>
            <Text style={styles.statLabel}>Return</Text>
            <Text style={styles.statValue}>{strategy.expectedReturn}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statIcon}>🛡️</Text>
            <Text style={styles.statLabel}>Risk</Text>
            <Text style={styles.statValue}>{strategy.riskPercentage}%</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statIcon}>⏰</Text>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>{strategy.timeFrame}</Text>
          </View>
        </View>

        {/* Processing Info */}
        <View style={styles.processingInfo}>
          <Text style={styles.processingText}>
            🧠 {sourceStrategies}/4 LLMs • {processingMetadata.layer1.complexity} complexity
          </Text>
          <Text style={styles.confidenceText}>
            Confidence: {strategy.confidenceScore}%
          </Text>
        </View>
      </LinearGradient>

      {/* Overview Section */}
      {renderSectionHeader('Strategy Overview', 'dashboard', 'overview')}
      {expandedSection === 'overview' && (
        <View style={styles.sectionContent}>
          <View style={[styles.approachBadgeContainer, { borderLeftColor: getApproachColor() }]}>
            <View style={[styles.approachBadge, { backgroundColor: getApproachColor() }]}>
              <Text style={styles.approachText}>{strategy.approach.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.reasoningText}>{strategy.reasoning}</Text>
          
          <Text style={styles.marketConditionsTitle}>Market Conditions:</Text>
          <Text style={styles.marketConditionsText}>{strategy.marketConditions}</Text>
        </View>
      )}

      {/* Portfolio Allocation Section */}
      {renderSectionHeader('Portfolio Allocation', 'pie-chart', 'allocation')}
      {expandedSection === 'allocation' && (
        <View style={styles.sectionContent}>
          {/* Simple Visual Allocation Display */}
          <View style={styles.allocationVisualization}>
            <Text style={styles.allocationTitle}>Portfolio Distribution:</Text>
            {Object.entries(strategy.allocation).map(([token, percentage]) => (
              <View key={token} style={styles.allocationVisualItem}>
                <Text style={styles.allocationEmoji}>
                  {token === 'WTON' ? '🟢' : token === 'DUCK' ? '🔵' : token === 'TON' ? '🟣' : '🟠'}
                </Text>
                <Text style={styles.allocationToken}>{token}</Text>
                <View style={styles.allocationBarContainer}>
                  <View style={styles.allocationBar}>
                    <View 
                      style={[
                        styles.allocationFill, 
                        { 
                          width: `${percentage}%`, 
                          backgroundColor: getTokenColor(token) 
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.percentageText}>{percentage}%</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Immediate Actions Section */}
      {renderSectionHeader('Immediate Actions', 'play-arrow', 'actions')}
      {expandedSection === 'actions' && (
        <View style={styles.sectionContent}>
          {strategy.immediateActions.map((action, index) => (
            <View key={index} style={styles.actionItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepText}>{action.step}</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionText}>{action.action}</Text>
                {action.amount && (
                  <Text style={styles.actionAmount}>{action.amount}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Rebalancing Rules Section */}
      {renderSectionHeader('Rebalancing Rules', 'sync', 'rebalancing')}
      {expandedSection === 'rebalancing' && (
        <View style={styles.sectionContent}>
          {strategy.rebalancingActions.map((rule, index) => (
            <View key={index} style={styles.rebalancingRule}>
              <View style={styles.ruleHeader}>
                <Text style={styles.ruleIcon}>🔄</Text>
                <Text style={styles.ruleFrequency}>{rule.frequency}</Text>
              </View>
              <Text style={styles.ruleTrigger}>When: {rule.trigger}</Text>
              <Text style={styles.ruleAction}>Do: {rule.action}</Text>
              {rule.threshold && (
                <View style={styles.thresholdTag}>
                  <Text style={styles.thresholdText}>Threshold: {rule.threshold}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Market Data Requirements Section */}
      {renderSectionHeader('Required Market Data', 'analytics', 'data')}
      {expandedSection === 'data' && (
        <View style={styles.sectionContent}>
          <Text style={styles.subsectionTitle}>Key Metrics to Monitor:</Text>
          <View style={styles.metricsList}>
            {strategy.keyMetrics.map((metric, index) => (
              <View key={index} style={styles.metricChip}>
                <Text style={styles.metricIcon}>📊</Text>
                <Text style={styles.metricText}>{metric}</Text>
              </View>
            ))}
          </View>
          
          <Text style={styles.subsectionTitle}>Data Sources Needed:</Text>
          {strategy.dataNeeded.map((data, index) => (
            <View key={index} style={styles.dataItem}>
              <Text style={styles.dataIcon}>💾</Text>
              <Text style={styles.dataText}>{data}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Risk Management Section */}
      {renderSectionHeader('Risk Management', 'security', 'risk')}
      {expandedSection === 'risk' && (
        <View style={styles.sectionContent}>
          <View style={styles.riskCard}>
            <Text style={styles.riskText}>{strategy.riskManagement}</Text>
          </View>
          
          <View style={styles.entryExitContainer}>
            <View style={styles.entryExitItem}>
              <Text style={styles.entryExitTitle}>🚀 Entry Strategy:</Text>
              <Text style={styles.entryExitText}>{strategy.entryStrategy}</Text>
            </View>
            
            <View style={styles.entryExitItem}>
              <Text style={styles.entryExitTitle}>🎯 Exit Strategy:</Text>
              <Text style={styles.entryExitText}>{strategy.exitStrategy}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Timestamp */}
      <Text style={styles.timestamp}>{new Date(timestamp).toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerGradient: {
    padding: 15,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiIcon: {
    fontSize: 20,
    marginRight: 6,
  },
  aiLabel: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.9,
  },
  strategyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    fontSize: 14,
    marginBottom: 2,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    marginTop: 2,
  },
  statValue: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  processingInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  processingText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
  },
  confidenceText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  expandIcon: {
    fontSize: 16,
  },
  sectionContent: {
    padding: 15,
  },
  approachBadgeContainer: {
    borderLeftWidth: 4,
    paddingLeft: 10,
    marginBottom: 10,
  },
  approachBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  approachText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  reasoningText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 12,
  },
  marketConditionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  marketConditionsText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  allocationVisualization: {
    backgroundColor: '#f8f9ff',
    padding: 12,
    borderRadius: 8,
    marginVertical: 10,
  },
  allocationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  allocationVisualItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  allocationEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  allocationToken: {
    fontSize: 13,
    fontWeight: '600',
    width: 45,
    color: '#333',
  },
  allocationBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  allocationBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginHorizontal: 8,
  },
  allocationFill: {
    height: '100%',
    borderRadius: 3,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: 'bold',
    width: 40,
    textAlign: 'right',
    color: '#333',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNumber: {
    width: 20,
    height: 20,
    backgroundColor: '#667eea',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  stepText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionContent: {
    flex: 1,
  },
  actionText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  actionAmount: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
    marginTop: 2,
  },
  rebalancingRule: {
    backgroundColor: '#f8f9ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ruleIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  ruleFrequency: {
    fontSize: 11,
    color: '#667eea',
    fontWeight: '600',
  },
  ruleTrigger: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  ruleAction: {
    fontSize: 12,
    color: '#333',
    marginBottom: 6,
  },
  thresholdTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  thresholdText: {
    fontSize: 10,
    color: '#667eea',
    fontWeight: '600',
  },
  subsectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 8,
  },
  metricsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f2ff',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    margin: 2,
  },
  metricIcon: {
    fontSize: 12,
    marginRight: 3,
  },
  metricText: {
    fontSize: 11,
    color: '#667eea',
  },
  dataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dataIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  dataText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
    lineHeight: 16,
  },
  riskCard: {
    backgroundColor: '#fff5f5',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
    marginBottom: 12,
  },
  riskText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  entryExitContainer: {
    marginTop: 8,
  },
  entryExitItem: {
    marginBottom: 12,
  },
  entryExitTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  entryExitText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
});