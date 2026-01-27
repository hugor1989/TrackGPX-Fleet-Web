import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  Platform,
  Alert,
  KeyboardAvoidingView, // 1. Importante para móviles
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import companyService, { Company, UpdateCompanyRequest } from '../../api/companyService';
import * as ImagePicker from 'expo-image-picker';

export default function CompanyInfoScreen() {
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null); // 2. Referencia para scroll automático

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [formData, setFormData] = useState<UpdateCompanyRequest>({});

  useEffect(() => {
    loadCompanyInfo();
  }, []);

  const loadCompanyInfo = async () => {
    try {
      setLoading(true);
      const data = await companyService.getCompany();
      setCompany(data);
      resetForm(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar información');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = (data: Company) => {
    setFormData({
      name: data.name,
      rfc: data.rfc,
      fiscal_address: data.fiscal_address,
      contact_email: data.contact_email,
      phone: data.phone,
      website: data.website,
    });
  };

  // Función auxiliar para subir al inicio si hay error
  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleSave = async () => {
    setError('');

    // --- Validaciones Frontend ---
    if (!formData.name?.trim()) {
      setError('El nombre de la empresa es requerido');
      scrollToTop();
      return;
    }

    // Validación básica de RFC (12 o 13 caracteres)
    if (formData.rfc) {
      const rfcLen = formData.rfc.length;
      if (rfcLen < 12 || rfcLen > 13) {
        setError('El RFC debe tener 12 (Moral) o 13 (Física) caracteres');
        scrollToTop();
        return;
      }
    }

    if (formData.contact_email && !formData.contact_email.includes('@')) {
      setError('Email inválido');
      scrollToTop();
      return;
    }

    try {
      setSaving(true);
      const updated = await companyService.updateCompany(formData);
      setCompany(updated);
      setIsEditing(false);
      Alert.alert('Éxito', 'Información actualizada correctamente');
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
      scrollToTop();
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (company) {
      resetForm(company);
    }
    setIsEditing(false);
    setError('');
  };

  const handlePickImage = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (file) {
          uploadImageProcess(file);
        }
      };
      input.click();
    } else {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Para móvil, necesitamos convertir la URI a Blob o enviarla como FormData
        // Aquí asumimos que tu servicio maneja la URI o Blob correctamente
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        uploadImageProcess(blob);
      }
    }
  };

  const uploadImageProcess = async (fileOrBlob: any) => {
    try {
      setSaving(true);
      await companyService.uploadLogo(fileOrBlob);
      await loadCompanyInfo(); // Recargar para ver el nuevo logo
      Alert.alert('Éxito', 'Logo actualizado correctamente');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLogo = () => {
    Alert.alert(
      'Eliminar Logo',
      '¿Estás seguro de que deseas eliminar el logo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await companyService.deleteLogo();
              await loadCompanyInfo();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#226bfc" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Fijo */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Empresa</Text>
        <View style={styles.headerRight}>
          {!isEditing ? (
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Ionicons name="pencil" size={24} color="#fff" />
            </TouchableOpacity>
          ) : (
             // Placeholder para mantener el título centrado
            <View style={{ width: 24 }} />
          )}
        </View>
      </View>

      {/* 3. KeyboardAvoidingView para que el teclado no tape inputs */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              {company?.logo ? (
                <Image source={{ uri: company.logo }} style={styles.logo} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Ionicons name="business" size={48} color="#9ca3af" />
                </View>
              )}
            </View>
            
            {isEditing && (
              <View style={styles.logoActions}>
                <TouchableOpacity style={styles.logoButton} onPress={handlePickImage} disabled={saving}>
                  <Ionicons name="camera" size={20} color="#226bfc" />
                  <Text style={styles.logoButtonText}>Cambiar</Text>
                </TouchableOpacity>
                {company?.logo && (
                  <TouchableOpacity style={styles.logoButtonDanger} onPress={handleRemoveLogo} disabled={saving}>
                    <Ionicons name="trash" size={20} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Mensaje de Error (ahora con scroll automático hacia aquí) */}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>Información General</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre de la Empresa *</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                editable={isEditing}
                placeholder="Nombre de la empresa"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>RFC</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.rfc}
                onChangeText={(text) => setFormData({ ...formData, rfc: text.toUpperCase() })} // Mayúsculas directo
                editable={isEditing}
                placeholder="RFC (12-13 caracteres)"
                autoCapitalize="characters"
                maxLength={13}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Dirección Fiscal</Text>
              <TextInput
                style={[styles.input, styles.textArea, !isEditing && styles.inputDisabled]}
                value={formData.fiscal_address}
                onChangeText={(text) => setFormData({ ...formData, fiscal_address: text })}
                editable={isEditing}
                placeholder="Dirección fiscal completa"
                multiline
                numberOfLines={3}
              />
            </View>

            <Text style={styles.sectionTitle}>Contacto</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.contact_email}
                onChangeText={(text) => setFormData({ ...formData, contact_email: text.toLowerCase() })}
                editable={isEditing}
                placeholder="contacto@empresa.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Teléfono</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                editable={isEditing}
                placeholder="(33) 1234-5678"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Sitio Web</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.website}
                onChangeText={(text) => setFormData({ ...formData, website: text.toLowerCase() })}
                editable={isEditing}
                placeholder="www.empresa.com"
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            {/* Estado (Solo lectura) */}
            {company?.status && (
              <View style={styles.statusContainer}>
                <Text style={styles.label}>Estado de la Cuenta</Text>
                <View style={[
                  styles.statusBadge,
                  company.status === 'active' ? styles.statusActive : styles.statusSuspended
                ]}>
                  <Text style={styles.statusText}>
                    {company.status === 'active' ? 'Activa' : 'Suspendida'}
                  </Text>
                </View>
              </View>
            )}

            {/* Botones de Acción */}
            {isEditing && (
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancel}
                  disabled={saving}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.buttonDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="#fff" />
                      <Text style={styles.saveButtonText}>Guardar</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          {/* Espacio extra al final para scroll */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f6f8' },
  
  // Header optimizado
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 16 : 50, // Ajuste para SafeArea
    paddingBottom: 16,
    backgroundColor: '#226bfc',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  backButton: { padding: 4 },
  headerRight: { flexDirection: 'row', alignItems: 'center', minWidth: 32 },

  content: { flex: 1 },
  contentContainer: { padding: 20 },

  // Logo
  logoSection: { alignItems: 'center', marginBottom: 24 },
  logoContainer: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 4, borderColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4
  },
  logo: { width: 100, height: 100, borderRadius: 50 },
  logoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  logoActions: { flexDirection: 'row', gap: 10 },
  logoButton: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, backgroundColor: '#eef2ff',
    gap: 6,
  },
  logoButtonText: { fontSize: 13, color: '#226bfc', fontWeight: '600' },
  logoButtonDanger: {
    padding: 6, borderRadius: 20, backgroundColor: '#fee2e2',
  },

  // Formulario
  form: {
    backgroundColor: '#fff', borderRadius: 12, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
  },
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: '#111827',
    marginTop: 10, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 8
  },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#4b5563', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, color: '#1f2937', backgroundColor: '#fff',
  },
  inputDisabled: { backgroundColor: '#f9fafb', color: '#6b7280', borderColor: '#f3f4f6' },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  
  // Status
  statusContainer: { marginTop: 10, marginBottom: 10 },
  statusBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 6,
  },
  statusActive: { backgroundColor: '#dcfce7' },
  statusSuspended: { backgroundColor: '#fee2e2' },
  statusText: { fontSize: 13, fontWeight: '600', color: '#374151' },

  // Errores
  errorBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
    borderRadius: 8, padding: 12, marginBottom: 20, gap: 8
  },
  errorText: { flex: 1, fontSize: 13, color: '#991b1b' },

  // Botones
  buttonRow: { flexDirection: 'row', marginTop: 20, gap: 12 },
  cancelButton: {
    flex: 1, backgroundColor: '#f3f4f6', borderRadius: 8,
    paddingVertical: 12, alignItems: 'center',
  },
  cancelButtonText: { fontSize: 15, fontWeight: '600', color: '#4b5563' },
  saveButton: {
    flex: 1, flexDirection: 'row', backgroundColor: '#226bfc',
    borderRadius: 8, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', gap: 6
  },
  saveButtonText: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  buttonDisabled: { opacity: 0.7 },
});