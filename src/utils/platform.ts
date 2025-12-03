// src/utils/platform.ts

import { Platform, Dimensions } from 'react-native';

/**
 * Detectar plataforma actual
 */
export const isWeb = Platform.OS === 'web';
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isMobile = isIOS || isAndroid;

/**
 * Obtener dimensiones de la pantalla
 */
export const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Detectar si es tablet
 */
export const isTablet = () => {
  const pixelDensity = Platform.select({
    ios: 2,
    android: 2,
    web: 1,
  }) || 1;

  const adjustedWidth = SCREEN_WIDTH * pixelDensity;
  const adjustedHeight = SCREEN_HEIGHT * pixelDensity;

  if (pixelDensity < 2 && (adjustedWidth >= 1000 || adjustedHeight >= 1000)) {
    return true;
  }

  return adjustedWidth >= 900 && adjustedHeight >= 900;
};

/**
 * Obtener valor específico por plataforma
 */
export const getPlatformValue = <T>(values: {
  ios?: T;
  android?: T;
  web?: T;
  default: T;
}): T => {
  return Platform.select(values) ?? values.default;
};

/**
 * Espaciado seguro por plataforma
 */
export const getSafeAreaPadding = () => ({
  paddingTop: getPlatformValue({
    ios: 44,
    android: 24,
    web: 0,
    default: 0,
  }),
  paddingBottom: getPlatformValue({
    ios: 34,
    android: 0,
    web: 0,
    default: 0,
  }),
});

/**
 * Shadow por plataforma
 */
export const getShadowStyle = (elevation: number = 4) => {
  if (isWeb) {
    return {
      boxShadow: `0px ${elevation}px ${elevation * 2}px rgba(0, 0, 0, 0.1)`,
    };
  }

  if (isIOS) {
    return {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: elevation / 2 },
      shadowOpacity: 0.1,
      shadowRadius: elevation,
    };
  }

  // Android
  return {
    elevation,
  };
};

/**
 * Tamaño de fuente responsive
 */
export const responsiveFontSize = (size: number) => {
  const scale = SCREEN_WIDTH / 375; // iPhone 11 como referencia
  const newSize = size * scale;
  
  if (isWeb) {
    return Math.round(newSize);
  }
  
  return Math.round(newSize * 0.95); // Móvil un poco más pequeño
};

/**
 * Verificar si tiene soporte de cámara
 */
export const hasCameraSupport = () => {
  return isMobile;
};

/**
 * Verificar si tiene soporte de biometría
 */
export const hasBiometricSupport = () => {
  return isMobile;
};

/**
 * Verificar si tiene soporte de notificaciones push
 */
export const hasPushNotificationSupport = () => {
  return isMobile;
};

/**
 * Formatear URL de API según plataforma
 */
export const getApiUrl = (isDevelopment: boolean = __DEV__) => {
  if (!isDevelopment) {
    return 'https://api.trackgpx.com/api';
  }

  return getPlatformValue({
    ios: 'http://localhost:8000/api',
    android: 'http://10.0.2.2:8000/api',
    web: 'http://localhost:8000/api',
    default: 'http://localhost:8000/api',
  });
};

/**
 * Device info
 */
export const getDeviceInfo = () => ({
  platform: Platform.OS,
  version: Platform.Version,
  isWeb,
  isIOS,
  isAndroid,
  isMobile,
  isTablet: isTablet(),
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
});

export default {
  isWeb,
  isIOS,
  isAndroid,
  isMobile,
  isTablet,
  getPlatformValue,
  getSafeAreaPadding,
  getShadowStyle,
  responsiveFontSize,
  hasCameraSupport,
  hasBiometricSupport,
  hasPushNotificationSupport,
  getApiUrl,
  getDeviceInfo,
};