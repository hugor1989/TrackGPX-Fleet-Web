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
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import MainLayout from '../../layouts/MainLayout';
import billingInfoService, {
  BillingInfo,
  CreateBillingInfoRequest,
  FISCAL_REGIMES,
  CFDI_USES,
  MEXICAN_STATES,
} from '../../api/billingInfoService';
// Si usas Expo Document Picker
// import * as DocumentPicker from 'expo-document-picker';

export default function BillingInfoScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Estado del formulario
  const [formData, setFormData] = useState<CreateBillingInfoRequest>({
    rfc: '',
    legal_name: '',
    fiscal_regime: '601',
    tax_regime: '', // Este es el campo que daba error
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

  // Efecto para auto-llenar el nombre del régimen (tax_regime) cuando cambia el código
  useEffect(() => {
    const regimeName = billingInfoService.getFiscalRegimeName(formData.fiscal_regime);
    setFormData(prev => ({ ...prev, tax_regime: regimeName }));
  }, [formData.fiscal_regime]);

  const loadBillingInfo = async () => {
    try {
      setLoading(true);
      const data = await billingInfoService.getBillingInfo();
      
      if (data && data.id) {
        setBillingInfo(data);
        fillForm(data);
      } else {
        setBillingInfo(null);
        setIsEditing(true);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fillForm = (data: BillingInfo) => {
    setFormData({
      rfc: data.rfc || '',
      legal_name: data.legal_name || '',
      fiscal_regime: data.fiscal_regime || '601',
      tax_regime: data.tax_regime || '',
      postal_code: data.postal_code || '',
      email_for_invoices: data.email_for_invoices || '',
      phone: data.phone || '',
      street: data.street || '',
      exterior_number: data.exterior_number || '',
      interior_number: data.interior_number || '',
      neighborhood: data.neighborhood || '',
      city: data.city || '',
      state: data.state || '',
      country: data.country || 'México',
      cfdi_use: data.cfdi_use || 'G03',
    });
  };

  const handleSave = async () => {
    // 1. Validaciones
    if (!formData.rfc?.trim() || !formData.legal_name?.trim()) {
      Alert.alert('Datos incompletos', 'RFC y Razón Social son obligatorios.');
      return;
    }

    // 2. Corrección del BUG: Asegurar que tax_regime no vaya nulo
    const finalData = {
      ...formData,
      tax_regime: formData.tax_regime || billingInfoService.getFiscalRegimeName(formData.fiscal_regime) || 'No especificado',
      phone: formData.phone || '', // Asegurar que no vaya null
      interior_number: formData.interior_number || '',
    };

    try {
      setSaving(true);
      let result;
      if (billingInfo?.id) {
        result = await billingInfoService.updateBillingInfo(billingInfo.id, finalData);
      } else {
        result = await billingInfoService.createBillingInfo(finalData);
      }
      setBillingInfo(result);
      setIsEditing(false);
      Alert.alert('Éxito', 'Información guardada correctamente.');
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error al guardar', err.message || 'Verifica los datos e intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadConstancia = async () => {
    // Aquí iría la lógica de DocumentPicker
    Alert.alert(
      'Cargar Constancia',
      'La función de lectura automática (OCR) requiere un servicio en la nube. Por ahora, puedes ingresar los datos manualmente basándote en tu PDF.',
      [{ text: 'Entendido' }]
    );
  };

  if (loading) {
    return (
      <MainLayout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#226bfc" />
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout activeMenu="Config-DatosFiscales">
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          {/* HEADER SECTION */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.pageTitle}>Facturación</Text>
              <Text style={styles.pageSubtitle}>Administra tus datos fiscales y preferencias</Text>
            </View>
            <View style={styles.headerActions}>
              {!isEditing && billingInfo && (
                <TouchableOpacity style={styles.btnOutline} onPress={() => setIsEditing(true)}>
                  <Ionicons name="create-outline" size={18} color="#374151" />
                  <Text style={styles.btnOutlineText}>Editar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* MAIN CONTENT GRID */}
          <View style={[styles.gridContainer, isDesktop && styles.gridDesktop]}>
            
            {/* LEFT COLUMN: IDENTITY & FILE */}
            <View style={styles.leftColumn}>
              
              {/* STATUS CARD */}
              <View style={styles.statusCard}>
                <View style={styles.statusIconBg}>
                  <Ionicons 
                    name={billingInfo ? "checkmark-circle" : "alert-circle"} 
                    size={24} 
                    color={billingInfo ? "#10b981" : "#f59e0b"} 
                  />
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.statusTitle}>
                    {billingInfo ? 'Datos Fiscales Completos' : 'Información Pendiente'}
                  </Text>
                  <Text style={styles.statusDesc}>
                    {billingInfo ? 'Tu cuenta está lista para emitir facturas.' : 'Completa tu información para facturar.'}
                  </Text>
                </View>
              </View>

              {/* UPLOAD BOX (Simulado) */}
              {isEditing && (
                <TouchableOpacity style={styles.uploadBox} onPress={handleUploadConstancia}>
                  <Ionicons name="cloud-upload-outline" size={32} color="#226bfc" />
                  <Text style={styles.uploadTitle}>Subir Constancia de Situación Fiscal</Text>
                  <Text style={styles.uploadDesc}>PDF o JPG (Max 5MB)</Text>
                </TouchableOpacity>
              )}

              {/* IDENTITY FORM */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Identidad Fiscal</Text>
                
                <View style={styles.formGroup}>
                  <InputLabel label="RFC" required />
                  <TextInput 
                    style={[styles.input, !isEditing && styles.inputDisabled]}
                    value={formData.rfc}
                    onChangeText={t => setFormData({...formData, rfc: billingInfoService.formatRFC(t)})}
                    editable={isEditing}
                    maxLength={13}
                    placeholder="XAXX010101000"
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.formGroup}>
                  <InputLabel label="Razón Social" required />
                  <TextInput 
                    style={[styles.input, !isEditing && styles.inputDisabled]}
                    value={formData.legal_name}
                    onChangeText={t => setFormData({...formData, legal_name: t})}
                    editable={isEditing}
                    placeholder="Nombre legal completo"
                  />
                </View>

                <View style={styles.formGroup}>
                  <InputLabel label="Régimen Fiscal" required />
                  {isEditing ? (
                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={formData.fiscal_regime}
                        onValueChange={(v) => setFormData({ ...formData, fiscal_regime: v })}
                        style={styles.picker}
                      >
                        {FISCAL_REGIMES.map((r) => (
                          <Picker.Item key={r.code} label={`${r.code} - ${r.name}`} value={r.code} style={{fontSize: 14}} />
                        ))}
                      </Picker>
                    </View>
                  ) : (
                    <View style={styles.readOnlyField}>
                       <Text style={styles.readOnlyText}>
                        {formData.fiscal_regime} - {billingInfoService.getFiscalRegimeName(formData.fiscal_regime)}
                       </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* RIGHT COLUMN: ADDRESS & CONTACT */}
            <View style={styles.rightColumn}>
              
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Domicilio Fiscal</Text>
                
                <View style={styles.formGroup}>
                  <InputLabel label="Código Postal" required />
                  <TextInput 
                    style={[styles.input, !isEditing && styles.inputDisabled]}
                    value={formData.postal_code}
                    onChangeText={t => setFormData({...formData, postal_code: t})}
                    editable={isEditing}
                    keyboardType="numeric"
                    maxLength={5}
                    placeholder="00000"
                  />
                </View>

                <View style={styles.row}>
                  <View style={{flex: 2, marginRight: 12}}>
                    <InputLabel label="Calle" />
                    <TextInput 
                      style={[styles.input, !isEditing && styles.inputDisabled]}
                      value={formData.street}
                      onChangeText={t => setFormData({...formData, street: t})}
                      editable={isEditing}
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={{flex: 1, marginRight: 12}}>
                    <InputLabel label="Num. Exterior" />
                    <TextInput 
                      style={[styles.input, !isEditing && styles.inputDisabled]}
                      value={formData.exterior_number}
                      onChangeText={t => setFormData({...formData, exterior_number: t})}
                      editable={isEditing}
                    />
                  </View>
                  <View style={{flex: 1}}>
                    <InputLabel label="Num. Interior" />
                    <TextInput 
                      style={[styles.input, !isEditing && styles.inputDisabled]}
                      value={formData.interior_number}
                      onChangeText={t => setFormData({...formData, interior_number: t})}
                      editable={isEditing}
                      placeholder="(Opcional)"
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={{flex: 1, marginRight: 12}}>
                    <InputLabel label="Colonia" />
                    <TextInput 
                      style={[styles.input, !isEditing && styles.inputDisabled]}
                      value={formData.neighborhood}
                      onChangeText={t => setFormData({...formData, neighborhood: t})}
                      editable={isEditing}
                    />
                  </View>
                  <View style={{flex: 1}}>
                    <InputLabel label="Ciudad" />
                    <TextInput 
                      style={[styles.input, !isEditing && styles.inputDisabled]}
                      value={formData.city}
                      onChangeText={t => setFormData({...formData, city: t})}
                      editable={isEditing}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <InputLabel label="Estado" />
                  {isEditing ? (
                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={formData.state}
                        onValueChange={(v) => setFormData({ ...formData, state: v })}
                        style={styles.picker}
                      >
                        <Picker.Item label="Seleccionar Estado" value="" color="#9ca3af" />
                        {MEXICAN_STATES.map((s) => (<Picker.Item key={s} label={s} value={s} />))}
                      </Picker>
                    </View>
                  ) : (
                    <TextInput 
                      style={[styles.input, styles.inputDisabled]}
                      value={formData.state}
                      editable={false}
                    />
                  )}
                </View>
              </View>

              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Preferencias de Facturación</Text>
                
                <View style={styles.formGroup}>
                  <InputLabel label="Uso de CFDI Habitual" />
                  {isEditing ? (
                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={formData.cfdi_use}
                        onValueChange={(v) => setFormData({ ...formData, cfdi_use: v })}
                        style={styles.picker}
                      >
                        {CFDI_USES.map((u) => (
                          <Picker.Item key={u.code} label={`${u.code} - ${u.name}`} value={u.code} />
                        ))}
                      </Picker>
                    </View>
                  ) : (
                    <View style={styles.readOnlyField}>
                       <Text style={styles.readOnlyText}>
                        {formData.cfdi_use} - {billingInfoService.getCFDIUseName(formData.cfdi_use)}
                       </Text>
                    </View>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <InputLabel label="Correo para envío de XML/PDF" required />
                  <View style={styles.inputIconWrapper}>
                    <Ionicons name="mail-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                    <TextInput 
                      style={[styles.inputWithIcon, !isEditing && styles.inputDisabled]}
                      value={formData.email_for_invoices}
                      onChangeText={t => setFormData({...formData, email_for_invoices: t})}
                      editable={isEditing}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              </View>

            </View>
          </View>

          {/* FOOTER ACTIONS */}
          {isEditing && (
            <View style={styles.footerActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => { setIsEditing(false); loadBillingInfo(); }} disabled={saving}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSaveText}>Guardar Información</Text>}
              </TouchableOpacity>
            </View>
          )}

          <View style={{height: 60}} />
        </ScrollView>
      </KeyboardAvoidingView>
    </MainLayout>
  );
}

// --- SUBCOMPONENTES ---
const InputLabel = ({ label, required }: any) => (
  <View style={{flexDirection: 'row', marginBottom: 6}}>
    <Text style={styles.label}>{label}</Text>
    {required && <Text style={{color: '#ef4444', marginLeft: 4}}>*</Text>}
  </View>
);

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20 },

  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  pageTitle: { fontSize: 26, fontWeight: 'bold', color: '#111827' },
  pageSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  headerActions: { flexDirection: 'row' },
  
  btnOutline: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
  },
  btnOutlineText: { color: '#374151', fontWeight: '600', fontSize: 14 },

  // Grid System
  gridContainer: { flexDirection: 'column', gap: 24 },
  gridDesktop: { flexDirection: 'row', alignItems: 'flex-start' },
  leftColumn: { flex: 1, gap: 24 },
  rightColumn: { flex: 1, gap: 24 },

  // Status Card
  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#fff', padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 4, elevation: 1
  },
  statusIconBg: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center' },
  statusTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  statusDesc: { fontSize: 13, color: '#6b7280' },

  // Upload Box
  uploadBox: {
    backgroundColor: '#f8fafc', borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed',
    borderRadius: 12, padding: 32, alignItems: 'center', justifyContent: 'center', gap: 8
  },
  uploadTitle: { fontSize: 14, fontWeight: '600', color: '#226bfc' },
  uploadDesc: { fontSize: 12, color: '#94a3b8' },

  // Forms & Sections
  sectionContainer: {
    backgroundColor: '#fff', borderRadius: 12, padding: 24,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 4, elevation: 1
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 12 },
  
  formGroup: { marginBottom: 16 },
  row: { flexDirection: 'row', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#4b5563' },
  
  // Inputs
  input: {
    height: 42, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    paddingHorizontal: 12, fontSize: 15, color: '#111827', backgroundColor: '#fff'
  },
  inputDisabled: { backgroundColor: '#f9fafb', color: '#6b7280', borderColor: '#e5e7eb' },
  
  inputIconWrapper: { position: 'relative', justifyContent: 'center' },
  inputIcon: { position: 'absolute', left: 12, zIndex: 1 },
  inputWithIcon: {
    height: 42, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    paddingLeft: 40, paddingRight: 12, fontSize: 15, color: '#111827', backgroundColor: '#fff'
  },

  // Pickers
  pickerWrapper: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    backgroundColor: '#fff', height: 42, justifyContent: 'center', overflow: 'hidden'
  },
  picker: { height: 42, width: '100%' },
  
  // Read Only Field (Imitates Input)
  readOnlyField: {
    height: 42, backgroundColor: '#f9fafb', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb',
    justifyContent: 'center', paddingHorizontal: 12
  },
  readOnlyText: { color: '#6b7280', fontSize: 14 },

  // Footer
  footerActions: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 10,
    backgroundColor: '#fff', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb'
  },
  btnCancel: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db' },
  btnCancelText: { color: '#374151', fontWeight: '600' },
  btnSave: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, backgroundColor: '#226bfc', alignItems: 'center' },
  btnSaveText: { color: '#fff', fontWeight: 'bold' },
});