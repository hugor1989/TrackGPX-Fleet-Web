// App.tsx - Con debugging

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

// Importar pantallas directamente
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';

import Dashboard from './src/screens/Dashboard';

const Stack = createNativeStackNavigator();

export default function App() {
  console.log('🚀 App iniciando...');
  
  // Verificar que los componentes existen


  return (
    <NavigationContainer
      onReady={() => console.log('📱 Navigation ready')}
      onStateChange={(state) => console.log('🔄 Navigation state:', state)}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
        initialRouteName="Login"
      >
        {/* Pantallas de Auth */}
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{ title: 'Login' }}
        />
        <Stack.Screen 
          name="Register" 
          component={RegisterScreen}
          options={{ title: 'Register' }}
        />
        <Stack.Screen 
          name="ForgotPassword" 
          component={ForgotPasswordScreen}
          options={{ title: 'Forgot Password' }}
        />
        
        {/* Pantalla principal */}
        <Stack.Screen 
          name="Dashboard" 
          component={Dashboard}
          options={{ title: 'Dashboard' }}
        />
      </Stack.Navigator>
      <StatusBar style="light" />
    </NavigationContainer>
  );
}