import axios from 'axios';

const axiosClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL
});

axiosClient.interceptors.request.use(config => {
  // Puedes agregar el token aquí
  return config;
});

axiosClient.interceptors.response.use(
  response => response,
  error => Promise.reject(error)
);

export default axiosClient;
