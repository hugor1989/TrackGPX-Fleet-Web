// src/screens/billing/BillingInfoScreen.tsx

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
import { Picker } from '@react-native-picker/picker';
import billingInfoService, {
  BillingInfo,
  CreateBillingInfoRequest,
  FISCAL_REGIMES,
  CFDI_USES,
  MEXICAN_STATES,
} from '../../api/billingInfoService';

export default function BillingInfoScreen() {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [formData, setFormData] = useState<CreateBillingInfoRequest>({
    rfc: '',
    legal_name: '',
    fiscal_regime: '601',
    tax_regime: 'Persona Moral',
    postal_code: '',
    email_for_invoices: '',
    phone: '',
    street: '',
    exterior_number: '',
    interior_number: '',
    neighborhood: '',
    city: '',
    state: '',
    country: 'México',
    cfdi_use: 'G03',
  });

  useEffect(() => {
    loadBillingInfo();
  }, []);

  const loadBillingInfo = async () => {
    try {
      setLoading(true);
      const data = await billingInfoService.getBillingInfo();
      
      if (data) {
        setBillingInfo(data);
        setFormData({
          rfc: data.rfc,
          legal_name: data.legal_name,
          fiscal_regime: data.fiscal_regime,
          tax_regime: data.tax_regime,
          postal_code: data.postal_code,
          email_for_invoices: data.email_for_invoices,
          phone: data.phone,
          street: data.street,
          exterior_number: data.exterior_number,
          interior_number: data.interior_number || '',
          neighborhood: data.neighborhood,
          city: data.city,
          state: data.state,
          country: data.country,
          cfdi_use: data.cfdi_use,
        });
      } else {
        // No hay datos fiscales, activar modo edición
        setIsEditing(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setError('');

    // Validaciones
    if (!formData.rfc?.trim()) {
      setError('El RFC es requerido');
      return;
    }

    if (!billingInfoService.validateRFC(formData.rfc)) {
      setError('RFC inválido');
      return;
    }

    if (!formData.legal_name?.trim()) {
      setError('La razón social es requerida');
      return;
    }

    if (!formData.postal_code || !billingInfoService.validatePostalCode(formData.postal_code)) {
      setError('Código postal inválido (5 dígitos)');
      return;
    }

    if (!formData.email_for_invoices || !billingInfoService.validateEmail(formData.email_for_invoices)) {
      setError('Email inválido');
      return;
    }

    if (!formData.street?.trim() || !formData.exterior_number?.trim()) {
      setError('Dirección incompleta');
      return;
    }

    if (!formData.neighborhood?.trim() || !formData.city?.trim() || !formData.state?.trim()) {
      setError('Información de ubicación incompleta');
      return;
    }

    try {
      setSaving(true);
      
      if (billingInfo?.id) {
        // Actualizar
        const updated = await billingInfoService.updateBillingInfo(billingInfo.id, formData);
        setBillingInfo(updated);
      } else {
        // Crear
        const created = await billingInfoService.createBillingInfo(formData);
        setBillingInfo(created);
      }
      
      setIsEditing(false);
      Alert.alert('Éxito', 'Datos fiscales guardados correctamente');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (billingInfo) {
      setFormData({
        rfc: billingInfo.rfc,
        legal_name: billingInfo.legal_name,
        fiscal_regime: billingInfo.fiscal_regime,
        tax_regime: billingInfo.tax_regime,
        postal_code: billingInfo.postal_code,
        email_for_invoices: billingInfo.email_for_invoices,
        phone: billingInfo.phone,
        street: billingInfo.street,
        exterior_number: billingInfo.exterior_number,
        interior_number: billingInfo.interior_number || '',
        neighborhood: billingInfo.neighborhood,
        city: billingInfo.city,
        state: billingInfo.state,
        country: billingInfo.country,
        cfdi_use: billingInfo.cfdi_use,
      });
      setIsEditing(false);
    }
    setError('');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Datos Fiscales</Text>
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
        <Text style={styles.headerTitle}>Datos Fiscales</Text>
        {!isEditing && billingInfo ? (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Ionicons name="pencil" size={24} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {!billingInfo && !isEditing ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>Sin datos fiscales</Text>
            <Text style={styles.emptyText}>
              Agrega tu información fiscal para poder emitir facturas
            </Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setIsEditing(true)}>
              <Ionicons name="add" size={24} color="#fff" />
              <Text style={styles.addButtonText}>Agregar Datos Fiscales</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            {/* Información Fiscal */}
            <Text style={styles.sectionTitle}>Información Fiscal</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>RFC *</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.rfc}
                onChangeText={(text) => setFormData({ ...formData, rfc: billingInfoService.formatRFC(text) })}
                editable={isEditing}
                placeholder="RFC (12-13 caracteres)"
                autoCapitalize="characters"
                maxLength={13}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Razón Social *</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.legal_name}
                onChangeText={(text) => setFormData({ ...formData, legal_name: text })}
                editable={isEditing}
                placeholder="Nombre legal de la empresa"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Régimen Fiscal *</Text>
              {isEditing ? (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.fiscal_regime}
                    onValueChange={(value) => setFormData({ ...formData, fiscal_regime: value })}
                    style={styles.picker}
                  >
                    {FISCAL_REGIMES.map((regime) => (
                      <Picker.Item
                        key={regime.code}
                        label={`${regime.code} - ${regime.name}`}
                        value={regime.code}
                      />
                    ))}
                  </Picker>
                </View>
              ) : (
                <Text style={styles.inputDisabled}>
                  {billingInfoService.getFiscalRegimeName(formData.fiscal_regime)}
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tipo de Régimen</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.tax_regime}
                onChangeText={(text) => setFormData({ ...formData, tax_regime: text })}
                editable={isEditing}
                placeholder="Ej: Persona Moral"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Uso de CFDI *</Text>
              {isEditing ? (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.cfdi_use}
                    onValueChange={(value) => setFormData({ ...formData, cfdi_use: value })}
                    style={styles.picker}
                  >
                    {CFDI_USES.map((use) => (
                      <Picker.Item
                        key={use.code}
                        label={`${use.code} - ${use.name}`}
                        value={use.code}
                      />
                    ))}
                  </Picker>
                </View>
              ) : (
                <Text style={styles.inputDisabled}>
                  {billingInfoService.getCFDIUseName(formData.cfdi_use)}
                </Text>
              )}
            </View>

            {/* Dirección Fiscal */}
            <Text style={styles.sectionTitle}>Dirección Fiscal</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Calle *</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.street}
                onChangeText={(text) => setFormData({ ...formData, street: text })}
                editable={isEditing}
                placeholder="Nombre de la calle"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Número Exterior *</Text>
                <TextInput
                  style={[styles.input, !isEditing && styles.inputDisabled]}
                  value={formData.exterior_number}
                  onChangeText={(text) => setFormData({ ...formData, exterior_number: text })}
                  editable={isEditing}
                  placeholder="123"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Número Interior</Text>
                <TextInput
                  style={[styles.input, !isEditing && styles.inputDisabled]}
                  value={formData.interior_number}
                  onChangeText={(text) => setFormData({ ...formData, interior_number: text })}
                  editable={isEditing}
                  placeholder="A (opcional)"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Colonia *</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.neighborhood}
                onChangeText={(text) => setFormData({ ...formData, neighborhood: text })}
                editable={isEditing}
                placeholder="Nombre de la colonia"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Ciudad *</Text>
                <TextInput
                  style={[styles.input, !isEditing && styles.inputDisabled]}
                  value={formData.city}
                  onChangeText={(text) => setFormData({ ...formData, city: text })}
                  editable={isEditing}
                  placeholder="Ciudad"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Código Postal *</Text>
                <TextInput
                  style={[styles.input, !isEditing && styles.inputDisabled]}
                  value={formData.postal_code}
                  onChangeText={(text) => setFormData({ ...formData, postal_code: text })}
                  editable={isEditing}
                  placeholder="01000"
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Estado *</Text>
              {isEditing ? (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.state}
                    onValueChange={(value) => setFormData({ ...formData, state: value })}
                    style={styles.picker}
                  >
                    <Picker.Item label="Seleccionar estado..." value="" />
                    {MEXICAN_STATES.map((state) => (
                      <Picker.Item key={state} label={state} value={state} />
                    ))}
                  </Picker>
                </View>
              ) : (
                <Text style={styles.inputDisabled}>{formData.state}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>País *</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={formData.country}
                editable={false}
              />
            </View>

            {/* Contacto */}
            <Text style={styles.sectionTitle}>Contacto para Facturación</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.email_for_invoices}
                onChangeText={(text) => setFormData({ ...formData, email_for_invoices: text.toLowerCase() })}
                editable={isEditing}
                placeholder="facturacion@empresa.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.hint}>Las facturas se enviarán a este correo</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Teléfono</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                editable={isEditing}
                placeholder="5512345678"
                keyboardType="phone-pad"
              />
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {isEditing && (
              <View style={styles.buttonRow}>
                {billingInfo && (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancel}
                    disabled={saving}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.buttonDisabled, !billingInfo && { flex: 1 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="#fff" />
                      <Text style={styles.saveButtonText}>
                        {billingInfo ? 'Guardar Cambios' : 'Crear Datos Fiscales'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  contentContainer: { padding: 20 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
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
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 24,
    marginBottom: 16,
  },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#fff',
  },
  inputDisabled: { backgroundColor: '#f3f4f6', color: '#6b7280', padding: 12, borderRadius: 12 },
  hint: { fontSize: 12, color: '#9ca3af', marginTop: 4, fontStyle: 'italic' },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: { height: 50 },
  row: { flexDirection: 'row', marginHorizontal: -8 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  errorText: { flex: 1, fontSize: 14, color: '#991b1b' },
  buttonRow: { flexDirection: 'row', marginTop: 24, gap: 12 },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#226bfc',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  buttonDisabled: { opacity: 0.5 },
});