import React, { useState } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, Modal, 
    ScrollView, TextInput, Image, Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Vehicle } from '../api/mockData';
import vehicleService from '../api/vehicleService';

interface Props {
    visible: boolean;
    vehicle: Vehicle | null;
    onClose: () => void;
    onUpdateSuccess: (updatedVehicle: Vehicle) => void;
}

// Opciones de Iconos (Simuladas)
const ICON_OPTIONS = [
    { id: 'car-sport', label: 'Sedán', type: 'image' },
    { id: 'truck', label: 'Carga', type: 'image' },
    { id: 'bus', label: 'Autobús', type: 'image' },
    { id: 'motorcycle', label: 'Moto', type: 'image' },
    { id: 'nave_track', label: 'Nave Track', type: 'image' },
    { id: 'airplane', label: 'Avión', type: 'image' },
];
export default function VehicleConfigModal({ visible, vehicle, onClose, onUpdateSuccess }: Props) {
    const [activeTab, setActiveTab] = useState<'details' | 'commands'>('details');
    const [selectedIcon, setSelectedIcon] = useState(vehicle?.map_icon || 'car-sport');

    if (!vehicle) return null;

    // --- TAB 1: DETALLE (Formulario) ---
    const renderDetailsTab = () => (
        <ScrollView style={styles.tabContent}>
            
            {/* Sección 1: Info Dispositivo */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                    <Ionicons name="hardware-chip-outline" size={16} /> Información del Dispositivo
                </Text>
                
                <View style={styles.row}>
                    <View style={styles.col}>
                        <Text style={styles.label}>Nombre del dispositivo</Text>
                        <TextInput style={styles.input} value={vehicle.name} editable={false} />
                    </View>
                    <View style={styles.col}>
                        <Text style={styles.label}>Modelo</Text>
                        <TextInput style={styles.input} value={vehicle.deviceInfo?.model} editable={false} />
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={styles.col}>
                        <Text style={styles.label}>IMEI</Text>
                        <TextInput style={styles.input} value={vehicle.deviceInfo?.imei} editable={false} />
                    </View>
                    <View style={styles.col}>
                        <Text style={styles.label}>Tarjeta SIM</Text>
                        <TextInput style={styles.input} value={vehicle.deviceInfo?.sim} editable={false} />
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={styles.col}>
                        <Text style={styles.label}>Fecha Activación</Text>
                        <TextInput style={styles.input} value={vehicle.deviceInfo?.activationDate} editable={false} />
                    </View>
                    <View style={styles.col}>
                        <Text style={styles.label}>Vencimiento Plataforma</Text>
                        <TextInput style={styles.input} value={vehicle.deviceInfo?.platformExpiry} editable={false} />
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={styles.col}>
                        <Text style={styles.label}>ICCID</Text>
                        <TextInput style={styles.input} value={vehicle.deviceInfo?.iccid} editable={false} />
                    </View>
                </View>
            </View>

            {/* Sección 2: Info Vehículo */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                    <Ionicons name="car-outline" size={16} /> Información del Vehículo
                </Text>

                <View style={styles.row}>
                    <View style={styles.col}>
                        <Text style={styles.label}>Número de Placa</Text>
                        <TextInput style={styles.input} value={vehicle.plate} editable={false} />
                    </View>
                    <View style={styles.col}>
                        <Text style={styles.label}>Conductor</Text>
                        <TextInput style={styles.input} value={vehicle.driverName} editable={false} />
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={styles.col}>
                        <Text style={styles.label}>Teléfono Contacto</Text>
                        <TextInput style={styles.input} value={vehicle.contactPhone} editable={false} />
                    </View>
                </View>

                {/* Selector de Iconos */}
                <Text style={[styles.label, {marginTop:15, marginBottom: 8}]}>Icono del Mapa:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 12, paddingBottom: 10}}>
                        {ICON_OPTIONS.map(icon => (
                            <TouchableOpacity 
                                key={icon.id} 
                                style={[
                                    styles.iconOption, 
                                    selectedIcon === icon.id && styles.iconOptionSelected
                                ]}
                                onPress={() => setSelectedIcon(icon.id)}
                            >
                                <Image 
                                    source={{ uri: `http://127.0.0.1:8000/assets/icons/map/${icon.id}.png` }} 
                                    style={[
                                        styles.iconImage,
                                        selectedIcon === icon.id && { tintColor: '#fff' } // Opcional: si tus iconos son planos/monocromáticos
                                    ]}
                                />
                                <Text style={[
                                    styles.iconLabel, 
                                    selectedIcon === icon.id && { color: '#fff' }
                                ]}>
                                    {icon.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
            </View>

            <View style={{height: 20}} /> 
        </ScrollView>
    );

    const handleSave = async () => {
        try {
            // Creamos el objeto siguiendo la estructura de UpdateVehicleRequest
            // Si tu interfaz pide otros campos obligatorios, inclúyelos aquí
            const dataToUpdate = {
                map_icon: selectedIcon // El valor de tu estado 'selectedIcon' (ej: 'truck')
            };

            // 1. Llamada a tu API pasando el ID y el objeto
            const response = await vehicleService.updateVehicle(vehicle.id, dataToUpdate);

            // 2. Avisar al usuario (usando la data que regresa la promesa si es necesario)
            alert('Configuración guardada correctamente');
            
            // 3. Notificar al Dashboard para que el mapa se actualice sin recargar
            // IMPORTANTE: Asegúrate de que 'onUpdateSuccess' reciba el vehículo actualizado
            if (onUpdateSuccess) {
                // Si tu API devuelve { success: true, data: Vehicle }, extrae la data
                const updatedVehicle = response || response; 
                onUpdateSuccess(updatedVehicle as any);
            }

            onClose();
            
        } catch (error) {
            console.error('Error al guardar:', error);
            alert('Error al guardar configuración');
        }
    };
    // --- TAB 2: COMANDOS (Botones) ---
    const renderCommandsTab = () => (
        <ScrollView style={styles.tabContent}>
            <View style={styles.grid}>
                <CommandButton icon="power" label="Paro de Motor" color="#ef4444" />
                <CommandButton icon="refresh-circle" label="Restaurar Motor" color="#10b981" />
                <CommandButton icon="camera" label="Petición de Foto" color="#3b82f6" />
                <CommandButton icon="locate" label="Ubicación única" color="#f59e0b" />
                <CommandButton icon="lock-closed" label="Cerrar Seguros" color="#64748b" />
                <CommandButton icon="lock-open" label="Abrir Seguros" color="#64748b" />
                <CommandButton icon="speedometer" label="Límite Velocidad" color="#8b5cf6" />
                <CommandButton icon="mic" label="Escucha Remota" color="#ec4899" />
            </View>
        </ScrollView>
    );

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Configuración: {vehicle.name}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabsContainer}>
                        <TouchableOpacity 
                            style={[styles.tab, activeTab === 'details' && styles.activeTab]}
                            onPress={() => setActiveTab('details')}
                        >
                            <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>Detalle</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.tab, activeTab === 'commands' && styles.activeTab]}
                            onPress={() => setActiveTab('commands')}
                        >
                            <Text style={[styles.tabText, activeTab === 'commands' && styles.activeTabText]}>Comandos</Text>
                        </TouchableOpacity>
                        
                        {/* Tabs Deshabilitados (Visuales) */}
                        <View style={styles.tabDisabled}><Text style={styles.tabTextDisabled}>Alertas</Text></View>
                        <View style={styles.tabDisabled}><Text style={styles.tabTextDisabled}>Mantenimiento</Text></View>
                    </View>

                    {/* Contenido Dinámico */}
                    <View style={styles.contentContainer}>
                        {activeTab === 'details' ? renderDetailsTab() : renderCommandsTab()}
                    </View>

                    {/* Footer con Botón Guardar (Solo en detalle) */}
                    {activeTab === 'details' && (
                        <View style={styles.footer}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                                <Text style={styles.cancelBtnText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                                <Text style={styles.saveBtnText}>Confirmar</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

// Componente auxiliar para botones de comando
const CommandButton = ({ icon, label, color }: any) => (
    <TouchableOpacity style={[styles.cmdBtn, { borderColor: color }]}>
        <View style={[styles.cmdIcon, { backgroundColor: color }]}>
            <Ionicons name={icon} size={24} color="#fff" />
        </View>
        <Text style={styles.cmdLabel}>{label}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContainer: { width: '90%', height: '85%', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
    
    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: '#e2e8f0' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
    closeBtn: { padding: 5 },

    // Tabs
    tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
    tab: { paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 3, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: '#3b82f6' },
    tabText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
    activeTabText: { color: '#3b82f6' },
    tabDisabled: { paddingVertical: 12, paddingHorizontal: 20 },
    tabTextDisabled: { color: '#cbd5e1' },

    // Contenido
    contentContainer: { flex: 1, backgroundColor: '#fff' },
    tabContent: { padding: 20 },
    
    // Secciones Formulario
    section: { marginBottom: 25 },
    sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#3b82f6', marginBottom: 15, textTransform:'uppercase' },
    row: { flexDirection: 'row', gap: 15, marginBottom: 15 },
    col: { flex: 1 },
    label: { fontSize: 11, color: '#64748b', marginBottom: 5, fontWeight:'500' },
    input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, padding: 8, fontSize: 13, color: '#334155', backgroundColor: '#f8fafc' },

    // Icon Selector
    iconSelector: { flexDirection: 'row', gap: 10, marginTop: 5 },

    // Grid Comandos
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, justifyContent:'space-between' },
    cmdBtn: { width: '47%', padding: 15, borderRadius: 12, borderWidth: 1, alignItems: 'center', marginBottom: 10, backgroundColor: '#fff' },
    cmdIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    cmdLabel: { fontSize: 13, fontWeight: '600', color: '#334155' },

    // Footer
    footer: { flexDirection: 'row', justifyContent: 'flex-end', padding: 15, borderTopWidth: 1, borderColor: '#e2e8f0', gap: 10 },
    cancelBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1' },
    cancelBtnText: { color: '#64748b', fontWeight: '600' },
    saveBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 6, backgroundColor: '#3b82f6' },
    saveBtnText: { color: '#fff', fontWeight: '600' },

    iconOption: { 
    width: 85, 
    height: 85, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderRadius: 15, 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    backgroundColor: '#f8fafc',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
    },
    iconOptionSelected: { 
        backgroundColor: '#3b82f6', 
        borderColor: '#2563eb' 
    },
    iconImage: { 
        width: 35, 
        height: 35, 
        resizeMode: 'contain',
        marginBottom: 5
    },
    iconLabel: { 
        fontSize: 10, 
        color: '#64748b', 
        fontWeight: '700',
        textAlign: 'center'
    },
});