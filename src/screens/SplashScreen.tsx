import React, { useEffect, useRef } from 'react';
import { View, Image, Text, StyleSheet, Animated, Dimensions, StatusBar } from 'react-native';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  // Valores animados
  const logoFade = useRef(new Animated.Value(0)).current;  // Opacidad Logo
  const logoScale = useRef(new Animated.Value(0.3)).current; // Escala Logo
  
  const textFade = useRef(new Animated.Value(0)).current;  // Opacidad Texto
  const textTranslate = useRef(new Animated.Value(20)).current; // Movimiento Texto (Y)

  const footerFade = useRef(new Animated.Value(0)).current; // Opacidad del Loading abajo

  useEffect(() => {
    // SECUENCIA DE ANIMACIÓN
    Animated.sequence([
      // 1. Entrada del Logo (Rebote)
      Animated.parallel([
        Animated.timing(logoFade, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),

      // 2. Pequeña pausa
      Animated.delay(300),

      // 3. Entrada del Texto "Bienvenidos" (Sube y aparece)
      Animated.parallel([
        Animated.timing(textFade, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslate, {
          toValue: 0, // Llega a su posición original
          duration: 800,
          useNativeDriver: true,
        }),
      ]),

      // 4. Entrada del Footer (Loading...)
      Animated.timing(footerFade, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),

    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Contenedor Central */}
      <View style={styles.centerContent}>
          <Animated.View 
            style={{ 
              opacity: logoFade, 
              transform: [{ scale: logoScale }] 
            }}
          >
            <Image 
                source={require('../../assets/logo-sin-fondo.png')} 
                style={styles.logo}
                resizeMode="contain"
            />
          </Animated.View>

          <Animated.View 
            style={{ 
              opacity: textFade, 
              transform: [{ translateY: textTranslate }],
              marginTop: 20,
              alignItems: 'center'
            }}
          >
            <Text style={styles.welcomeTitle}>Bienvenido</Text>
            <Text style={styles.welcomeSubtitle}>TrackGPX System</Text>
          </Animated.View>
      </View>

      {/* Footer / Loading (Parte inferior) */}
      <Animated.View style={[styles.footer, { opacity: footerFade }]}>
          <Text style={styles.loadingText}>Iniciando sistema...</Text>
          <View style={styles.progressBar}>
             {/* Una barra simple animada visualmente */}
             <View style={styles.progressFill} /> 
          </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', 
    alignItems: 'center',
    justifyContent: 'space-between', // Distribuye espacio entre centro y footer
    paddingVertical: 60,
  },
  centerContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
  },
  logo: {
    width: width * 0.5, // 50% del ancho de pantalla
    height: width * 0.5,
  },
  welcomeTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: '#111827', // Gris oscuro elegante
      letterSpacing: 1,
  },
  welcomeSubtitle: {
      fontSize: 16,
      color: '#10b981', // Tu color verde corporativo
      fontWeight: '600',
      marginTop: 5,
      textTransform: 'uppercase',
      letterSpacing: 2,
  },
  footer: {
      width: '100%',
      alignItems: 'center',
      paddingHorizontal: 40,
  },
  loadingText: {
      fontSize: 12,
      color: '#9ca3af',
      marginBottom: 10,
  },
  progressBar: {
      width: 150,
      height: 4,
      backgroundColor: '#f3f4f6',
      borderRadius: 2,
      overflow: 'hidden',
  },
  progressFill: {
      width: '50%', // Simulación de carga
      height: '100%',
      backgroundColor: '#10b981',
      borderRadius: 2,
  }
});