import apiClient from './client';
const dashboardService = {
  // Obtener resumen completo
  getSummary: async () => {
    try {
      const response = await apiClient.get('/billing/dashboard/summary');
      return response;
    } catch (error) {
      console.error('Error cargando dashboard', error);
      throw error;
    }
  }
};

export default dashboardService;