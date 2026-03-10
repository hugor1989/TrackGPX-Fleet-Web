import React, { useState, useCallback } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, 
    TextInput, Modal, ActivityIndicator, Alert, FlatList, Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import MainLayout from '../../layouts/MainLayout';
import groupService from '../../api/groupService';
import vehicleService from '../../api/vehicleService';

// Paleta de colores para las flotas
const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];
const { height } = Dimensions.get('window');

export default function GroupsScreen() {
    const [loading, setLoading] = useState(true);
    const [groups, setGroups] = useState<any[]>([]);
    const [allVehicles, setAllVehicles] = useState<any[]>([]); 
    const [supervisors, setSupervisors] = useState<any[]>([]); // Lista de usuarios Fleet Managers

    // --- ESTADOS DE MODALES ---
    const [modalVisible, setModalVisible] = useState(false); // Modal Crear/Editar
    const [assignModalVisible, setAssignModalVisible] = useState(false); // Modal Asignar Vehículos
    
    // --- ESTADOS DE FORMULARIO (Grupo) ---
    const [editingGroup, setEditingGroup] = useState<any>(null);
    const [name, setName] = useState('');
    const [selectedColor, setSelectedColor] = useState(COLORS[0]);
    const [selectedSupervisorId, setSelectedSupervisorId] = useState<number | null>(null);
    
    // --- ESTADOS DE ASIGNACIÓN (Vehículos) ---
    const [currentGroupId, setCurrentGroupId] = useState<number | null>(null);
    const [selectedVehicles, setSelectedVehicles] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // 1. CARGA DE DATOS (Grupos, Vehículos, Supervisores)
    const loadData = async () => {
        try {
            setLoading(true);
            const [groupsRes, vehiclesRes, supervisorsRes] = await Promise.all([
                groupService.getGroups(),
                vehicleService.getVehicles(),      // Para saber qué carros existen
                groupService.getSupervisors() // Para llenar el selector
            ]);
            
            setGroups(groupsRes);
            setAllVehicles(vehiclesRes);
            setSupervisors(supervisorsRes);
        } catch (error) {
            console.error("Error cargando datos:", error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(useCallback(() => { loadData(); }, []));

    // 2. ABRIR MODAL CREAR/EDITAR
    const openModal = (group?: any) => {
        if (group) {
            // Modo Edición
            setEditingGroup(group);
            setName(group.name);
            setSelectedColor(group.color);
            setSelectedSupervisorId(group.supervisor_id || null);
        } else {
            // Modo Creación
            setEditingGroup(null);
            setName('');
            setSelectedColor(COLORS[0]);
            setSelectedSupervisorId(null);
        }
        setModalVisible(true);
    };

    // 3. GUARDAR GRUPO
    const handleSaveGroup = async () => {
        if (!name.trim()) return Alert.alert("Falta información", "El nombre es obligatorio");
        
        try {
            const payload = { 
                name, 
                color: selectedColor, 
                supervisor_id: selectedSupervisorId // Enviamos el ID del usuario seleccionado
            };
            
            if (editingGroup) {
                await groupService.updateGroup(editingGroup.id, payload);
            } else {
                await groupService.createGroup(payload);
            }
            setModalVisible(false);
            loadData();
        } catch (error) {
            Alert.alert("Error", "No se pudo guardar el grupo");
        }
    };

    // 4. ELIMINAR GRUPO
    const handleDelete = (id: number) => {
        Alert.alert("Eliminar Grupo", "¿Seguro? Los vehículos quedarán sin grupo asignado.", [
            { text: "Cancelar", style: "cancel" },
            { text: "Eliminar", style: 'destructive', onPress: async () => {
                try {
                    await groupService.deleteGroup(id);
                    loadData();
                } catch(e) { Alert.alert("Error al eliminar"); }
            }}
        ]);
    };

    // 5. ABRIR MODAL ASIGNAR VEHÍCULOS
    const openAssignModal = (group: any) => {
        setCurrentGroupId(group.id);
        setSearchQuery('');
        
        // Pre-seleccionar vehículos que YA pertenecen a este grupo
        // (Asumiendo que el endpoint de vehicles devuelve 'group_id')
        const currentIds = allVehicles
            .filter(v => v.group_id === group.id)
            .map(v => v.id);
            
        setSelectedVehicles(currentIds);
        setAssignModalVisible(true);
    };

    // 6. TOGGLE SELECCIÓN DE VEHÍCULO
    const toggleVehicleSelection = (vehicleId: number) => {
        if (selectedVehicles.includes(vehicleId)) {
            setSelectedVehicles(prev => prev.filter(id => id !== vehicleId));
        } else {
            setSelectedVehicles(prev => [...prev, vehicleId]);
        }
    };

    // 7. GUARDAR ASIGNACIÓN
    const handleSaveAssignment = async () => {
        if (!currentGroupId) return;
        try {
            await groupService.assignVehicles(currentGroupId, selectedVehicles);
            setAssignModalVisible(false);
            loadData(); // Recargar para actualizar contadores
            Alert.alert("Éxito", "Vehículos asignados correctamente");
        } catch (error) {
            Alert.alert("Error", "No se pudo realizar la asignación");
        }
    };

    // --- FILTRADO DE VEHÍCULOS EN EL MODAL ---
    const filteredVehicles = allVehicles.filter(v => 
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        v.plate.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // --- RENDERIZADO ---
    return (
        <MainLayout activeMenu="Grupos">
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Gestión de Flotas</Text>
                        <Text style={styles.subtitle}>Organiza tus vehículos y supervisores</Text>
                    </View>
                    <TouchableOpacity style={styles.addBtn} onPress={() => openModal()}>
                        <Ionicons name="add" size={20} color="#fff" />
                        <Text style={styles.addBtnText}>Nuevo Grupo</Text>
                    </TouchableOpacity>
                </View>

                {/* Lista de Grupos */}
                {loading ? <ActivityIndicator size="large" color="#3b82f6" style={{marginTop:50}}/> : (
                    <ScrollView contentContainerStyle={styles.grid}>
                        {groups.map(group => (
                            <View key={group.id} style={styles.card}>
                                <View style={[styles.colorStrip, { backgroundColor: group.color }]} />
                                <View style={styles.cardContent}>
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.groupName}>{group.name}</Text>
                                        <TouchableOpacity onPress={() => openModal(group)}>
                                            <Ionicons name="create-outline" size={20} color="#94a3b8" />
                                        </TouchableOpacity>
                                    </View>
                                    
                                    {/* Muestra Supervisor si existe (Nombre del usuario) */}
                                    <View style={styles.supervisorRow}>
                                        <Ionicons name="person-circle-outline" size={16} color="#64748b" />
                                        <Text style={styles.supervisorText}>
                                            {group.supervisor ? group.supervisor.name : 'Sin Supervisor'}
                                        </Text>
                                    </View>

                                    <View style={styles.statsRow}>
                                        <View style={styles.badge}>
                                            <Ionicons name="car-sport" size={14} color="#64748b" />
                                            <Text style={styles.badgeText}>{group.vehicles_count || 0} Unidades</Text>
                                        </View>
                                    </View>

                                    <View style={styles.actions}>
                                        <TouchableOpacity 
                                            style={styles.actionBtnPrimary} 
                                            onPress={() => openAssignModal(group)}
                                        >
                                            <Ionicons name="swap-horizontal" size={16} color="#3b82f6" />
                                            <Text style={styles.actionTextPrimary}>Asignar Vehículos</Text>
                                        </TouchableOpacity>
                                        
                                        <TouchableOpacity 
                                            style={styles.actionBtnDelete} 
                                            onPress={() => handleDelete(group.id)}
                                        >
                                            <Ionicons name="trash-outline" size={16} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </View>

            {/* --- MODAL 1: CREAR/EDITAR GRUPO --- */}
            <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{editingGroup ? 'Editar Grupo' : 'Nuevo Grupo'}</Text>
                        
                        {/* Nombre */}
                        <Text style={styles.label}>Nombre del Grupo</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Ej. Ventas Norte" 
                            value={name} 
                            onChangeText={setName} 
                        />

                        {/* Selector de Supervisor */}
                        <Text style={styles.label}>Supervisor (Fleet Manager)</Text>
                        <View style={styles.supervisorListContainer}>
                            <ScrollView style={{maxHeight: 150}} nestedScrollEnabled>
                                {/* Opción: Sin Supervisor */}
                                <TouchableOpacity 
                                    style={[styles.supervisorOption, selectedSupervisorId === null && styles.supervisorSelected]}
                                    onPress={() => setSelectedSupervisorId(null)}
                                >
                                    <View style={[styles.avatarMini, {backgroundColor: '#94a3b8'}]}>
                                         <Ionicons name="close" size={12} color="#fff"/>
                                    </View>
                                    <Text style={styles.supervisorOptionText}>-- Sin Asignar --</Text>
                                    {selectedSupervisorId === null && <Ionicons name="checkmark" size={18} color="#3b82f6" />}
                                </TouchableOpacity>

                                {/* Lista de Supervisores Activos */}
                                {supervisors.map(user => (
                                    <TouchableOpacity 
                                        key={user.id} 
                                        style={[styles.supervisorOption, selectedSupervisorId === user.id && styles.supervisorSelected]}
                                        onPress={() => setSelectedSupervisorId(user.id)}
                                    >
                                        <View style={styles.avatarMini}>
                                            <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
                                        </View>
                                        <View style={{flex:1}}>
                                            <Text style={styles.supervisorOptionText}>{user.name}</Text>
                                            <Text style={styles.supervisorEmail}>{user.email}</Text>
                                        </View>
                                        {selectedSupervisorId === user.id && <Ionicons name="checkmark" size={18} color="#3b82f6" />}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Color Picker */}
                        <Text style={styles.label}>Color Identificativo</Text>
                        <View style={styles.colorGrid}>
                            {COLORS.map(c => (
                                <TouchableOpacity 
                                    key={c} 
                                    style={[styles.colorCircle, { backgroundColor: c }, selectedColor === c && styles.colorSelected]}
                                    onPress={() => setSelectedColor(c)}
                                />
                            ))}
                        </View>

                        {/* Botones */}
                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                                <Text style={{color:'#64748b'}}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSaveGroup} style={styles.saveBtn}>
                                <Text style={{color:'#fff', fontWeight:'bold'}}>Guardar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* --- MODAL 2: ASIGNAR VEHÍCULOS --- */}
            <Modal visible={assignModalVisible} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setAssignModalVisible(false)}>
                <View style={styles.fullModal}>
                    <View style={styles.fullModalHeader}>
                        <Text style={styles.fullModalTitle}>Asignar Unidades</Text>
                        <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                            <Ionicons name="close" size={24} color="#1e293b" />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color="#94a3b8" />
                        <TextInput 
                            placeholder="Buscar por placa o nombre..." 
                            style={{flex:1}} 
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    <FlatList
                        data={filteredVehicles}
                        keyExtractor={item => item.id.toString()}
                        contentContainerStyle={{padding: 20, paddingBottom: 100}}
                        renderItem={({ item }) => {
                            const isSelected = selectedVehicles.includes(item.id);
                            // Ver si pertenece a otro grupo diferente al actual
                            const otherGroup = item.group_id && item.group_id !== currentGroupId;
                            
                            return (
                                <TouchableOpacity 
                                    style={[styles.vehicleRow, isSelected && styles.vehicleRowSelected]} 
                                    onPress={() => toggleVehicleSelection(item.id)}
                                >
                                    <View style={{flex:1}}>
                                        <Text style={styles.vehicleRowName}>{item.name}</Text>
                                        <View style={{flexDirection:'row', gap:5}}>
                                            <Text style={styles.vehicleRowPlate}>{item.plate}</Text>
                                            {otherGroup && (
                                                <Text style={{fontSize:10, color:'#ef4444', backgroundColor:'#fee2e2', paddingHorizontal:4, borderRadius:4}}>
                                                    En otro grupo
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                    <Ionicons 
                                        name={isSelected ? "checkbox" : "square-outline"} 
                                        size={24} 
                                        color={isSelected ? "#3b82f6" : "#cbd5e1"} 
                                    />
                                </TouchableOpacity>
                            );
                        }}
                    />

                    <View style={styles.fullModalFooter}>
                        <TouchableOpacity style={styles.saveBtnFull} onPress={handleSaveAssignment}>
                            <Text style={styles.saveBtnText}>Confirmar ({selectedVehicles.length})</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </MainLayout>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
    subtitle: { fontSize: 14, color: '#64748b' },
    addBtn: { flexDirection: 'row', backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, alignItems: 'center', gap: 8 },
    addBtnText: { color: '#fff', fontWeight: 'bold' },

    // Cards
    grid: { paddingBottom: 50 },
    card: { width: '100%', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
    colorStrip: { height: 6, width: '100%' },
    cardContent: { padding: 16 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    groupName: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
    
    supervisorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    supervisorText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
    
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    badge: { flexDirection: 'row', backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignItems: 'center', gap: 6 },
    badgeText: { fontSize: 12, color: '#475569', fontWeight: '600' },
    
    actions: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
    actionBtnPrimary: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: '#eff6ff', paddingVertical: 8, borderRadius: 6 },
    actionTextPrimary: { color: '#3b82f6', fontWeight: '600', fontSize: 13 },
    actionBtnDelete: { width: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef2f2', borderRadius: 6 },

    // Modal Create/Edit
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', width: '100%', maxWidth: 400, borderRadius: 16, padding: 24 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    label: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 6, marginTop: 12 },
    input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#f8fafc' },
    
    // Supervisor List Styles
    supervisorListContainer: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: '#f8fafc', overflow: 'hidden' },
    supervisorOption: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    supervisorSelected: { backgroundColor: '#eff6ff' },
    avatarMini: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    supervisorOptionText: { fontSize: 14, color: '#334155', fontWeight: '500' },
    supervisorEmail: { fontSize: 11, color: '#94a3b8' },

    // Color Picker
    colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
    colorCircle: { width: 32, height: 32, borderRadius: 16 },
    colorSelected: { borderWidth: 3, borderColor: '#1e293b' },
    
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 30 },
    cancelBtn: { padding: 12 },
    saveBtn: { backgroundColor: '#3b82f6', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },

    // Modal Assign (Full Screen)
    fullModal: { flex: 1, backgroundColor: '#fff', marginTop: 40, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    fullModalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems:'center' },
    fullModalTitle: { fontSize: 18, fontWeight: 'bold' },
    searchBar: { flexDirection: 'row', margin: 20, padding: 12, backgroundColor: '#f1f5f9', borderRadius: 10, alignItems: 'center', gap: 10 },
    vehicleRow: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f8fafc', alignItems: 'center' },
    vehicleRowSelected: { backgroundColor: '#eff6ff' },
    vehicleRowName: { fontWeight: 'bold', color: '#1e293b' },
    vehicleRowPlate: { color: '#64748b', fontSize: 12 },
    fullModalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9', position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#fff' },
    saveBtnFull: { backgroundColor: '#3b82f6', padding: 16, borderRadius: 12, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});