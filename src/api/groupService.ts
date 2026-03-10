import apiClient from './client';

const groupService = {
    // 1. Obtener todos los grupos (con conteo de vehículos)
    getGroups: async () => {
        const response = await apiClient.get('/billing/config/groups');
        console.log('Grupos obtenidos:', response);
        return response;
    },

    // 2. Crear grupo
    createGroup: async (data: { name: string; color: string; supervisor_id?: number }) => {
        const response = await apiClient.post('/billing/config/groups', data);
        return response;
    },

    // 3. Editar grupo
    updateGroup: async (id: number, data: { name: string; color: string; supervisor_id?: number }) => {
        const response = await apiClient.put(`/billing/config/groups/${id}`, data);
        return response;
    },

    // 4. Eliminar grupo
    deleteGroup: async (id: number) => {
        const response = await apiClient.delete(`/billing/config/groups/${id}`);
        return response;
    },

    // 5. Asignar vehículos (Movimiento masivo)
    assignVehicles: async (groupId: number, vehicleIds: number[]) => {
        const response = await apiClient.post(`/billing/config/groups/${groupId}/assign`, {
            vehicle_ids: vehicleIds
        });
        return response;
    },

    getSupervisors: async () => {
        const response = await apiClient.get('/billing/config/groups/supervisors');
        return response;
    }
};

export default groupService;