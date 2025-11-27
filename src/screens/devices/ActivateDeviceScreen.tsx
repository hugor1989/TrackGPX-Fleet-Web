// src/screens/devices/ActivateDeviceScreen.tsx

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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import deviceService from '../../api/deviceService';
import planService, { Plan } from '../../api/planService';
import paymentService, { PaymentMethod } from '../../api/paymentService';
import openPayService, { OpenPayService } from '../../api/openPayService';

type Step = 1 | 2 | 3 | 4;
type BillingCycle = 'monthly' | 'annual';

export default function ActivateDeviceScreen() {
  const navigation = useNavigation();
  
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imei, setImei] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [deviceSessionId, setDeviceSessionId] = useState('');
  const [activationResult, setActivationResult] = useState<any>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [plansData, paymentMethodsData] = await Promise.all([
        planService.getPlans(),
        paymentService.getPaymentMethods(),
      ]);
      setPlans(plansData);
      setPaymentMethods(paymentMethodsData);

      if (Platform.OS === 'web') {
        await OpenPayService.loadScript();
        openPayService.initialize('m5f8bj6cvaxndcjkoun6', 'pk_09fab58b510845d6978e7eeeee5e0b90', true);
        const deviceSession = await openPayService.generateDeviceSessionId();
        if (deviceSession.success) {
          setDeviceSessionId(deviceSession.deviceSessionId || '');
        }
      }
    } catch (err: any) {
      setError('Error al cargar datos iniciales');
    }
  };

  const handleValidateDevice = async () => {
    setError('');
    if (!imei || imei.length !== 15) {
      setError('El IMEI debe tener 15 dígitos');
      return;
    }
    if (!activationCode || activationCode.length !== 9) {
      setError('El código de activación debe tener 9 caracteres');
      return;
    }
    setLoading(true);
    try {
      await deviceService.previewActivation(imei, activationCode);
      setCurrentStep(2);
    } catch (err: any) {
      setError(err.message || 'Código de activación inválido');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPlan = () => {
    if (!selectedPlan) {
      setError('Por favor selecciona un plan');
      return;
    }
    setError('');
    setCurrentStep(3);
  };

  const handleActivateDevice = async () => {
    if (!selectedPaymentMethod || !selectedPlan) {
      setError('Información incompleta');
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
        setError(result.message || 'Error al activar dispositivo');
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar la activación');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Ionicons name="phone-portrait-outline" size={48} color="#226bfc" />
        <Text style={styles.stepTitle}>Datos del Dispositivo</Text>
        <Text style={styles.stepSubtitle}>
          Ingresa el IMEI y código de activación de tu GPS
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>IMEI (15 dígitos)</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="barcode-outline" size={20} color="#6b7280" />
          <TextInput
            style={styles.input}
            placeholder="123456789012345"
            value={imei}
            onChangeText={(text) => setImei(text.replace(/\D/g, '').substring(0, 15))}
            keyboardType="numeric"
            maxLength={15}
            editable={!loading}
          />
        </View>
        <Text style={styles.hint}>El IMEI está impreso en tu dispositivo GPS</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Código de Activación</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="key-outline" size={20} color="#6b7280" />
          <TextInput
            style={styles.input}
            placeholder="ABC123XYZ"
            value={activationCode}
            onChangeText={(text) => setActivationCode(text.toUpperCase().substring(0, 9))}
            autoCapitalize="characters"
            maxLength={9}
            editable={!loading}
          />
        </View>
        <Text style={styles.hint}>Código incluido en el empaque del dispositivo</Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={20} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleValidateDevice}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.buttonText}>Continuar</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Ionicons name="pricetags-outline" size={48} color="#226bfc" />
        <Text style={styles.stepTitle}>Selecciona tu Plan</Text>
        <Text style={styles.stepSubtitle}>
          Elige el plan que mejor se adapte a tus necesidades
        </Text>
      </View>

      <View style={styles.billingToggle}>
        <TouchableOpacity
          style={[styles.billingOption, billingCycle === 'monthly' && styles.billingOptionActive]}
          onPress={() => setBillingCycle('monthly')}
        >
          <Text style={[styles.billingOptionText, billingCycle === 'monthly' && styles.billingOptionTextActive]}>
            Mensual
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.billingOption, billingCycle === 'annual' && styles.billingOptionActive]}
          onPress={() => setBillingCycle('annual')}
        >
          <Text style={[styles.billingOptionText, billingCycle === 'annual' && styles.billingOptionTextActive]}>
            Anual
          </Text>
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsBadgeText}>Ahorra 2 meses</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.plansList} showsVerticalScrollIndicator={false}>
        {plans.map((plan) => {
          const pricing = planService.calculatePrice(plan, billingCycle);
          const isSelected = selectedPlan?.id === plan.id;

          return (
            <TouchableOpacity
              key={plan.id}
              style={[styles.planCard, isSelected && styles.planCardSelected]}
              onPress={() => setSelectedPlan(plan)}
            >
              <View style={styles.planHeader}>
                <View>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planDescription}>{plan.description}</Text>
                </View>
                {isSelected && (
                  <View style={styles.selectedBadge}>
                    <Ionicons name="checkmark-circle" size={24} color="#27ae60" />
                  </View>
                )}
              </View>

              <View style={styles.planPricing}>
                <Text style={styles.planPrice}>${pricing.finalPrice.toFixed(2)}</Text>
                <Text style={styles.planInterval}>/{billingCycle === 'monthly' ? 'mes' : 'año'}</Text>
              </View>

              {billingCycle === 'annual' && pricing.savings > 0 && (
                <View style={styles.savingsTag}>
                  <Text style={styles.savingsText}>Ahorras ${pricing.savings.toFixed(2)}</Text>
                </View>
              )}

              <View style={styles.planFeatures}>
                {planService.formatFeatures(plan).slice(0, 4).map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Ionicons name="checkmark" size={16} color="#27ae60" />
                    <Text style={styles.featureText}>{feature.name}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={20} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setCurrentStep(1)}>
          <Ionicons name="arrow-back" size={20} color="#374151" />
          <Text style={styles.secondaryButtonText}>Atrás</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.primaryButton, { flex: 1 }]} onPress={handleConfirmPlan} disabled={!selectedPlan}>
          <Text style={styles.buttonText}>Continuar</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Ionicons name="card-outline" size={48} color="#226bfc" />
        <Text style={styles.stepTitle}>Método de Pago</Text>
        <Text style={styles.stepSubtitle}>Selecciona una tarjeta para procesar el pago</Text>
      </View>

      <ScrollView style={styles.cardsList} showsVerticalScrollIndicator={false}>
        {paymentMethods.map((method) => {
          const isSelected = selectedPaymentMethod?.id === method.id;
          return (
            <TouchableOpacity
              key={method.id}
              style={[styles.cardItem, isSelected && styles.cardItemSelected]}
              onPress={() => setSelectedPaymentMethod(method)}
            >
              <View style={styles.cardIcon}>
                <Ionicons name={method.card.brand === 'visa' ? 'card' : 'card-outline'} size={24} color="#226bfc" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardBrand}>{method.card.brand.toUpperCase()}</Text>
                <Text style={styles.cardNumber}>•••• {method.card.last4}</Text>
              </View>
              {isSelected && <Ionicons name="checkmark-circle" size={24} color="#27ae60" />}
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={styles.addCardButton} onPress={() => navigation.navigate('AddPayment' as never)}>
          <Ionicons name="add-circle-outline" size={24} color="#226bfc" />
          <Text style={styles.addCardText}>Agregar nueva tarjeta</Text>
        </TouchableOpacity>
      </ScrollView>

      {selectedPlan && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Resumen del Pago</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Plan:</Text>
            <Text style={styles.summaryValue}>{selectedPlan.name}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ciclo:</Text>
            <Text style={styles.summaryValue}>{billingCycle === 'monthly' ? 'Mensual' : 'Anual'}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.summaryTotalLabel}>Total:</Text>
            <Text style={styles.summaryTotalValue}>
              ${planService.calculatePrice(selectedPlan, billingCycle).finalPrice.toFixed(2)} MXN
            </Text>
          </View>
        </View>
      )}

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={20} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setCurrentStep(2)} disabled={loading}>
          <Ionicons name="arrow-back" size={20} color="#374151" />
          <Text style={styles.secondaryButtonText}>Atrás</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, { flex: 1, backgroundColor: '#27ae60' }]}
          onPress={handleActivateDevice}
          disabled={!selectedPaymentMethod || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.buttonText}>Activar GPS</Text>
              <Ionicons name="checkmark" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIcon}>
        <Ionicons name="checkmark" size={64} color="#fff" />
      </View>
      <Text style={styles.successTitle}>¡Activación Exitosa!</Text>
      <Text style={styles.successMessage}>Tu dispositivo GPS ha sido activado correctamente</Text>
      {activationResult && (
        <View style={styles.successDetails}>
          <View style={styles.successDetailRow}>
            <Text style={styles.successDetailLabel}>IMEI:</Text>
            <Text style={styles.successDetailValue}>{activationResult.device.imei}</Text>
          </View>
          <View style={styles.successDetailRow}>
            <Text style={styles.successDetailLabel}>Plan:</Text>
            <Text style={styles.successDetailValue}>{selectedPlan?.name}</Text>
          </View>
        </View>
      )}
      <TouchableOpacity
        style={[styles.primaryButton, { marginTop: 32 }]}
        onPress={() => navigation.navigate('Dashboard' as never)}
      >
        <Text style={styles.buttonText}>Ir al Dashboard</Text>
        <Ionicons name="home" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activar Dispositivo GPS</Text>
        <View style={{ width: 40 }} />
      </View>

      {currentStep < 4 && (
        <View style={styles.progressContainer}>
          {[1, 2, 3].map((step) => (
            <View key={step} style={[styles.progressStep, step <= currentStep && styles.progressStepActive]} />
          ))}
        </View>
      )}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </ScrollView>
    </View>
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
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  progressStep: { flex: 1, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2 },
  progressStepActive: { backgroundColor: '#226bfc' },
  content: { flex: 1 },
  contentContainer: { padding: 20 },
  stepContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  stepHeader: { alignItems: 'center', marginBottom: 32 },
  stepTitle: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginTop: 16, marginBottom: 8 },
  stepSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    gap: 12,
  },
  input: { flex: 1, fontSize: 16, color: '#1f2937' },
  hint: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  errorText: { flex: 1, fontSize: 14, color: '#991b1b' },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#226bfc',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  secondaryButtonText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  buttonRow: { flexDirection: 'row', gap: 12 },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  billingOption: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8, position: 'relative' },
  billingOptionActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  billingOptionText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  billingOptionTextActive: { color: '#226bfc' },
  savingsBadge: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: '#27ae60',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  savingsBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#fff' },
  plansList: { maxHeight: 400, marginBottom: 20 },
  planCard: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  planCardSelected: { borderColor: '#226bfc', backgroundColor: '#eff6ff' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  planName: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  planDescription: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  selectedBadge: { marginLeft: 8 },
  planPricing: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  planPrice: { fontSize: 32, fontWeight: 'bold', color: '#226bfc' },
  planInterval: { fontSize: 16, color: '#6b7280', marginLeft: 4 },
  savingsTag: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 12 },
  savingsText: { fontSize: 12, fontWeight: '600', color: '#166534' },
  planFeatures: { gap: 8 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontSize: 14, color: '#4b5563' },
  cardsList: { maxHeight: 300, marginBottom: 20 },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    gap: 12,
  },
  cardItemSelected: { borderColor: '#226bfc', backgroundColor: '#eff6ff' },
  cardIcon: { width: 48, height: 32, backgroundColor: '#f3f4f6', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardBrand: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 2 },
  cardNumber: { fontSize: 16, fontWeight: '500', color: '#1f2937' },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#226bfc',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  addCardText: { fontSize: 16, fontWeight: '600', color: '#226bfc' },
  summaryCard: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 20 },
  summaryTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: '#6b7280' },
  summaryValue: { fontSize: 14, fontWeight: '500', color: '#1f2937' },
  summaryTotal: { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 12, marginTop: 4 },
  summaryTotalLabel: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  summaryTotalValue: { fontSize: 20, fontWeight: 'bold', color: '#226bfc' },
  successContainer: { alignItems: 'center', paddingVertical: 40 },
  successIcon: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#27ae60', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  successTitle: { fontSize: 28, fontWeight: 'bold', color: '#1f2937', marginBottom: 12 },
  successMessage: { fontSize: 16, color: '#6b7280', textAlign: 'center', marginBottom: 32 },
  successDetails: { width: '100%', backgroundColor: '#f9fafb', borderRadius: 12, padding: 16 },
  successDetailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  successDetailLabel: { fontSize: 14, color: '#6b7280' },
  successDetailValue: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
});