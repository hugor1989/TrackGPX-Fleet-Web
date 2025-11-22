import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";

export default function Navbar({ user = "Demo", toggleSidebar, isWeb }) {
  return (
    <View className="flex-row items-center justify-between h-16 px-4 md:px-8 bg-white border-b border-gray-200">
      {/* Botón hamburguesa SIEMPRE visible */}
      <TouchableOpacity className="mr-2 p-2" onPress={toggleSidebar}>
        <Text className="text-2xl">☰</Text>
      </TouchableOpacity>
      {/* Solo en web: resto del navbar */}
      {isWeb && (
        <>
          <Text className="text-lg font-bold text-[#223d68]">GeoKey</Text>
          <View className="flex-row items-center bg-[#f4f6fa] rounded-lg px-4 py-1 w-44 md:w-80">
            <Text className="text-gray-400 mr-2">🔍</Text>
            <Text className="text-gray-600 opacity-60">IMEI/nombre/cuenta</Text>
          </View>
          <View className="flex-row items-center space-x-3">
            <TouchableOpacity className="mr-2">
              <Text className="text-xl">🔔</Text>
            </TouchableOpacity>
            <View className="w-8 h-8 items-center justify-center rounded-full bg-white shadow border border-[#e5e7eb] overflow-hidden">
              <Image
                source={require("../assets/logo-sin-fondo.png")}
                style={{ width: "80%", height: "80%", resizeMode: "contain" }}
              />
            </View>
            <Text className="ml-2 font-semibold text-[#163056]">{user}</Text>
          </View>
        </>
      )}
    </View>
  );
}
