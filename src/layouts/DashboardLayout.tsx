import React, { useState, useEffect } from "react";
import { View, useWindowDimensions } from "react-native";
import Sidebar from "./Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const isWeb = width >= 768;
  const [selected, setSelected] = useState("Sistema");
  const [sidebarOpen, setSidebarOpen] = useState(isWeb);

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
      {/* Contenido principal SIN navbar */}
      <View className="flex-1">
        {children}
      </View>
    </View>
  );
}