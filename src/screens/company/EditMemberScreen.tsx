import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, Platform, KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import companyService from '../../api/companyService';

// Roles disponibles (Mismos que en TeamScreen)
const ROLES = [
  { id: 2, label: 'Administrador', description: 'Acceso total a la configuración y facturación.' },
  { id: 3, label: 'Supervisor', description: 'Puede ver y gestionar vehículos y conductores.' },
  { id: 4, label: 'Operador', description: 'Solo visualización de monitoreo.' },
];

export default function EditMemberScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  
  // Obtenemos el usuario pasado por parámetros
  const { user } = route.params || {};

  // Estados del formulario
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [position, setPosition] = useState(user?.position || '');
  
  // Lógica para extraer el ID del rol actual
  const initialRoleId = (user?.roles && user.roles.length > 0) 
    ? (typeof user.roles[0] === 'object' ? user.roles[0].id : user.roles[0]) 
    : 4;
    
  const [roleId, setRoleId] = useState(initialRoleId);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "El nombre es obligatorio");
      return;
    }

    setSaving(true);
    try {
      await companyService.updateMember(user.id, {
        name,
        phone,
        position,
        role_id: roleId
      });
      
      Alert.alert("Éxito", "Usuario actualizado correctamente", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "No se pudo actualizar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Usuario</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          
          {/* Tarjeta de Formulario */}
          <View style={styles.card}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{name ? name.charAt(0).toUpperCase() : 'U'}</Text>
              </View>
              <Text style={styles.emailText}>{user?.account?.email || user?.email}</Text>
            </View>

            {/* Inputs */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre Completo</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ej. Juan Pérez"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Puesto / Cargo</Text>
                <TextInput
                  style={styles.input}
                  value={position}
                  onChangeText={setPosition}
                  placeholder="Ej. Logística"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Teléfono</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Ej. 3312345678"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Selector de Rol */}
            <Text style={[styles.label, { marginTop: 10 }]}>Nivel de Acceso</Text>
            <View style={styles.roleContainer}>
              {ROLES.map((role) => (
                <TouchableOpacity
                  key={role.id}
                  style={[styles.roleOption, roleId === role.id && styles.roleOptionActive]}
                  onPress={() => setRoleId(role.id)}
                >
                  <View style={styles.roleHeader}>
                    <View style={[styles.radio, roleId === role.id && styles.radioActive]}>
                      {roleId === role.id && <View style={styles.radioInner} />}
                    </View>
                    <Text style={[styles.roleTitle, roleId === role.id && styles.roleTitleActive]}>
                      {role.label}
                    </Text>
                  </View>
                  <Text style={styles.roleDesc}>{role.description}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Botón Guardar */}
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Guardar Cambios</Text>
              )}
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  backButton: { padding: 8, borderRadius: 8, backgroundColor: '#f3f4f6' },
  
  content: { padding: 20, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 24, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  
  avatarContainer: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 2, borderColor: '#dbeafe' },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#226bfc' },
  emailText: { fontSize: 14, color: '#6b7280' },

  inputGroup: { marginBottom: 16 },
  row: { flexDirection: 'row' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 15, color: '#1f2937', backgroundColor: '#fff' },
  
  roleContainer: { gap: 10, marginTop: 6, marginBottom: 24 },
  roleOption: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, backgroundColor: '#f9fafb' },
  roleOptionActive: { borderColor: '#226bfc', backgroundColor: '#eff6ff' },
  roleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  roleTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginLeft: 8 },
  roleTitleActive: { color: '#226bfc' },
  roleDesc: { fontSize: 12, color: '#6b7280', marginLeft: 28 },
  
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#d1d5db', justifyContent: 'center', alignItems: 'center' },
  radioActive: { borderColor: '#226bfc' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#226bfc' },

  saveButton: { backgroundColor: '#226bfc', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  buttonDisabled: { opacity: 0.7 },
});