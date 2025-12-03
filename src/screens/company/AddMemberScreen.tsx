// src/screens/company/AddMemberScreen.tsx

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Platform, ActivityIndicator, Alert, KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
// import companyService from '../../api/companyService'; // Importa tu servicio

const AddMemberScreen = () => {
  const navigation = useNavigation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Estado del formulario según tu JSON requerido
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    position: '',
    timezone: 'America/Mexico_City', // Valor default
    roleId: 3 // Valor default (Ej: Supervisor)
  });

  // Listas estáticas (Idealmente vendrían del backend)
  const rolesList = [
    { id: 2, label: 'Administrador' },
    { id: 3, label: 'Supervisor' },
    { id: 4, label: 'Operador' },
  ];
  
  const timezonesList = [
    'America/Mexico_City',
    'America/Monterrey',
    'America/Tijuana',
    'America/Bogota',
  ];

  const validate = () => {
    if (!formData.name.trim()) return "El nombre es obligatorio.";
    if (!formData.email.trim() || !formData.email.includes('@')) return "Email inválido.";
    if (formData.password.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
    return null;
  };

  const handleSubmit = async () => {
    setError('');
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      
      // Preparamos el payload final según el JSON que espera Laravel
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        position: formData.position,
        timezone: formData.timezone,
        roles: [formData.roleId] // Laravel espera un array de IDs
        // NOTA: No enviamos company_id, el backend lo toma del usuario logueado
      };

      console.log("Enviando payload:", payload);
      
      // AQUI LLAMAS A TU SERVICIO REAL
      // await companyService.createEmployee(payload);

      Alert.alert("Éxito", "Usuario creado correctamente", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);

    } catch (err: any) {
      setError(err.message || "Error al crear el usuario");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nuevo Colaborador</Text>
      </View>

      <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.sectionTitle}>Información Personal</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nombre Completo *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Ej. Juan Pérez"
            value={formData.name}
            onChangeText={(t) => setFormData({...formData, name: t})}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Email *</Text>
            <TextInput 
              style={styles.input} 
              placeholder="correo@ejemplo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.email}
              onChangeText={(t) => setFormData({...formData, email: t})}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Teléfono</Text>
            <TextInput 
              style={styles.input} 
              placeholder="555-123-4567"
              keyboardType="phone-pad"
              value={formData.phone}
              onChangeText={(t) => setFormData({...formData, phone: t})}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Contraseña Temporal *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Mínimo 6 caracteres"
            secureTextEntry
            value={formData.password}
            onChangeText={(t) => setFormData({...formData, password: t})}
          />
        </View>

        <Text style={styles.sectionTitle}>Detalles del Puesto</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Cargo / Posición</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Ej. Gerente de Ventas"
            value={formData.position}
            onChangeText={(t) => setFormData({...formData, position: t})}
          />
        </View>

        {/* Selector de Rol (Simple Chips) */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Rol de Acceso *</Text>
          <View style={styles.chipsContainer}>
            {rolesList.map(role => (
              <TouchableOpacity 
                key={role.id}
                style={[styles.chip, formData.roleId === role.id && styles.chipActive]}
                onPress={() => setFormData({...formData, roleId: role.id})}
              >
                <Text style={[styles.chipText, formData.roleId === role.id && styles.chipTextActive]}>
                  {role.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

         {/* Selector de Zona Horaria (Simple Lista Horizontal) */}
         <View style={styles.inputGroup}>
          <Text style={styles.label}>Zona Horaria</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexGrow: 0}}>
            <View style={styles.chipsContainer}>
                {timezonesList.map(tz => (
                <TouchableOpacity 
                    key={tz}
                    style={[styles.chipOutline, formData.timezone === tz && styles.chipOutlineActive]}
                    onPress={() => setFormData({...formData, timezone: tz})}
                >
                    <Text style={[styles.chipOutlineText, formData.timezone === tz && styles.chipOutlineTextActive]}>
                    {tz.replace('America/', '')}
                    </Text>
                </TouchableOpacity>
                ))}
            </View>
          </ScrollView>
        </View>

        {/* Mensaje de Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Botón de Guardar */}
        <TouchableOpacity 
          style={[styles.submitBtn, saving && styles.submitBtnDisabled]} 
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>Crear Usuario</Text>}
        </TouchableOpacity>

        <View style={{height: 40}} />

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  formContent: { padding: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 16, marginTop: 8 },
  inputGroup: { marginBottom: 20 },
  row: { flexDirection: 'row', gap: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#4B5563', marginBottom: 8 },
  input: { 
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, 
    fontSize: 16, color: '#1F2937', backgroundColor: '#F9FAFB',
    ...Platform.select({ web: { outlineStyle: 'none' } as any }) 
  },
  
  // Chips Selectors
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#F3F4F6' },
  chipActive: { backgroundColor: '#4F46E5' },
  chipText: { fontSize: 14, color: '#4B5563', fontWeight: '500' },
  chipTextActive: { color: 'white' },

  chipOutline: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: 'white' },
  chipOutlineActive: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  chipOutlineText: { fontSize: 14, color: '#6B7280' },
  chipOutlineTextActive: { color: '#4F46E5', fontWeight: '600' },

  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', padding: 12, borderRadius: 8, marginBottom: 20, gap: 8 },
  errorText: { color: '#DC2626' },
  submitBtn: { backgroundColor: '#4F46E5', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});

export default AddMemberScreen;