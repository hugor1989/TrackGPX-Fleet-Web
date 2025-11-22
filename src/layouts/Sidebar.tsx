import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";

const menuItems = [
  { icon: "📍", label: "Monitor" },
  { icon: "🎥", label: "Video" },
  { icon: "💼", label: "Negocio" },
  { icon: "💰", label: "Centro de Finanzas" },
  { icon: "📄", label: "Informe" },
  { icon: "⚙️", label: "Sistema" },
  { icon: "🗝️", label: "GeoKey" },
];

export default function Sidebar({ selected, onMenuSelect, open, alwaysVisible }) {
  if (!open) return null;
  return (
    <View className="bg-[#163056] h-full w-56 md:w-64 relative z-50 transition-all duration-200">
      <View className="items-center mt-8 mb-12 flex-row px-2 space-x-2">
        <View className="w-12 h-12 items-center justify-center rounded-full bg-white shadow border border-[#e5e7eb] overflow-hidden">
          <Image
            source={require("../assets/logo-sin-fondo.png")}
            style={{ width: "80%", height: "80%", resizeMode: "contain" }}
          />
        </View>
        <Text className="text-white text-2xl font-bold ml-1">
          Track<Text className="text-[#50b287]">GPX</Text>
        </Text>
      </View>
      <View className="flex-1 space-y-1">
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.label}
            onPress={() => onMenuSelect(item.label)}
            className={`flex-row items-center px-6 py-3 ${
              selected === item.label ? "bg-[#223d68] rounded-l-2xl" : ""
            }`}
          >
            <Text className="text-xl mr-3">{item.icon}</Text>
            <Text className={`text-base ${selected === item.label ? "text-white font-bold" : "text-gray-300"}`}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View className="px-6 py-4">
        <Text className="text-gray-500 text-sm text-center">© TrackGPX 2025</Text>
      </View>
    </View>
  );
}
