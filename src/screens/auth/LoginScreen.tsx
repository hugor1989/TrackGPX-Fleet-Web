// src/screens/auth/LoginScreen.tsx

import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Image, TouchableOpacity, Platform, StyleSheet, ActivityIndicator } from "react-native";
import { useNavigation } from '@react-navigation/native';
import authService from '../../api/authService';

export default function LoginScreen() {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigation = useNavigation();

  // Cargar email guardado si existe (remember me)
  useEffect(() => {
    loadSavedEmail();
  }, []);

  const loadSavedEmail = async () => {
    const savedEmail = await authService.getSavedEmail();
    if (savedEmail) {
      setAccount(savedEmail);
      setRemember(true);
    }
  };

  const handleLogin = async () => {
    // Limpiar errores previos
    setError("");

    // Validaciones básicas
    if (!account || !password) {
      setError("Por favor ingresa tu cuenta y contraseña");
      return;
    }

    setLoading(true);

    try {
      const response = await authService.login({
        email: account,
        password: password,
        remember: remember,
      });

      if (response.success) {
        // Login exitoso - navegar al dashboard
        navigation.navigate('Dashboard' as never);
      } else {
        // Mostrar error del servidor
        setError(response.message || 'Credenciales incorrectas');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Error de conexión. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    // TODO: Navegar a pantalla de recuperación
    console.log('Forgot password clicked');
  };

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1200&q=80" }}
        style={styles.backgroundImage}
        resizeMode="cover"
        blurRadius={Platform.OS === "web" ? 0 : 20}
      />

      {/* Card de Login */}
      <View style={styles.loginCard}>
        {/* Logo */}
        <View style={styles.logoContainer}>
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
              placeholder="Account/IMEI"
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
              placeholder="Please enter password"
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
              <Text style={styles.rememberText}>Remember password</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handleForgotPassword}
              disabled={loading}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
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
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Botones de plataforma - Separados del card */}
      <View style={styles.platformSection}>
        <View style={styles.platformButtons}>
          <TouchableOpacity style={styles.platformButton}>
            <Text style={styles.platformButtonText}>Android</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.platformButton}>
            <Text style={styles.platformButtonText}>iOS</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerTitle}>TrackGPX | Global Tracking System | Soporte técnico</Text>
        <Text style={styles.footerText}>
          Copyright©2005 All Rights Reserved | Política de privacidad | Términos de servicio
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101624',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  loginCard: {
    width: '100%',
    maxWidth: 450,
    backgroundColor: 'white',
    borderRadius: 24,
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 32,
    alignItems: 'center',
    position: 'relative',
    zIndex: 10,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  logoContainer: {
    position: 'absolute',
    width: 120,
    height: 112,
    top: -56,
    left: '50%',
    marginLeft: -60,
    backgroundColor: 'white',
    borderRadius: 56,
    borderWidth: 4,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 210,
    height: 100,
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
    padding: 12,
    marginBottom: 20,
  },
  errorIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    color: '#991b1b',
    fontSize: 14,
    fontWeight: '500',
  },
  inputsContainer: {
    width: '100%',
    marginTop: 20,
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
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  rememberContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  rememberButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderColor: "#50b287",
    borderRadius: 4,
    backgroundColor: "transparent",
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: "#50b287",
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rememberText: {
    color: '#4b5563',
    fontSize: 14,
  },
  forgotText: {
    color: '#50b287',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loginButton: {
    width: '100%',
    backgroundColor: '#226bfc',
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  platformSection: {
    marginTop: 20,
    marginBottom: 30,
    alignItems: 'center',
  },
  platformButtons: {
    flexDirection: 'row',
    gap: 20,
  },
  platformButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    paddingHorizontal: 25,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  platformButtonText: {
    color: '#2c3e50',
    fontSize: 14,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  footerTitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 16,
  },
});