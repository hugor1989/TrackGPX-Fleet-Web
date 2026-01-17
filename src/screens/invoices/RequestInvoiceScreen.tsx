// src/screens/invoices/RequestInvoiceScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import invoiceService, { Payment } from '../../api/invoiceService';

export default function RequestInvoiceScreen() {
  const navigation = useNavigation();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<number | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setError('');
      const data = await invoiceService.getPaymentsWithoutInvoice();
      setPayments(data || []); // Asegurar que siempre sea un array
    } catch (err: any) {
      console.error('Error cargando pagos:', err);
      setError(err.message);
      setPayments([]); // Inicializar como array vacío en caso de error
      
      // Solo mostrar alert si no es un error de "no hay pagos"
      if (!err.message.includes('disponibles')) {
        Alert.alert('Error', err.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPayments();
  };

  const confirmRequestInvoice = () => {
    console.log('🔔 Mostrando confirmación para pago ID:', selectedPayment);
    
    if (!selectedPayment) {
      Alert.alert('Atención', 'Selecciona una transacción para facturar');
      return;
    }

    if (Platform.OS === 'web') {
      // En web, usar confirm nativo
      const confirmed = window.confirm(
        '¿Deseas solicitar la factura para esta transacción? Se generará con los datos fiscales registrados en tu perfil.'
      );
      
      if (confirmed) {
        handleRequestInvoice();
      }
    } else {
      // En mobile, usar Alert normal
      Alert.alert(
        'Confirmar Solicitud',
        '¿Deseas solicitar la factura para esta transacción? Se generará con los datos fiscales registrados en tu perfil.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Solicitar',
            onPress: () => handleRequestInvoice(),
          },
        ]
      );
    }
  };

  const handleRequestInvoice = async () => {
    console.log('🚀 Iniciando solicitud de factura...');
    
    try {
      setRequesting(true);
      
      console.log('📤 Enviando petición a backend...');
      const invoice = await invoiceService.requestInvoice({
        payment_id: selectedPayment!,
      });

      console.log('✅ Factura generada:', invoice);

      // Recargar lista de pagos primero
      await loadPayments();
      setSelectedPayment(null);

      // Luego mostrar mensaje de éxito
      if (Platform.OS === 'web') {
        window.alert(
          `✅ Factura generada exitosamente\n\nFolio: ${invoice.folio || 'N/A'}\nTotal: ${formatCurrency(invoice.total)}\n\nLa factura ha sido enviada a tu correo registrado.`
        );
      } else {
        Alert.alert(
          '✅ Factura Solicitada',
          `Tu factura ha sido generada exitosamente.\n\nFolio: ${invoice.folio || 'N/A'}\nTotal: ${formatCurrency(invoice.total)}\n\nLa factura ha sido enviada a tu correo registrado.`,
          [
            {
              text: 'Ver Facturas',
              onPress: () => navigation.navigate('InvoiceHistory' as never),
            },
            { text: 'Aceptar' },
          ]
        );
      }
    } catch (err: any) {
      console.error('❌ Error solicitando factura:', err);
      console.error('Error completo:', JSON.stringify(err, null, 2));
      
      if (Platform.OS === 'web') {
        window.alert(`Error: ${err.message}`);
      } else {
        Alert.alert('Error', err.message);
      }
    } finally {
      setRequesting(false);
    }
  };

  const formatCurrency = (amount: string | number): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(numAmount);
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Sin fecha';
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getPaymentIcon = (payment: Payment): string => {
    switch (payment.type) {
      case 'activation':
        return 'radio-outline';
      case 'renewal':
      case 'subscription':
        return 'sync-outline';
      default:
        return 'card-outline';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Solicitar Factura</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#226bfc" />
          <Text style={styles.loadingText}>Cargando pagos...</Text>
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
        <Text style={styles.headerTitle}>Solicitar Factura</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={24} color="#3b82f6" />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Facturación Electrónica</Text>
            <Text style={styles.infoText}>
              Selecciona una transacción para solicitar tu factura. La factura será generada y
              enviada a tu correo registrado en datos fiscales.
            </Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Lista de Pagos */}
        {!payments || payments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No hay pagos disponibles</Text>
            <Text style={styles.emptyText}>
              Todos tus pagos ya tienen factura o no hay transacciones recientes para facturar.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('InvoiceHistory' as never)}
            >
              <Text style={styles.emptyButtonText}>Ver Historial de Facturas</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pagos Disponibles para Facturar</Text>
              <Text style={styles.sectionSubtitle}>
                {payments?.length || 0} {(payments?.length || 0) === 1 ? 'pago' : 'pagos'}
              </Text>
            </View>

            {payments?.map((payment) => (
              <TouchableOpacity
                key={payment.id}
                style={[
                  styles.paymentCard,
                  selectedPayment === payment.id && styles.paymentCardSelected,
                ]}
                onPress={() => setSelectedPayment(payment.id)}
                disabled={requesting}
              >
                <View style={styles.paymentHeader}>
                  <View style={styles.paymentHeaderLeft}>
                    <View
                      style={[
                        styles.radioButton,
                        selectedPayment === payment.id && styles.radioButtonSelected,
                      ]}
                    >
                      {selectedPayment === payment.id && (
                        <View style={styles.radioButtonInner} />
                      )}
                    </View>

                    <View style={styles.paymentIcon}>
                      <Ionicons name={getPaymentIcon(payment)} size={20} color="#226bfc" />
                    </View>

                    <View style={styles.paymentInfo}>
                      <Text style={styles.paymentDescription}>{payment.description}</Text>
                      <Text style={styles.paymentDate}>{formatDate(payment.paid_at || payment.created_at)}</Text>
                      {payment.device?.imei && (
                        <View style={styles.deviceBadge}>
                          <Ionicons name="radio-outline" size={12} color="#6b7280" />
                          <Text style={styles.deviceText}>IMEI: {payment.device.imei}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.paymentRight}>
                    <Text style={styles.paymentAmount}>{formatCurrency(payment.total)}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        payment.is_paid && styles.statusBadgeSuccess,
                      ]}
                    >
                      <Text style={styles.statusText}>
                        {payment.is_paid ? 'Pagado' : payment.status}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {/* Botón solicitar */}
            <TouchableOpacity
              style={[
                styles.requestButton,
                (!selectedPayment || requesting) && styles.requestButtonDisabled,
              ]}
              onPress={confirmRequestInvoice}
              disabled={!selectedPayment || requesting}
            >
              {requesting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={20} color="#fff" />
                  <Text style={styles.requestButtonText}>Solicitar Factura</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Información adicional */}
            <View style={styles.additionalInfo}>
              <Text style={styles.additionalInfoTitle}>Requisitos:</Text>
              <View style={styles.requirementRow}>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.requirementText}>
                  Debes tener tus datos fiscales completos
                </Text>
              </View>
              <View style={styles.requirementRow}>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.requirementText}>
                  Solo se pueden facturar transacciones del mes en curso y anterior
                </Text>
              </View>
              <View style={styles.requirementRow}>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.requirementText}>
                  La factura se enviará al correo registrado
                </Text>
              </View>
            </View>
          </>
        )}
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 14, color: '#6b7280' },
  content: { flex: 1 },
  contentContainer: { padding: 20 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  infoTitle: { fontSize: 14, fontWeight: '600', color: '#1e40af', marginBottom: 4 },
  infoText: { fontSize: 13, color: '#1e40af', lineHeight: 18 },
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#226bfc',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  sectionSubtitle: { fontSize: 14, color: '#6b7280' },
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  paymentCardSelected: {
    borderColor: '#226bfc',
    backgroundColor: '#eff6ff',
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: { borderColor: '#226bfc' },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#226bfc',
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentInfo: { flex: 1 },
  paymentDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  paymentDate: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  deviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  deviceText: { fontSize: 11, color: '#6b7280' },
  paymentRight: { alignItems: 'flex-end', gap: 4 },
  paymentAmount: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  statusBadge: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeSuccess: { backgroundColor: '#dcfce7' },
  statusText: { fontSize: 11, fontWeight: '600', color: '#166534' },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#226bfc',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    gap: 8,
  },
  requestButtonDisabled: { opacity: 0.5 },
  requestButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  additionalInfo: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  additionalInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  requirementText: { flex: 1, fontSize: 13, color: '#6b7280', lineHeight: 18 },
});