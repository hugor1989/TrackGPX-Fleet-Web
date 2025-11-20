import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginPage from '../pages/Login';
import DashboardPage from '../pages/Dashboard';

const Stack = createNativeStackNavigator();

export default function RootRouter() {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginPage} />
      <Stack.Screen name="Dashboard" component={DashboardPage} />
    </Stack.Navigator>
  );
}
