import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

interface ArgumentRequestModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (args: Record<string, string>) => void;
  interactiveData: {
    type: 'argumentRequest';
    message: string;
    components: Array<{
      name: string;
      type: 'text' | 'number' | 'address' | 'amount';
      label: string;
      placeholder?: string;
      required?: boolean;
      options?: string[];
    }>;
    missingArgs: string[];
  };
  validation?: {
    isValid: boolean;
    missing: string[];
    requiredArgs: string[];
  };
  extractedData?: {
    actionType: string;
    args: Record<string, any>;
  };
}

const ArgumentRequestModal: React.FC<ArgumentRequestModalProps> = ({
  visible,
  onClose,
  onSubmit,
  interactiveData,
  validation,
  extractedData,
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(height));

  useEffect(() => {
    if (visible) {
      // Initialize form with any existing data
      if (extractedData?.args) {
        const initialData: Record<string, string> = {};
        Object.keys(extractedData.args).forEach(key => {
          if (extractedData.args[key] !== null && extractedData.args[key] !== undefined) {
            initialData[key] = String(extractedData.args[key]);
          }
        });
        setFormData(initialData);
      }

      // Generate components array from missing arguments if not provided
      if (!interactiveData.components && validation?.missing) {
        const generatedComponents = validation.missing.map(argName => ({
          name: argName,
          type: argName === 'amount' ? 'amount' as const : 
                argName === 'recipient' ? 'address' as const : 'text' as const,
          label: argName === 'recipient' ? 'Recipient Address' : 
                 argName === 'amount' ? 'Amount' : 
                 argName.charAt(0).toUpperCase() + argName.slice(1),
          required: true,
          placeholder: argName === 'recipient' ? 'Enter recipient address or username' : 
                      argName === 'amount' ? 'Enter amount to transfer' : 
                      `Enter ${argName}...`
        }));
        
        // Update the interactiveData with generated components
        (interactiveData as any).components = generatedComponents;
      }

      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations
      fadeAnim.setValue(0);
      slideAnim.setValue(height);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      setFormData({});
      setErrors({});
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    interactiveData.components.forEach(component => {
      const value = formData[component.name];
      
      if (component.required && (!value || value.trim() === '')) {
        newErrors[component.name] = `${component.label} is required`;
        return;
      }

      if (value && component.type === 'amount') {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue <= 0) {
          newErrors[component.name] = 'Please enter a valid amount';
          return;
        }
      }

      if (value && component.type === 'address') {
        // Basic address validation
        if (value.length < 3) {
          newErrors[component.name] = 'Please enter a valid address';
          return;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
      handleClose();
    } else {
      // Show error haptic
      Alert.alert(
        'Please check your inputs',
        'Some fields contain errors that need to be fixed.',
        [{ text: 'OK' }]
      );
    }
  };

  const updateFormData = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const getInputIcon = (type: string) => {
    switch (type) {
      case 'address': return '📍';
      case 'amount': return '💰';
      case 'number': return '🔢';
      default: return '✏️';
    }
  };

  const getInputPlaceholder = (component: any) => {
    if (component.placeholder) return component.placeholder;
    
    switch (component.type) {
      case 'address': return 'Enter recipient address...';
      case 'amount': return 'Enter amount...';
      case 'number': return 'Enter number...';
      default: return `Enter ${component.label.toLowerCase()}...`;
    }
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity 
            style={styles.backdropTouchable} 
            onPress={handleClose}
            activeOpacity={1}
          />
        </Animated.View>
        
        <Animated.View 
          style={[
            styles.modalContainer,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <LinearGradient
            colors={['#FFFFFF', '#F8FAFC']}
            style={styles.modalContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Text style={styles.headerIconText}>📝</Text>
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.title}>Complete Transfer</Text>
                <Text style={styles.subtitle}>{interactiveData.message}</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Action Context */}
            {extractedData && (
              <View style={styles.contextCard}>
                <View style={styles.contextHeader}>
                  <Text style={styles.contextIcon}>🔄</Text>
                  <Text style={styles.contextTitle}>Transfer {extractedData.actionType}</Text>
                </View>
                <Text style={styles.contextMessage}>
                  I need a few more details to complete your transfer
                </Text>
              </View>
            )}

            {/* Form Fields */}
            <ScrollView 
              style={styles.formContainer}
              showsVerticalScrollIndicator={false}
            >
              {interactiveData.components.map((component, index) => (
                <View key={component.name} style={styles.inputGroup}>
                  <View style={styles.inputLabelContainer}>
                    <Text style={styles.inputIcon}>{getInputIcon(component.type)}</Text>
                    <Text style={styles.inputLabel}>
                      {component.label}
                      {component.required && <Text style={styles.required}> *</Text>}
                    </Text>
                  </View>

                  <View style={[
                    styles.inputContainer,
                    errors[component.name] && styles.inputContainerError
                  ]}>
                    <TextInput
                      style={styles.textInput}
                      value={formData[component.name] || ''}
                      onChangeText={(value) => updateFormData(component.name, value)}
                      placeholder={getInputPlaceholder(component)}
                      placeholderTextColor="#94A3B8"
                      keyboardType={
                        component.type === 'number' || component.type === 'amount' 
                          ? 'numeric' 
                          : 'default'
                      }
                      autoCapitalize={component.type === 'address' ? 'none' : 'words'}
                      selectTextOnFocus
                    />
                    
                    {formData[component.name] && !errors[component.name] && (
                      <View style={styles.validIcon}>
                        <Text style={styles.validIconText}>✓</Text>
                      </View>
                    )}
                  </View>

                  {errors[component.name] && (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorIcon}>⚠️</Text>
                      <Text style={styles.errorText}>{errors[component.name]}</Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.submitButton} 
                onPress={handleSubmit}
              >
                <LinearGradient
                  colors={['#3B82F6', '#1E40AF']}
                  style={styles.submitButtonGradient}
                >
                  <Text style={styles.submitButtonText}>Complete Transfer</Text>
                  <Text style={styles.submitButtonIcon}>→</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  backdropTouchable: {
    flex: 1,
  },
  modalContainer: {
    maxHeight: height * 0.9,
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    minHeight: height * 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerIconText: {
    fontSize: 20,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },

  // Context Card
  contextCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 24,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contextIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  contextTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3730A3',
  },
  contextMessage: {
    fontSize: 14,
    color: '#4C1D95',
    lineHeight: 20,
  },

  // Form Styles
  formContainer: {
    paddingHorizontal: 24,
    marginTop: 24,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  required: {
    color: '#EF4444',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    minHeight: 56,
  },
  inputContainerError: {
    borderColor: '#EF4444',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  validIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  validIconText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  errorIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },

  // Button Styles
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  submitButton: {
    flex: 2,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 8,
  },
  submitButtonIcon: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default ArgumentRequestModal;