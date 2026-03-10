import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Modal, Dimensions,Animated, 
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import MainLayout from '../../layouts/MainLayout';
import fineService from '../../api/fineOService';

const { width } = Dimensions.get('window');

export default function FinesListScreen() {
  const [loading, setLoading] = useState(true);
  const [fines, setFines] = useState<any[]>([]);
  const [summary, setSummary] = useState({ pending_count: 0, pending_amount: 0 });
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [showToast, setShowToast] = useState(false);

  // --- ESTADOS PARA EL POPUP (MODAL) ---
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedFine, setSelectedFine] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- CARGA DE DATOS ---
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fineService.getFines('all');
      setFines(res.data);
      setSummary(res.summary);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  // Helpers de formato
  const formatCurrency = (amount: any) => {
    return parseFloat(amount).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
  };
  const formatDate = (date: string) => {
    if(!date) return '--';
    return new Date(date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour:'2-digit', minute:'2-digit'});
  };

  // --- LÓGICA DEL POPUP ---
  
  // 1. Abrir el modal
  const openConfirmModal = (fine: any) => {
    setSelectedFine(fine);
    setModalVisible(true);
  };

  // 2. Confirmar y Pagar
const handleConfirmPayment = async () => {
    if (!selectedFine) return;
    
    try {
      setIsProcessing(true);
      await fineService.markAsPaid(selectedFine.id);
      
      setModalVisible(false); // Cerramos el modal
      setSelectedFine(null);
      loadData(); // Recargamos la lista
      
      // ✅ AQUÍ ACTIVAMOS EL TOAST
      setShowToast(true);

    } catch (error) {
      console.error(error);
      // Para errores sí dejamos un alert normal o hacemos un toast de error
      alert("Error al procesar el pago"); 
    } finally {
      setIsProcessing(false);
    }
  };

  // --- RENDERIZADO ---
  const displayedFines = fines.filter(f => filter === 'pending' ? f.status === 'pending' : true);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{flexDirection:'row', alignItems:'center', gap:10, flex:1}}>
          <View style={[styles.iconBox, item.status === 'pending' ? styles.bgRed : styles.bgGreen]}>
             <Ionicons name={item.status === 'pending' ? "alert-circle" : "checkmark-circle"} size={20} color="#fff" />
          </View>
          <View>
            <Text style={styles.plate}>{item.vehicle?.plate || 'Sin Placa'}</Text>
            <Text style={styles.vehicleName}>{item.vehicle?.name}</Text>
          </View>
        </View>
        <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.desc}>{item.description}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Fecha:</Text>
          <Text style={styles.metaValue}>{formatDate(item.detected_at)}</Text>
        </View>
        <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Referencia:</Text>
            <Text style={styles.metaValue}>{item.reference || '---'}</Text>
        </View>
      </View>

      {item.status === 'pending' && (
        <View style={styles.cardFooter}>
            {/* AL DAR CLIC, ABRIMOS EL MODAL PERSONALIZADO */}
            <TouchableOpacity style={styles.payBtn} onPress={() => openConfirmModal(item)}>
                <Ionicons name="card-outline" size={16} color="#fff" />
                <Text style={styles.payText}>Registrar Pago</Text>
            </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <MainLayout activeMenu="Multas">
      <View style={styles.container}>
        <View style={styles.header}>
            <View>
                <Text style={styles.title}>Gestión de Multas</Text>
                <Text style={styles.subtitle}>Controla las infracciones de tu flota</Text>
            </View>
            <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>Total por Pagar</Text>
                <Text style={styles.summaryAmount}>{formatCurrency(summary.pending_amount)}</Text>
            </View>
        </View>

        <View style={styles.tabs}>
            <TouchableOpacity style={[styles.tab, filter === 'pending' && styles.tabActive]} onPress={() => setFilter('pending')}>
                <Text style={[styles.tabText, filter === 'pending' && styles.tabTextActive]}>Pendientes ({summary.pending_count})</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, filter === 'all' && styles.tabActive]} onPress={() => setFilter('all')}>
                <Text style={[styles.tabText, filter === 'all' && styles.tabTextActive]}>Historial Completo</Text>
            </TouchableOpacity>
        </View>

        {loading ? (
            <ActivityIndicator size="large" color="#10b981" style={{marginTop: 50}} />
        ) : (
            <FlatList
                data={displayedFines}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={{ paddingBottom: 50 }}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="folder-open-outline" size={48} color="#cbd5e1" />
                        <Text style={{color:'#94a3b8', marginTop:10}}>No hay multas aquí</Text>
                    </View>
                }
            />
        )}

        {/* --- MODAL PERSONALIZADO (POPUP) --- */}
        <Modal
            animationType="fade"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <View style={styles.modalIconBg}>
                            <Ionicons name="wallet" size={28} color="#3b82f6" />
                        </View>
                    </View>
                    
                    <Text style={styles.modalTitle}>Confirmar Pago</Text>
                    
                    <Text style={styles.modalText}>
                        Estás a punto de registrar el pago de la multa para el vehículo <Text style={{fontWeight:'bold'}}>{selectedFine?.vehicle?.name}</Text>.
                    </Text>

                    <View style={styles.amountContainer}>
                         <Text style={styles.amountLabel}>Monto a pagar</Text>
                         <Text style={styles.amountValue}>
                             {selectedFine ? formatCurrency(selectedFine.amount) : '$0.00'}
                         </Text>
                    </View>

                    <View style={styles.infoBox}>
                         <Ionicons name="information-circle-outline" size={20} color="#64748b" />
                         <Text style={styles.infoText}>Esta acción generará un gasto automáticamente en tus reportes financieros.</Text>
                    </View>

                    <View style={styles.modalActions}>
                        <TouchableOpacity 
                            style={styles.modalBtnCancel} 
                            onPress={() => setModalVisible(false)}
                            disabled={isProcessing}
                        >
                            <Text style={styles.modalBtnCancelText}>Cancelar</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.modalBtnConfirm} 
                            onPress={handleConfirmPayment}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Text style={styles.modalBtnConfirmText}>Confirmar Pago</Text>
                                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>

        <SuccessToast 
            visible={showToast} 
            message="Pago registrado exitosamente" 
            onHide={() => setShowToast(false)} 
        />
      </View>
    </MainLayout>
  );
}
const SuccessToast = ({ visible, message, onHide }: { visible: boolean, message: string, onHide: () => void }) => {
    const opacity = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (visible) {
            Animated.timing(opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();

            const timer = setTimeout(() => {
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }).start(() => onHide());
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Animated.View style={[styles.toastContainer, { opacity }]}>
            <View style={styles.toastContent}>
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.toastText}>{message}</Text>
            </View>
        </Animated.View>
    );
};
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#64748b' },
  summaryBox: { alignItems: 'flex-end' },
  summaryLabel: { fontSize: 12, color: '#64748b', textTransform:'uppercase' },
  summaryAmount: { fontSize: 24, fontWeight: 'bold', color: '#ef4444' },
  
  tabs: { flexDirection: 'row', marginBottom: 15, backgroundColor: '#e2e8f0', borderRadius: 8, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, elevation: 1 },
  tabText: { fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#0f172a' },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  iconBox: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  bgRed: { backgroundColor: '#ef4444' },
  bgGreen: { backgroundColor: '#10b981' },
  plate: { fontWeight: 'bold', fontSize: 16, color: '#1e293b' },
  vehicleName: { fontSize: 12, color: '#64748b' },
  amount: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  cardBody: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  desc: { fontSize: 14, color: '#334155', marginBottom: 8, fontWeight: '500' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  metaLabel: { fontSize: 12, color: '#94a3b8' },
  metaValue: { fontSize: 12, color: '#475569', fontWeight: '600' },
  cardFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  payBtn: { flexDirection: 'row', backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, alignItems: 'center', gap: 6 },
  payText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  empty: { alignItems: 'center', marginTop: 50 },

  // --- ESTILOS DEL MODAL (NUEVOS) ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)', // Fondo oscuro transparente
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400, // Límite para que no se vea gigante en PC
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 10,
  },
  modalHeader: { marginBottom: 16 },
  modalIconBg: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#eff6ff', justifyContent:'center', alignItems:'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 },
  modalText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  
  amountContainer: { alignItems:'center', marginBottom: 20 },
  amountLabel: { fontSize: 12, color: '#94a3b8', textTransform:'uppercase', letterSpacing: 1 },
  amountValue: { fontSize: 32, fontWeight: 'bold', color: '#1e293b' },

  infoBox: { flexDirection:'row', backgroundColor:'#f8fafc', padding: 12, borderRadius: 8, marginBottom: 24, gap: 10, alignItems:'center' },
  infoText: { flex:1, fontSize: 12, color: '#64748b' },

  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtnCancel: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center' },
  modalBtnCancelText: { color: '#64748b', fontWeight: '600' },
  modalBtnConfirm: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#3b82f6', flexDirection:'row', justifyContent:'center', alignItems:'center', gap:8 },
  modalBtnConfirmText: { color: '#fff', fontWeight: 'bold' },

  toastContainer: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 9999,
  },
  toastContent: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    gap: 10,
  },
  toastText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});