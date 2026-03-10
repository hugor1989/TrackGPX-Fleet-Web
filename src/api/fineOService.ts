import apiClient from './client';

const fineService = {
  // Obtener multas (status opcional: 'pending', 'paid', 'all')
  getFines: async (status = 'all') => {
    try {
      const response = await apiClient.get(`/billing/fines?status=${status}`);
      return response; // Esperamos { data: [], summary: {} }
    } catch (error) {
      throw error;
    }
  },

  // Marcar como pagada
  markAsPaid: async (id: number) => {
    try {
      const response = await apiClient.post(`/billing/fines/${id}/pay`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  getHistory: async (filters: any) => {
        // Convertimos objeto filters a query string
        const params = new URLSearchParams(filters).toString();
        const response = await apiClient.get(`/billing/fines/history?${params}`);
        return response;
    },

    exportReport: async (filters: any, format: 'xlsx' | 'pdf' | 'csv') => {
        // Importante: responseType: 'blob' para archivos
        const params = new URLSearchParams({ ...filters, format }).toString();
        
        // Usamos fetch directo o axios configurado con blob
        // Aquí ejemplo genérico asumiendo que usas axios en 'api'
        const response = await apiClient.get(`/billing/fines/export?${params}`, { responseType: 'blob' });

        // Crear link de descarga invisible en el navegador
        console.log('Exportando reporte con filtros:', response);
        const url = window.URL.createObjectURL(new Blob([response]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Reporte_Multas_${new Date().toISOString().slice(0,10)}.${format}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    }
};

export default fineService;