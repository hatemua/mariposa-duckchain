import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import API_CONFIG from './config/ApiConfig';

interface ProgressStep {
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  emoji: string;
}

interface StrategyProgress {
  stage: string;
  percentage: number;
  currentStep: string;
  steps?: ProgressStep[];
}

interface StrategyLoadingProps {
  processingId: string;
  progress?: StrategyProgress;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

const { width } = Dimensions.get('window');

export default function StrategyLoadingComponent({
  processingId,
  progress,
  onComplete,
  onError,
}: StrategyLoadingProps) {
  const [currentProgress, setCurrentProgress] = useState<StrategyProgress>({
    stage: 'Initializing AI Strategy Analysis...',
    percentage: 5,
    currentStep: 'Starting multi-layer processing...',
    steps: [
      { name: 'Request Validation', status: 'in_progress', emoji: '🔍' },
      { name: '4 LLM Strategy Generation', status: 'pending', emoji: '🧠' },
      { name: 'Master Consolidation', status: 'pending', emoji: '⚡' },
      { name: 'Final Analysis', status: 'pending', emoji: '📊' }
    ]
  });

  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0)
  ]).current;
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (progress) {
      setCurrentProgress(progress);
    }
  }, [progress]);

  useEffect(() => {
    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: currentProgress.percentage,
      duration: 500,
      useNativeDriver: false,
    }).start();

    // Pulse animation for active processing
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    // Dot loading animation
    const dotAnimation = Animated.loop(
      Animated.stagger(200, dotAnimations.map(dot =>
        Animated.sequence([
          Animated.timing(dot, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ))
    );
    dotAnimation.start();

    return () => {
      pulseAnimation.stop();
      dotAnimation.stop();
    };
  }, [currentProgress]);

  useEffect(() => {
    // Start polling for progress updates
    startPolling();

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [processingId]);

  const startPolling = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
    }

    pollInterval.current = setInterval(async () => {
      try {
        // First check status
        const statusResponse = await fetch(API_CONFIG.getStrategyStatusUrl(processingId));
        const statusData = await statusResponse.json();

        if (statusData.success && statusData.status === 'completed') {
          // Get the final result
          const resultResponse = await fetch(API_CONFIG.getStrategyResultUrl(processingId));
          const resultData = await resultResponse.json();

          if (resultData.success && onComplete) {
            clearInterval(pollInterval.current!);
            setCurrentProgress(prev => ({
              ...prev,
              stage: 'Strategy Complete!',
              percentage: 100,
              currentStep: 'Analysis ready!'
            }));
            
            // Small delay to show completion
            setTimeout(() => {
              onComplete(resultData.result);
            }, 1000);
          }
        } else if (statusData.success && statusData.status === 'processing') {
          // Get detailed progress
          const progressResponse = await fetch(API_CONFIG.getStrategyProgressUrl(processingId));
          const progressData = await progressResponse.json();

          if (progressData.success) {
            setCurrentProgress(prev => ({
              ...prev,
              ...progressData.progress
            }));
          }
        }
      } catch (error) {
        console.error('Error polling strategy progress:', error);
        if (onError) {
          onError('Failed to get strategy progress updates');
        }
      }
    }, 2000); // Poll every 2 seconds
  };

  const getStepStatus = (step: ProgressStep) => {
    switch (step.status) {
      case 'completed':
        return { color: '#4CAF50', opacity: 1 };
      case 'in_progress':
        return { color: '#667eea', opacity: 1 };
      default:
        return { color: '#ccc', opacity: 0.6 };
    }
  };

  const getProgressColor = () => {
    if (currentProgress.percentage >= 95) return '#4CAF50';
    if (currentProgress.percentage >= 75) return '#FF9800';
    if (currentProgress.percentage >= 50) return '#667eea';
    return '#2196F3';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Animated.View style={[styles.aiIcon, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.aiIconText}>🧠</Text>
        </Animated.View>
        <Text style={styles.title}>AI Strategy Analysis</Text>
        <Text style={styles.subtitle}>Multi-layer processing in progress...</Text>
      </LinearGradient>

      {/* Progress Section */}
      <View style={styles.progressSection}>
        <Text style={styles.currentStage}>{currentProgress.stage}</Text>
        <Text style={styles.currentStep}>{currentProgress.currentStep}</Text>
        
        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <Animated.View 
              style={[
                styles.progressBarFill, 
                { 
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                  backgroundColor: getProgressColor()
                }
              ]} 
            />
          </View>
          <Text style={styles.percentageText}>{Math.round(currentProgress.percentage)}%</Text>
        </View>

        {/* Processing Steps */}
        <View style={styles.stepsContainer}>
          {currentProgress.steps?.map((step, index) => {
            const stepStyle = getStepStatus(step);
            return (
              <View key={index} style={styles.stepItem}>
                <View style={[styles.stepIcon, { backgroundColor: stepStyle.color, opacity: stepStyle.opacity }]}>
                  <Text style={styles.stepEmoji}>{step.emoji}</Text>
                </View>
                <Text style={[styles.stepName, { color: stepStyle.color, opacity: stepStyle.opacity }]}>
                  {step.name}
                </Text>
                {step.status === 'in_progress' && (
                  <View style={styles.loadingDots}>
                    {dotAnimations.map((dot, dotIndex) => (
                      <Animated.View
                        key={dotIndex}
                        style={[
                          styles.loadingDot,
                          {
                            opacity: dot,
                            backgroundColor: stepStyle.color
                          }
                        ]}
                      />
                    ))}
                  </View>
                )}
                {step.status === 'completed' && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* LLM Processing Info */}
        <View style={styles.llmInfo}>
          <Text style={styles.llmInfoTitle}>🤖 AI Processing Pipeline:</Text>
          <Text style={styles.llmInfoText}>• Conservative Analyst - Risk mitigation focus</Text>
          <Text style={styles.llmInfoText}>• Advanced Strategist - Quantitative optimization</Text>
          <Text style={styles.llmInfoText}>• Risk Manager - Downside protection</Text>
          <Text style={styles.llmInfoText}>• Growth Optimizer - Return maximization</Text>
          <Text style={styles.llmInfoText}>• Master Consolidator - Best element synthesis</Text>
        </View>

        {/* Time Estimate */}
        <View style={styles.timeEstimate}>
          <Text style={styles.timeEstimateText}>
            ⏱️ Estimated completion: 10-15 seconds
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  aiIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  aiIconText: {
    fontSize: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  progressSection: {
    padding: 20,
  },
  currentStage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  currentStep: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    width: 40,
    textAlign: 'right',
  },
  stepsContainer: {
    marginBottom: 20,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepEmoji: {
    fontSize: 16,
  },
  stepName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  loadingDots: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  loadingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 2,
  },
  checkmark: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  llmInfo: {
    backgroundColor: '#f8f9ff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  llmInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  llmInfoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    lineHeight: 16,
  },
  timeEstimate: {
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  timeEstimateText: {
    fontSize: 12,
    color: '#999',
  },
});