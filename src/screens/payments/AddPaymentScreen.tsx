// src/screens/payments/AddPaymentScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import openPayService from '../../api/openPayService';
import paymentService from '../../api/paymentService';

export default function AddPaymentScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Campos del formulario
  const [cardNumber, setCardNumber] = useState('');
  const [holderName, setHolder Name] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');

  // Estado de validación
  const [cardType, setCardType] = useState<string | null>(null);
  const [isValidCard, setIsValidCard] = useState(false);

  useEffect(() => {
    initializeOpenPay();
  }, []);

  const initializeOpenPay = async () => {
    if (Platform.OS === 'web') {
      await openPayService.loadScript();
      openPayService.initialize(
        'mzdvf4hdyg1me8ncfbyz', // Tu Merchant ID
        'pk_test_...', // Tu Public Key
        true // Sandbox
      );
    }
  };

  // Validar número de tarjeta en tiempo real
  useEffect(() => {
    if (cardNumber.length >= 13) {
      const type = openPayService.getCardType(cardNumber);
      setCardType(type);
      setIsValidCard(openPayService.validateCardNumber(cardNumber));
    } else {
      setCardType(null);
      setIsValidCard(false);
    }
  }, [cardNumber]);

  const handleCardNumberChange = (text: string) => {
    const formatted = openPayService.formatCardNumber(text);
    setCardNumber(formatted);
    if (errors.cardNumber) {
      setErrors(prev => ({ ...prev, cardNumber: '' }));
    }
  };

  const handleHolderNameChange = (text: string) => {
    // Solo letras y espacios
    const cleaned = text.replace(/[^a-zA-Z\s]/g, '').toUpperCase();
    setHolderName(cleaned);
    if (errors.holderName) {
      setErrors(prev => ({ ...prev, holderName: '' }));
    }
  };

  const handleExpiryMonthChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').substring(0, 2);
    if (cleaned.length === 2 && parseInt(cleaned) > 12) {
      setExpiryMonth('12');
    } else {
      setExpiryMonth(cleaned);
    }
    if (errors.expiry) {
      setErrors(prev => ({ ...prev, expiry: '' }));
    }
  };

  const handleExpiryYearChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').substring(0, 2);
    setExpiryYear(cleaned);
    if (errors.expiry) {
      setErrors(prev => ({ ...prev, expiry: '' }));
    }
  };

  const handleCvvChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').substring(0, 4);
    setCvv(cleaned);
    if (errors.cvv) {
      setErrors(prev => ({ ...prev, cvv: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!cardNumber || !openPayService.validateCardNumber(cardNumber)) {
      newErrors.cardNumber = 'Número de tarjeta inválido';
    }

    if (!holderName || holderName.length < 3) {
      newErrors.holderName = 'Nombre del titular requerido';
    }

    if (!expiryMonth || !expiryYear || !openPayService.validateExpiry(expiryMonth, `20${expiryYear}`)) {
      newErrors.expiry = 'Fecha de expiración inválida';
    }

    if (!cvv || !openPayService.validateCVC(cvv)) {
      newErrors.cvv = 'CVV inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Error', 'Por favor corrige los errores en el formulario');
      return;
    }

    setLoading(true);

    try {
      // 1. Tokenizar tarjeta con OpenPay
      const tokenResult = await openPayService.tokenizeCard({
        card_number: cardNumber,
        holder_name: holderName,
        expiration_month: expiryMonth,
        expiration_year: `20${expiryYear}`,
        cvv2: cvv,
      });

      if (!tokenResult.success || !tokenResult.token) {
        throw new Error(tokenResult.error || 'Error al procesar la tarjeta');
      }

      // 2. Generar Device Session ID
      const deviceSession = await openPayService.generateDeviceSessionId();
      if (!deviceSession.success) {
        throw new Error('Error al generar sesión de dispositivo');
      }

      // 3. Enviar al backend
      await paymentService.addPaymentMethod({
        token_id: tokenResult.token,
        device_session_id: deviceSession.deviceSessionId || '',
      });

      Alert.alert(
        'Éxito',
        'Tarjeta agregada correctamente',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo agregar la tarjeta');
    } finally {
      setLoading(false);
    }
  };

  const getCardIcon = () => {
    if (!cardType) return 'card-outline';
    
    switch (cardType.toLowerCase()) {
      case 'visa':
        return 'card';
      case 'mastercard':
        return 'card-outline';
      case 'amex':
        return 'card';
      default:
        return 'card-outline';
    }
  };

  const getCardColor = () => {
    if (!cardType) return '#6b7280';
    
    switch (cardType.toLowerCase()) {
      case 'visa':
        return '#1434CB';
      case 'mastercard':
        return '#EB001B';
      case 'amex':
        return '#006FCF';
      default:
        return '#6b7280';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Agregar Tarjeta</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Preview Card */}
        <View style={[styles.cardPreview, { borderColor: getCardColor() }]}>
          <View style={styles.cardPreviewHeader}>
            <Ionicons name={getCardIcon()} size={40} color={getCardColor()} />
            {cardType && (
              <Text style={[styles.cardTypeBadge, { color: getCardColor() }]}>
                {cardType.toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={styles.cardPreviewNumber}>
            {cardNumber || '•••• •••• •••• ••••'}
          </Text>
          <View style={styles.cardPreviewFooter}>
            <View>
              <Text style={styles.cardPreviewLabel}>Titular</Text>
              <Text style={styles.cardPreviewValue}>
                {holderName || 'NOMBRE APELLIDO'}
              </Text>
            </View>
            <View>
              <Text style={styles.cardPreviewLabel}>Vencimiento</Text>
              <Text style={styles.cardPreviewValue}>
                {expiryMonth || 'MM'}/{expiryYear || 'AA'}
              </Text>
            </View>
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Número de Tarjeta */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Número de Tarjeta</Text>
            <View style={[styles.inputContainer, errors.cardNumber && styles.inputError]}>
              <Ionicons name="card-outline" size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChangeText={handleCardNumberChange}
                keyboardType="numeric"
                maxLength={19}
                editable={!loading}
              />
              {isValidCard && (
                <Ionicons name="checkmark-circle" size={20} color="#27ae60" />
              )}
            </View>
            {errors.cardNumber && (
              <Text style={styles.errorText}>{errors.cardNumber}</Text>
            )}
          </View>

          {/* Nombre del Titular */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre del Titular</Text>
            <View style={[styles.inputContainer, errors.holderName && styles.inputError]}>
              <Ionicons name="person-outline" size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="NOMBRE APELLIDO"
                value={holderName}
                onChangeText={handleHolderNameChange}
                autoCapitalize="characters"
                editable={!loading}
              />
            </View>
            {errors.holderName && (
              <Text style={styles.errorText}>{errors.holderName}</Text>
            )}
            <Text style={styles.hint}>Como aparece en la tarjeta</Text>
          </View>

          {/* Fecha de Expiración y CVV */}
          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Vencimiento</Text>
              <View style={styles.expiryContainer}>
                <View style={[styles.expiryInput, errors.expiry && styles.inputError]}>
                  <TextInput
                    style={styles.expiryField}
                    placeholder="MM"
                    value={expiryMonth}
                    onChangeText={handleExpiryMonthChange}
                    keyboardType="numeric"
                    maxLength={2}
                    editable={!loading}
                  />
                </View>
                <Text style={styles.expirySeparator}>/</Text>
                <View style={[styles.expiryInput, errors.expiry && styles.inputError]}>
                  <TextInput
                    style={styles.expiryField}
                    placeholder="AA"
                    value={expiryYear}
                    onChangeText={handleExpiryYearChange}
                    keyboardType="numeric"
                    maxLength={2}
                    editable={!loading}
                  />
                </View>
              </View>
              {errors.expiry && (
                <Text style={styles.errorText}>{errors.expiry}</Text>
              )}
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>CVV</Text>
              <View style={[styles.inputContainer, errors.cvv && styles.inputError]}>
                <Ionicons name="lock-closed-outline" size={20} color="#6b7280" />
                <TextInput
                  style={styles.input}
                  placeholder="123"
                  value={cvv}
                  onChangeText={handleCvvChange}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                  editable={!loading}
                />
              </View>
              {errors.cvv && (
                <Text style={styles.errorText}>{errors.cvv}</Text>
              )}
            </View>
          </View>

          {/* Información de Seguridad */}
          <View style={styles.securityInfo}>
            <Ionicons name="shield-checkmark" size={24} color="#27ae60" />
            <View style={styles.securityContent}>
              <Text style={styles.securityTitle}>Transacción segura</Text>
              <Text style={styles.securityText}>
                Tu información está protegida con encriptación de 256 bits
              </Text>
            </View>
          </View>

          {/* Botón de Agregar */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Agregar Tarjeta</Text>
                <Ionicons name="checkmark" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          {/* Logos de Seguridad */}
          <View style={styles.securityLogos}>
            <Text style={styles.securityLogosText}>Powered by</Text>
            <Text style={styles.openpayLogo}>OpenPay</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 20 : 60,
    paddingBottom: 20,
    backgroundColor: '#226bfc',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  cardPreview: {
    backgroundColor: '#1f2937',
    margin: 20,
    padding: 24,
    borderRadius: 20,
    borderWidth: 2,
    minHeight: 200,
  },
  cardPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  cardTypeBadge: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardPreviewNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
    letterSpacing: 2,
  },
  cardPreviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardPreviewLabel: {
    fontSize: 10,
    color: '#9ca3af',
    marginBottom: 4,
  },
  cardPreviewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  form: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expiryInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  expiryField: {
    fontSize: 16,
    color: '#1f2937',
    textAlign: 'center',
  },
  expirySeparator: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  securityInfo: {
    flexDirection: 'row',
    backgroundColor: '#dcfce7',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#27ae60',
    gap: 12,
    marginBottom: 24,
  },
  securityContent: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 2,
  },
  securityText: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 16,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#226bfc',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  securityLogos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  securityLogosText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  openpayLogo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#226bfc',
  },
});