// src/navigation/types.ts

import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Tipos del Auth Stack
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

// Tipos del Root Stack
export type RootStackParamList = {
  Auth: undefined;
  Dashboard: undefined;
  // Agregar más pantallas aquí después
  ActivateDevice?: undefined;
  Plans?: undefined;
  PaymentMethods?: undefined;
};

// Helper types para navigation
export type AuthScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList>;
export type RootScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Declaración global para usar useNavigation sin tipos genéricos
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
