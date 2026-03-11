import React, { useState } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, Modal, 
    ScrollView, TextInput, Image, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Vehicle } from '../api/mockData';
import vehicleService from '../api/vehicleService';
import { sendDeviceCommand } from '../api/commandService';

interface Props {
    visible: boolean;
    vehicle: Vehicle | null;
    onClose: () => void;
    onUpdateSuccess: (updatedVehicle: Vehicle) => void;
}

const ICON_OPTIONS = [
    { id: 'car-sport', label: 'Sedán' },
    { id: 'truck', label: 'Carga' },
    { id: 'bus', label: 'Autobús' },
    { id: 'motorcycle', label: 'Moto' },
    { id: 'nave_track', label: 'Nave Track' },
    { id: 'airplane', label: 'Avión' },
];

type CommandType = 'engineStop' | 'engineResume' | 'positionSingle' | 'reboot';

interface ConfirmModal {
    visible: boolean;
    command: CommandType | null;
    label: string;
}

export default function VehicleConfigModal({ visible, vehicle, onClose, onUpdateSuccess }: Props) {
    const [activeTab, setActiveTab] = useState<'details' | 'commands'>('details');
    const [selectedIcon, setSelectedIcon] = useState(vehicle?.map_icon || 'car-sport');
    const [loadingCommand, setLoadingCommand] = useState<string | null>(null);
    const [confirmModal, setConfirmModal] = useState<ConfirmModal>({
        visible: false,
        command: null,
        label: '',
    });
    const [resultModal, setResultModal] = useState<{ visible: boolean; success: boolean; message: string }>({
        visible: false,
        success: true,
        message: '',
    });

    if (!vehicle) return null;

    const handleCommand = (command: CommandType, label: string) => {
        if (!vehicle.deviceInfo?.id) {
            setResultModal({ visible: true, success: false, message: 'Este vehículo no tiene dispositivo GPS asignado' });
            return;
        }
        setConfirmModal({ visible: true, command, label });
    };

    const executeCommand = async () => {
        if (!confirmModal.command || !vehicle.deviceInfo?.id) return;

        const command = confirmModal.command;
        const label = confirmModal.label; // ← guardar antes de limpiar

        setConfirmModal({ visible: false, command: null, label: '' });

        try {
            setLoadingCommand(command);
            await sendDeviceCommand(vehicle.deviceInfo.id!, command);
            setResultModal({ visible: true, success: true, message: `Comando "${label}" enviado correctamente` });
        } catch (error) {
            setResultModal({ visible: true, success: false, message: `No se pudo enviar el comando "${label}"` });
        } finally {
            setLoadingCommand(null);
        }
    };

    const handleSave = async () => {
        try {
            const response = await vehicleService.updateVehicle(vehicle.id, { map_icon: selectedIcon });
            setResultModal({ visible: true, success: true, message: 'Configuración guardada correctamente' });
            if (onUpdateSuccess) onUpdateSuccess(response as any);
            onClose();
        } catch (error) {
            setResultModal({ visible: true, success: false, message: 'Error al guardar configuración' });
        }
    };

    const renderDetailsTab = () => (
        <ScrollView style={styles.tabContent}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Información del Dispositivo</Text>
                <View style={styles.row}>
                    <View style={styles.col}>
                        <Text style={styles.label}>Nombre</Text>
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

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Información del Vehículo</Text>
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

                <Text style={[styles.label, { marginTop: 15, marginBottom: 8 }]}>Icono del Mapa:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 10 }}>
                    {ICON_OPTIONS.map(icon => (
                        <TouchableOpacity
                            key={icon.id}
                            style={[styles.iconOption, selectedIcon === icon.id && styles.iconOptionSelected]}
                            onPress={() => setSelectedIcon(icon.id)}
                        >
                            <Image
                                source={{ uri: `https://backend.track-gpx.com.mx/assets/icons/map/${icon.id}.png` }}
                                style={[styles.iconImage, selectedIcon === icon.id && { tintColor: '#fff' }]}
                            />
                            <Text style={[styles.iconLabel, selectedIcon === icon.id && { color: '#fff' }]}>
                                {icon.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
            <View style={{ height: 20 }} />
        </ScrollView>
    );

    const renderCommandsTab = () => (
        <ScrollView style={styles.tabContent}>
            <View style={styles.grid}>
                <CommandButton icon="power" label="Paro de Motor" color="#ef4444"
                    loading={loadingCommand === 'engineStop'}
                    onPress={() => handleCommand('engineStop', 'Paro de Motor')} />
                <CommandButton icon="refresh-circle" label="Restaurar Motor" color="#10b981"
                    loading={loadingCommand === 'engineResume'}
                    onPress={() => handleCommand('engineResume', 'Restaurar Motor')} />
                <CommandButton icon="locate" label="Ubicación única" color="#f59e0b"
                    loading={loadingCommand === 'positionSingle'}
                    onPress={() => handleCommand('positionSingle', 'Ubicación única')} />
                <CommandButton icon="reload-circle" label="Reiniciar Dispositivo" color="#8b5cf6"
                    loading={loadingCommand === 'reboot'}
                    onPress={() => handleCommand('reboot', 'Reiniciar Dispositivo')} />
            </View>
        </ScrollView>
    );

    return (
        <>
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
                                onPress={() => setActiveTab('details')}>
                                <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>Detalle</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'commands' && styles.activeTab]}
                                onPress={() => setActiveTab('commands')}>
                                <Text style={[styles.tabText, activeTab === 'commands' && styles.activeTabText]}>Comandos</Text>
                            </TouchableOpacity>
                            <View style={styles.tabDisabled}><Text style={styles.tabTextDisabled}>Alertas</Text></View>
                            <View style={styles.tabDisabled}><Text style={styles.tabTextDisabled}>Mantenimiento</Text></View>
                        </View>

                        {/* Contenido */}
                        <View style={styles.contentContainer}>
                            {activeTab === 'details' ? renderDetailsTab() : renderCommandsTab()}
                        </View>

                        {/* Footer */}
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

            {/* Modal de Confirmación */}
            <Modal visible={confirmModal.visible} transparent animationType="fade">
                <View style={styles.alertOverlay}>
                    <View style={styles.alertBox}>
                        <Text style={styles.alertTitle}>Confirmar comando</Text>
                        <Text style={styles.alertMessage}>
                            ¿Deseas ejecutar "{confirmModal.label}" en {vehicle.name}?
                        </Text>
                        <View style={styles.alertButtons}>
                            <TouchableOpacity
                                style={styles.alertCancelBtn}
                                onPress={() => setConfirmModal({ visible: false, command: null, label: '' })}>
                                <Text style={styles.alertCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.alertConfirmBtn, confirmModal.command === 'engineStop' && { backgroundColor: '#ef4444' }]}
                                onPress={executeCommand}>
                                <Text style={styles.alertConfirmText}>Confirmar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal de Resultado */}
            <Modal visible={resultModal.visible} transparent animationType="fade">
                <View style={styles.alertOverlay}>
                    <View style={styles.alertBox}>
                        <Text style={styles.alertTitle}>
                            {resultModal.success ? '✅ Éxito' : '❌ Error'}
                        </Text>
                        <Text style={styles.alertMessage}>{resultModal.message}</Text>
                        <View style={styles.alertButtons}>
                            <TouchableOpacity
                                style={styles.alertConfirmBtn}
                                onPress={() => setResultModal({ visible: false, success: true, message: '' })}>
                                <Text style={styles.alertConfirmText}>Aceptar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const CommandButton = ({ icon, label, color, onPress, loading }: any) => (
    <TouchableOpacity
        style={[styles.cmdBtn, { borderColor: color }, loading && styles.cmdBtnDisabled]}
        onPress={onPress}
        disabled={loading}>
        <View style={[styles.cmdIcon, { backgroundColor: color }]}>
            {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Ionicons name={icon} size={24} color="#fff" />}
        </View>
        <Text style={styles.cmdLabel}>{label}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContainer: { width: '90%', height: '85%', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: '#e2e8f0' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
    closeBtn: { padding: 5 },
    tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
    tab: { paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 3, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: '#3b82f6' },
    tabText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
    activeTabText: { color: '#3b82f6' },
    tabDisabled: { paddingVertical: 12, paddingHorizontal: 20 },
    tabTextDisabled: { color: '#cbd5e1' },
    contentContainer: { flex: 1, backgroundColor: '#fff' },
    tabContent: { padding: 20 },
    section: { marginBottom: 25 },
    sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#3b82f6', marginBottom: 15, textTransform: 'uppercase' },
    row: { flexDirection: 'row', gap: 15, marginBottom: 15 },
    col: { flex: 1 },
    label: { fontSize: 11, color: '#64748b', marginBottom: 5, fontWeight: '500' },
    input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, padding: 8, fontSize: 13, color: '#334155', backgroundColor: '#f8fafc' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, justifyContent: 'space-between' },
    cmdBtn: { width: '47%', padding: 15, borderRadius: 12, borderWidth: 1, alignItems: 'center', marginBottom: 10, backgroundColor: '#fff' },
    cmdBtnDisabled: { opacity: 0.5 },
    cmdIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    cmdLabel: { fontSize: 13, fontWeight: '600', color: '#334155' },
    footer: { flexDirection: 'row', justifyContent: 'flex-end', padding: 15, borderTopWidth: 1, borderColor: '#e2e8f0', gap: 10 },
    cancelBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1' },
    cancelBtnText: { color: '#64748b', fontWeight: '600' },
    saveBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 6, backgroundColor: '#3b82f6' },
    saveBtnText: { color: '#fff', fontWeight: '600' },
    iconOption: { width: 85, height: 85, justifyContent: 'center', alignItems: 'center', borderRadius: 15, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
    iconOptionSelected: { backgroundColor: '#3b82f6', borderColor: '#2563eb' },
    iconImage: { width: 35, height: 35, resizeMode: 'contain', marginBottom: 5 },
    iconLabel: { fontSize: 10, color: '#64748b', fontWeight: '700', textAlign: 'center' },
    alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    alertBox: { width: 300, backgroundColor: '#fff', borderRadius: 12, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 10 },
    alertTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 10 },
    alertMessage: { fontSize: 14, color: '#64748b', marginBottom: 20, lineHeight: 20 },
    alertButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
    alertCancelBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1' },
    alertCancelText: { color: '#64748b', fontWeight: '600' },
    alertConfirmBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, backgroundColor: '#3b82f6' },
    alertConfirmText: { color: '#fff', fontWeight: '600' },
});