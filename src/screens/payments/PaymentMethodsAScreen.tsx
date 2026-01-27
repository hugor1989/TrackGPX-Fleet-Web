import React, { useState, useEffect, useCallback } from 'react';
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
  Image
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import paymentService, { PaymentMethod } from '../../api/paymentService';

// --- CONFIGURACIÓN ---
const OPENPAY_ID = 'm5f8bj6cvaxndcjkoun6';
const OPENPAY_PK = 'pk_09fab58b510845d6978e7eeeee5e0b90';

// Declaración global para TS
declare global {
  interface Window {
    OpenPay: any;
  }
}

export default function PaymentMethodsScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Recargar al entrar a la pantalla
  useFocusEffect(
    useCallback(() => {
      loadPaymentMethods();
    }, [])
  );

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const methods = await paymentService.getPaymentMethods();
      setPaymentMethods(methods);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (card: PaymentMethod) => {
    Alert.alert(
      'Eliminar tarjeta',
      `¿Deseas eliminar la terminación ••${card.card.last4}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await paymentService.deletePaymentMethod(card.id);
              await loadPaymentMethods();
            } catch (err: any) {
              Alert.alert('Error', err.message);
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (cardId: string) => {
    try {
      setLoading(true);
      await paymentService.setDefaultPaymentMethod(cardId);
      await loadPaymentMethods();
    } catch (err: any) {
      Alert.alert('Error', err.message);
      setLoading(false);
    }
  };

  if (loading && paymentMethods.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#226bfc" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Billetera</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.headerAddBtn}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {paymentMethods.length === 0 ? (
          <EmptyState onAdd={() => setShowAddModal(true)} />
        ) : (
          <View style={styles.cardsList}>
            {paymentMethods.map((method) => (
              <CreditCardItem
                key={method.id}
                method={method}
                onDelete={() => handleDelete(method)}
                onSetDefault={() => handleSetDefault(method.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB solo si hay tarjetas (para añadir más rápido) */}
      {paymentMethods.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Modal Agregar Tarjeta */}
      <AddCardModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={async () => {
          setShowAddModal(false);
          await loadPaymentMethods();
        }}
      />
    </View>
  );
}

// --- SUBCOMPONENTES ---

// 1. Tarjeta Visual Estilo "Wallet"
const CreditCardItem = ({ method, onDelete, onSetDefault }: any) => {
  const { brand, last4, holder_name, exp_month, exp_year } = method.card;
  const isDefault = method.is_default;

  // Color según marca
  const getCardStyle = (brandName: string) => {
    const b = brandName.toLowerCase();
    if (b.includes('visa')) return { bg: '#1a1f71', logo: 'logo-visa' }; // Azul Visa
    if (b.includes('master')) return { bg: '#252525', logo: 'logo-mastercard' }; // Negro Master
    if (b.includes('amex')) return { bg: '#006fcf', logo: 'logo-amex' }; // Azul Amex
    return { bg: '#4b5563', logo: 'card' }; // Gris Genérico
  };

  const style = getCardStyle(brand);

  return (
    <View style={styles.cardWrapper}>
      {/* Tarjeta Visual */}
      <View style={[styles.visualCard, { backgroundColor: style.bg }]}>
        <View style={styles.visualCardTop}>
          {/* Chip Simulado */}
          <View style={styles.cardChip} />
          {isDefault && <View style={styles.defaultBadge}><Text style={styles.defaultText}>Predeterminada</Text></View>}
        </View>
        
        <View style={styles.visualCardNumber}>
          <Text style={styles.cardNumberText}>•••• •••• •••• {last4}</Text>
        </View>

        <View style={styles.visualCardBottom}>
          <View>
            <Text style={styles.cardLabel}>TITULAR</Text>
            <Text style={styles.cardValue} numberOfLines={1}>{holder_name}</Text>
          </View>
          <View>
            <Text style={styles.cardLabel}>EXPIRA</Text>
            <Text style={styles.cardValue}>{String(exp_month).padStart(2,'0')}/{String(exp_year).slice(-2)}</Text>
          </View>
          {/* Marca (Texto o Icono) */}
          <Text style={styles.brandText}>{brand.toUpperCase()}</Text>
        </View>
      </View>

      {/* Acciones Debajo */}
      <View style={styles.cardActions}>
        {!isDefault && (
          <TouchableOpacity onPress={onSetDefault} style={styles.actionBtn}>
            <Text style={styles.actionTextPrimary}>Usar como principal</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// 2. Estado Vacío
const EmptyState = ({ onAdd }: any) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconBg}>
      <Ionicons name="wallet-outline" size={60} color="#9ca3af" />
    </View>
    <Text style={styles.emptyTitle}>Tu billetera está vacía</Text>
    <Text style={styles.emptyText}>Agrega una tarjeta para gestionar tus suscripciones fácilmente.</Text>
    <TouchableOpacity style={styles.emptyBtn} onPress={onAdd}>
      <Text style={styles.emptyBtnText}>Agregar Tarjeta</Text>
    </TouchableOpacity>
  </View>
);

// 3. Modal con OpenPay (Optimizado)
function AddCardModal({ visible, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [deviceSessionId, setDeviceSessionId] = useState('');
  const [error, setError] = useState('');

  // Form
  const [form, setForm] = useState({ number: '', name: '', month: '', year: '', cvv: '' });

  useEffect(() => {
    if (visible && Platform.OS === 'web') {
      initializeOpenPay();
    }
  }, [visible]);

  const initializeOpenPay = async () => {
    try {
      if (!window.OpenPay) {
        // Cargar scripts dinámicamente
        await loadScript('https://js.openpay.mx/openpay.v1.min.js');
        await loadScript('https://js.openpay.mx/openpay-data.v1.min.js');
      }
      
      if (window.OpenPay) {
        window.OpenPay.setId(OPENPAY_ID);
        window.OpenPay.setApiKey(OPENPAY_PK);
        window.OpenPay.setSandboxMode(true); // Cambiar a false en producción
        const sessionId = window.OpenPay.deviceData.setup();
        setDeviceSessionId(sessionId);
      }
    } catch (e) {
      console.error("Error OpenPay init", e);
    }
  };

  const loadScript = (src: string) => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const handleSubmit = async () => {
    setError('');
    // Validaciones simples
    if (form.number.length < 15 || !form.name || !form.cvv) {
      setError('Por favor verifica los datos de la tarjeta.');
      return;
    }

    setLoading(true);
    try {
      if (Platform.OS === 'web' && window.OpenPay) {
        const tokenData = {
          card_number: form.number.replace(/\s/g, ''),
          holder_name: form.name,
          expiration_year: form.year,
          expiration_month: form.month,
          cvv2: form.cvv,
        };

        window.OpenPay.token.create(
          tokenData,
          async (response: any) => {
            try {
              await paymentService.addPaymentMethod({
                token_id: response.data.id,
                device_session_id: deviceSessionId
              });
              setForm({ number: '', name: '', month: '', year: '', cvv: '' }); // Limpiar
              onSuccess();
            } catch (apiErr: any) {
              setError(apiErr.message || 'Error al guardar la tarjeta en el servidor.');
            } finally {
              setLoading(false);
            }
          },
          (err: any) => {
            setLoading(false);
            setError(err.data?.description || 'La tarjeta fue declinada o los datos son incorrectos.');
          }
        );
      } else {
        throw new Error("OpenPay no disponible");
      }
    } catch (e: any) {
      setLoading(false);
      setError(e.message);
    }
  };

  // Helpers de formato
  const formatCard = (t: string) => setForm({ ...form, number: t.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19) });
  
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalKeyView}>
          <View style={styles.modalContent}>
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nueva Tarjeta</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#374151" /></TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Número de Tarjeta</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="0000 0000 0000 0000" 
                  keyboardType="numeric" 
                  value={form.number} 
                  onChangeText={formatCard}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre del Titular</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Como aparece en el plástico" 
                  value={form.name} 
                  onChangeText={t => setForm({...form, name: t.toUpperCase()})}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Mes (MM)</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="01" 
                    keyboardType="numeric" 
                    maxLength={2}
                    value={form.month}
                    onChangeText={t => setForm({...form, month: t})}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginHorizontal: 4 }]}>
                  <Text style={styles.label}>Año (YY)</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="26" 
                    keyboardType="numeric" 
                    maxLength={2}
                    value={form.year}
                    onChangeText={t => setForm({...form, year: t})}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>CVV</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="123" 
                    keyboardType="numeric" 
                    maxLength={4}
                    secureTextEntry
                    value={form.cvv}
                    onChangeText={t => setForm({...form, cvv: t})}
                  />
                </View>
              </View>

              {error ? <View style={styles.errorContainer}><Text style={styles.errorText}>{error}</Text></View> : null}
              
              <View style={styles.secureBadge}>
                <Ionicons name="lock-closed" size={14} color="#059669" />
                <Text style={styles.secureText}>Pagos procesados de forma segura por OpenPay</Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.btnCancel} onPress={onClose} disabled={loading}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={handleSubmit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSaveText}>Guardar Tarjeta</Text>}
              </TouchableOpacity>
            </View>

          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'web' ? 20 : 60, paddingBottom: 20, paddingHorizontal: 20,
    backgroundColor: '#226bfc' 
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  backButton: { padding: 4 },
  headerAddBtn: { padding: 4 },

  content: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },

  // Tarjetas Visuales
  cardsList: { gap: 20 },
  cardWrapper: { marginBottom: 10 },
  visualCard: {
    height: 200, borderRadius: 16, padding: 24,
    justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  visualCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardChip: { width: 40, height: 30, backgroundColor: '#e5e7eb', borderRadius: 6, opacity: 0.8 },
  defaultBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  defaultText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  visualCardNumber: { marginVertical: 20 },
  cardNumberText: { color: '#fff', fontSize: 22, letterSpacing: 2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  visualCardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginBottom: 2 },
  cardValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  brandText: { color: '#fff', fontSize: 18, fontWeight: 'bold', fontStyle: 'italic' },

  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 12, alignItems: 'center' },
  actionBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  actionTextPrimary: { color: '#226bfc', fontSize: 14, fontWeight: '600' },
  deleteBtn: { padding: 8, backgroundColor: '#fee2e2', borderRadius: 8 },

  // Empty State
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyIconBg: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  emptyText: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginHorizontal: 40, marginTop: 8, marginBottom: 24 },
  emptyBtn: { backgroundColor: '#226bfc', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  emptyBtnText: { color: '#fff', fontWeight: 'bold' },

  // FAB
  fab: {
    position: 'absolute', right: 24, bottom: 30,
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#226bfc',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#226bfc', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalKeyView: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  modalBody: { padding: 24 },
  inputGroup: { marginBottom: 16 },
  row: { flexDirection: 'row' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, fontSize: 16, color: '#1f2937', backgroundColor: '#fff' },
  
  errorContainer: { backgroundColor: '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#fecaca' },
  errorText: { color: '#991b1b', fontSize: 13 },
  secureBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, padding: 10, backgroundColor: '#ecfdf5', borderRadius: 8 },
  secureText: { color: '#065f46', fontSize: 12 },

  modalFooter: { flexDirection: 'row', padding: 20, borderTopWidth: 1, borderColor: '#f3f4f6', gap: 12 },
  btnCancel: { flex: 1, padding: 14, backgroundColor: '#f3f4f6', borderRadius: 10, alignItems: 'center' },
  btnCancelText: { color: '#4b5563', fontWeight: '600' },
  btnSave: { flex: 1, padding: 14, backgroundColor: '#226bfc', borderRadius: 10, alignItems: 'center' },
  btnSaveText: { color: '#fff', fontWeight: 'bold' },
});