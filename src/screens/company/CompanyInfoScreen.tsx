// src/screens/company/CompanyInfoScreen.tsx

import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import companyService, { Company, UpdateCompanyRequest } from '../../api/companyService';
import * as ImagePicker from 'expo-image-picker';

export default function CompanyInfoScreen() {
  const navigation = useNavigation();

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
      setFormData({
        name: data.name,
        rfc: data.rfc,
        fiscal_address: data.fiscal_address,
        contact_email: data.contact_email,
        phone: data.phone,
        website: data.website,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setError('');

    // Validaciones
    if (!formData.name?.trim()) {
      setError('El nombre de la empresa es requerido');
      return;
    }

    if (formData.rfc && !companyService.validateRFC(formData.rfc)) {
      setError('RFC inválido');
      return;
    }

    if (formData.contact_email && !companyService.validateEmail(formData.contact_email)) {
      setError('Email inválido');
      return;
    }

    try {
      setSaving(true);
      const updated = await companyService.updateCompany(formData);
      setCompany(updated);
      setIsEditing(false);
      Alert.alert('Éxito', 'Información actualizada correctamente');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (company) {
      setFormData({
        name: company.name,
        rfc: company.rfc,
        fiscal_address: company.fiscal_address,
        contact_email: company.contact_email,
        phone: company.phone,
        website: company.website,
      });
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
          try {
            setSaving(true);
            await companyService.uploadLogo(file);
            await loadCompanyInfo();
            Alert.alert('Éxito', 'Logo actualizado correctamente');
          } catch (err: any) {
            Alert.alert('Error', err.message);
          } finally {
            setSaving(false);
          }
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
        try {
          setSaving(true);
          const response = await fetch(result.assets[0].uri);
          const blob = await response.blob();
          await companyService.uploadLogo(blob);
          await loadCompanyInfo();
          Alert.alert('Éxito', 'Logo actualizado correctamente');
        } catch (err: any) {
          Alert.alert('Error', err.message);
        } finally {
          setSaving(false);
        }
      }
    }
  };

  const handleRemoveLogo = () => {
    Alert.alert(
      'Eliminar Logo',
      '¿Estás seguro de que deseas eliminar el logo de la empresa?',
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
              Alert.alert('Éxito', 'Logo eliminado correctamente');
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
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mi Empresa</Text>
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
        <Text style={styles.headerTitle}>Mi Empresa</Text>
        {!isEditing ? (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Ionicons name="pencil" size={24} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
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
                <Text style={styles.logoButtonText}>Cambiar Logo</Text>
              </TouchableOpacity>
              {company?.logo && (
                <TouchableOpacity style={styles.logoButtonDanger} onPress={handleRemoveLogo} disabled={saving}>
                  <Ionicons name="trash" size={20} color="#ef4444" />
                  <Text style={styles.logoButtonDangerText}>Eliminar</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Form */}
        <View style={styles.form}>
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
              onChangeText={(text) => setFormData({ ...formData, rfc: companyService.formatRFC(text) })}
              editable={isEditing}
              placeholder="RFC (12-13 caracteres)"
              autoCapitalize="characters"
              maxLength={13}
            />
            <Text style={styles.hint}>Se utilizará para la facturación</Text>
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
            <Text style={styles.hint}>Para emisión de facturas</Text>
          </View>

          <Text style={styles.sectionTitle}>Contacto</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email de Contacto</Text>
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
              placeholder="https://www.empresa.com"
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          {/* Estado de la Empresa (Solo vista) */}
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

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

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
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  contentContainer: { padding: 20 },
  logoSection: { alignItems: 'center', marginBottom: 32 },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  logo: { width: 120, height: 120, borderRadius: 60 },
  logoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  logoActions: { flexDirection: 'row', gap: 12 },
  logoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#226bfc',
    gap: 8,
  },
  logoButtonText: { fontSize: 14, color: '#226bfc', fontWeight: '600' },
  logoButtonDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    gap: 8,
  },
  logoButtonDangerText: { fontSize: 14, color: '#ef4444', fontWeight: '600' },
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
  inputDisabled: { backgroundColor: '#f3f4f6', color: '#6b7280' },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    fontStyle: 'italic',
  },
  statusContainer: { marginTop: 24, marginBottom: 16 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusActive: { backgroundColor: '#dcfce7' },
  statusSuspended: { backgroundColor: '#fee2e2' },
  statusText: { fontSize: 14, fontWeight: '600' },
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