import React, { useState } from "react";
import { View, Text, TextInput, Image, TouchableOpacity, Platform, StyleSheet } from "react-native";
import { useNavigation } from '@react-navigation/native';

export default function LoginPage() {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const navigation = useNavigation();

  const handleLogin = () => {
    // Aquí puedes agregar la lógica de validación antes de navegar
    navigation.navigate('Dashboard');
  };

  return (
    <View className="flex-1 bg-[#101624] items-center justify-center px-2">
      <Image
        source={{ uri: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1200&q=80" }}
        className="absolute w-full h-full opacity-60"
        resizeMode="cover"
        blurRadius={Platform.OS === "web" ? 0 : 20}
      />

      {/* Card de Login */}
      <View className="w-full max-w-md bg-white rounded-3xl shadow-2xl pt-16 pb-10 px-8 items-center relative z-10 mb-8">
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../assets/logo-sin-fondo.png")}
            style={styles.logoImage}
          />
        </View>

        {/* Inputs */}
        <View className="mt-2 w-full">
          <View style={styles.inputContainer}>
            <Text className="text-gray-400 text-lg mr-2">👤</Text>
            <TextInput
              placeholder="Account/IMEI"
              placeholderTextColor="#71717a"
              className="flex-1 py-3 text-gray-800"
              value={account}
              onChangeText={setAccount}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text className="text-gray-400 text-lg mr-2">🔒</Text>
            <TextInput
              placeholder="Please enter password"
              placeholderTextColor="#71717a"
              className="flex-1 py-3 text-gray-800"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          
          <View style={styles.rememberContainer}>
            <TouchableOpacity 
              onPress={() => setRemember(!remember)} 
              style={styles.rememberButton}
            >
              <View style={[styles.checkbox, remember && styles.checkboxChecked]} />
              <Text className="text-gray-700 text-sm ml-2">Remember password</Text>
            </TouchableOpacity>
            
            <TouchableOpacity>
              <Text className="text-[#50b287] text-sm font-bold">Forgot Password?</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Botón Login */}
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={handleLogin}
          activeOpacity={0.8}
        >
          <Text className="text-white text-lg font-bold text-center tracking-wide">Login</Text>
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
  logoContainer: {
    position: 'absolute',
    width: 120,
    height: 112,
    top: -56,
    left: '50%',
    transform: [{ translateX: -56 }],
    backgroundColor: 'white',
    borderRadius: 56,
    borderWidth: 4,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoImage: {
    width: 210,
    height: 100,
    resizeMode: 'contain'
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
    backgroundColor: '#f9fafb'
  },
  rememberContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  rememberButton: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 2,
    borderColor: "#50b287",
    borderRadius: 4,
    backgroundColor: "transparent",
  },
  checkboxChecked: {
    backgroundColor: "#50b287",
  },
  loginButton: {
    width: '100%',
    backgroundColor: '#226bfc',
    borderRadius: 25,
    paddingVertical: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6
  },
  platformSection: {
    marginTop: 20, // Separación adicional desde el card
    marginBottom: 30, // Espacio antes del footer
    alignItems: 'center',
  },
  platformButtons: {
    flexDirection: 'row',
    gap: 20, // Más espacio entre botones
  },
  platformButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    paddingHorizontal: 25,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
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