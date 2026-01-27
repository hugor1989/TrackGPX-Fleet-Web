import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  TextInput,
  useWindowDimensions,
  Clipboard // Nota: Si usas Expo SDK > 45, usa: import * as Clipboard from 'expo-clipboard';
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MainLayout from '../../layouts/MainLayout';
import invoiceService from '../../api/invoiceService';
// Importa tu URL base o defínela aquí
import { apiClient } from '../../api/client'; // Asegúrate de tener esto, o usa 'http://localhost:8000'

// Tipos (Mantenemos tu interfaz completa)
interface Invoice {
    id: number;
    company_id: number;
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
    cfdi_pdf_path: string | null;
    cfdi_xml_path: string | null;
    receiver_name: string;
    receiver_rfc: string;
    status: string;
    is_paid: boolean;
    // ... resto de tus campos
}

export default function InvoiceHistoryScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768;

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Totales calculados
  const totals = useMemo(() => {
    return invoices.reduce((acc, curr) => ({
      count: acc.count + 1,
      amount: acc.amount + parseFloat(curr.total)
    }), { count: 0, amount: 0 });
  }, [invoices]);

  const loadInvoices = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      // Aquí podrías implementar paginación real, por ahora traemos 50
      const response = await invoiceService.getInvoices(1, 50); 
      setInvoices(response.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    loadInvoices();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadInvoices();
  };

  // Filtrado local
  const filteredInvoices = useMemo(() => {
    if (!searchQuery) return invoices;
    const query = searchQuery.toLowerCase();
    return invoices.filter(inv => 
      (inv.folio && inv.folio.toLowerCase().includes(query)) ||
      (inv.receiver_name && inv.receiver_name.toLowerCase().includes(query)) ||
      (inv.cfdi_uuid && inv.cfdi_uuid.toLowerCase().includes(query)) ||
      inv.total.includes(query)
    );
  }, [invoices, searchQuery]);

  const handleDownload = async (invoice: Invoice, type: 'pdf' | 'xml') => {
    const path = type === 'pdf' ? invoice.cfdi_pdf_path : invoice.cfdi_xml_path;
    
    if (!path) {
      Alert.alert('No disponible', `El archivo ${type.toUpperCase()} no está listo aún.`);
      return;
    }

    // Construcción de URL (Ajusta API_URL según tu entorno prod/dev)
    const baseUrl = apiClient || 'http://localhost:8000'; 
    const downloadUrl = `${baseUrl}/api/invoices/${invoice.id}/download-${type}`;

    try {
      if (Platform.OS === 'web') {
        window.open(downloadUrl, '_blank');
      } else {
        const supported = await Linking.canOpenURL(downloadUrl);
        if (supported) {
          await Linking.openURL(downloadUrl);
        } else {
          Alert.alert('Error', 'No se puede abrir el enlace de descarga.');
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Ocurrió un error al intentar descargar el archivo.');
    }
  };

  const copyToClipboard = (text: string | null) => {
    if (!text) return;
    // En React Native puro: Clipboard.setString(text);
    // En Web/Expo recientes:
    if (Platform.OS === 'web') {
      navigator.clipboard.writeText(text);
      window.alert('UUID copiado al portapapeles');
    } else {
      Alert.alert('Copiado', 'UUID copiado al portapapeles');
    }
  };

  return (
    <MainLayout activeMenu="Config-Facturacion">
      <View style={styles.container}>
        
        {/* HEADER & STATS */}
        <View style={styles.headerSection}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.pageTitle}>Historial de Facturas</Text>
              <Text style={styles.pageSubtitle}>Consulta y descarga tus comprobantes fiscales</Text>
            </View>
            <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn}>
              <Ionicons name="refresh" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <StatCard 
              label="Facturas Emitidas" 
              value={totals.count} 
              icon="documents" 
              color="#226bfc" 
              bg="#eff6ff" 
            />
            <StatCard 
              label="Monto Total" 
              value={formatCurrency(totals.amount)} 
              icon="cash" 
              color="#10b981" 
              bg="#ecfdf5" 
            />
          </View>
          
          {/* SEARCH BAR */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por Folio, Cliente o Monto..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* CONTENT */}
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#226bfc" style={{ marginTop: 40 }} />
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          >
            {filteredInvoices.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="file-tray-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyTitle}>No se encontraron facturas</Text>
                <Text style={styles.emptyText}>Intenta con otros filtros o genera una nueva factura.</Text>
              </View>
            ) : (
              <View style={[styles.grid, isDesktop && styles.gridDesktop, isTablet && !isDesktop && styles.gridTablet]}>
                {filteredInvoices.map((inv) => (
                  <InvoiceCard 
                    key={inv.id} 
                    invoice={inv} 
                    onDownload={handleDownload}
                    onCopyUuid={copyToClipboard}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </MainLayout>
  );
}

// --- SUBCOMPONENTES ---

const StatCard = ({ label, value, icon, color, bg }: any) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  </View>
);

const InvoiceCard = ({ invoice, onDownload, onCopyUuid }: { invoice: Invoice, onDownload: any, onCopyUuid: any }) => {
  const statusConfig = getStatusConfig(invoice.status);
  
  return (
    <View style={styles.card}>
      {/* Header Card */}
      <View style={styles.cardHeader}>
        <View style={styles.folioBadge}>
          <Text style={styles.folioText}>
            {invoice.serie ? `${invoice.serie}-` : ''}{invoice.folio || invoice.invoice_number}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.text}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Info */}
      <View style={styles.cardBody}>
        <View style={styles.row}>
          <Text style={styles.label}>Fecha:</Text>
          <Text style={styles.value}>{formatDate(invoice.invoice_date)}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>Receptor:</Text>
          <Text style={styles.value} numberOfLines={1}>{invoice.receiver_name}</Text>
        </View>

        {invoice.cfdi_uuid && (
          <TouchableOpacity 
            style={styles.uuidRow} 
            onPress={() => onCopyUuid(invoice.cfdi_uuid)}
          >
            <Text style={styles.label}>UUID:</Text>
            <Text style={styles.uuidValue} numberOfLines={1}>
              {invoice.cfdi_uuid.substring(0, 8)}...{invoice.cfdi_uuid.substring(invoice.cfdi_uuid.length - 4)}
            </Text>
            <Ionicons name="copy-outline" size={12} color="#226bfc" style={{marginLeft: 4}} />
          </TouchableOpacity>
        )}

        <View style={[styles.row, { marginTop: 8 }]}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalValue}>{formatCurrency(invoice.total)}</Text>
        </View>
      </View>

      {/* Footer Actions */}
      <View style={styles.cardFooter}>
        <TouchableOpacity 
          style={[styles.actionBtn, !invoice.cfdi_pdf_path && styles.btnDisabled]} 
          onPress={() => onDownload(invoice, 'pdf')}
          disabled={!invoice.cfdi_pdf_path}
        >
          <Ionicons name="document-text" size={16} color={invoice.cfdi_pdf_path ? "#ef4444" : "#9ca3af"} />
          <Text style={[styles.actionText, { color: invoice.cfdi_pdf_path ? "#374151" : "#9ca3af" }]}>PDF</Text>
        </TouchableOpacity>

        <View style={styles.verticalDivider} />

        <TouchableOpacity 
          style={[styles.actionBtn, !invoice.cfdi_xml_path && styles.btnDisabled]} 
          onPress={() => onDownload(invoice, 'xml')}
          disabled={!invoice.cfdi_xml_path}
        >
          <Ionicons name="code" size={16} color={invoice.cfdi_xml_path ? "#226bfc" : "#9ca3af"} />
          <Text style={[styles.actionText, { color: invoice.cfdi_xml_path ? "#374151" : "#9ca3af" }]}>XML</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// --- HELPERS ---
const formatCurrency = (val: string | number) => {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'issued': return { bg: '#dcfce7', color: '#166534', text: 'TIMBRADA' };
    case 'pending': return { bg: '#fef3c7', color: '#b45309', text: 'PENDIENTE' };
    case 'canceled': return { bg: '#fee2e2', color: '#991b1b', text: 'CANCELADA' };
    default: return { bg: '#f3f4f6', color: '#4b5563', text: status.toUpperCase() };
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  
  // Header Section
  headerSection: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', padding: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#1f2937' },
  pageSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  refreshBtn: { padding: 8, borderRadius: 8, backgroundColor: '#f3f4f6' },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 2, elevation: 1
  },
  statIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  statLabel: { fontSize: 12, color: '#6b7280' },

  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 12, borderRadius: 10, height: 44
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#1f2937' },

  // List & Grid
  listContent: { padding: 20 },
  grid: { gap: 16 },
  gridDesktop: { flexDirection: 'row', flexWrap: 'wrap' },
  gridTablet: { flexDirection: 'row', flexWrap: 'wrap' },
  
  // Empty State
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginTop: 16 },
  emptyText: { color: '#9ca3af', marginTop: 8 },

  // Invoice Card
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    // Responsive width logic
    minWidth: '100%', 
    ...(Platform.OS === 'web' && {
       flexBasis: '32%', // 3 columnas en desktop aprox
       flexGrow: 1,
       maxWidth: '100%' 
    })
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  folioBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  folioText: { color: '#1d4ed8', fontWeight: 'bold', fontSize: 13 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: 'bold' },

  divider: { height: 1, backgroundColor: '#f3f4f6' },

  cardBody: { padding: 16, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 13, color: '#6b7280' },
  value: { fontSize: 13, color: '#374151', fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  
  uuidRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb', padding: 6, borderRadius: 6, marginTop: 4 },
  uuidValue: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', color: '#4b5563' },

  totalLabel: { fontSize: 14, fontWeight: 'bold', color: '#1f2937' },
  totalValue: { fontSize: 16, fontWeight: 'bold', color: '#226bfc' },

  cardFooter: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 },
  btnDisabled: { opacity: 0.5 },
  actionText: { fontSize: 13, fontWeight: '600' },
  verticalDivider: { width: 1, backgroundColor: '#f3f4f6' },
});