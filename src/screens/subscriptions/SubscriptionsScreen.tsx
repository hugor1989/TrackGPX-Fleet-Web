// src/screens/subscriptions/SubscriptionsScreen.tsx

import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import subscriptionService, { Subscription, SubscriptionStats } from '../../api/subscriptionService';

export default function SubscriptionsScreen() {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [subs, statistics] = await Promise.all([
        subscriptionService.getSubscriptions(),
        subscriptionService.getSubscriptionStats(),
      ]);
      
      setSubscriptions(subs);
      setStats(statistics);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSubscriptions();
    setRefreshing(false);
  };

  const handleCancelSubscription = (subscription: Subscription) => {
    Alert.alert(
      'Cancelar Suscripción',
      `¿Estás seguro de cancelar la suscripción del dispositivo ${subscription.device?.imei || subscription.device_id}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, Cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await subscriptionService.cancelSubscription(subscription.id);
              Alert.alert('Éxito', 'Suscripción cancelada');
              await loadSubscriptions();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const handleReactivate = async (subscription: Subscription) => {
    try {
      await subscriptionService.reactivateSubscription(subscription.id);
      Alert.alert('Éxito', 'Suscripción reactivada');
      await loadSubscriptions();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mis Suscripciones</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#226bfc" />
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
        <Text style={styles.headerTitle}>Mis Suscripciones</Text>
        <TouchableOpacity onPress={handleRefresh}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Stats Cards */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="checkmark-circle" size={24} color="#226bfc" />
              </View>
              <Text style={styles.statValue}>{stats.active}</Text>
              <Text style={styles.statLabel}>Activas</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="calendar" size={24} color="#f59e0b" />
              </View>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#dcfce7' }]}>
                <Ionicons name="cash" size={24} color="#10b981" />
              </View>
              <Text style={styles.statValue}>
                {subscriptionService.formatPrice(stats.total_monthly_cost)}
              </Text>
              <Text style={styles.statLabel}>Mensual</Text>
            </View>
          </View>
        )}

        {/* Subscriptions List */}
        {subscriptions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>Sin suscripciones</Text>
            <Text style={styles.emptyText}>
              Activa un dispositivo GPS para comenzar
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('ActivateDevice' as never)}
            >
              <Ionicons name="add" size={24} color="#fff" />
              <Text style={styles.addButtonText}>Activar Dispositivo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.subscriptionsList}>
            {subscriptions.map((subscription) => (
              <SubscriptionCard
                key={subscription.id}
                subscription={subscription}
                onCancel={handleCancelSubscription}
                onReactivate={handleReactivate}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Card de suscripción individual
function SubscriptionCard({
  subscription,
  onCancel,
  onReactivate,
}: {
  subscription: Subscription;
  onCancel: (sub: Subscription) => void;
  onReactivate: (sub: Subscription) => void;
}) {
  const daysRemaining = subscriptionService.getDaysRemaining(subscription.end_date);
  const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Ionicons name="hardware-chip-outline" size={24} color="#226bfc" />
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>
              IMEI: {subscription.device?.imei || subscription.device_id}
            </Text>
            {subscription.device?.vehicle && (
              <Text style={styles.cardSubtitle}>
                {subscription.device.vehicle.name}
                {subscription.device.vehicle.plates && ` • ${subscription.device.vehicle.plates}`}
              </Text>
            )}
          </View>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: subscriptionService.getStatusBackground(subscription.status),
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: subscriptionService.getStatusColor(subscription.status) },
            ]}
          >
            {subscriptionService.getStatusLabel(subscription.status)}
          </Text>
        </View>
      </View>

      {/* Plan Info */}
      {subscription.plan && (
        <View style={styles.planInfo}>
          <View style={styles.planRow}>
            <Text style={styles.planLabel}>Plan</Text>
            <Text style={styles.planValue}>{subscription.plan.name}</Text>
          </View>
          <View style={styles.planRow}>
            <Text style={styles.planLabel}>Precio</Text>
            <Text style={styles.planValue}>
              {subscriptionService.formatPrice(parseFloat(subscription.plan.price))}
              <Text style={styles.planCycle}>
                {' '}/ {subscription.plan.interval === 'month' ? 'mes' : 'año'}
              </Text>
            </Text>
          </View>
        </View>
      )}

      {/* Dates */}
      <View style={styles.datesContainer}>
        <View style={styles.dateItem}>
          <Ionicons name="calendar-outline" size={16} color="#6b7280" />
          <Text style={styles.dateLabel}>Inicio:</Text>
          <Text style={styles.dateValue}>
            {subscriptionService.formatDate(subscription.start_date)}
          </Text>
        </View>

        <View style={styles.dateItem}>
          <Ionicons name="calendar-outline" size={16} color="#6b7280" />
          <Text style={styles.dateLabel}>Vence:</Text>
          <Text style={styles.dateValue}>
            {subscriptionService.formatDate(subscription.end_date)}
          </Text>
        </View>
      </View>

      {/* Warning si está por vencer */}
      {subscription.is_active && isExpiringSoon && (
        <View style={styles.warningBox}>
          <Ionicons name="warning" size={16} color="#f59e0b" />
          <Text style={styles.warningText}>
            Vence en {daysRemaining} {daysRemaining === 1 ? 'día' : 'días'}
          </Text>
        </View>
      )}

      {/* Auto-renovación */}
      <View style={styles.autoRenewRow}>
        <View style={styles.autoRenewInfo}>
          <Ionicons
            name={subscription.auto_renew ? 'repeat' : 'ban'}
            size={16}
            color={subscription.auto_renew ? '#10b981' : '#6b7280'}
          />
          <Text style={styles.autoRenewText}>
            {subscription.auto_renew ? 'Renovación automática' : 'Sin renovación automática'}
          </Text>
        </View>
        {subscription.next_billing_date && subscription.auto_renew && (
          <Text style={styles.nextBillingText}>
            Próximo cobro: {subscriptionService.formatDate(subscription.next_billing_date)}
          </Text>
        )}
      </View>

      {/* Actions */}
      <View style={styles.cardActions}>
        {subscription.is_active ? (
          <>
            <TouchableOpacity
              style={styles.actionButtonOutline}
              onPress={() => onCancel(subscription)}
            >
              <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
              <Text style={styles.actionButtonOutlineText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButtonPrimary}>
              <Ionicons name="card-outline" size={18} color="#fff" />
              <Text style={styles.actionButtonPrimaryText}>Cambiar Plan</Text>
            </TouchableOpacity>
          </>
        ) : subscription.is_canceled ? (
          <TouchableOpacity
            style={[styles.actionButtonPrimary, { flex: 1 }]}
            onPress={() => onReactivate(subscription)}
          >
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.actionButtonPrimaryText}>Reactivar</Text>
          </TouchableOpacity>
        ) : null}
      </View>
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  contentContainer: { padding: 20 },
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
  statsContainer: { flexDirection: 'row', marginBottom: 20, gap: 12 },
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
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#226bfc',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 24,
    gap: 8,
  },
  addButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  subscriptionsList: { gap: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  cardSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  statusBadge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  planInfo: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planLabel: { fontSize: 14, color: '#6b7280' },
  planValue: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  planCycle: { fontSize: 12, fontWeight: '400', color: '#6b7280' },
  datesContainer: { marginBottom: 16, gap: 8 },
  dateItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateLabel: { fontSize: 14, color: '#6b7280' },
  dateValue: { fontSize: 14, color: '#1f2937' },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  warningText: { fontSize: 13, color: '#92400e', fontWeight: '500' },
  autoRenewRow: { marginBottom: 16 },
  autoRenewInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  autoRenewText: { fontSize: 13, color: '#6b7280' },
  nextBillingText: { fontSize: 12, color: '#9ca3af', marginLeft: 24 },
  cardActions: { flexDirection: 'row', gap: 12 },
  actionButtonOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  actionButtonOutlineText: { fontSize: 14, fontWeight: '600', color: '#ef4444' },
  actionButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#226bfc',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  actionButtonPrimaryText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});