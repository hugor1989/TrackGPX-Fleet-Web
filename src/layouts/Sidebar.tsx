import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Image,
  Animated,
  Platform,
  PanResponder,
  TextInput,
  ScrollView
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

// ============= TIPOS =============
interface FleetStats {
  enMovimiento: number;
  detenidos: number;
  sinSenal: number;
  alertasCriticas: number;
}

interface Notification {
  id: string;
  type: 'critical' | 'warning' | 'info';
  icon: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: () => void;
}

interface QuickAction {
  key: string;
  icon: string;
  label: string;
  badge?: number | string;
  pulse?: boolean;
  action: () => void;
}

interface SearchResult {
  category: string;
  items: Array<{
    id: string;
    title: string;
    subtitle?: string;
    icon: string;
    action: () => void;
  }>;
}

interface SubMenuItem {
  key: string;
  label: string;
  badge?: number | string;
}

interface MenuItem {
  key: string;
  label: string;
  icon: string;
  iconType?: 'Ionicons' | 'MaterialIcons';
  badge?: number | string;
  badgeType?: 'info' | 'warning' | 'danger';
  pulse?: boolean;
  subItems?: SubMenuItem[];
}

interface SidebarProps {
  selected: string;
  onMenuSelect: (menu: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  fleetStats?: FleetStats;
  notifications?: Notification[];
  quickActions?: QuickAction[];
  userInfo?: {
    name: string;
    company: string;
    email?: string;
    avatar?: any;
  };
  onLogout?: () => void;
  onSearch?: (query: string) => SearchResult[];
  mode?: 'normal' | 'compact' | 'collapsed';
  onModeChange?: (mode: 'normal' | 'compact' | 'collapsed') => void;
}

// ============= TEMA =============
const THEME = {
  colors: {
    sidebar: '#2c3e50',
    sidebarDark: '#34495e',
    active: '#3498db',
    hover: '#34495e',
    text: '#ecf0f1',
    textActive: '#ffffff',
    textMuted: '#95a5a6',
    success: '#27ae60',
    warning: '#f39c12',
    danger: '#e74c3c',
    info: '#3498db',
    badge: {
      info: '#3498db',
      warning: '#f39c12',
      danger: '#e74c3c',
    }
  },
  sizes: {
    normal: 280,
    compact: 180,
    collapsed: 70,
    min: 200,
    max: 400,
  },
};

// ============= COMPONENTE PRINCIPAL =============
export default function FleetSidebar({
  selected,
  onMenuSelect,
  open,
  setOpen,
  fleetStats = { enMovimiento: 45, detenidos: 12, sinSenal: 3, alertasCriticas: 2 },
  notifications = [],
  quickActions = [],
  userInfo,
  onLogout,
  onSearch,
  mode = 'normal',
  onModeChange,
}: SidebarProps) {
  // Estados
  const [currentMode, setCurrentMode] = useState<'normal' | 'compact' | 'collapsed'>(mode);
  const [sidebarWidth, setSidebarWidth] = useState(THEME.sizes[currentMode]);
  const [sidebarAnimation] = useState(new Animated.Value(sidebarWidth));
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [expandedSubmenus, setExpandedSubmenus] = useState<Set<string>>(new Set(['Monitor']));
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isResizing, setIsResizing] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(
    notifications.filter(n => !n.read).length
  );

  // Menú items para gestión de flotas
  const menuItems: MenuItem[] = useMemo(() => [
    { 
      key: "Dashboard", 
      label: "Dashboard", 
      icon: "speedometer-outline",
      iconType: 'Ionicons'
    },
    { 
      key: "Monitor", 
      label: "Monitor en Vivo", 
      icon: "location-outline",
      iconType: 'Ionicons',
      badge: fleetStats.enMovimiento,
      badgeType: 'info',
      subItems: [
        { key: "Monitor-Mapa", label: "Mapa Tiempo Real", badge: fleetStats.enMovimiento },
        { key: "Monitor-Lista", label: "Lista de Vehículos" },
        { key: "Monitor-Grupos", label: "Grupos y Rutas" },
        { key: "Monitor-Geocercas", label: "Geocercas" },
      ]
    },
    { 
      key: "Camaras", 
      label: "Cámaras", 
      icon: "videocam-outline",
      iconType: 'Ionicons',
      badge: 3,
      pulse: true,
      subItems: [
        { key: "Camaras-EnVivo", label: "En Vivo", badge: 3 },
        { key: "Camaras-Grabaciones", label: "Grabaciones" },
        { key: "Camaras-Eventos", label: "Eventos/Alertas" },
        { key: "Camaras-Config", label: "Configuración" },
      ]
    },
    { 
      key: "Historial", 
      label: "Historial y Rutas", 
      icon: "map-outline",
      iconType: 'Ionicons',
      subItems: [
        { key: "Historial-Recorridos", label: "Recorridos" },
        { key: "Historial-Paradas", label: "Paradas" },
        { key: "Historial-Kilometraje", label: "Kilometraje" },
        { key: "Historial-Comparar", label: "Comparar Vehículos" },
      ]
    },
    { 
      key: "Alertas", 
      label: "Alertas y Eventos", 
      icon: "notifications-outline",
      iconType: 'Ionicons',
      badge: fleetStats.alertasCriticas,
      badgeType: 'danger',
      pulse: fleetStats.alertasCriticas > 0,
      subItems: [
        { key: "Alertas-Activas", label: "Alertas Activas", badge: fleetStats.alertasCriticas },
        { key: "Alertas-Geocercas", label: "Geocercas" },
        { key: "Alertas-Velocidad", label: "Exceso de Velocidad" },
        { key: "Alertas-Mantenimiento", label: "Mantenimiento" },
        { key: "Alertas-Configurar", label: "Configurar Alertas" },
      ]
    },
    { 
      key: "Facturacion", 
      label: "Facturación", 
      icon: "receipt-outline",
      iconType: 'Ionicons',
      subItems: [
        { key: "Facturacion-MisSuscripciones", label: "Mis Suscripciones" },
        { key: "Facturacion-SolicitarFactura", label: "Solicitar Factura" },
        { key: "Facturacion-Historial", label: "Historial de Facturas" },
        { key: "Facturacion-MetodosPago", label: "Métodos de Pago" },
        { key: "Facturacion-DatosFiscales", label: "Datos Fiscales" },
      ]
    },
    { 
      key: "Multas", 
      label: "Multas y Verificaciones", 
      icon: "alert-circle-outline",
      iconType: 'Ionicons',
      badge: 2,
      badgeType: 'warning',
      subItems: [
        { key: "Multas-Consultar", label: "Consultar Multas" },
        { key: "Multas-Pendientes", label: "Pendientes de Pago", badge: 2 },
        { key: "Multas-Historial", label: "Historial" },
        { key: "Multas-Verificacion", label: "Verificación Vehicular" },
        { key: "Multas-Tenencias", label: "Tenencias" },
      ]
    },
    { 
      key: "Mantenimiento", 
      label: "Mantenimiento", 
      icon: "construct-outline",
      iconType: 'Ionicons',
      subItems: [
        { key: "Mantenimiento-Programado", label: "Programado" },
        { key: "Mantenimiento-Historial", label: "Historial" },
        { key: "Mantenimiento-Proveedores", label: "Proveedores" },
        { key: "Mantenimiento-Costos", label: "Costos" },
      ]
    },
    { 
      key: "Reportes", 
      label: "Reportes", 
      icon: "bar-chart-outline",
      iconType: 'Ionicons',
      subItems: [
        { key: "Reportes-Operativos", label: "Operativos" },
        { key: "Reportes-Financieros", label: "Financieros" },
        { key: "Reportes-Conductores", label: "Conductores" },
        { key: "Reportes-Combustible", label: "Combustible" },
        { key: "Reportes-Personalizados", label: "Personalizados" },
      ]
    },
    { 
      key: "Configuracion", 
      label: "Configuración", 
      icon: "settings-outline",
      iconType: 'Ionicons',
      subItems: [
        { key: "Config-Empresa", label: "Mi Empresa" },
        { key: "Config-Usuarios", label: "Usuarios y Roles" },
        { key: "Config-Vehiculos", label: "Vehículos" },
        { key: "Config-Dispositivos", label: "Dispositivos GPS" },
        { key: "Config-Integraciones", label: "Integraciones" },
      ]
    },
    { 
      key: "Ayuda", 
      label: "Ayuda y Soporte", 
      icon: "help-circle-outline",
      iconType: 'Ionicons',
      subItems: [
        { key: "Ayuda-Guias", label: "Guías" },
        { key: "Ayuda-Videos", label: "Videotutoriales" },
        { key: "Ayuda-Soporte", label: "Contactar Soporte" },
        { key: "Ayuda-Changelog", label: "Novedades" },
      ]
    },
  ], [fleetStats]);

  // Quick Actions por defecto
  const defaultQuickActions: QuickAction[] = useMemo(() => [
    { 
      key: 'add-vehicle', 
      icon: 'add-circle-outline', 
      label: 'Añadir Vehículo',
      action: () => console.log('Añadir vehículo')
    },
    { 
      key: 'cameras', 
      icon: 'videocam', 
      label: 'Cámaras',
      badge: 3,
      pulse: true,
      action: () => onMenuSelect('Camaras-EnVivo')
    },
    { 
      key: 'alerts', 
      icon: 'notifications', 
      label: 'Alertas',
      badge: fleetStats.alertasCriticas,
      pulse: fleetStats.alertasCriticas > 0,
      action: () => setShowNotifications(true)
    },
    { 
      key: 'invoice', 
      icon: 'receipt', 
      label: 'Facturar',
      action: () => onMenuSelect('Facturacion-Emitir')
    },
  ], [fleetStats, onMenuSelect]);

  const activeQuickActions = quickActions.length > 0 ? quickActions : defaultQuickActions;

  // Keyboard shortcuts
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setShowNotifications(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Funciones
  const changeMode = (newMode: 'normal' | 'compact' | 'collapsed') => {
    const newWidth = THEME.sizes[newMode];
    
    Animated.timing(sidebarAnimation, {
      toValue: newWidth,
      duration: 300,
      useNativeDriver: false,
    }).start();
    
    setCurrentMode(newMode);
    setSidebarWidth(newWidth);
    setOpen(newMode !== 'collapsed');
    onModeChange?.(newMode);
  };

  const toggleSubmenu = (key: string) => {
    setExpandedSubmenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const renderIcon = (item: MenuItem, isActive: boolean) => {
    const iconColor = isActive ? THEME.colors.textActive : THEME.colors.text;
    const IconComponent = item.iconType === 'MaterialIcons' ? MaterialIcons : Ionicons;
    
    return (
      <IconComponent 
        name={item.icon as any} 
        size={22} 
        color={iconColor} 
      />
    );
  };

  const renderBadge = (badge?: number | string, badgeType: string = 'info', pulse?: boolean) => {
    if (!badge) return null;

    const badgeColor = THEME.colors.badge[badgeType as keyof typeof THEME.colors.badge];

    return (
      <View style={[styles.badge, { backgroundColor: badgeColor }, pulse && styles.badgePulse]}>
        <Text style={styles.badgeText}>
          {typeof badge === 'number' && badge > 99 ? '99+' : badge}
        </Text>
      </View>
    );
  };

  const isExpanded = currentMode === 'normal';
  const isCompact = currentMode === 'compact';
  const isCollapsed = currentMode === 'collapsed';

  // Drag to resize
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => setIsResizing(true),
      onPanResponderMove: (_, gestureState) => {
        const newWidth = Math.max(
          THEME.sizes.min,
          Math.min(THEME.sizes.max, sidebarWidth + gestureState.dx)
        );
        setSidebarWidth(newWidth);
        sidebarAnimation.setValue(newWidth);
      },
      onPanResponderRelease: (_, gestureState) => {
        setIsResizing(false);
        const finalWidth = Math.max(
          THEME.sizes.min,
          Math.min(THEME.sizes.max, sidebarWidth + gestureState.dx)
        );
        
        let newMode: 'normal' | 'compact' | 'collapsed';
        if (finalWidth < 100) newMode = 'collapsed';
        else if (finalWidth < 220) newMode = 'compact';
        else newMode = 'normal';
        
        changeMode(newMode);
      },
    })
  ).current;

  return (
    <>
      <Animated.View style={[styles.sidebar, { width: sidebarAnimation }]}>
        {/* Logo */}
        <TouchableOpacity 
          style={styles.logoContainer}
          onPress={() => changeMode(isCollapsed ? 'normal' : 'collapsed')}
        >
          <View style={styles.logoWrapper}>
            <Image 
              source={require("../assets/logo-blanco.png")}
              style={[
                styles.logoImage,
                isCompact && styles.logoImageCompact,
                isCollapsed && styles.logoImageCollapsed
              ]}
              resizeMode="contain"
              onError={() => console.log('Error loading logo')}
            />
          </View>
        </TouchableOpacity>

        {/* Búsqueda */}
        {isExpanded && (
          <TouchableOpacity 
            style={styles.searchBar}
            onPress={() => setShowSearch(true)}
          >
            <Ionicons name="search" size={18} color={THEME.colors.textMuted} />
            <Text style={styles.searchPlaceholder}>Buscar... (Ctrl+K)</Text>
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        {!isCollapsed && (
          <View style={styles.quickActions}>
            {activeQuickActions.map(action => (
              <TouchableOpacity
                key={action.key}
                style={styles.quickActionButton}
                onPress={action.action}
              >
                <View style={styles.quickActionContent}>
                  <Ionicons 
                    name={action.icon as any} 
                    size={20} 
                    color={THEME.colors.text} 
                  />
                  {action.badge && renderBadge(action.badge, 'danger', action.pulse)}
                </View>
                {isExpanded && (
                  <Text style={styles.quickActionLabel}>{action.label}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Widget de Estado de Flota */}
        {isExpanded && (
          <View style={styles.fleetStatsWidget}>
            <View style={styles.statRow}>
              <View style={[styles.statDot, { backgroundColor: THEME.colors.success }]} />
              <Text style={styles.statLabel}>En Movimiento</Text>
              <Text style={styles.statValue}>{fleetStats.enMovimiento}</Text>
            </View>
            <View style={styles.statRow}>
              <View style={[styles.statDot, { backgroundColor: THEME.colors.warning }]} />
              <Text style={styles.statLabel}>Detenidos</Text>
              <Text style={styles.statValue}>{fleetStats.detenidos}</Text>
            </View>
            <View style={styles.statRow}>
              <View style={[styles.statDot, { backgroundColor: THEME.colors.danger }]} />
              <Text style={styles.statLabel}>Sin Señal</Text>
              <Text style={styles.statValue}>{fleetStats.sinSenal}</Text>
            </View>
            {fleetStats.alertasCriticas > 0 && (
              <TouchableOpacity 
                style={styles.criticalAlert}
                onPress={() => onMenuSelect('Alertas-Activas')}
              >
                <Ionicons name="warning" size={16} color={THEME.colors.danger} />
                <Text style={styles.criticalAlertText}>
                  {fleetStats.alertasCriticas} alertas críticas
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Área de scroll para el menú */}
        <View style={styles.scrollContainer}>
          <ScrollView 
            style={styles.menuScrollView}
            contentContainerStyle={styles.menuContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {menuItems.map((item, index) => {
              const isActive = selected === item.key || selected.startsWith(item.key + '-');
              const isHovered = hoveredItem === item.key;
              const hasSubmenu = item.subItems && item.subItems.length > 0;
              const isSubmenuExpanded = expandedSubmenus.has(item.key);
              const showSeparator = index === 4 || index === 8;

              return (
                <View key={item.key}>
                  {showSeparator && <View style={styles.divider} />}

                  <TouchableOpacity
                    style={[
                      styles.menuItem,
                      isActive && styles.menuItemActive,
                      isHovered && !isActive && styles.menuItemHover,
                      isCollapsed && styles.menuItemCollapsed,
                    ]}
                    onPress={() => {
                      if (hasSubmenu && !isCollapsed) {
                        toggleSubmenu(item.key);
                      } else {
                        onMenuSelect(item.key);
                      }
                    }}
                    onMouseEnter={() => setHoveredItem(item.key)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <View style={styles.menuItemContent}>
                      {renderIcon(item, isActive)}
                      
                      {!isCollapsed && (
                        <>
                          <Text style={[
                            styles.menuText,
                            isActive && styles.menuTextActive,
                            isCompact && styles.menuTextCompact,
                          ]} numberOfLines={1}>
                            {item.label}
                          </Text>
                          {item.badge && renderBadge(item.badge, item.badgeType, item.pulse)}
                          
                          {hasSubmenu && isExpanded && (
                            <Ionicons 
                              name={isSubmenuExpanded ? "chevron-down" : "chevron-forward"} 
                              size={16} 
                              color={THEME.colors.text}
                              style={styles.submenuChevron}
                            />
                          )}
                        </>
                      )}
                    </View>

                    {isCollapsed && item.badge && (
                      <View style={styles.badgeDot} />
                    )}
                  </TouchableOpacity>

                  {/* Submenú */}
                  {hasSubmenu && isSubmenuExpanded && !isCollapsed && (
                    <View style={styles.submenuContainer}>
                      {item.subItems!.map((subItem) => {
                        const isSubActive = selected === subItem.key;
                        
                        return (
                          <TouchableOpacity
                            key={subItem.key}
                            style={[
                              styles.submenuItem,
                              isSubActive && styles.submenuItemActive,
                            ]}
                            onPress={() => onMenuSelect(subItem.key)}
                          >
                            <View style={styles.submenuDot} />
                            <Text style={[
                              styles.submenuText,
                              isSubActive && styles.submenuTextActive,
                            ]} numberOfLines={1}>
                              {subItem.label}
                            </Text>
                            {subItem.badge && renderBadge(subItem.badge, 'info')}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Footer con Usuario */}
        {userInfo && (
          <>
            <View style={styles.divider} />
            <View style={styles.footer}>
              <TouchableOpacity 
                style={[
                  styles.userSection,
                  isCollapsed && styles.userSectionCollapsed
                ]}
              >
                <View style={styles.avatarContainer}>
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarText}>
                      {userInfo.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.statusDot} />
                </View>

                {!isCollapsed && (
                  <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {userInfo.name}
                    </Text>
                    <Text style={styles.userCompany} numberOfLines={1}>
                      {userInfo.company}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {onLogout && !isCollapsed && (
                <TouchableOpacity 
                  style={styles.logoutButton}
                  onPress={onLogout}
                >
                  <Ionicons name="log-out-outline" size={20} color={THEME.colors.text} />
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* Resize Handle */}
        {Platform.OS === 'web' && !isCollapsed && (
          <View 
            {...panResponder.panHandlers}
            style={[
              styles.resizeHandle,
              isResizing && styles.resizeHandleActive
            ]}
          >
            <View style={styles.resizeHandleLine} />
          </View>
        )}
      </Animated.View>

      {/* Panel de Notificaciones */}
      {showNotifications && (
        <NotificationPanel
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          onNotificationClick={(notification) => {
            notification.action?.();
            setShowNotifications(false);
          }}
        />
      )}

      {/* Panel de Búsqueda */}
      {showSearch && (
        <SearchPanel
          query={searchQuery}
          onQueryChange={setSearchQuery}
          onSearch={onSearch}
          onClose={() => {
            setShowSearch(false);
            setSearchQuery('');
          }}
          onSelect={(item) => {
            item.action();
            setShowSearch(false);
            setSearchQuery('');
          }}
        />
      )}
    </>
  );
}

// ============= COMPONENTES AUXILIARES =============

// Panel de Notificaciones
function NotificationPanel({ 
  notifications, 
  onClose, 
  onNotificationClick 
}: { 
  notifications: Notification[];
  onClose: () => void;
  onNotificationClick: (notification: Notification) => void;
}) {
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'critical': return THEME.colors.danger;
      case 'warning': return THEME.colors.warning;
      default: return THEME.colors.info;
    }
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Notificaciones</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={THEME.colors.text} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.panelContent}>
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={48} color={THEME.colors.textMuted} />
              <Text style={styles.emptyStateText}>No hay notificaciones</Text>
            </View>
          ) : (
            notifications.map(notification => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationItem,
                  !notification.read && styles.notificationUnread
                ]}
                onPress={() => onNotificationClick(notification)}
              >
                <View style={[
                  styles.notificationIcon,
                  { backgroundColor: getNotificationColor(notification.type) }
                ]}>
                  <Ionicons 
                    name={notification.icon as any} 
                    size={20} 
                    color="#ffffff" 
                  />
                </View>
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                  <Text style={styles.notificationMessage}>{notification.message}</Text>
                  <Text style={styles.notificationTime}>
                    {notification.timestamp.toLocaleTimeString()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

// Panel de Búsqueda
function SearchPanel({
  query,
  onQueryChange,
  onSearch,
  onClose,
  onSelect
}: {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch?: (query: string) => SearchResult[];
  onClose: () => void;
  onSelect: (item: any) => void;
}) {
  const results = useMemo(() => {
    if (!query || !onSearch) return [];
    return onSearch(query);
  }, [query, onSearch]);

  return (
    <View style={styles.overlay}>
      <View style={styles.searchPanel}>
        <View style={styles.searchPanelHeader}>
          <Ionicons name="search" size={20} color={THEME.colors.textMuted} />
          <TextInput
            style={styles.searchPanelInput}
            placeholder="Buscar vehículos, conductores, rutas..."
            placeholderTextColor={THEME.colors.textMuted}
            value={query}
            onChangeText={onQueryChange}
            autoFocus
          />
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={THEME.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.searchResults}>
          {results.length === 0 && query.length > 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No se encontraron resultados</Text>
            </View>
          ) : (
            results.map((category, idx) => (
              <View key={idx} style={styles.searchCategory}>
                <Text style={styles.searchCategoryTitle}>{category.category}</Text>
                {category.items.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.searchResultItem}
                    onPress={() => onSelect(item)}
                  >
                    <Ionicons 
                      name={item.icon as any} 
                      size={20} 
                      color={THEME.colors.info} 
                    />
                    <View style={styles.searchResultContent}>
                      <Text style={styles.searchResultTitle}>{item.title}</Text>
                      {item.subtitle && (
                        <Text style={styles.searchResultSubtitle}>{item.subtitle}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

// ============= ESTILOS =============
const styles = StyleSheet.create({
  sidebar: {
    backgroundColor: THEME.colors.sidebar,
    height: '100vh',
    maxHeight: '100vh',
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.sidebarDark,
    flexShrink: 0,
  },
  logoWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  logoImage: {
    width: '100%',
    height: 80,
    maxWidth: 220,
  },
  logoImageCompact: {
    height: 50,
  },
  logoImageCollapsed: {
    height: 60,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.sidebarDark,
    marginHorizontal: 15,
    marginVertical: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    flexShrink: 0,
  },
  searchPlaceholder: {
    color: THEME.colors.textMuted,
    fontSize: 13,
    flex: 1,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 8,
    flexWrap: 'wrap',
    flexShrink: 0,
  },
  quickActionButton: {
    alignItems: 'center',
    gap: 4,
  },
  quickActionContent: {
    backgroundColor: THEME.colors.sidebarDark,
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  quickActionLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  fleetStatsWidget: {
    backgroundColor: THEME.colors.sidebarDark,
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 15,
    borderRadius: 8,
    flexShrink: 0,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statLabel: {
    flex: 1,
    color: THEME.colors.text,
    fontSize: 12,
  },
  statValue: {
    color: THEME.colors.textActive,
    fontSize: 14,
    fontWeight: 'bold',
  },
  criticalAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    gap: 6,
  },
  criticalAlertText: {
    color: THEME.colors.danger,
    fontSize: 11,
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  menuScrollView: {
    flex: 1,
    overflow: 'auto',
  },
  menuContent: {
    paddingBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginHorizontal: 10,
    marginVertical: 3,
    borderRadius: 8,
    position: 'relative',
  },
  menuItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  menuItemActive: {
    backgroundColor: THEME.colors.active,
  },
  menuItemHover: {
    backgroundColor: THEME.colors.hover,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuText: {
    color: THEME.colors.text,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 14,
    flex: 1,
  },
  menuTextCompact: {
    fontSize: 12,
  },
  menuTextActive: {
    color: THEME.colors.textActive,
    fontWeight: '600',
  },
  submenuChevron: {
    marginLeft: 4,
  },
  submenuContainer: {
    marginLeft: 20,
    marginTop: 4,
    marginBottom: 8,
  },
  submenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginHorizontal: 10,
    borderRadius: 6,
  },
  submenuItemActive: {
    backgroundColor: THEME.colors.hover,
  },
  submenuDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.colors.textMuted,
    marginRight: 12,
  },
  submenuText: {
    color: THEME.colors.text,
    fontSize: 13,
    flex: 1,
  },
  submenuTextActive: {
    color: THEME.colors.textActive,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  badgePulse: {
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.danger,
    position: 'absolute',
    top: 10,
    right: 20,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.sidebarDark,
    marginHorizontal: 15,
    marginVertical: 10,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: THEME.colors.sidebarDark,
    paddingVertical: 15,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  userSectionCollapsed: {
    justifyContent: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: THEME.colors.active,
  },
  avatarFallback: {
    backgroundColor: THEME.colors.active,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: THEME.colors.success,
    borderWidth: 2,
    borderColor: THEME.colors.sidebar,
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    color: THEME.colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  userCompany: {
    color: THEME.colors.textMuted,
    fontSize: 11,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: THEME.colors.sidebarDark,
  },
  resizeHandle: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 8,
    cursor: 'ew-resize',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  resizeHandleActive: {
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
  },
  resizeHandleLine: {
    width: 2,
    height: 40,
    backgroundColor: THEME.colors.active,
    borderRadius: 1,
    opacity: 0.5,
  },
  // Overlay y Paneles
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  panel: {
    backgroundColor: THEME.colors.sidebar,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.sidebarDark,
  },
  panelTitle: {
    color: THEME.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  panelContent: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.sidebarDark,
    gap: 12,
  },
  notificationUnread: {
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    color: THEME.colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationMessage: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  notificationTime: {
    color: THEME.colors.textMuted,
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    color: THEME.colors.textMuted,
    fontSize: 14,
    marginTop: 8,
  },
  searchPanel: {
    backgroundColor: THEME.colors.sidebar,
    width: '90%',
    maxWidth: 600,
    maxHeight: '70%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  searchPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.sidebarDark,
    gap: 12,
  },
  searchPanelInput: {
    flex: 1,
    color: THEME.colors.text,
    fontSize: 16,
    padding: 0,
  },
  searchResults: {
    flex: 1,
  },
  searchCategory: {
    paddingVertical: 10,
  },
  searchCategoryTitle: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    gap: 12,
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultTitle: {
    color: THEME.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  searchResultSubtitle: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
});