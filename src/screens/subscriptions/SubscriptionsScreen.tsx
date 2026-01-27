import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MainLayout from '../../layouts/MainLayout';
import subscriptionService, { Subscription, SubscriptionStats } from '../../api/subscriptionService';

export default function SubscriptionsScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  
  // Nuevo: Filtro de estado
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all');

  const loadData = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      const [subs, statistics] = await Promise.all([
        subscriptionService.getSubscriptions(),
        subscriptionService.getSubscriptionStats(),
      ]);
      setSubscriptions(subs);
      setStats(statistics);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCancel = (sub: Subscription) => {
    Alert.alert(
      'Cancelar Renovación',
      `¿Deseas cancelar la renovación automática para ${sub.device?.vehicle?.name || 'el dispositivo'}?`,
      [
        { text: 'Mantener', style: 'cancel' },
        {
          text: 'Sí, Cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await subscriptionService.cancelSubscription(sub.id);
              Alert.alert('Suscripción cancelada', 'El servicio continuará hasta la fecha de vencimiento.');
              loadData();
            } catch (err: any) {
              Alert.alert('Error', err.message);
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleReactivate = async (sub: Subscription) => {
    try {
      setLoading(true);
      await subscriptionService.reactivateSubscription(sub.id);
      Alert.alert('¡Excelente!', 'Suscripción reactivada correctamente.');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message);
      setLoading(false);
    }
  };

  // Filtrado lógico
  const filteredSubs = useMemo(() => {
    if (filter === 'all') return subscriptions;
    if (filter === 'active') return subscriptions.filter(s => s.status === 'active' || s.status === 'trial');
    if (filter === 'expired') return subscriptions.filter(s => s.status === 'expired' || s.status === 'canceled');
    return subscriptions;
  }, [subscriptions, filter]);

  return (
    <MainLayout activeMenu="Config-Suscripciones"> {/* O el ID que uses en tu menú */}
      <View style={styles.container}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.pageTitle}>Suscripciones</Text>
            <Text style={styles.pageSubtitle}>Gestiona tus planes y facturación</Text>
          </View>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('DevicesList' as never)} // Mejor ir a lista de dispositivos para activar uno específico
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Nueva Suscripción</Text>
          </TouchableOpacity>
        </View>

        {/* STATS */}
        {stats && (
          <View style={styles.statsRow}>
            <StatCard 
              label="Costo Mensual" 
              value={subscriptionService.formatPrice(stats.total_monthly_cost)} 
              icon="wallet" 
              color="#10b981" 
              bg="#ecfdf5" 
            />
            <StatCard 
              label="Activas" 
              value={stats.active} 
              icon="checkmark-circle" 
              color="#226bfc" 
              bg="#eff6ff" 
            />
            <StatCard 
              label="Total Dispositivos" 
              value={stats.total} 
              icon="hardware-chip" 
              color="#6366f1" 
              bg="#e0e7ff" 
            />
          </View>
        )}

        {/* FILTROS */}
        <View style={styles.filterContainer}>
          <FilterTab label="Todas" active={filter === 'all'} onPress={() => setFilter('all')} />
          <FilterTab label="Activas" active={filter === 'active'} onPress={() => setFilter('active')} />
          <FilterTab label="Vencidas / Canceladas" active={filter === 'expired'} onPress={() => setFilter('expired')} />
        </View>

        {/* LISTA */}
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#226bfc" style={{marginTop: 40}} />
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          >
            {filteredSubs.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyTitle}>No hay suscripciones en esta categoría</Text>
              </View>
            ) : (
              <View style={isDesktop ? styles.grid : styles.list}>
                {filteredSubs.map((sub) => (
                  <SubscriptionCard
                    key={sub.id}
                    sub={sub}
                    onCancel={() => handleCancel(sub)}
                    onReactivate={() => handleReactivate(sub)}
                    isDesktop={isDesktop}
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
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  </View>
);

const FilterTab = ({ label, active, onPress }: any) => (
  <TouchableOpacity style={[styles.filterTab, active && styles.filterTabActive]} onPress={onPress}>
    <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const SubscriptionCard = ({ sub, onCancel, onReactivate, isDesktop }: any) => {
  const daysRemaining = subscriptionService.getDaysRemaining(sub.end_date);
  const isDanger = daysRemaining <= 5 && sub.status === 'active';
  const isActive = sub.status === 'active' || sub.status === 'trial';

  // Barra de progreso de tiempo (visual)
  const progressPercent = Math.max(0, Math.min(100, (daysRemaining / 30) * 100)); // Asumiendo ciclo mensual

  return (
    <View style={[styles.card, isDesktop && styles.cardDesktop]}>
      {/* Header Card */}
      <View style={styles.cardHeader}>
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleName}>
            {sub.device?.vehicle?.name || 'Vehículo Sin Nombre'}
          </Text>
          <Text style={styles.deviceImei}>IMEI: {sub.device?.imei}</Text>
        </View>
        <View style={[styles.badge, isActive ? styles.bgSuccess : styles.bgGray]}>
          <Text style={[styles.badgeText, isActive ? styles.textSuccess : styles.textGray]}>
            {isActive ? 'ACTIVO' : sub.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Plan Details */}
      <View style={styles.detailsRow}>
        <View>
          <Text style={styles.detailLabel}>Plan Contratado</Text>
          <Text style={styles.detailValue}>{sub.plan?.name || 'Básico'}</Text>
        </View>
        <View style={{alignItems: 'flex-end'}}>
          <Text style={styles.detailLabel}>Precio</Text>
          <Text style={styles.priceValue}>
            {subscriptionService.formatPrice(Number(sub.plan?.price))}
            <Text style={styles.priceCycle}>/mes</Text>
          </Text>
        </View>
      </View>

      {/* Time Progress */}
      {isActive && (
        <View style={styles.progressContainer}>
          <View style={styles.progressLabels}>
            <Text style={[styles.daysText, isDanger && {color: '#dc2626'}]}>
              {daysRemaining} días restantes
            </Text>
            <Text style={styles.dateText}>Vence: {subscriptionService.formatDate(sub.end_date)}</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${progressPercent}%`, backgroundColor: isDanger ? '#ef4444' : '#226bfc' }
              ]} 
            />
          </View>
        </View>
      )}

      {!isActive && (
        <View style={styles.expiredContainer}>
          <Ionicons name="alert-circle-outline" size={16} color="#6b7280" />
          <Text style={styles.expiredText}>
            Venció el {subscriptionService.formatDate(sub.end_date)}
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.cardFooter}>
        <View style={styles.autoRenewBox}>
          <Ionicons 
            name={sub.auto_renew ? "checkmark-circle" : "close-circle"} 
            size={16} 
            color={sub.auto_renew ? "#10b981" : "#9ca3af"} 
          />
          <Text style={styles.autoRenewText}>Auto-renovación</Text>
        </View>

        {isActive ? (
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.reactivateBtn} onPress={onReactivate}>
            <Text style={styles.reactivateBtnText}>Reactivar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  
  // Header
  header: {
    padding: 20, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#1f2937' },
  pageSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  addButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#226bfc', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8
  },
  addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  // Stats
  statsRow: { flexDirection: 'row', padding: 20, paddingBottom: 0, gap: 12 },
  statCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  statLabel: { fontSize: 12, color: '#6b7280' },

  // Filter
  filterContainer: {
    flexDirection: 'row', margin: 20, marginBottom: 10,
    backgroundColor: '#e5e7eb', borderRadius: 8, padding: 4
  },
  filterTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  filterTabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  filterText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  filterTextActive: { color: '#226bfc' },

  // List
  listContent: { padding: 20, paddingBottom: 80 },
  list: { gap: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { color: '#9ca3af', fontSize: 16, marginTop: 12 },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1
  },
  cardDesktop: { width: '48%' },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  vehicleInfo: { flex: 1 },
  vehicleName: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  deviceImei: { fontSize: 12, color: '#6b7280', marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  bgSuccess: { backgroundColor: '#dcfce7' },
  textSuccess: { color: '#166534' },
  bgGray: { backgroundColor: '#f3f4f6' },
  textGray: { color: '#4b5563' },

  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 12 },

  detailsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 12, color: '#6b7280' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 2 },
  priceValue: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  priceCycle: { fontSize: 12, fontWeight: '400', color: '#6b7280' },

  // Progress Bar
  progressContainer: { marginTop: 16 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  daysText: { fontSize: 12, fontWeight: '600', color: '#226bfc' },
  dateText: { fontSize: 12, color: '#6b7280' },
  progressBarBg: { height: 6, backgroundColor: '#eff6ff', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },

  expiredContainer: { marginTop: 16, flexDirection: 'row', gap: 6, alignItems: 'center' },
  expiredText: { fontSize: 13, color: '#6b7280', fontStyle: 'italic' },

  // Footer Actions
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f9fafb' },
  autoRenewBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  autoRenewText: { fontSize: 12, color: '#6b7280' },
  
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: '#fef2f2' },
  cancelBtnText: { fontSize: 12, fontWeight: '600', color: '#dc2626' },
  reactivateBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: '#eff6ff' },
  reactivateBtnText: { fontSize: 12, fontWeight: '600', color: '#226bfc' },
});