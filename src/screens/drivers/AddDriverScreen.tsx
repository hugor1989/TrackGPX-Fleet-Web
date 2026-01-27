import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import driverService, { CreateDriverRequest } from '../../api/driverService';

export default function AddDriverScreen() {
  const navigation = useNavigation();

  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false); // Estado para el modal
  
  // Estados del formulario
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [license, setLicense] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  // Validaciones y Guardado
  const handleSave = async () => {
    // 1. Validaciones
    if (!name.trim()) {
      alert('Por favor ingresa el nombre completo.');
      return;
    }
    if (!email.trim() || !driverService.validateEmail(email)) {
      alert('Email inválido.');
      return;
    }

    // 2. Preparar datos
    const driverData: CreateDriverRequest = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.replace(/\D/g, ''),
      license_number: license.trim(),
      emergency_contact: emergencyContact.trim(),
    };

    // 3. Enviar al Backend
    try {
      setSaving(true);
      await driverService.createDriver(driverData);
      
      // ✅ LIMPIEZA INMEDIATA
      setName('');
      setEmail('');
      setPhone('');
      setLicense('');
      setEmergencyContact('');

      // ✅ MOSTRAR MODAL PROFESIONAL (En lugar de window.alert)
      setShowSuccessModal(true);

    } catch (error: any) {
      const errorMsg = error.message || 'Error desconocido';
      if (errorMsg.includes('email')) {
        alert('El correo ya está registrado en el sistema.');
      } else {
        alert(errorMsg);
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePhoneChange = (text: string) => {
    const formatted = driverService.formatPhone(text);
    setPhone(formatted);
  };

  // Función al cerrar el modal de éxito
  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    navigation.goBack(); // Regresar a la lista
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alta de Conductor</Text>
        <TouchableOpacity 
          onPress={handleSave} 
          disabled={saving} 
          style={styles.saveHeaderBtn}
        >
          {saving ? <ActivityIndicator color="#226bfc" size="small" /> : <Text style={styles.saveHeaderText}>Guardar</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* FORMULARIO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INFORMACIÓN PERSONAL</Text>
          <View style={styles.card}>
            <InputGroup 
              label="Nombre Completo" 
              placeholder="Ej. Juan Pérez López" 
              value={name} 
              onChangeText={setName} 
              icon="person-outline"
              autoCapitalize="words"
            />
            <InputGroup 
              label="Correo Electrónico" 
              placeholder="juan.perez@empresa.com" 
              value={email} 
              onChangeText={setEmail} 
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <InputGroup 
              label="Teléfono Móvil" 
              placeholder="33 1234 5678" 
              value={phone} 
              onChangeText={handlePhoneChange} 
              icon="call-outline"
              keyboardType="phone-pad"
              maxLength={14} 
              last
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DOCUMENTACIÓN</Text>
          <View style={styles.card}>
            <InputGroup 
              label="Número de Licencia" 
              placeholder="Ej. M12345678" 
              value={license} 
              onChangeText={setLicense} 
              icon="card-outline"
              autoCapitalize="characters"
            />
            <InputGroup 
              label="Contacto de Emergencia" 
              placeholder="Nombre y Teléfono" 
              value={emergencyContact} 
              onChangeText={setEmergencyContact} 
              icon="medical-outline"
              last
            />
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={24} color="#3b82f6" />
          <Text style={styles.infoText}>
            La contraseña predeterminada será <Text style={{fontWeight: 'bold'}}>password123</Text>.
          </Text>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FOOTER MÓVIL */}
      {Platform.OS !== 'web' && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.footerBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="person-add" size={20} color="#fff" style={{marginRight: 8}} />
                <Text style={styles.footerBtnText}>Registrar Conductor</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* 🌟 MODAL DE ÉXITO PROFESIONAL 🌟 */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleSuccessClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="checkmark" size={50} color="#fff" />
            </View>
            
            <Text style={styles.modalTitle}>¡Registro Exitoso!</Text>
            <Text style={styles.modalMessage}>
              El conductor ha sido dado de alta correctamente en el sistema.
            </Text>

            <TouchableOpacity 
              style={styles.modalButton} 
              onPress={handleSuccessClose}
            >
              <Text style={styles.modalButtonText}>Aceptar y Continuar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

// Subcomponente Input
const InputGroup = ({ label, placeholder, value, onChangeText, icon, keyboardType, maxLength, last, autoCapitalize }: any) => (
  <View style={[styles.inputContainer, !last && { borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 12, marginBottom: 12 }]}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputWrapper}>
      {icon && <Ionicons name={icon} size={20} color="#9ca3af" style={{ marginRight: 12 }} />}
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#d1d5db"
        keyboardType={keyboardType || 'default'}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
      />
    </View>
  </View>
);

// Estilos
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: 16, paddingTop: Platform.OS === 'web' ? 16 : 60, paddingBottom: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb'
  },
  backButton: { padding: 8, borderRadius: 8, backgroundColor: '#f3f4f6' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  saveHeaderBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  saveHeaderText: { color: '#226bfc', fontWeight: 'bold', fontSize: 16 },
  content: { padding: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  inputContainer: {},
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, fontSize: 16, color: '#1f2937', padding: 0, height: 24 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#eff6ff', borderRadius: 12, padding: 16, gap: 12 },
  infoText: { flex: 1, fontSize: 14, color: '#1e40af', lineHeight: 20 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  footerBtn: { flexDirection: 'row', backgroundColor: '#226bfc', borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#226bfc', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  footerBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // --- ESTILOS DEL MODAL (SweetAlert Style) ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10b981', // Verde éxito
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 4,
    borderColor: '#d1fae5', // Verde clarito borde
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
    textAlign: 'center'
  },
  modalMessage: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22
  },
  modalButton: {
    backgroundColor: '#226bfc',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center'
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});