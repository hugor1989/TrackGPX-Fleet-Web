import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FeedbackModalProps {
    visible: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
    onClose: () => void;
}

const FeedbackModal = ({ visible, type, title, message, onClose }: FeedbackModalProps) => {
    // Configuración dinámica según el tipo
    const isSuccess = type === 'success';
    
    // Colores y Textos
    const iconName = isSuccess ? "checkmark" : "alert-circle";
    const iconColor = isSuccess ? "#166534" : "#991b1b"; // Verde oscuro / Rojo oscuro
    const iconBg = isSuccess ? "#dcfce7" : "#fee2e2";     // Verde claro / Rojo claro
    const btnColor = isSuccess ? "#226bfc" : "#ef4444";   // Azul (Primary) / Rojo
    const btnText = isSuccess ? "Entendido" : "Cerrar";

    return (
        <Modal 
            visible={visible} 
            transparent 
            animationType="fade"
            onRequestClose={onClose} // Para Android botón atrás
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    
                    {/* ÍCONO */}
                    <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                        <Ionicons name={iconName} size={32} color={iconColor} />
                    </View>

                    {/* TEXTOS */}
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    {/* BOTÓN */}
                    <TouchableOpacity 
                        style={[styles.button, { backgroundColor: btnColor }]} 
                        onPress={onClose}
                    >
                        <Text style={styles.buttonText}>{btnText}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        paddingTop: 32,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 8,
        textAlign: 'center'
    },
    message: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 24,
        paddingHorizontal: 10,
        lineHeight: 20
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center'
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15
    }
});

export default FeedbackModal;