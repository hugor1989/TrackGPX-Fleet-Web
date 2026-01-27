import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { authService, User, LoginRequest, RegisterRequest } from '../api/authService';
import { StorageHelper } from '../utils/storageHelper';

// Definimos qué datos y funciones estarán disponibles para toda la app
interface AuthContextData {
  user: User | null;
  isLoading: boolean;     // Carga durante login/logout
  isSplashLoading: boolean; // Carga inicial al abrir la app (verificando sesión)
  login: (credentials: LoginRequest) => Promise<{ success: boolean; message?: string }>;
  register: (data: RegisterRequest) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}

// Creamos el contexto
const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// El Provider envuelve tu aplicación
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSplashLoading, setIsSplashLoading] = useState(true);

  // 1. Al abrir la app, verificar si hay sesión guardada
  useEffect(() => {
    loadUserFromStorage();
  }, []);

  const loadUserFromStorage = async () => {
    try {
      setIsSplashLoading(true);
      // Verificamos si hay token y usuario guardados
      const userJSON = await authService.getCurrentUser();
      const token = await authService.getToken();

      if (userJSON && token) {
        // Opcional: Podrías validar el token con el backend aquí con authService.verifyToken()
        setUser(userJSON); 
      }
    } catch (e) {
      console.log('No hay sesión activa');
    } finally {
      setIsSplashLoading(false);
    }
  };

  // 2. Función de Login
  const login = async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);
      
      if (response.success && response.data?.user) {
        setUser(response.data.user); // Esto actualiza la UI automáticamente
        return { success: true };
      } else {
        return { success: false, message: response.message || 'Error al iniciar sesión' };
      }
    } catch (error) {
      return { success: false, message: 'Error de conexión' };
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Función de Registro
  const register = async (data: RegisterRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.register(data);
      
      if (response.success && response.data?.user) {
        setUser(response.data.user);
        return { success: true };
      } else {
        return { success: false, message: response.message || 'Error en el registro' };
      }
    } catch (error) {
      return { success: false, message: 'Error de conexión' };
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Función de Logout
  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } finally {
      setUser(null); // Al poner user en null, la navegación cambiará al Login
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isSplashLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para usar el contexto más fácil
export const useAuth = () => useContext(AuthContext);