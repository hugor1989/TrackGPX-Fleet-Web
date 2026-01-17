// src/screens/invoices/InvoiceHistoryScreen.tsx

import React, { useState, useEffect, useCallback } from 'react';
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
  Linking,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import invoiceService from '../../api/invoiceService';

// Tipos basados en la respuesta real del backend
interface Invoice {
id: number;
    company_id: number;
    billing_cycle_id: number | null;
    invoice_number: string;
    folio: string | null;
    serie: string | null;
    invoice_date: string;
    due_date: string;
    subtotal: string;
    tax: string;
    discount: string;
    total: string;
    currency: string;
    cfdi_uuid: string | null;
    cfdi_folio: string | null;
    cfdi_serie: string | null;
    cfdi_xml_path: string | null;
    cfdi_pdf_path: string | null;
    cfdi_original_string: string | null;
    cfdi_sat_seal: string | null;
    cfdi_cfdi_seal: string | null;
    cfdi_sat_cert_number: string | null;
    cfdi_stamp_date: string | null;
    pac_name: string | null;
    pac_rfc: string | null;
    issuer_rfc: string;
    issuer_name: string;
    issuer_fiscal_regime: string;
    receiver_rfc: string;
    receiver_name: string;
    receiver_fiscal_regime: string;
    receiver_zip_code: string;
    receiver_tax_regime: string;
    cfdi_use: string;
    cfdi_payment_method: string;
    cfdi_payment_form: string;
    export_type: string;
    cfdi_canceled_at: string | null;
    cfdi_cancellation_status: string | null;
    cfdi_cancellation_reason: string | null;
    status: string;
    paid_at: string | null;
    payment_method: string | null;
    payment_reference: string | null;
    notes: string | null;
    internal_notes: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    is_paid: boolean;
    is_overdue: boolean;
    is_issued: boolean;
}

interface InvoiceListResponse {
  success: boolean;
  data: Invoice[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export default function InvoiceHistoryScreen() {
  const navigation = useNavigation();
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalInvoices, setTotalInvoices] = useState(0);

  // Cargar facturas al montar
  useEffect(() => {
    loadInvoices();
  }, []);

  // Recargar al volver a la pantalla
  useFocusEffect(
    useCallback(() => {
      loadInvoices();
    }, [])
  );

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📋 Cargando facturas...');
      
      const response: InvoiceListResponse = await invoiceService.getInvoices(page, 50);
      
      console.log('✅ Facturas cargadas:', response.data.length);
      console.log('📊 Primera factura:', response.data[0]);
      
      setInvoices(response.data);
      setTotalInvoices(response.meta?.total || response.data.length);
      
    } catch (err: any) {
      console.error('❌ Error cargando facturas:', err);
      setError(err.message || 'Error al cargar facturas');
      
      if (Platform.OS === 'web') {
        window.alert(`Error: ${err.message}`);
      } else {
        Alert.alert('Error', err.message || 'Error al cargar facturas');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadInvoices();
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    if (!invoice.cfdi_pdf_path) {
      if (Platform.OS === 'web') {
        window.alert('PDF no disponible para esta factura');
      } else {
        Alert.alert('No disponible', 'El PDF no está disponible para esta factura');
      }
      return;
    }

    try {
      // Construir URL completa del PDF
      const baseUrl = 'http://localhost:8000'; // Cambiar según tu API
      const pdfUrl = `${baseUrl}/api/invoices/${invoice.id}/download-pdf`;
      
      console.log('📄 Descargando PDF:', pdfUrl);
      
      if (Platform.OS === 'web') {
        // En web, abrir en nueva pestaña
        window.open(pdfUrl, '_blank');
      } else {
        // En móvil, abrir con el navegador
        const canOpen = await Linking.canOpenURL(pdfUrl);
        if (canOpen) {
          await Linking.openURL(pdfUrl);
        } else {
          Alert.alert('Error', 'No se puede abrir el enlace');
        }
      }
    } catch (err: any) {
      console.error('❌ Error descargando PDF:', err);
      if (Platform.OS === 'web') {
        window.alert('Error al descargar PDF');
      } else {
        Alert.alert('Error', 'No se pudo descargar el PDF');
      }
    }
  };

  const handleDownloadXML = async (invoice: Invoice) => {
    if (!invoice.cfdi_xml_path) {
      if (Platform.OS === 'web') {
        window.alert('XML no disponible para esta factura');
      } else {
        Alert.alert('No disponible', 'El XML no está disponible para esta factura');
      }
      return;
    }

    try {
      // Construir URL completa del XML
      const baseUrl = 'http://localhost:8000'; // Cambiar según tu API
      const xmlUrl = `${baseUrl}/api/invoices/${invoice.id}/download-xml`;
      
      console.log('📄 Descargando XML:', xmlUrl);
      
      if (Platform.OS === 'web') {
        // En web, abrir en nueva pestaña
        window.open(xmlUrl, '_blank');
      } else {
        // En móvil, abrir con el navegador
        const canOpen = await Linking.canOpenURL(xmlUrl);
        if (canOpen) {
          await Linking.openURL(xmlUrl);
        } else {
          Alert.alert('Error', 'No se puede abrir el enlace');
        }
      }
    } catch (err: any) {
      console.error('❌ Error descargando XML:', err);
      if (Platform.OS === 'web') {
        window.alert('Error al descargar XML');
      } else {
        Alert.alert('Error', 'No se pudo descargar el XML');
      }
    }
  };

  const handleSendEmail = (invoice: Invoice) => {
    if (Platform.OS === 'web') {
      window.alert('Funcionalidad de envío por correo próximamente');
    } else {
      Alert.alert(
        'Próximamente',
        'La función de envío por correo estará disponible pronto',
        [{ text: 'Entendido' }]
      );
    }
  };

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(numAmount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'issued':
        return {
          icon: 'checkmark-circle' as const,
          color: '#10b981',
          bg: '#dcfce7',
          text: 'Timbrada',
        };
      case 'pending':
        return {
          icon: 'time-outline' as const,
          color: '#f59e0b',
          bg: '#fef3c7',
          text: 'Pendiente',
        };
      case 'canceled':
        return {
          icon: 'close-circle' as const,
          color: '#ef4444',
          bg: '#fee2e2',
          text: 'Cancelada',
        };
      case 'failed':
        return {
          icon: 'alert-circle' as const,
          color: '#ef4444',
          bg: '#fee2e2',
          text: 'Fallida',
        };
      default:
        return {
          icon: 'help-circle' as const,
          color: '#6b7280',
          bg: '#f3f4f6',
          text: status,
        };
    }
  };

  const totalAmount = invoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0);

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Historial de Facturas</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#226bfc" />
          <Text style={styles.loadingText}>Cargando facturas...</Text>
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
        <Text style={styles.headerTitle}>Historial de Facturas</Text>
        <TouchableOpacity onPress={loadInvoices}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#226bfc']} />
        }
      >
        {/* Error state */}
        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={20} color="#dc2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalInvoices}</Text>
            <Text style={styles.statLabel}>Facturas</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrency(totalAmount)}</Text>
            <Text style={styles.statLabel}>Total Facturado</Text>
          </View>
        </View>

        {/* Facturas */}
        {invoices.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>Sin facturas</Text>
            <Text style={styles.emptyText}>
              Aquí aparecerán tus facturas cuando solicites una
            </Text>
          </View>
        ) : (
          <View style={styles.invoicesList}>
            {invoices.map((invoice) => {
              const statusInfo = getStatusInfo(invoice.status);
              
              return (
                <View key={invoice.id} style={styles.invoiceCard}>
                  {/* Header */}
                  <View style={styles.invoiceHeader}>
                    <View style={styles.invoiceHeaderLeft}>
                      <View style={styles.invoiceIcon}>
                        <Ionicons name="document-text" size={24} color="#226bfc" />
                      </View>
                      <View>
                        <Text style={styles.invoiceFolio}>
                          {invoice.cfdi_serie}-{invoice.cfdi_folio}
                        </Text>
                        <Text style={styles.invoiceDate}>
                          {formatDate(invoice.invoice_date)}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                      <Ionicons name={statusInfo.icon} size={16} color={statusInfo.color} />
                      <Text style={[styles.statusText, { color: statusInfo.color }]}>
                        {statusInfo.text}
                      </Text>
                    </View>
                  </View>

                  {/* Receptor */}
                  <View style={styles.receptorContainer}>
                    <Text style={styles.receptorLabel}>RFC:</Text>
                    <Text style={styles.receptorValue}>{invoice.receiver_rfc}</Text>
                  </View>
                  <Text style={styles.receptorName}>{invoice.receiver_name}</Text>

                  {/* Amounts */}
                  <View style={styles.amountsContainer}>
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>Subtotal:</Text>
                      <Text style={styles.amountValue}>{formatCurrency(invoice.subtotal)}</Text>
                    </View>
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>IVA (16%):</Text>
                      <Text style={styles.amountValue}>{formatCurrency(invoice.tax)}</Text>
                    </View>
                    {parseFloat(invoice.discount) > 0 && (
                      <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>Descuento:</Text>
                        <Text style={[styles.amountValue, { color: '#10b981' }]}>
                          -{formatCurrency(invoice.discount)}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.amountRow, styles.totalRow]}>
                      <Text style={styles.totalLabel}>Total:</Text>
                      <Text style={styles.totalValue}>{formatCurrency(invoice.total)}</Text>
                    </View>
                  </View>

                  {/* UUID (solo si está timbrada) */}
                  {invoice.cfdi_uuid && (
                    <View style={styles.uuidContainer}>
                      <Text style={styles.uuidLabel}>UUID:</Text>
                      <Text style={styles.uuidValue} numberOfLines={1}>
                        {invoice.cfdi_uuid}
                      </Text>
                    </View>
                  )}

                  {/* Actions */}
                  <View style={styles.invoiceActions}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        !invoice.cfdi_pdf_path && styles.actionButtonDisabled,
                      ]}
                      onPress={() => handleDownloadPDF(invoice)}
                      disabled={!invoice.cfdi_pdf_path}
                    >
                      <Ionicons
                        name="download-outline"
                        size={18}
                        color={invoice.cfdi_pdf_path ? '#226bfc' : '#9ca3af'}
                      />
                      <Text
                        style={[
                          styles.actionButtonText,
                          !invoice.cfdi_pdf_path && styles.actionButtonTextDisabled,
                        ]}
                      >
                        PDF
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        !invoice.cfdi_xml_path && styles.actionButtonDisabled,
                      ]}
                      onPress={() => handleDownloadXML(invoice)}
                      disabled={!invoice.cfdi_xml_path}
                    >
                      <Ionicons
                        name="code-download-outline"
                        size={18}
                        color={invoice.cfdi_xml_path ? '#226bfc' : '#9ca3af'}
                      />
                      <Text
                        style={[
                          styles.actionButtonText,
                          !invoice.cfdi_xml_path && styles.actionButtonTextDisabled,
                        ]}
                      >
                        XML
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleSendEmail(invoice)}
                    >
                      <Ionicons name="mail-outline" size={18} color="#226bfc" />
                      <Text style={styles.actionButtonText}>Enviar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Info adicional */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#3b82f6" />
          <Text style={styles.infoText}>
            Las facturas se conservan por tiempo indefinido y puedes descargarlas en cualquier
            momento
          </Text>
        </View>
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
  content: { flex: 1 },
  contentContainer: { padding: 20 },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: { fontSize: 14, color: '#6b7280' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  errorText: { flex: 1, fontSize: 13, color: '#991b1b', fontWeight: '500' },
  statsRow: { flexDirection: 'row', marginBottom: 20, gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#6b7280' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginTop: 16 },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  invoicesList: { gap: 16 },
  invoiceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  invoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  invoiceHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  invoiceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceFolio: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  invoiceDate: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 4,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  receptorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  receptorLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  receptorValue: { fontSize: 13, color: '#1f2937', fontWeight: '600' },
  receptorName: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  amountsContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountLabel: { fontSize: 14, color: '#6b7280' },
  amountValue: { fontSize: 14, color: '#1f2937' },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    marginTop: 4,
  },
  totalLabel: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  totalValue: { fontSize: 16, fontWeight: 'bold', color: '#226bfc' },
  uuidContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  uuidLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  uuidValue: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#1f2937',
  },
  invoiceActions: { flexDirection: 'row', gap: 8 },
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
  actionButtonDisabled: {
    backgroundColor: '#f3f4f6',
    opacity: 0.5,
  },
  actionButtonText: { fontSize: 14, fontWeight: '600', color: '#226bfc' },
  actionButtonTextDisabled: { color: '#9ca3af' },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    gap: 12,
  },
  infoText: { flex: 1, fontSize: 13, color: '#1e40af', lineHeight: 18 },
});
