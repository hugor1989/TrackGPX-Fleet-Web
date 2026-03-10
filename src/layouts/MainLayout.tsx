import React, { useState } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext'; // Importamos tu AuthContext
import FleetSidebar from './Sidebar'; // Tu componente actual (asegúrate de la ruta)

interface MainLayoutProps {
  children: React.ReactNode;
  activeMenu?: string; // Para saber qué ítem iluminar
}

export default function MainLayout({ children, activeMenu = 'Monitor' }: MainLayoutProps) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentMenu, setCurrentMenu] = useState(activeMenu);

  // Manejador para el cierre de sesión con confirmación
  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirm = window.confirm("¿Estás seguro que deseas cerrar sesión?");
      if (confirm) logout();
    } else {
      Alert.alert(
        "Cerrar Sesión",
        "¿Estás seguro que deseas salir del sistema?",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Salir", style: "destructive", onPress: logout }
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <FleetSidebar
        selected={currentMenu}
        onMenuSelect={(menu) => setCurrentMenu(menu)}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        
        // CONEXIÓN CLAVE 1: Datos del usuario real
        userInfo={{
          name: user?.name || 'Usuario',
          company: user?.company?.name || 'Mi Empresa',
          email: user?.email,
          avatar: null // O la URL si la tienes en user.avatar_url
        }}

        // CONEXIÓN CLAVE 2: Función de Logout
        onLogout={handleLogout}
        
        // Datos simulados (luego los conectarás a una API real de estadísticas)
        fleetStats={{
          enMovimiento: 12,
          detenidos: 5,
          sinSenal: 1,
          alertasCriticas: 0
        }}
      />

      {/* Contenido de la pantalla (Dashboard, Mapa, etc.) */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row', // Pone el Sidebar al lado del contenido
    backgroundColor: '#f4f6f8', // Color de fondo general
    height: Platform.OS === 'web' ? '100vh' : '100%',
  },
  content: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden', // Importante para mapas
  },
});