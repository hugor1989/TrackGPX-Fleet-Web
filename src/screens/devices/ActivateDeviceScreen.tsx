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
  KeyboardAvoidingView, // 1. Agregado para manejo de teclado
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native'; // 2. Importamos useFocusEffect
import { Ionicons } from '@expo/vector-icons';
import deviceService from '../../api/deviceService';
import planService, { Plan } from '../../api/planService';
import paymentService, { PaymentMethod } from '../../api/paymentService';
import openPayService, { OpenPayService } from '../../api/openPayService';

// Tip: Mueve esto a tu archivo de configuración o .env
const OPENPAY_ID = 'm5f8bj6cvaxndcjkoun6';
const OPENPAY_PK = 'pk_09fab58b510845d6978e7eeeee5e0b90';

type Step = 1 | 2 | 3 | 4;
type BillingCycle = 'monthly' | 'annual';

export default function ActivateDeviceScreen() {
  const navigation = useNavigation();
  
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Datos Paso 1
  const [imei, setImei] = useState('');
  const [activationCode, setActivationCode] = useState('');
  
  // Datos Paso 2
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  
  // Datos Paso 3
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  
  // Datos Sistema
  const [deviceSessionId, setDeviceSessionId] = useState('');
  const [activationResult, setActivationResult] = useState<any>(null);

  // Carga inicial de planes y configuración
  useEffect(() => {
    loadPlansAndConfig();
  }, []);

  // 3. Recargar tarjetas cada vez que volvemos a la pantalla
  useFocusEffect(
    useCallback(() => {
      loadPaymentMethods();
    }, [])
  );

  const loadPlansAndConfig = async () => {
    try {
      const plansData = await planService.getPlans();
      setPlans(plansData);

      // Inicializar OpenPay solo una vez
      if (Platform.OS === 'web') {
        await OpenPayService.loadScript();
        openPayService.initialize(OPENPAY_ID, OPENPAY_PK, true); // Usar constantes
        const deviceSession = await openPayService.generateDeviceSessionId();
        if (deviceSession.success) {
          setDeviceSessionId(deviceSession.deviceSessionId || '');
        }
      }
    } catch (err: any) {
      setError('Error al cargar configuración');
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const methods = await paymentService.getPaymentMethods();
      setPaymentMethods(methods);
      // Opcional: Preseleccionar la primera tarjeta si no hay ninguna seleccionada
      if (methods.length > 0 && !selectedPaymentMethod) {
        setSelectedPaymentMethod(methods[0]);
      }
    } catch (err) {
      console.error("Error cargando tarjetas", err);
    }
  };

  // --- MANEJADORES ---

  const handleValidateDevice = async () => {
    setError('');
    if (!imei || imei.length < 15) { // Algunos IMEI pueden ser de 15 o 17
      setError('El IMEI debe tener al menos 15 dígitos');
      return;
    }
    if (!activationCode || activationCode.length < 6) {
      setError('Código de activación inválido');
      return;
    }
    setLoading(true);
    try {
      await deviceService.previewActivation(imei, activationCode);
      setCurrentStep(2);
    } catch (err: any) {
      setError(err.message || 'Datos de dispositivo inválidos');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateDevice = async () => {
    if (!selectedPaymentMethod || !selectedPlan) {
      setError('Selecciona un plan y método de pago');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await deviceService.activateDevice({
        imei,
        activation_code: activationCode,
        plan_id: selectedPlan.id,
        billing_cycle: billingCycle,
        card_id: selectedPaymentMethod.id,
        device_session_id: deviceSessionId,
      });
      
      if (result.success) {
        setActivationResult(result.data);
        setCurrentStep(4);
      } else {
        setError(result.message || 'No se pudo activar el dispositivo');
      }
    } catch (err: any) {
      setError(err.message || 'Error en el proceso de activación');
    } finally {
      setLoading(false);
    }
  };

  // --- RENDERIZADO DE PASOS ---

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <View style={styles.heroIconContainer}>
        <View style={styles.heroIconBg}>
          <Ionicons name="scan-outline" size={40} color="#226bfc" />
        </View>
      </View>
      
      <Text style={styles.stepTitle}>Vincula tu GPS</Text>
      <Text style={styles.stepSubtitle}>
        Ingresa los datos que se encuentran en la etiqueta de tu dispositivo.
      </Text>

      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>IMEI</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="barcode-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Ej. 86920..."
              value={imei}
              onChangeText={(t) => setImei(t.replace(/\D/g, '').substring(0, 17))}
              keyboardType="numeric"
              editable={!loading}
            />
            {imei.length === 15 && <Ionicons name="checkmark-circle" size={20} color="#10b981" />}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Código de Activación</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="key-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Ej. A1B2C3"
              value={activationCode}
              onChangeText={(t) => setActivationCode(t.toUpperCase())}
              autoCapitalize="characters"
              editable={!loading}
            />
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.btnDisabled]}
          onPress={handleValidateDevice}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Validar y Continuar</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Elige tu Plan</Text>
      <Text style={styles.stepSubtitle}>Selecciona el plan de servicio para tu línea.</Text>

      {/* Selector de Ciclo Moderno */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity 
          style={[styles.toggleBtn, billingCycle === 'monthly' && styles.toggleBtnActive]}
          onPress={() => setBillingCycle('monthly')}
        >
          <Text style={[styles.toggleText, billingCycle === 'monthly' && styles.toggleTextActive]}>Mensual</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toggleBtn, billingCycle === 'annual' && styles.toggleBtnActive]}
          onPress={() => setBillingCycle('annual')}
        >
          <Text style={[styles.toggleText, billingCycle === 'annual' && styles.toggleTextActive]}>Anual</Text>
          <View style={styles.discountBadge}><Text style={styles.discountText}>-15%</Text></View>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
        {plans.map((plan) => {
          const pricing = planService.calculatePrice(plan, billingCycle);
          const isSelected = selectedPlan?.id === plan.id;
          
          return (
            <TouchableOpacity
              key={plan.id}
              style={[styles.planCard, isSelected && styles.planCardActive]}
              onPress={() => setSelectedPlan(plan)}
              activeOpacity={0.7}
            >
              <View style={styles.planHeader}>
                <View>
                  <Text style={[styles.planName, isSelected && styles.textActive]}>{plan.name}</Text>
                  <Text style={styles.planDesc}>{plan.description}</Text>
                </View>
                <View style={styles.priceContainer}>
                  <Text style={[styles.planPrice, isSelected && styles.textActive]}>${pricing.finalPrice}</Text>
                  <Text style={styles.planInterval}>/{billingCycle === 'monthly' ? 'mes' : 'año'}</Text>
                </View>
              </View>
              
              {/* Features simplificados */}
              <View style={styles.featuresContainer}>
                {planService.formatFeatures(plan).slice(0, 3).map((feat, i) => (
                  <View key={i} style={styles.featureItem}>
                    <Ionicons name="checkmark" size={14} color={isSelected ? "#226bfc" : "#10b981"} />
                    <Text style={styles.featureText}>{feat.name}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footerBtns}>
        <TouchableOpacity onPress={() => setCurrentStep(1)} style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>Atrás</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setCurrentStep(3)} 
          style={[styles.primaryBtn, {flex: 1}, !selectedPlan && styles.btnDisabled]}
          disabled={!selectedPlan}
        >
          <Text style={styles.primaryBtnText}>Siguiente</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Confirmar Pago</Text>
      
      {/* Resumen del Pedido */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Plan Seleccionado</Text>
          <Text style={styles.summaryValue}>{selectedPlan?.name} ({billingCycle === 'monthly' ? 'Mensual' : 'Anual'})</Text>
        </View>
        <View style={[styles.summaryRow, { marginTop: 8 }]}>
          <Text style={styles.totalLabel}>Total a pagar</Text>
          <Text style={styles.totalValue}>
            ${selectedPlan ? planService.calculatePrice(selectedPlan, billingCycle).finalPrice.toFixed(2) : '0.00'} MXN
          </Text>
        </View>
      </View>

      <Text style={[styles.label, {marginTop: 20, marginBottom: 10}]}>Método de Pago</Text>
      
      <ScrollView style={styles.scrollList}>
        {paymentMethods.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[styles.cardItem, selectedPaymentMethod?.id === method.id && styles.cardItemActive]}
            onPress={() => setSelectedPaymentMethod(method)}
          >
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
              <Ionicons name="card" size={24} color="#4b5563" />
              <View>
                <Text style={styles.cardText}>•••• {method.card.last4}</Text>
                <Text style={styles.cardBrand}>{method.card.brand.toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.radioOuter}>
              {selectedPaymentMethod?.id === method.id && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity 
          style={styles.addCardBtn}
          onPress={() => navigation.navigate('AddPayment' as never)}
        >
          <Ionicons name="add" size={20} color="#226bfc" />
          <Text style={styles.addCardText}>Agregar nueva tarjeta</Text>
        </TouchableOpacity>
      </ScrollView>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.footerBtns}>
        <TouchableOpacity onPress={() => setCurrentStep(2)} style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>Atrás</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={handleActivateDevice} 
          style={[styles.primaryBtn, {flex: 1, backgroundColor: '#10b981'}, (!selectedPaymentMethod || loading) && styles.btnDisabled]}
          disabled={!selectedPaymentMethod || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Pagar y Activar</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={[styles.stepContent, { justifyContent: 'center', alignItems: 'center' }]}>
      <View style={styles.successCircle}>
        <Ionicons name="checkmark" size={60} color="#fff" />
      </View>
      <Text style={styles.successTitle}>¡Activación Exitosa!</Text>
      <Text style={styles.successDesc}>
        El dispositivo <Text style={{fontWeight: 'bold'}}>{activationResult?.device?.imei}</Text> ya está activo en tu flota.
      </Text>
      
      <TouchableOpacity 
        style={[styles.primaryBtn, { width: '100%', marginTop: 40 }]}
        onPress={() => navigation.navigate('Dashboard' as never)}
      >
        <Text style={styles.primaryBtnText}>Ir al Dashboard</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Activar Dispositivo</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress Bar */}
        {currentStep < 4 && (
          <View style={styles.progressContainer}>
            {[1, 2, 3].map(step => (
              <View 
                key={step} 
                style={[
                  styles.progressSegment, 
                  step <= currentStep && styles.progressActive,
                  step < currentStep && styles.progressCompleted
                ]} 
              />
            ))}
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    backgroundColor: '#226bfc',
    paddingTop: Platform.OS === 'web' ? 20 : 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  closeBtn: { padding: 4 },
  
  progressContainer: { flexDirection: 'row', height: 4, width: '100%' },
  progressSegment: { flex: 1, backgroundColor: '#e5e7eb' },
  progressActive: { backgroundColor: '#226bfc' },
  progressCompleted: { backgroundColor: '#1e40af' },

  content: { flex: 1, padding: 20 },
  stepContent: { flex: 1 },
  
  heroIconContainer: { alignItems: 'center', marginBottom: 20, marginTop: 10 },
  heroIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
  
  stepTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', textAlign: 'center', marginBottom: 8 },
  stepSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 30, paddingHorizontal: 20 },

  formContainer: { gap: 20 },
  inputGroup: {},
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, paddingHorizontal: 12, height: 50
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#1f2937' },

  primaryBtn: {
    backgroundColor: '#226bfc', borderRadius: 12, height: 50,
    alignItems: 'center', justifyContent: 'center', marginTop: 10,
    shadowColor: '#226bfc', shadowOpacity: 0.2, shadowRadius: 4, elevation: 2
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  btnDisabled: { opacity: 0.6 },
  
  secondaryBtn: {
    height: 50, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center',
    borderRadius: 12, backgroundColor: '#f3f4f6', marginRight: 10
  },
  secondaryBtnText: { color: '#4b5563', fontWeight: '600' },
  
  footerBtns: { flexDirection: 'row', marginTop: 'auto', paddingTop: 20 },
  errorText: { color: '#ef4444', textAlign: 'center', marginBottom: 10 },

  // Toggle Styles
  toggleContainer: { flexDirection: 'row', backgroundColor: '#e5e7eb', borderRadius: 12, p: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  toggleBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  toggleTextActive: { color: '#226bfc' },
  discountBadge: { position: 'absolute', top: -8, right: 10, backgroundColor: '#10b981', paddingHorizontal: 6, borderRadius: 8 },
  discountText: { fontSize: 10, color: '#fff', fontWeight: 'bold' },

  // Plan Card
  scrollList: { flex: 1 },
  planCard: { 
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
  },
  planCardActive: { borderColor: '#226bfc', backgroundColor: '#f5f8ff' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  planName: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  planDesc: { fontSize: 12, color: '#6b7280' },
  priceContainer: { alignItems: 'flex-end' },
  planPrice: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  planInterval: { fontSize: 12, color: '#6b7280' },
  textActive: { color: '#226bfc' },
  featuresContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  featureText: { fontSize: 12, color: '#4b5563' },

  // Summary & Payment
  summaryCard: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { color: '#64748b' },
  summaryValue: { fontWeight: '600', color: '#334155' },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: '#226bfc' },

  cardItem: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#e5e7eb'
  },
  cardItemActive: { borderColor: '#226bfc', backgroundColor: '#f0f9ff' },
  cardText: { fontSize: 15, fontWeight: '500', color: '#1f2937' },
  cardBrand: { fontSize: 12, color: '#6b7280' },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#226bfc' },
  
  addCardBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#226bfc', borderRadius: 12, gap: 8 },
  addCardText: { color: '#226bfc', fontWeight: '600' },

  // Success
  successCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  successTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  successDesc: { fontSize: 16, color: '#4b5563', textAlign: 'center', paddingHorizontal: 20 },
});