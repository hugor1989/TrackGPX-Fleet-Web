import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
  Modal
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MainLayout from '../../layouts/MainLayout';
import invoiceService, { Payment } from '../../api/invoiceService';
import billingInfoService from '../../api/billingInfoService'; 

export default function RequestInvoiceScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rfcDestino, setRfcDestino] = useState<string>('');
  
  // Estado para el Modal de Feedback (Éxito o Error)
  const [feedbackModal, setFeedbackModal] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
    data?: any; // Para guardar datos extra como el folio si es éxito
  }>({
    visible: false,
    type: 'success',
    title: '',
    message: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (!refreshing) setLoading(true);
      
      const [paymentsData, billingData] = await Promise.all([
        invoiceService.getPaymentsWithoutInvoice(),
        billingInfoService.getBillingInfo().catch(() => null)
      ]);

      setPayments(paymentsData || []);
      if (billingData) {
        setRfcDestino(billingData.rfc);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const selectedPayment = useMemo(() => 
    payments.find(p => p.id === selectedPaymentId), 
  [payments, selectedPaymentId]);

  const handleRequestInvoice = async () => {
    if (!selectedPaymentId) return;

    try {
      setRequesting(true);
      
      const invoice = await invoiceService.requestInvoice({
        payment_id: selectedPaymentId,
      });

      // ✅ ÉXITO: Mostramos modal verde
      setFeedbackModal({
        visible: true,
        type: 'success',
        title: '¡Factura Generada!',
        message: 'Se ha enviado el XML y PDF a tu correo electrónico registrado.',
        data: invoice
      });
      
      loadData();
      setSelectedPaymentId(null);

    } catch (err: any) {
      // ❌ ERROR: Mostramos modal rojo con el mensaje del backend
      setFeedbackModal({
        visible: true,
        type: 'error',
        title: 'No se pudo facturar',
        message: err.message || 'Ocurrió un error inesperado al procesar la solicitud.',
      });
    } finally {
      setRequesting(false);
    }
  };

  const closeFeedbackModal = () => {
    const wasSuccess = feedbackModal.type === 'success';
    setFeedbackModal({ ...feedbackModal, visible: false });
    
    // Si fue éxito, al cerrar mandamos al historial
    if (wasSuccess) {
      navigation.navigate('InvoiceHistory' as never);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // --- COMPONENTE RENDERIZADO DEL MODAL ---
  const FeedbackModal = () => {
    const isSuccess = feedbackModal.type === 'success';
    const color = isSuccess ? '#10b981' : '#ef4444'; // Verde o Rojo
    const icon = isSuccess ? 'checkmark' : 'alert';
    const bgIcon = isSuccess ? '#d1fae5' : '#fee2e2';

    return (
      <Modal
        visible={feedbackModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeFeedbackModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            {/* Icono Dinámico */}
            <View style={[styles.modalIconContainer, { backgroundColor: color, borderColor: bgIcon }]}>
              <Ionicons name={icon} size={40} color="#fff" />
            </View>

            <Text style={styles.modalTitle}>{feedbackModal.title}</Text>
            
            <Text style={styles.modalText}>
              {feedbackModal.message}
            </Text>
            
            {/* Si es éxito y tenemos datos de factura, mostramos resumen */}
            {isSuccess && feedbackModal.data && (
               <View style={styles.invoiceSummary}>
                 <Text style={styles.summaryLabel}>Folio Fiscal:</Text>
                 <Text style={styles.summaryValue}>{feedbackModal.data.folio || 'N/A'}</Text>
                 <View style={styles.rowBetween}>
                    <Text style={styles.summaryLabel}>Total:</Text>
                    <Text style={[styles.summaryValue, {color: '#166534'}]}>
                        {formatCurrency(feedbackModal.data.total)}
                    </Text>
                 </View>
               </View>
            )}

            {/* Si es error, mostramos un tip */}
            {!isSuccess && (
                <View style={styles.errorTip}>
                    <Ionicons name="information-circle" size={16} color="#b45309" />
                    <Text style={styles.errorTipText}>
                        Si el problema persiste, contacta a soporte técnico.
                    </Text>
                </View>
            )}

            <View style={styles.modalActions}>
              {!isSuccess && (
                  <TouchableOpacity 
                    style={styles.modalBtnOutline} 
                    onPress={() => setFeedbackModal({...feedbackModal, visible: false})}
                  >
                    <Text style={styles.modalBtnOutlineText}>Cerrar</Text>
                  </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.modalBtnPrimary, { backgroundColor: isSuccess ? '#226bfc' : '#ef4444' }]} 
                onPress={closeFeedbackModal}
              >
                <Text style={styles.modalBtnPrimaryText}>
                    {isSuccess ? 'Aceptar y Ver Historial' : 'Entendido'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <MainLayout activeMenu="Config-Facturacion">
      <View style={styles.container}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.pageTitle}>Solicitar Factura</Text>
            <Text style={styles.pageSubtitle}>Selecciona un movimiento para facturar</Text>
          </View>
          <View style={styles.rfcBadge}>
            <Text style={styles.rfcLabel}>Facturando a:</Text>
            <Text style={styles.rfcValue}>{rfcDestino || 'Sin Datos Fiscales'}</Text>
          </View>
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#226bfc" style={{marginTop: 50}} />
        ) : (
          <View style={[styles.contentContainer, isDesktop && styles.desktopLayout]}>
            
            {/* COLUMNA IZQUIERDA: LISTA */}
            <View style={[styles.leftColumn, isDesktop && { width: '60%' }]}>
              <ScrollView 
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                contentContainerStyle={{ paddingBottom: 100 }}
              >
                {payments.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="documents-outline" size={64} color="#d1d5db" />
                    <Text style={styles.emptyTitle}>No hay pagos pendientes</Text>
                    <Text style={styles.emptyText}>Todas tus transacciones recientes ya han sido facturadas.</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.sectionTitle}>Pagos Disponibles ({payments.length})</Text>
                    {payments.map((payment) => {
                      const isSelected = selectedPaymentId === payment.id;
                      return (
                        <TouchableOpacity
                          key={payment.id}
                          style={[styles.paymentCard, isSelected && styles.paymentCardSelected]}
                          onPress={() => setSelectedPaymentId(payment.id)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.cardLeft}>
                            <View style={[styles.iconBox, isSelected ? styles.iconBoxSelected : styles.iconBoxNormal]}>
                              <Ionicons 
                                name={isSelected ? "checkmark" : "receipt-outline"} 
                                size={24} 
                                color={isSelected ? "#fff" : "#6b7280"} 
                              />
                            </View>
                            <View>
                              <Text style={[styles.paymentDesc, isSelected && {color: '#226bfc'}]}>
                                {payment.description}
                              </Text>
                              <Text style={styles.paymentDate}>
                                {formatDate(payment.paid_at || payment.created_at)}
                              </Text>
                              {payment.device && (
                                <Text style={styles.deviceInfo}>GPS: {payment.device.imei}</Text>
                              )}
                            </View>
                          </View>
                          <View style={styles.cardRight}>
                            <Text style={styles.amountText}>{formatCurrency(payment.total)}</Text>
                            <View style={styles.statusPill}>
                              <Text style={styles.statusPillText}>Pagado</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </>
                )}
              </ScrollView>
            </View>

            {/* COLUMNA DERECHA: RESUMEN */}
            <View style={[styles.rightColumn, isDesktop ? { width: '38%' } : styles.mobileFooter]}>
               <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Resumen de Solicitud</Text>
                  
                  {selectedPayment ? (
                    <>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Concepto:</Text>
                        <Text style={styles.summaryRowValue} numberOfLines={1}>{selectedPayment.description}</Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Fecha Pago:</Text>
                        <Text style={styles.summaryRowValue}>{formatDate(selectedPayment.paid_at || selectedPayment.created_at)}</Text>
                      </View>
                      <View style={styles.divider} />
                      <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total a Facturar</Text>
                        <Text style={styles.totalValue}>{formatCurrency(selectedPayment.total)}</Text>
                      </View>

                      {!rfcDestino && (
                        <View style={styles.warningBox}>
                          <Ionicons name="warning" size={16} color="#b45309" />
                          <Text style={styles.warningText}>No tienes RFC registrado. Configura tus datos fiscales antes de continuar.</Text>
                        </View>
                      )}

                      <TouchableOpacity 
                        style={[styles.requestBtn, (!rfcDestino || requesting) && styles.btnDisabled]}
                        onPress={handleRequestInvoice}
                        disabled={!rfcDestino || requesting}
                      >
                        {requesting ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="paper-plane-outline" size={20} color="#fff" />
                            <Text style={styles.requestBtnText}>Solicitar Factura</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <Text style={styles.legalText}>
                        Al solicitar, confirmas que los datos fiscales son correctos.
                      </Text>
                    </>
                  ) : (
                    <View style={styles.emptySummary}>
                      <Ionicons name="arrow-back-circle-outline" size={40} color="#d1d5db" />
                      <Text style={styles.emptySummaryText}>Selecciona un pago de la lista para ver el detalle.</Text>
                    </View>
                  )}
               </View>
            </View>

          </View>
        )}
      </View>
      
      {/* ✅ INYECCIÓN DEL MODAL */}
      <FeedbackModal />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#1f2937' },
  pageSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  rfcBadge: { alignItems: 'flex-end' },
  rfcLabel: { fontSize: 11, color: '#9ca3af', textTransform: 'uppercase' },
  rfcValue: { fontSize: 14, fontWeight: 'bold', color: '#374151', backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 2 },
  contentContainer: { flex: 1, flexDirection: 'column' },
  desktopLayout: { flexDirection: 'row', padding: 20, gap: 20 },
  leftColumn: { flex: 1 },
  rightColumn: {},
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#6b7280', marginBottom: 12, paddingHorizontal: 20, marginTop: 20 },
  emptyState: { alignItems: 'center', marginTop: 60, padding: 20 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginTop: 12 },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 4 },
  paymentCard: { backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, marginHorizontal: 20, marginBottom: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 2, elevation: 1 },
  paymentCardSelected: { borderColor: '#226bfc', backgroundColor: '#eff6ff', borderWidth: 2 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  iconBoxNormal: { backgroundColor: '#f3f4f6' },
  iconBoxSelected: { backgroundColor: '#226bfc' },
  paymentDesc: { fontSize: 15, fontWeight: '600', color: '#374151' },
  paymentDate: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  deviceInfo: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  amountText: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  statusPill: { backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  statusPillText: { fontSize: 10, fontWeight: 'bold', color: '#166534' },
  mobileFooter: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb', elevation: 10 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  summaryTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 13, color: '#6b7280' },
  summaryRowValue: { fontSize: 13, fontWeight: '500', color: '#374151', flex: 1, textAlign: 'right', paddingLeft: 10 },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: '#374151' },
  totalValue: { fontSize: 24, fontWeight: 'bold', color: '#226bfc' },
  warningBox: { flexDirection: 'row', backgroundColor: '#fffbeb', padding: 10, borderRadius: 8, marginBottom: 12, gap: 8 },
  warningText: { fontSize: 12, color: '#b45309', flex: 1 },
  requestBtn: { backgroundColor: '#226bfc', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8, shadowColor: '#226bfc', shadowOpacity: 0.3, shadowRadius: 8 },
  btnDisabled: { backgroundColor: '#9ca3af', shadowOpacity: 0 },
  requestBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  legalText: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 12 },
  emptySummary: { alignItems: 'center', padding: 20, opacity: 0.7 },
  emptySummaryText: { textAlign: 'center', color: '#6b7280', marginTop: 10 },

  // --- MODAL STYLES ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 360, alignItems: 'center', elevation: 5 },
  modalIconContainer: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 4 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 8, textAlign: 'center' },
  modalText: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  invoiceSummary: { width: '100%', backgroundColor: '#f9fafb', padding: 12, borderRadius: 8, marginBottom: 24 },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#1f2937', marginBottom: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  errorTip: { flexDirection: 'row', backgroundColor: '#fff7ed', padding: 10, borderRadius: 8, marginBottom: 20, gap: 8 },
  errorTipText: { fontSize: 12, color: '#c2410c', flex: 1 },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtnOutline: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center' },
  modalBtnOutlineText: { color: '#374151', fontWeight: '600' },
  modalBtnPrimary: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  modalBtnPrimaryText: { color: '#fff', fontWeight: '600' },
});