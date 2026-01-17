import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  Image, 
  TouchableOpacity, 
  Platform, 
  StyleSheet, 
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView
} from "react-native";
// import { useNavigation } from '@react-navigation/native'; // ❌ Ya no es necesario para ir al Dashboard
import { useAuth } from '../../context/AuthContext'; // ✅ Usamos el Hook
import authService from '../../api/authService'; // Solo para leer el email guardado

export default function LoginScreen() {
  const { login } = useAuth(); // Obtenemos la función login del contexto global
  
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Cargar email guardado si existe (solo al montar)
  useEffect(() => {
    const loadSavedEmail = async () => {
      const savedEmail = await authService.getSavedEmail();
      if (savedEmail) {
        setAccount(savedEmail);
        setRemember(true);
      }
    };
    loadSavedEmail();
  }, []);

  const handleLogin = async () => {
    // 1. Limpieza y Validación
    setError("");
    if (!account || !password) {
      setError("Por favor ingresa tu cuenta y contraseña");
      return;
    }

    setLoading(true);

    try {
      // 2. Llamada al Contexto (El contexto se encarga de hablar con la API y guardar el token)
      const result = await login({
        email: account,
        password: password,
        remember: remember,
      });

      if (!result.success) {
        // Solo mostramos error si falla. 
        // Si tiene éxito, el Contexto actualiza el estado 'user' y 
        // el Navegador (App.tsx) cambiará automáticamente de pantalla.
        setError(result.message || 'Credenciales incorrectas');
      }
      
    } catch (err) {
      setError('Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    // KeyboardAvoidingView ayuda a que el teclado no tape los inputs en móviles
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.container}>
          <Image
            source={{ uri: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1200&q=80" }}
            style={styles.backgroundImage}
            resizeMode="cover"
            blurRadius={Platform.OS === "web" ? 0 : 3} // Un poco menos de blur se ve mejor a veces
          />

          {/* Card de Login */}
          <View style={styles.loginCard}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              {/* Asegúrate de que la ruta sea correcta */}
              <Image
                source={require("../../../assets/logo-sin-fondo.png")}
                style={styles.logoImage}
              />
            </View>

            {/* Mensaje de error */}
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Inputs */}
            <View style={styles.inputsContainer}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>👤</Text>
                <TextInput
                  placeholder="Usuario / Correo"
                  placeholderTextColor="#71717a"
                  style={styles.input}
                  value={account}
                  onChangeText={setAccount}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  placeholder="Contraseña"
                  placeholderTextColor="#71717a"
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
              
              <View style={styles.rememberContainer}>
                <TouchableOpacity 
                  onPress={() => setRemember(!remember)} 
                  style={styles.rememberButton}
                  disabled={loading}
                >
                  <View style={[styles.checkbox, remember && styles.checkboxChecked]}>
                    {remember && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.rememberText}>Recordar contraseña</Text>
                </TouchableOpacity>
                
                <TouchableOpacity disabled={loading}>
                  <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Botón Login */}
            <TouchableOpacity 
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>INICIAR SESIÓN</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerTitle}>TrackGPX | Global Tracking System</Text>
            <Text style={styles.footerText}>
              Copyright©2024 All Rights Reserved
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101624',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    minHeight: 600, // Para asegurar espacio en pantallas pequeñas
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  loginCard: {
    width: '100%',
    maxWidth: 400, // Un poco más estrecho para elegancia
    backgroundColor: 'white',
    borderRadius: 24,
    paddingTop: 70,
    paddingBottom: 40,
    paddingHorizontal: 25,
    alignItems: 'center',
    position: 'relative',
    marginTop: 60, // Espacio para el logo flotante
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logoContainer: {
    position: 'absolute',
    width: 110,
    height: 110,
    top: -55,
    alignSelf: 'center',
    backgroundColor: 'white',
    borderRadius: 55,
    borderWidth: 4,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  logoImage: {
    width: 90,
    height: 90,
    resizeMode: 'contain',
  },
  errorContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    color: '#991b1b',
    fontSize: 13,
    fontWeight: '600',
  },
  inputsContainer: {
    width: '100%',
    marginTop: 10,
  },
  inputContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: '#f9fafb',
    height: 50,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 10,
    opacity: 0.7,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#1f2937',
  },
  rememberContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 5,
  },
  rememberButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#226bfc", // Color primario
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: "#226bfc",
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rememberText: {
    color: '#4b5563',
    fontSize: 13,
  },
  forgotText: {
    color: '#226bfc',
    fontSize: 13,
    fontWeight: '600',
  },
  loginButton: {
    width: '100%',
    backgroundColor: '#226bfc',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#226bfc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerTitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
    fontWeight: '500',
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
  },
});