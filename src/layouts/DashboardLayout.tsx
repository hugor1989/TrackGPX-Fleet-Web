import React from 'react';
import { View, Text } from 'react-native';

export default function DashboardLayout({ children }) {
  return (
    <View className="flex-row min-h-screen">
      <View className="w-52 bg-gray-800 h-full p-4">
        <Text className="text-white text-lg mb-4">Sidebar</Text>
        {/* Links del menú aquí */}
      </View>
      <View className="flex-1 bg-gray-100 p-4">
        <View className="h-16 bg-white justify-center px-4 shadow mb-4">
          <Text className="text-gray-800 text-xl">Navbar</Text>
        </View>
        {children}
      </View>
    </View>
  );
}
