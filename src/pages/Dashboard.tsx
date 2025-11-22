import React from 'react';
import { View, Text } from 'react-native';
import DashboardLayout from '../layouts/DashboardLayout';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <View className="p-4">
        <Text className="text-lg">Dashboard vacío</Text>
      </View>
    </DashboardLayout>
  );
}
