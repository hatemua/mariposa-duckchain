import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { PieChart, BarChart, LineChart } from 'react-native-chart-kit';

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

interface StrategyModalProps {
  visible: boolean;
  onClose: () => void;
  strategy: StrategyData;
  sourceStrategies: number;
  processingMetadata: ProcessingMetadata;
}

const { width, height } = Dimensions.get('window');

export default function StrategyModal({
  visible,
  onClose,
  strategy,
  sourceStrategies,
  processingMetadata,
}: StrategyModalProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [chartData, setChartData] = useState<any>({});

  useEffect(() => {
    if (strategy?.allocation) {
      // Prepare pie chart data for allocation
      const allocData = Object.entries(strategy.allocation).map(([token, percentage]) => ({
        name: token,
        percentage: parseFloat(percentage),
        color: getTokenColor(token),
        legendFontColor: '#7F7F7F',
        legendFontSize: 14,
      }));

      // Prepare risk distribution data
      const riskData = [
        { name: 'Conservative', value: strategy.approach === 'conservative' ? 80 : 20, color: '#4CAF50' },
        { name: 'Balanced', value: strategy.approach === 'balanced' ? 70 : 30, color: '#FF9800' },
        { name: 'Aggressive', value: strategy.approach === 'aggressive' ? 90 : 10, color: '#F44336' },
      ];

      // Mock market trend data for visualization
      const trendData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            data: [100, 105, 102, 115, 108, 120], // Mock price progression
            color: (opacity = 1) => `rgba(74, 175, 79, ${opacity})`,
            strokeWidth: 2,
          },
        ],
      };

      setChartData({ allocData, riskData, trendData });
    }
  }, [strategy]);

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

  const getComplexityIcon = () => {
    switch (processingMetadata?.layer1?.complexity) {
      case 'simple': return 'radio-button-off';
      case 'moderate': return 'radio-button-on';
      case 'complex': return 'layers';
      default: return 'help-circle';
    }
  };

  const renderOverviewTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Strategy Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.headerGradient}
      >
        <Text style={styles.strategyTitle}>{strategy.strategyName}</Text>
        <View style={styles.headerStats}>
          <View style={styles.statItem}>
            <MaterialIcons name="trending-up" size={24} color="white" />
            <Text style={styles.statLabel}>Expected Return</Text>
            <Text style={styles.statValue}>{strategy.expectedReturn}</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="security" size={24} color="white" />
            <Text style={styles.statLabel}>Risk Level</Text>
            <Text style={styles.statValue}>{strategy.riskPercentage}%</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="schedule" size={24} color="white" />
            <Text style={styles.statLabel}>Time Frame</Text>
            <Text style={styles.statValue}>{strategy.timeFrame}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* AI Processing Analysis */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧠 AI Deep Analysis</Text>
        <View style={styles.analysisCard}>
          <View style={styles.analysisRow}>
            <MaterialIcons name={getComplexityIcon()} size={20} color="#667eea" />
            <Text style={styles.analysisLabel}>Complexity:</Text>
            <Text style={styles.analysisValue}>{processingMetadata.layer1.complexity}</Text>
          </View>
          <View style={styles.analysisRow}>
            <MaterialIcons name="analytics" size={20} color="#667eea" />
            <Text style={styles.analysisLabel}>Analysis Depth:</Text>
            <Text style={styles.analysisValue}>{processingMetadata.layer1.analysisDepth}</Text>
          </View>
          <View style={styles.analysisRow}>
            <MaterialIcons name="psychology" size={20} color="#667eea" />
            <Text style={styles.analysisLabel}>LLM Strategies:</Text>
            <Text style={styles.analysisValue}>{sourceStrategies}/4 Generated</Text>
          </View>
          <View style={styles.analysisRow}>
            <MaterialIcons name="confidence" size={20} color="#667eea" />
            <Text style={styles.analysisLabel}>Confidence:</Text>
            <Text style={styles.analysisValue}>{strategy.confidenceScore}%</Text>
          </View>
        </View>
      </View>

      {/* Strategy Approach */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Strategy Approach</Text>
        <View style={[styles.approachCard, { borderLeftColor: getApproachColor() }]}>
          <View style={styles.approachHeader}>
            <View style={[styles.approachBadge, { backgroundColor: getApproachColor() }]}>
              <Text style={styles.approachBadgeText}>{strategy.approach.toUpperCase()}</Text>
            </View>
            <Text style={styles.approachRisk}>Risk: {strategy.riskPercentage}%</Text>
          </View>
          <Text style={styles.reasoningText}>{strategy.reasoning}</Text>
        </View>
      </View>

      {/* Market Conditions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Market Analysis</Text>
        <View style={styles.marketCard}>
          <Text style={styles.marketText}>{strategy.marketConditions}</Text>
          
          {/* Key Metrics */}
          <Text style={styles.subsectionTitle}>Key Metrics to Monitor:</Text>
          <View style={styles.metricsContainer}>
            {strategy.keyMetrics.map((metric, index) => (
              <View key={index} style={styles.metricChip}>
                <MaterialIcons name="show-chart" size={16} color="#667eea" />
                <Text style={styles.metricText}>{metric}</Text>
              </View>
            ))}
          </View>

          {/* Data Requirements */}
          <Text style={styles.subsectionTitle}>Required Market Data:</Text>
          <View style={styles.dataContainer}>
            {strategy.dataNeeded.map((data, index) => (
              <View key={index} style={styles.dataItem}>
                <MaterialIcons name="data-usage" size={16} color="#FF9800" />
                <Text style={styles.dataText}>{data}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderAllocationTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Portfolio Allocation Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💼 Portfolio Allocation</Text>
        {chartData.allocData && (
          <View style={styles.chartContainer}>
            <PieChart
              data={chartData.allocData}
              width={width - 60}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="percentage"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        )}

        {/* Allocation Details */}
        <View style={styles.allocationDetails}>
          {Object.entries(strategy.allocation).map(([token, percentage]) => (
            <View key={token} style={styles.allocationRow}>
              <View style={[styles.tokenDot, { backgroundColor: getTokenColor(token) }]} />
              <Text style={styles.tokenSymbol}>{token}</Text>
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
              <Text style={styles.allocationPercent}>{percentage}%</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Entry & Exit Strategy */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚀 Entry Strategy</Text>
        <View style={styles.strategyCard}>
          <Text style={styles.strategyText}>{strategy.entryStrategy}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Exit Strategy</Text>
        <View style={styles.strategyCard}>
          <Text style={styles.strategyText}>{strategy.exitStrategy}</Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderActionsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Immediate Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Immediate Actions</Text>
        {strategy.immediateActions.map((action, index) => (
          <View key={index} style={styles.actionCard}>
            <View style={styles.actionHeader}>
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
          </View>
        ))}
      </View>

      {/* Rebalancing Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔄 Rebalancing Rules</Text>
        {strategy.rebalancingActions.map((rebalancing, index) => (
          <View key={index} style={styles.rebalancingCard}>
            <View style={styles.rebalancingHeader}>
              <MaterialIcons name="sync" size={20} color="#667eea" />
              <Text style={styles.rebalancingFreq}>{rebalancing.frequency}</Text>
            </View>
            
            <View style={styles.triggerSection}>
              <Text style={styles.triggerLabel}>Trigger:</Text>
              <Text style={styles.triggerText}>{rebalancing.trigger}</Text>
            </View>
            
            <View style={styles.actionSection}>
              <Text style={styles.actionLabel}>Action:</Text>
              <Text style={styles.actionText}>{rebalancing.action}</Text>
            </View>
            
            {rebalancing.threshold && (
              <View style={styles.thresholdBadge}>
                <Text style={styles.thresholdText}>Threshold: {rebalancing.threshold}</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Risk Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🛡️ Risk Management</Text>
        <View style={styles.riskCard}>
          <Text style={styles.riskText}>{strategy.riskManagement}</Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderTabButton = (tabId: string, title: string, icon: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tabId && styles.activeTabButton]}
      onPress={() => setActiveTab(tabId)}
    >
      <MaterialIcons 
        name={icon as any} 
        size={20} 
        color={activeTab === tabId ? '#667eea' : '#757575'} 
      />
      <Text style={[styles.tabText, activeTab === tabId && styles.activeTabText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  if (!strategy) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Strategy Analysis</Text>
          <View style={styles.headerRight}>
            <MaterialIcons name="psychology" size={24} color="#667eea" />
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          {renderTabButton('overview', 'Overview', 'dashboard')}
          {renderTabButton('allocation', 'Allocation', 'pie-chart')}
          {renderTabButton('actions', 'Actions', 'play-arrow')}
        </View>

        {/* Tab Content */}
        <View style={styles.content}>
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'allocation' && renderAllocationTab()}
          {activeTab === 'actions' && renderActionsTab()}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 5,
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: '#f0f2ff',
  },
  tabText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#757575',
  },
  activeTabText: {
    color: '#667eea',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  headerGradient: {
    padding: 20,
    borderRadius: 12,
    marginVertical: 15,
  },
  strategyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
    textAlign: 'center',
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 4,
  },
  statValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  section: {
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  analysisCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  analysisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  analysisLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  analysisValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  approachCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  approachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  approachBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  approachBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  approachRisk: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  reasoningText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  marketCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  marketText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 15,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 10,
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f2ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    margin: 2,
  },
  metricText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#667eea',
  },
  dataContainer: {
    marginTop: 5,
  },
  dataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dataText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  chartContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  allocationDetails: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  allocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tokenDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  tokenSymbol: {
    fontSize: 14,
    fontWeight: '600',
    width: 50,
  },
  allocationBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginHorizontal: 10,
  },
  allocationFill: {
    height: '100%',
    borderRadius: 4,
  },
  allocationPercent: {
    fontSize: 14,
    fontWeight: 'bold',
    width: 45,
    textAlign: 'right',
  },
  strategyCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  strategyText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actionCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepNumber: {
    width: 24,
    height: 24,
    backgroundColor: '#667eea',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionContent: {
    flex: 1,
  },
  actionText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  actionAmount: {
    fontSize: 13,
    color: '#667eea',
    fontWeight: '600',
  },
  rebalancingCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rebalancingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  rebalancingFreq: {
    marginLeft: 8,
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
  },
  triggerSection: {
    marginBottom: 8,
  },
  triggerLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  triggerText: {
    fontSize: 14,
    color: '#333',
  },
  actionSection: {
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  thresholdBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f2ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  thresholdText: {
    fontSize: 11,
    color: '#667eea',
    fontWeight: '600',
  },
  riskCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  riskText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});