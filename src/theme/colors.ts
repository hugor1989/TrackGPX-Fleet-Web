// src/theme/colors.ts

export const colors = {
  // Colores principales (de tu Login)
  primary: '#226bfc',      // Azul del botón login
  secondary: '#50b287',    // Verde de "Forgot Password"
  
  // Backgrounds
  background: {
    dark: '#101624',       // Fondo del login
    light: '#f9fafb',      // Fondo de inputs
    card: '#ffffff',
  },
  
  // Grises
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  
  // Estados
  success: '#27ae60',      // Verde - dispositivo activo
  error: '#e74c3c',        // Rojo - dispositivo detenido
  warning: '#f39c12',
  info: '#3498db',
  
  // Texto
  text: {
    primary: '#1f2937',
    secondary: '#6b7280',
    tertiary: '#9ca3af',
    inverse: '#ffffff',
  },
  
  // Borders
  border: {
    light: '#e5e7eb',
    medium: '#d1d5db',
    dark: '#9ca3af',
  },
  
  // Map colors (de tu RealMap)
  map: {
    moving: '#27ae60',
    stopped: '#e74c3c',
    background: '#e8f4f8',
  },
};

export const gradients = {
  primary: ['#667eea', '#764ba2'],  // Gradiente del fondo login
  card: ['#ffffff', '#f9fafb'],
};

export default colors;