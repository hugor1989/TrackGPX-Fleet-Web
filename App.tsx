import React from 'react';
import { View, ActivityIndicator, StyleSheet, Image } from 'react-native';
import './global.css';

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// 1. Importamos el Contexto y el Provider
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Importar pantallas
import LoginScreen from './src/screens/auth/LoginScreen';
import DashboardPage from './src/screens/Dashboard';
import ActivateDeviceScreen from './src/screens/devices/ActivateDeviceScreen';
import CompanyInfoScreen from './src/screens/company/CompanyInfoScreen';
import TeamScreen from './src/screens/company/TeamScreen';
import AddMemberScreen from './src/screens/company/AddMemberScreen';
import BillingInfoScreen from './src/screens/billing/BillingInfoScreen';
import PaymentMethodsAScreen from './src/screens/payments/PaymentMethodsAScreen';
import SubscriptionsScreen from './src/screens/subscriptions/SubscriptionsScreen';
import RequestInvoiceScreen from './src/screens/invoices/RequestInvoiceScreen';
import InvoiceHistoryScreen from './src/screens/invoices/InvoiceHistoryScreen';
import VehiclesListScreen from './src/screens/vehicles/VehiclesListScreen';
import VehicleFormScreen from './src/screens/vehicles/VehicleFormScreen';
import VehicleDetailScreen from './src/screens/vehicles/VehicleDetailScreen';

const Stack = createNativeStackNavigator();

// ----------------------------------------------------------------------
// 2. Definimos el Stack para usuarios NO autenticados
// ----------------------------------------------------------------------
const AuthNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      {/* Aquí podrías agregar RegisterScreen o ForgotPasswordScreen */}
    </Stack.Navigator>
  );
};

// ----------------------------------------------------------------------
// 3. Definimos el Stack para usuarios SI autenticados (Privado)
// ----------------------------------------------------------------------
const MainNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={DashboardPage} />
      
      {/* Dispositivos */}
      <Stack.Screen name="ActivateDevice" component={ActivateDeviceScreen} />
      
      {/* Compañía y Equipo */}
      <Stack.Screen name="CompanyInfo" component={CompanyInfoScreen} />
      <Stack.Screen name="TeamScreen" component={TeamScreen} />
      <Stack.Screen name="AddMemberScreen" component={AddMemberScreen} />
      
      {/* Facturación y Pagos */}
      <Stack.Screen name="BillingInfo" component={BillingInfoScreen} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsAScreen} />
      <Stack.Screen name="Subscriptions" component={SubscriptionsScreen} />
      <Stack.Screen name="RequestInvoice" component={RequestInvoiceScreen} />
      <Stack.Screen name="InvoiceHistory" component={InvoiceHistoryScreen} />
      
      {/* Vehículos */}
      <Stack.Screen name="VehiclesList" component={VehiclesListScreen} />
      <Stack.Screen name="VehicleForm" component={VehicleFormScreen} />
      <Stack.Screen name="VehicleDetail" component={VehicleDetailScreen} />
    </Stack.Navigator>
  );
};

// ----------------------------------------------------------------------
// 4. Componente Controlador de Navegación
// ----------------------------------------------------------------------
const NavigationWrapper = () => {
  const { user, isSplashLoading } = useAuth();

  // Pantalla de carga mientras verificamos el token guardado
  if (isSplashLoading) {
    return (
      <View style={styles.loadingContainer}>
        {/* Puedes poner tu logo aquí */}
        <ActivityIndicator size="large" color="#226bfc" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {/* Si existe usuario, mostramos la App, si no, el Login */}
      {user ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

// ----------------------------------------------------------------------
// 5. App Principal
// ----------------------------------------------------------------------
export default function App() {
  return (
    // Envolvemos TODO en el AuthProvider
    <AuthProvider>
      <NavigationWrapper />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#101624', // Mismo color de fondo que tu Login
  },
});