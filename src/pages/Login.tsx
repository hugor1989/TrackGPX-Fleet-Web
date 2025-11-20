
import "nativewind";
import React, { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <View className="flex-1 justify-center items-center bg-white">
      <Text className="text-2xl font-bold mb-6">Iniciar sesión</Text>
      <TextInput 
        className="border p-2 mb-3 w-64 rounded"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        className="border p-2 mb-3 w-64 rounded"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Entrar" onPress={() => {}} />
    </View>
  );
}
