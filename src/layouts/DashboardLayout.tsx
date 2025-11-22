import React, { useState, useEffect } from "react";
import { View, useWindowDimensions } from "react-native";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function DashboardLayout({ children }) {
  const { width } = useWindowDimensions();
  const isWeb = width >= 768; // md breakpoint
  const [selected, setSelected] = useState("Sistema");

  // Sidebar abierto por defecto EN WEB, cerrado por defecto EN MOBILE
  const [sidebarOpen, setSidebarOpen] = useState(isWeb);

  // Al cambiar de tamaño (ej. redimensionar ventana), cambia el default automáticamente
  useEffect(() => {
    setSidebarOpen(isWeb);
  }, [isWeb]);

  const toggleSidebar = () => setSidebarOpen((v) => !v);

  return (
    <View className="flex-row min-h-screen bg-[#f4f6fa]">
      <Sidebar
        selected={selected}
        onMenuSelect={setSelected}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        alwaysVisible={isWeb}
      />
      <View className="flex-1">
        <Navbar user="Demo" toggleSidebar={toggleSidebar} isWeb={isWeb} />
        <View className="p-2 md:p-6">{children}</View>
      </View>
    </View>
  );
}
