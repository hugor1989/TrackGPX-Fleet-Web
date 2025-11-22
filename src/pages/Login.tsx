import React, { useState } from "react";
import { View, Text, TextInput, Image, TouchableOpacity, Platform, StyleSheet } from "react-native";
import { useNavigation } from '@react-navigation/native';

export default function LoginPage() {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const navigation = useNavigation();

  return (
    <View className="flex-1 bg-[#101624] items-center justify-center px-2">
      <Image
        source={{ uri: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1200&q=80" }}
        className="absolute w-full h-full opacity-60"
        resizeMode="cover"
        blurRadius={Platform.OS === "web" ? 0 : 20}
      />

      <View className="w-full max-w-md bg-white rounded-3xl shadow-2xl pt-16 pb-10 px-8 items-center relative z-10">
        {/* ✅ Tu logo está bien aquí, no lo toques */}
        <View style={{
          position: 'absolute',
          width: 120, height: 112,
          top: -56, left: '50%',
          transform: [{translateX: -56}],
          backgroundColor: 'white',
          borderRadius: 56,
          borderWidth: 4, borderColor: '#e5e7eb',
          shadowColor: '#000', shadowOffset: {width: 0, height: 10},
          shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 10,
          alignItems: 'center', justifyContent: 'center'
        }}>
          <Image
            source={require("../assets/logo-sin-fondo.png")}
            style={{width: 210, height: 100, resizeMode: 'contain'}}
          />
        </View>

        {/* Inputs */}
        <View className="mt-2 w-full">
          <View className="w-full flex-row items-center border border-gray-200 rounded-lg px-3 mb-4 bg-[#f9fafb]">
            <Text className="text-gray-400 text-lg mr-2">👤</Text>
            <TextInput
              placeholder="Account/IMEI"
              placeholderTextColor="#71717a"
              className="flex-1 py-3 text-gray-800"
              value={account}
              onChangeText={setAccount}
              autoCapitalize="none"
            />
          </View>
          <View className="w-full flex-row items-center border border-gray-200 rounded-lg px-3 mb-2 bg-[#f9fafb]">
            <Text className="text-gray-400 text-lg mr-2">🔒</Text>
            <TextInput
              placeholder="Please enter password"
              placeholderTextColor="#71717a"
              className="flex-1 py-3 text-gray-800"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
          <View className="w-full flex-row justify-between items-center mt-0 mb-6">
            <TouchableOpacity onPress={() => setRemember(!remember)} className="flex-row items-center">
              {/* ✅ CHECKBOX CORREGIDO - Usa StyleSheet */}
              <View style={[styles.checkbox, remember && styles.checkboxChecked]} />
              <Text className="text-gray-700 text-sm ml-2">Remember password</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text className="text-[#50b287] text-sm font-bold">Forgot Password?</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Botón Login */}
        <TouchableOpacity className="w-full bg-[#226bfc] rounded-full py-3 mb-2 active:bg-[#1353ca] shadow-lg"
          onPress={() => navigation.navigate('Dashboard')}>
          <Text className="text-white text-lg font-bold text-center tracking-wide">Login</Text>
        </TouchableOpacity>

        {/* Demo */}
        <TouchableOpacity>
          <Text className="text-gray-500 text-base mt-1">Demo&rarr;</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View className="absolute bottom-8 flex-row w-full justify-center space-x-6 z-10">
        <View className="flex flex-row space-x-3">
          <Text className="text-gray-400 bg-white rounded-2xl px-4 py-2 font-semibold">Android</Text>
          <Text className="text-gray-400 bg-white rounded-2xl px-4 py-2 font-semibold">iOS</Text>
          <Text className="text-gray-400 bg-white rounded-2xl px-4 py-2 font-semibold">Wechat</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 2,
    borderColor: "#50b287",
    borderRadius: 4,
    marginRight: 8,
    backgroundColor: "transparent",
  },
  checkboxChecked: {
    backgroundColor: "#50b287",
  },
});