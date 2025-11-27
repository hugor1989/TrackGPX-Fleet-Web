// src/screens/plans/PlanListScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import planService, { Plan } from '../../api/planService';

type BillingCycle = 'monthly' | 'annual';

export default function PlanListScreen() {
  const navigation = useNavigation();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const data = await planService.getPlans();
      setPlans(data);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    // Navegar a activación con el plan seleccionado
    navigation.navigate('ActivateDevice' as never, { selectedPlan: plan, billingCycle } as never);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#226bfc" />
        <Text style={styles.loadingText}>Cargando planes...</Text>
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
        <Text style={styles.headerTitle}>Planes y Precios</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Descripción */}
        <View style={styles.descriptionCard}>
          <Text style={styles.descriptionTitle}>Elige el plan perfecto para ti</Text>
          <Text style={styles.descriptionText}>
            Todos los planes incluyen seguimiento en tiempo real, alertas, historial y soporte 24/7
          </Text>
        </View>

        {/* Toggle Mensual/Anual */}
        <View style={styles.billingToggle}>
          <TouchableOpacity
            style={[styles.billingOption, billingCycle === 'monthly' && styles.billingOptionActive]}
            onPress={() => setBillingCycle('monthly')}
          >
            <Text style={[styles.billingText, billingCycle === 'monthly' && styles.billingTextActive]}>
              Mensual
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.billingOption, billingCycle === 'annual' && styles.billingOptionActive]}
            onPress={() => setBillingCycle('annual')}
          >
            <Text style={[styles.billingText, billingCycle === 'annual' && styles.billingTextActive]}>
              Anual
            </Text>
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsBadgeText}>Ahorra 2 meses</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Lista de Planes */}
        <View style={styles.plansGrid}>
          {plans.map((plan, index) => {
            const pricing = planService.calculatePrice(plan, billingCycle);
            const isPopular = index === 1; // El segundo plan como "más popular"

            return (
              <View key={plan.id} style={styles.planCard}>
                {isPopular && (
                  <View style={styles.popularBadge}>
                    <Ionicons name="star" size={14} color="#fff" />
                    <Text style={styles.popularBadgeText}>Más popular</Text>
                  </View>
                )}

                <View style={styles.planHeader}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planDescription}>{plan.description}</Text>
                </View>

                <View style={styles.planPricing}>
                  <View style={styles.priceRow}>
                    <Text style={styles.currency}>$</Text>
                    <Text style={styles.price}>{pricing.finalPrice.toFixed(0)}</Text>
                    <Text style={styles.interval}>
                      /{billingCycle === 'monthly' ? 'mes' : 'año'}
                    </Text>
                  </View>
                  {billingCycle === 'annual' && pricing.savings > 0 && (
                    <View style={styles.savingsTag}>
                      <Text style={styles.savingsText}>
                        Ahorras ${pricing.savings.toFixed(0)} MXN
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.planFeatures}>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color="#27ae60" />
                    <Text style={styles.featureText}>
                      Hasta {plan.max_vehicles} vehículos
                    </Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color="#27ae60" />
                    <Text style={styles.featureText}>
                      {plan.max_users} usuarios
                    </Text>
                  </View>
                  {planService.formatFeatures(plan).slice(0, 4).map((feature, idx) => (
                    <View key={idx} style={styles.featureItem}>
                      <Ionicons name="checkmark-circle" size={20} color="#27ae60" />
                      <Text style={styles.featureText}>{feature.name}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.selectButton,
                    isPopular && styles.selectButtonPopular,
                  ]}
                  onPress={() => handleSelectPlan(plan)}
                >
                  <Text
                    style={[
                      styles.selectButtonText,
                      isPopular && styles.selectButtonTextPopular,
                    ]}
                  >
                    Seleccionar Plan
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* FAQ */}
        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>Preguntas Frecuentes</Text>
          
          <View style={styles.faqItem}>
            <Ionicons name="help-circle-outline" size={24} color="#226bfc" />
            <View style={styles.faqContent}>
              <Text style={styles.faqQuestion}>¿Puedo cambiar de plan después?</Text>
              <Text style={styles.faqAnswer}>
                Sí, puedes actualizar o cambiar tu plan en cualquier momento desde la configuración.
              </Text>
            </View>
          </View>

          <View style={styles.faqItem}>
            <Ionicons name="help-circle-outline" size={24} color="#226bfc" />
            <View style={styles.faqContent}>
              <Text style={styles.faqQuestion}>¿Hay periodo de prueba?</Text>
              <Text style={styles.faqAnswer}>
                Sí, todos los planes incluyen 7 días de prueba gratuita.
              </Text>
            </View>
          </View>

          <View style={styles.faqItem}>
            <Ionicons name="help-circle-outline" size={24} color="#226bfc" />
            <View style={styles.faqContent}>
              <Text style={styles.faqQuestion}>¿Puedo cancelar en cualquier momento?</Text>
              <Text style={styles.faqAnswer}>
                Sí, sin compromisos. Puedes cancelar tu suscripción cuando desees.
              </Text>
            </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
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
  descriptionCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  descriptionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  billingOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    position: 'relative',
  },
  billingOptionActive: {
    backgroundColor: '#226bfc',
  },
  billingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  billingTextActive: {
    color: '#fff',
  },
  savingsBadge: {
    position: 'absolute',
    top: -10,
    right: 8,
    backgroundColor: '#27ae60',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  savingsBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  plansGrid: {
    paddingHorizontal: 20,
    gap: 16,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: 20,
    right: 20,
    backgroundColor: '#226bfc',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  popularBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  planHeader: {
    marginBottom: 20,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  planPricing: {
    marginBottom: 24,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  currency: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#226bfc',
  },
  price: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#226bfc',
    marginLeft: 4,
  },
  interval: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 4,
  },
  savingsTag: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
  },
  planFeatures: {
    gap: 12,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
  },
  selectButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  selectButtonPopular: {
    backgroundColor: '#226bfc',
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  selectButtonTextPopular: {
    color: '#fff',
  },
  faqSection: {
    marginHorizontal: 20,
    marginTop: 32,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  faqTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
  },
  faqItem: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  faqContent: {
    flex: 1,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
});
