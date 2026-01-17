// src/screens/payments/PaymentMethodsScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import paymentService, { PaymentMethod } from '../../api/paymentService';

// Declaración global de OpenPay para TypeScript
declare global {
  interface Window {
    OpenPay: any;
  }
}

export default function PaymentMethodsScreen() {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      setError('');
      const methods = await paymentService.getPaymentMethods();
      setPaymentMethods(methods);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (cardId: string) => {
    try {
      await paymentService.setDefaultPaymentMethod(cardId);
      await loadPaymentMethods();
      Alert.alert('Éxito', 'Tarjeta predeterminada actualizada');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDelete = (card: PaymentMethod) => {
    Alert.alert(
      'Eliminar Tarjeta',
      `¿Estás seguro de eliminar la tarjeta •••• ${card.card.last4}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await paymentService.deletePaymentMethod(card.id);
              await loadPaymentMethods();
              Alert.alert('Éxito', 'Tarjeta eliminada correctamente');
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const getCardIcon = (brand: string) => {
    const brandLower = brand.toLowerCase();
    if (brandLower.includes('visa')) return 'card';
    if (brandLower.includes('mastercard')) return 'card';
    if (brandLower.includes('amex') || brandLower.includes('american')) return 'card';
    return 'card-outline';
  };

  const getCardColor = (brand: string) => {
    const brandLower = brand.toLowerCase();
    if (brandLower.includes('visa')) return '#1434CB';
    if (brandLower.includes('mastercard')) return '#EB001B';
    if (brandLower.includes('amex') || brandLower.includes('american')) return '#006FCF';
    return '#6b7280';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Métodos de Pago</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#226bfc" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Métodos de Pago</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {paymentMethods.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="card-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>Sin métodos de pago</Text>
            <Text style={styles.emptyText}>
              Agrega una tarjeta para activar dispositivos GPS y gestionar suscripciones
            </Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
              <Ionicons name="add" size={24} color="#fff" />
              <Text style={styles.addButtonText}>Agregar Tarjeta</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardsContainer}>
            {paymentMethods.map((method) => (
              <View key={method.id} style={styles.cardItem}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardBrand}>
                    <View
                      style={[
                        styles.cardIconContainer,
                        { backgroundColor: getCardColor(method.card.brand) },
                      ]}
                    >
                      <Ionicons name={getCardIcon(method.card.brand)} size={24} color="#fff" />
                    </View>
                    <View>
                      <Text style={styles.cardBrandText}>
                        {method.card.brand.charAt(0).toUpperCase() + method.card.brand.slice(1)}
                      </Text>
                      <Text style={styles.cardNumber}>•••• {method.card.last4}</Text>
                    </View>
                  </View>

                  {method.is_default && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultText}>Predeterminada</Text>
                    </View>
                  )}
                </View>

                <View style={styles.cardDetails}>
                  <View style={styles.cardDetail}>
                    <Ionicons name="person-outline" size={16} color="#6b7280" />
                    <Text style={styles.cardDetailText}>{method.card.holder_name}</Text>
                  </View>
                  <View style={styles.cardDetail}>
                    <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                    <Text style={styles.cardDetailText}>
                      {String(method.card.exp_month).padStart(2, '0')}/{method.card.exp_year}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  {!method.is_default && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleSetDefault(method.id)}
                    >
                      <Ionicons name="checkmark-circle-outline" size={20} color="#226bfc" />
                      <Text style={styles.actionButtonText}>Predeterminada</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.actionButtonDanger}
                    onPress={() => handleDelete(method)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    <Text style={styles.actionButtonDangerText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#3b82f6" />
          <Text style={styles.infoText}>
            La tarjeta predeterminada se usará para renovaciones automáticas de suscripciones
          </Text>
        </View>
      </ScrollView>

      {/* Modal para agregar tarjeta */}
      <AddCardModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={async () => {
          setShowAddModal(false);
          await loadPaymentMethods();
        }}
      />

      {/* Botón flotante para agregar (solo si hay tarjetas) */}
      {paymentMethods.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

// Modal para agregar tarjeta con OpenPay
function AddCardModal({
  visible,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deviceSessionId, setDeviceSessionId] = useState('');

  // Form fields
  const [cardNumber, setCardNumber] = useState('');
  const [holderName, setHolderName] = useState('');
  const [expirationMonth, setExpirationMonth] = useState('');
  const [expirationYear, setExpirationYear] = useState('');
  const [cvv, setCvv] = useState('');

  useEffect(() => {
    if (visible && Platform.OS === 'web') {
      loadOpenPay();
    }
  }, [visible]);

  const loadOpenPay = async () => {
    try {
      // Cargar scripts de OpenPay si no están cargados
      if (!window.OpenPay) {
        await loadOpenPayScript();
      }

      // Inicializar OpenPay
      if (window.OpenPay) {

        window.OpenPay.setId('m5f8bj6cvaxndcjkoun6'); // Tu merchant ID
        window.OpenPay.setApiKey('pk_09fab58b510845d6978e7eeeee5e0b90'); // Tu API key
        window.OpenPay.setSandboxMode(true);

        // Generar device session ID
        const sessionId = window.OpenPay.deviceData.setup();
        setDeviceSessionId(sessionId);
        console.log('✅ OpenPay inicializado, device session:', sessionId);
      }
    } catch (err) {
      console.error('❌ Error cargando OpenPay:', err);
    }
  };

  const loadOpenPayScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (typeof document === 'undefined') {
        resolve();
        return;
      }

      // Verificar si ya está cargado
      if (window.OpenPay) {
        resolve();
        return;
      }

      // Cargar OpenPay.js
      const script1 = document.createElement('script');
      script1.src = 'https://js.openpay.mx/openpay.v1.min.js';
      script1.async = true;
      script1.onload = () => {
        // Cargar OpenPay Data
        const script2 = document.createElement('script');
        script2.src = 'https://js.openpay.mx/openpay-data.v1.min.js';
        script2.async = true;
        script2.onload = () => resolve();
        script2.onerror = () => reject(new Error('Error cargando OpenPay Data'));
        document.head.appendChild(script2);
      };
      script1.onerror = () => reject(new Error('Error cargando OpenPay'));
      document.head.appendChild(script1);
    });
  };

  const handleAddCard = async () => {
    setError('');

    // Validaciones
    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 15) {
      setError('Número de tarjeta inválido');
      return;
    }

    if (!holderName.trim()) {
      setError('Nombre del titular requerido');
      return;
    }

    if (!expirationMonth || !expirationYear) {
      setError('Fecha de expiración inválida');
      return;
    }

    if (!cvv || cvv.length < 3) {
      setError('CVV inválido');
      return;
    }

    try {
      setSaving(true);

      if (Platform.OS === 'web' && window.OpenPay) {
        // Crear token con OpenPay
        const tokenData = {
          card_number: cardNumber.replace(/\s/g, ''),
          holder_name: holderName.toUpperCase(),
          expiration_year: expirationYear,
          expiration_month: expirationMonth.padStart(2, '0'),
          cvv2: cvv,
        };

        console.log('🔐 Generando token OpenPay...', tokenData);

        window.OpenPay.token.create(
          tokenData,
          async (response: any) => {
            try {
              console.log('✅ Token generado:', response.data.id);

              // Guardar tarjeta en el backend
              await paymentService.addPaymentMethod({
                token_id: response.data.id,
                device_session_id: deviceSessionId,
              });

              Alert.alert('Éxito', 'Tarjeta agregada correctamente');
              
              // Limpiar formulario
              setCardNumber('');
              setHolderName('');
              setExpirationMonth('');
              setExpirationYear('');
              setCvv('');
              
              onSuccess();
            } catch (err: any) {
              console.error('❌ Error guardando tarjeta:', err);
              setError(err.message);
            } finally {
              setSaving(false);
            }
          },
          (error: any) => {
            console.error('❌ Error generando token:', error);
            setSaving(false);
            
            const errorMsg = error.data?.description || error.message || 'Error al procesar la tarjeta';
            setError(errorMsg);
          }
        );
      } else {
        // Fallback para móvil o si OpenPay no está disponible
        throw new Error('OpenPay solo está disponible en web');
      }
    } catch (err: any) {
      setSaving(false);
      setError(err.message);
    }
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.substring(0, 19); // 16 dígitos + 3 espacios
  };

  const formatExpirationMonth = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length === 0) return '';
    let month = parseInt(cleaned);
    if (month > 12) month = 12;
    if (month < 1 && cleaned.length === 2) month = 1;
    return String(month);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Agregar Tarjeta</Text>
                <TouchableOpacity onPress={onClose} disabled={saving}>
                  <Ionicons name="close" size={24} color="#1f2937" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Número de tarjeta */}
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Número de Tarjeta *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={cardNumber}
                    onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                    placeholder="1234 5678 9012 3456"
                    keyboardType="numeric"
                    maxLength={19}
                    editable={!saving}
                  />
                </View>

                {/* Nombre del titular */}
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Nombre del Titular *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={holderName}
                    onChangeText={setHolderName}
                    placeholder="Como aparece en la tarjeta"
                    autoCapitalize="characters"
                    editable={!saving}
                  />
                </View>

                {/* Fecha de expiración y CVV */}
                <View style={styles.modalRow}>
                  <View style={[styles.modalInputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.modalLabel}>Mes *</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={expirationMonth}
                      onChangeText={(text) => setExpirationMonth(formatExpirationMonth(text))}
                      placeholder="12"
                      keyboardType="numeric"
                      maxLength={2}
                      editable={!saving}
                    />
                  </View>

                  <View style={[styles.modalInputGroup, { flex: 1, marginHorizontal: 4 }]}>
                    <Text style={styles.modalLabel}>Año *</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={expirationYear}
                      onChangeText={(text) => setExpirationYear(text.replace(/\D/g, ''))}
                      placeholder="26"
                      keyboardType="numeric"
                      maxLength={2}
                      editable={!saving}
                    />
                  </View>

                  <View style={[styles.modalInputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.modalLabel}>CVV *</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={cvv}
                      onChangeText={(text) => setCvv(text.replace(/\D/g, ''))}
                      placeholder="123"
                      keyboardType="numeric"
                      maxLength={4}
                      secureTextEntry
                      editable={!saving}
                    />
                  </View>
                </View>

                {/* Info de seguridad */}
                <View style={styles.modalInfoBox}>
                  <Ionicons name="shield-checkmark-outline" size={24} color="#10b981" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalInfoTitle}>Pagos Seguros</Text>
                    <Text style={styles.modalInfoText}>
                      Tus datos están protegidos con encriptación de nivel bancario
                    </Text>
                  </View>
                </View>

                {error ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={20} color="#ef4444" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={onClose}
                  disabled={saving}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalAddButton, saving && styles.buttonDisabled]}
                  onPress={handleAddCard}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="card-outline" size={20} color="#fff" />
                      <Text style={styles.modalAddText}>Agregar Tarjeta</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 20 : 60,
    paddingBottom: 20,
    backgroundColor: '#226bfc',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 100 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginTop: 16 },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#226bfc',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 24,
    gap: 8,
  },
  addButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  cardsContainer: { gap: 16 },
  cardItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardBrand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBrandText: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  cardNumber: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  defaultBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  defaultText: { fontSize: 12, fontWeight: '600', color: '#166534' },
  cardDetails: { gap: 8, marginBottom: 16 },
  cardDetail: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardDetailText: { fontSize: 14, color: '#6b7280' },
  cardActions: { flexDirection: 'row', gap: 12 },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  actionButtonText: { fontSize: 14, fontWeight: '600', color: '#226bfc' },
  actionButtonDanger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  actionButtonDangerText: { fontSize: 14, fontWeight: '600', color: '#ef4444' },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    gap: 12,
  },
  infoText: { flex: 1, fontSize: 14, color: '#1e40af', lineHeight: 20 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: { flex: 1, fontSize: 14, color: '#991b1b' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#226bfc',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  modalBody: { padding: 20 },
  modalText: { fontSize: 14, color: '#6b7280', lineHeight: 20, marginBottom: 20 },
  modalInputGroup: { marginBottom: 16 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#fff',
  },
  modalRow: { flexDirection: 'row', marginHorizontal: -4 },
  modalInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  modalInfoTitle: { fontSize: 14, fontWeight: '600', color: '#166534', marginBottom: 4 },
  modalInfoText: { fontSize: 13, color: '#166534', lineHeight: 18 },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  modalAddButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#226bfc',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalAddText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  buttonDisabled: { opacity: 0.5 },
});