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

import EditMemberScreen from './src/screens/company/EditMemberScreen';

import AddDriverScreen from './src/screens/drivers/AddDriverScreen';

import DriversListScreen from './src/screens/drivers/DriversListScreen';

import DevicesListScreen from './src/screens/devices/DevicesListScreen';

import GeofencesListScreen from './src/screens/config/GeofencesListScreen';
import GeofenceMapScreen from './src/screens/config/GeofenceMapScreen';

import AlertsListScreen from './src/screens/alerts/AlertsListScreen';
import CreateAlertScreen from './src/screens/alerts/CreateAlertScreen';

import AlertLogsScreen from './src/screens/alerts/AlertLogsScreen';

import AlertDetailMapScreen from './src/screens/alerts/AlertDetailMapScreen';

import PlaybackScreenWeb from './src/screens/history/PlaybackScreen.web'; 

import StopsReportScreenWeb from './src/screens/reports/StopsReportScreen.web'; 
import MileageReportScreenWeb from './src/screens/reports/MileageReportScreen.web'; 
import DriverRankingScreen from './src/screens/reports/DriverRankingScreen.web'; 
import FinancialReportScreen from './src/screens/reports/FinancialReportScreen.web'; 
 
import VehicleListScreen from './src/screens/monitor/VehicleListScreen'; 
import VehicleMonitorDetailScreen from './src/screens/monitor/VehicleMonitorDetailScreen'; 

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
      <Stack.Screen name="EditMemberScreen" component={EditMemberScreen} />

      {/* Facturación y Pagos */}
      <Stack.Screen name="BillingInfo" component={BillingInfoScreen} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsAScreen} />
      <Stack.Screen name="Subscriptions" component={SubscriptionsScreen} />
      <Stack.Screen name="RequestInvoice" component={RequestInvoiceScreen} />
      <Stack.Screen name="InvoiceHistory" component={InvoiceHistoryScreen} />

      {/* 2. Registra la Lista (Esta es la que sale en el menú) */}
      <Stack.Screen name="GeofencesList" component={GeofencesListScreen} />
      
      {/* 3. Registra el Mapa (A esta llegamos desde el botón "+") */}
      <Stack.Screen name="GeofenceMap" component={GeofenceMapScreen} />

      <Stack.Screen name="AlertsList" component={AlertsListScreen} />
      <Stack.Screen name="CreateAlert" component={CreateAlertScreen} />
      {/* Vehículos */}
      <Stack.Screen name="VehiclesList" component={VehiclesListScreen} />
      <Stack.Screen name="VehicleForm" component={VehicleFormScreen} />
      <Stack.Screen name="VehicleDetail" component={VehicleDetailScreen} />
      <Stack.Screen name="DriversList" component={DriversListScreen} options={{ headerShown: false }} />
      <Stack.Screen 
          name="AddDriver" 
          component={AddDriverScreen} 
          options={{ headerShown: false }} // Usamos nuestro propio header personalizado
        />
      <Stack.Screen name="DevicesList" component={DevicesListScreen} options={{ headerShown: false }} />

      {/* 1. Alertas Activas (Bandeja de Entrada) */}
      <Stack.Screen 
        name="ActiveAlerts" 
        component={AlertLogsScreen} 
        initialParams={{ filterMode: 'active', title: 'Alertas Activas' }} 
      />

      {/* 2. Historial de Geocercas */}
      <Stack.Screen 
        name="GeofenceLog" 
        component={AlertLogsScreen} 
        initialParams={{ filterMode: 'geofence', title: 'Historial de Zonas' }} 
      />

      {/* 3. Historial de Velocidad */}
      <Stack.Screen 
        name="SpeedLog" 
        component={AlertLogsScreen} 
        initialParams={{ filterMode: 'speed', title: 'Excesos de Velocidad' }} 
      />

      {/* 4. Historial de Mantenimiento */}
      <Stack.Screen 
        name="MaintenanceLog" 
        component={AlertLogsScreen} 
        initialParams={{ filterMode: 'maintenance', title: 'Bitácora de Mantenimiento' }} 
      />

      <Stack.Screen name="AlertDetailMap" component={AlertDetailMapScreen} />

      <Stack.Screen name="Playback" component={PlaybackScreenWeb} />
      <Stack.Screen name="StopsReport" component={StopsReportScreenWeb} />
      <Stack.Screen name="MileageReport" component={MileageReportScreenWeb} />
      <Stack.Screen name="DriverRanking" component={DriverRankingScreen} />

      <Stack.Screen name="FinancialReport" component={FinancialReportScreen} />
      <Stack.Screen name="VehicleList" component={VehicleListScreen} />
      <Stack.Screen name="VehicleMonitorDetail" component={VehicleMonitorDetailScreen} />
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