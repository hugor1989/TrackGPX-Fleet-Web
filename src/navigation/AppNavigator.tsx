// src/navigation/AppNavigator.tsx

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthNavigator from './AuthNavigator';
import DashboardScreen from '../screens/Dashboard';
import authService from '../api/authService';
import { ActivityIndicator, View } from 'react-native';

// Tipos de navegación principal
export type RootStackParamList = {
  Auth: undefined;
  Dashboard: undefined;
  // Aquí irán más pantallas después
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar autenticación al iniciar
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const authenticated = await authService.isAuthenticated();
      setIsAuthenticated(authenticated);
    } catch (error) {
      console.error('Error checking auth:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Mostrar loading mientras verifica
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#101624' }}>
        <ActivityIndicator size="large" color="#226bfc" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
        initialRouteName={isAuthenticated ? 'Dashboard' : 'Auth'}
      >
        {/* Pantallas de autenticación */}
        <Stack.Screen 
          name="Auth" 
          component={AuthNavigator}
        />
        
        {/* Pantallas principales (protegidas) */}
        <Stack.Screen 
          name="Dashboard" 
          component={DashboardScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}