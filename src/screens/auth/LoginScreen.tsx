import React, { useState, useEffect } from "react";
import { 
  View, Text, TextInput, Image, TouchableOpacity, Platform, 
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, ScrollView, 
  StatusBar, Dimensions, ImageBackground
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient'; 
import { useAuth } from '../../context/AuthContext';
import authService from '../../api/authService';

const { width } = Dimensions.get('window');
const isWideScreen = width > 768; 

// PALETA DE COLORES TRACKGPX
const COLORS = {
    primary: '#10b981', // Verde Esmeralda (Logo)
    dark: '#111827',    // Gris muy oscuro (Casi negro)
    darkAccent: '#064e3b', // Verde muy oscuro (Para gradiente)
    text: '#374151',
    textLight: '#9ca3af',
    bg: '#ffffff'
};

export default function LoginScreen() {
  const { login } = useAuth();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSavedEmail = async () => {
      const savedEmail = await authService.getSavedEmail();
      if (savedEmail) { setAccount(savedEmail); setRemember(true); }
    };
    loadSavedEmail();
  }, []);

  const handleLogin = async () => {
    setError("");
    if (!account || !password) { setError("Por favor completa los campos."); return; }
    setLoading(true);
    try {
      const result = await login({ email: account, password, remember });
      if (!result.success) setError(result.message || 'Credenciales incorrectas');
    } catch (err) { setError('Error de conexión.'); } finally { setLoading(false); }
  };

  // --- SECCIÓN IZQUIERDA (BRANDING OSCURO) ---
  const LeftBrandingSection = () => (
      <View style={styles.leftContainer}>
          {/* Fondo con imagen de mapa sutil o tecnología */}
          <ImageBackground 
            source={{uri: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop'}} // Imagen tech oscura
            style={styles.bgImage}
          >
            {/* Gradiente Oscuro encima */}
            <LinearGradient
                colors={[COLORS.dark, 'rgba(6, 78, 59, 0.9)']} // De Negro a Verde Oscuro
                style={styles.gradientOverlay}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.brandingContent}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="location" size={40} color={COLORS.primary} />
                    </View>
                    <Text style={styles.taglineTitle}>Control Total</Text>
                    <Text style={styles.taglineMain}>TrackGPX</Text>
                    <Text style={styles.taglineDesc}>
                        Gestión inteligente de flotas y rastreo satelital en tiempo real.
                    </Text>
                </View>
            </LinearGradient>
          </ImageBackground>
      </View>
  );

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle={isWideScreen ? "light-content" : "dark-content"} backgroundColor={isWideScreen ? COLORS.dark : "#fff"} />
      
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, flexDirection: isWideScreen ? 'row' : 'column' }}>
        
        {isWideScreen && <LeftBrandingSection />}

        {/* LADO DERECHO (Formulario) */}
        <ScrollView contentContainerStyle={styles.rightContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.formContent}>
            
            {/* Logo */}
            <View style={styles.logoHeader}>
                <Image source={require("../../../assets/logo-sin-fondo.png")} style={styles.logoImage} resizeMode="contain" />
            </View>

            <Text style={styles.welcomeText}>Bienvenido de nuevo</Text>
            <Text style={styles.instructionText}>Ingresa a tu panel de control</Text>

            {error ? <View style={styles.errorBox}><Text style={styles.errorText}>⚠️ {error}</Text></View> : null}

            {/* Input Usuario */}
            <View style={styles.inputBox}>
                <Ionicons name="mail-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
                <TextInput
                    style={styles.inputField}
                    placeholder="Usuario o Correo"
                    placeholderTextColor={COLORS.textLight}
                    value={account}
                    onChangeText={setAccount}
                    autoCapitalize="none"
                />
            </View>

            {/* Input Contraseña */}
            <View style={styles.inputBox}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
                <TextInput
                    style={styles.inputField}
                    placeholder="Contraseña"
                    placeholderTextColor={COLORS.textLight}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.textLight} />
                </TouchableOpacity>
            </View>

            {/* Opciones */}
            <View style={styles.optionsRow}>
                <TouchableOpacity style={styles.rememberSwitch} onPress={() => setRemember(!remember)} activeOpacity={0.7}>
                    <View style={[styles.checkbox, remember && styles.checkboxChecked]}>
                        {remember && <Ionicons name="checkmark" size={14} color="white" />}
                    </View>
                    <Text style={styles.optionText}>Recordarme</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                    <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>
            </View>

            {/* BOTÓN VERDE (COLOR DEL LOGO) */}
            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>INICIAR SESIÓN</Text>}
            </TouchableOpacity>

            <View style={styles.footerLinks}>
                <Text style={styles.footerText}>© 2024 TrackGPX System</Text>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#fff' },
  
  // --- LADO IZQUIERDO (AJUSTADO) ---
  leftContainer: { flex: 1, backgroundColor: COLORS.dark },
  bgImage: { flex: 1, width: '100%', height: '100%' },
  
  gradientOverlay: { 
      flex: 1, 
      justifyContent: 'center', // Centrado vertical
      alignItems: 'center',     // Centrado horizontal (NUEVO: Esto despega el contenido del borde)
  },
  
  brandingContent: { 
      maxWidth: 550, // Un poco más de ancho máximo permitido
      width: '100%', // Ocupa el ancho disponible hasta el máximo
      paddingHorizontal: 80, // Espacio generoso a los lados (NUEVO: Esto da el "aire")
  },

  iconCircle: {
      width: 70, height: 70, borderRadius: 35,
      backgroundColor: 'rgba(255,255,255,0.1)',
      alignItems: 'center', justifyContent: 'center', marginBottom: 20,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
  },
  taglineTitle: { fontSize: 20, color: COLORS.primary, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  // Aumenté un poco el tamaño del texto principal para más impacto
  taglineMain: { fontSize: 64, color: '#fff', fontWeight: '900', lineHeight: 68, marginBottom: 15 },
  taglineDesc: { fontSize: 18, color: '#d1d5db', lineHeight: 26, maxWidth: '90%' },
  // ------------------------------------

  // LADO DERECHO (Sigue igual, pero te lo pongo para referencia)
  rightContainer: { flexGrow: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  formContent: { width: '100%', maxWidth: 400, paddingHorizontal: 30 },

  logoHeader: { alignItems: 'center', marginBottom: 20 },
  logoImage: { width: 200, height: 120 }, // Ajusta según tu logo real

  welcomeText: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, textAlign: 'center' },
  instructionText: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', marginBottom: 30 },

  errorBox: { backgroundColor: '#fef2f2', padding: 10, borderRadius: 8, marginBottom: 20, borderWidth: 1, borderColor: '#fee2e2' },
  errorText: { color: '#b91c1c', fontSize: 13 },

  inputBox: {
      flexDirection: 'row', alignItems: 'center',
      borderWidth: 1.5, borderColor: '#f3f4f6', 
      borderRadius: 12, height: 56,
      paddingHorizontal: 15, marginBottom: 16,
      backgroundColor: '#f9fafb',
  },
  inputIcon: { marginRight: 12 },
  inputField: { flex: 1, height: '100%', color: COLORS.text, fontSize: 15, fontWeight: '500' },

  optionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, marginTop: 5 },
  rememberSwitch: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 20, height: 20, borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 6, marginRight: 8, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  optionText: { color: COLORS.textLight, fontSize: 14, fontWeight: '500' },
  forgotText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },

  loginBtn: {
      width: '100%', height: 56,
      backgroundColor: COLORS.primary, // VERDE
      borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5
  },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 },

  footerLinks: { marginTop: 40, alignItems: 'center' },
  footerText: { color: '#e5e7eb', fontSize: 12 }
});