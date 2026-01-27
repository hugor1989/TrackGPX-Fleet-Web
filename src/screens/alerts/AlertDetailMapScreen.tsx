// src/screens/alerts/AlertDetailMapScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MainLayout from '../../layouts/MainLayout';

export default function AlertDetailMapScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const alert = route.params?.alert;

  return (
    <MainLayout activeMenu="Alertas-Activas">
      <View style={styles.container}>
        <View style={styles.header}>
           <TouchableOpacity onPress={() => navigation.goBack()} style={{padding:8}}>
             <Ionicons name="arrow-back" size={24} color="#000"/>
           </TouchableOpacity>
           <Text style={styles.title}>Detalle de Alerta (Móvil)</Text>
        </View>
        
        <View style={styles.content}>
           <Text style={styles.info}>
             Para ver el mapa en la versión móvil, necesitaremos instalar 'react-native-maps' más adelante.
           </Text>
           <Text style={{marginTop: 20, fontWeight:'bold'}}>Evento:</Text>
           <Text>{alert?.message || 'Sin datos'}</Text>
        </View>
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection:'row', alignItems:'center', padding: 16, borderBottomWidth:1, borderColor:'#eee'},
  title: { fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  content: { padding: 20, alignItems: 'center', justifyContent: 'center', flex: 1 },
  info: { color: '#666', textAlign: 'center' }
});