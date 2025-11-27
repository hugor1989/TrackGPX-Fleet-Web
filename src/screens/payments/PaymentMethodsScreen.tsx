// src/screens/payments/PaymentMethodsScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import paymentService, { PaymentMethod } from '../../api/paymentService';

export default function PaymentMethodsScreen() {
  const navigation = useNavigation();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const data = await paymentService.getPaymentMethods();
      setPaymentMethods(data);
    } catch (error: any) {
      Alert.alert('Error', 'No se pudieron cargar los métodos de pago');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (cardId: string) => {
    Alert.alert(
      'Eliminar tarjeta',
      '¿Estás seguro de que deseas eliminar esta tarjeta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => confirmDelete(cardId),
        },
      ]
    );
  };

  const confirmDelete = async (cardId: string) => {
    setDeletingId(cardId);
    try {
      await paymentService.deletePaymentMethod(cardId);
      setPaymentMethods(prev => prev.filter(m => m.id !== cardId));
      Alert.alert('Éxito', 'Tarjeta eliminada correctamente');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo eliminar la tarjeta');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (cardId: string) => {
    try {
      await paymentService.setDefaultPaymentMethod(cardId);
      await loadPaymentMethods();
      Alert.alert('Éxito', 'Tarjeta predeterminada actualizada');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo actualizar');
    }
  };

  const getCardIcon = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'visa':
        return 'card';
      case 'mastercard':
        return 'card-outline';
      case 'amex':
        return 'card';
      default:
        return 'card-outline';
    }
  };

  const getCardColor = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'visa':
        return '#1434CB';
      case 'mastercard':
        return '#EB001B';
      case 'amex':
        return '#006FCF';
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#226bfc" />
        <Text style={styles.loadingText}>Cargando métodos de pago...</Text>
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
        <Text style={styles.headerTitle}>Métodos de Pago</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddPayment' as never)}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={32} color="#27ae60" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Seguridad garantizada</Text>
            <Text style={styles.infoText}>
              Tus datos están protegidos con encriptación de grado bancario
            </Text>
          </View>
        </View>

        {/* Payment Methods List */}
        {paymentMethods.length > 0 ? (
          <View style={styles.cardsList}>
            <Text style={styles.sectionTitle}>Tarjetas guardadas</Text>
            
            {paymentMethods.map((method) => (
              <View key={method.id} style={styles.cardItem}>
                <View style={[styles.cardIconContainer, { backgroundColor: getCardColor(method.card.brand) }]}>
                  <Ionicons name={getCardIcon(method.card.brand)} size={28} color="#fff" />
                </View>

                <View style={styles.cardInfo}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardBrand}>
                      {method.card.brand.toUpperCase()}
                    </Text>
                    {method.is_default && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Predeterminada</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardNumber}>•••• •••• •••• {method.card.last4}</Text>
                  <Text style={styles.cardExpiry}>
                    Vence {method.card.exp_month.toString().padStart(2, '0')}/{method.card.exp_year}
                  </Text>
                  <Text style={styles.cardHolder}>{method.card.holder_name}</Text>
                </View>

                <View style={styles.cardActions}>
                  {!method.is_default && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleSetDefault(method.id)}
                    >
                      <Ionicons name="star-outline" size={20} color="#226bfc" />
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDelete(method.id)}
                    disabled={deletingId === method.id}
                  >
                    {deletingId === method.id ? (
                      <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                      <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="card-outline" size={64} color="#d1d5db" />
            </View>
            <Text style={styles.emptyTitle}>No hay tarjetas guardadas</Text>
            <Text style={styles.emptyText}>
              Agrega una tarjeta para realizar pagos de forma rápida y segura
            </Text>
          </View>
        )}

        {/* Add Card Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddPayment' as never)}
        >
          <Ionicons name="add-circle-outline" size={24} color="#226bfc" />
          <Text style={styles.addButtonText}>Agregar nueva tarjeta</Text>
        </TouchableOpacity>

        {/* Security Info */}
        <View style={styles.securitySection}>
          <Text style={styles.securityTitle}>Tu información está segura</Text>
          <View style={styles.securityFeature}>
            <Ionicons name="lock-closed" size={20} color="#6b7280" />
            <Text style={styles.securityText}>Encriptación SSL de 256 bits</Text>
          </View>
          <View style={styles.securityFeature}>
            <Ionicons name="shield" size={20} color="#6b7280" />
            <Text style={styles.securityText}>Certificación PCI DSS</Text>
          </View>
          <View style={styles.securityFeature}>
            <Ionicons name="eye-off" size={20} color="#6b7280" />
            <Text style={styles.securityText}>
              No almacenamos tu CVV ni datos completos
            </Text>
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#dcfce7',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#27ae60',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
  },
  cardsList: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  cardItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    gap: 12,
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardBrand: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  defaultBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1e40af',
  },
  cardNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  cardExpiry: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  cardHolder: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
  },
  cardActions: {
    justifyContent: 'center',
    gap: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#226bfc',
    borderStyle: 'dashed',
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#226bfc',
  },
  securitySection: {
    marginHorizontal: 20,
    marginTop: 32,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  securityFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  securityText: {
    flex: 1,
    fontSize: 14,
    color: '#6b7280',
  },
});