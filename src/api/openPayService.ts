// src/api/openPayService.ts

import { Platform } from 'react-native';

declare global {
  interface Window {
    OpenPay: any;
  }
}

export interface CardData {
  card_number: string;
  holder_name: string;
  expiration_month: string;
  expiration_year: string;
  cvv2: string;
}

export interface TokenResponse {
  success: boolean;
  token?: string;
  error?: string;
}

export interface DeviceSessionResponse {
  success: boolean;
  deviceSessionId?: string;
  error?: string;
}

class OpenPayService {
  private merchantId: string = '';
  private publicKey: string = '';
  private initialized: boolean = false;

  /**
   * Inicializar OpenPay
   */
  initialize(merchantId: string, publicKey: string, sandbox: boolean = true): void {
    if (Platform.OS !== 'web') {
      console.warn('OpenPay solo está disponible en web');
      return;
    }

    if (!window.OpenPay) {
      console.error('OpenPay.js no está cargado');
      return;
    }

    this.merchantId = merchantId;
    this.publicKey = publicKey;

    window.OpenPay.setId(merchantId);
    window.OpenPay.setApiKey(publicKey);
    window.OpenPay.setSandboxMode(sandbox);

    this.initialized = true;
    console.log('✅ OpenPay inicializado correctamente');
  }

  /**
   * Verificar si OpenPay está disponible
   */
  isAvailable(): boolean {
    return Platform.OS === 'web' && !!window.OpenPay && this.initialized;
  }

  /**
   * Generar Device Session ID
   */
  async generateDeviceSessionId(): Promise<DeviceSessionResponse> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'OpenPay no está disponible',
      };
    }

    try {
      const deviceSessionId = window.OpenPay.deviceData.setup();
      
      console.log('✅ Device Session ID generado:', deviceSessionId);

      return {
        success: true,
        deviceSessionId,
      };
    } catch (error: any) {
      console.error('Error generando Device Session ID:', error);
      return {
        success: false,
        error: error.message || 'Error al generar Device Session ID',
      };
    }
  }

  /**
   * Tokenizar tarjeta
   */
  async tokenizeCard(cardData: CardData): Promise<TokenResponse> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'OpenPay no está disponible',
      };
    }

    return new Promise((resolve) => {
      window.OpenPay.token.create(
        {
          card_number: cardData.card_number.replace(/\s/g, ''),
          holder_name: cardData.holder_name,
          expiration_year: cardData.expiration_year,
          expiration_month: cardData.expiration_month,
          cvv2: cardData.cvv2,
        },
        (response: any) => {
          console.log('✅ Tarjeta tokenizada:', response.data.id);
          resolve({
            success: true,
            token: response.data.id,
          });
        },
        (error: any) => {
          console.error('❌ Error tokenizando tarjeta:', error);
          resolve({
            success: false,
            error: this.getErrorMessage(error),
          });
        }
      );
    });
  }

  /**
   * Validar número de tarjeta
   */
  validateCardNumber(cardNumber: string): boolean {
    if (!this.isAvailable()) return false;

    try {
      const cleaned = cardNumber.replace(/\s/g, '');
      return window.OpenPay.card.validateCardNumber(cleaned);
    } catch (error) {
      return false;
    }
  }

  /**
   * Validar CVC
   */
  validateCVC(cvc: string): boolean {
    if (!this.isAvailable()) return false;

    try {
      return window.OpenPay.card.validateCVC(cvc);
    } catch (error) {
      return false;
    }
  }

  /**
   * Validar fecha de expiración
   */
  validateExpiry(month: string, year: string): boolean {
    if (!this.isAvailable()) return false;

    try {
      return window.OpenPay.card.validateExpiry(month, year);
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtener tipo de tarjeta
   */
  getCardType(cardNumber: string): string | null {
    if (!this.isAvailable()) return null;

    try {
      const cleaned = cardNumber.replace(/\s/g, '');
      return window.OpenPay.card.cardType(cleaned);
    } catch (error) {
      return null;
    }
  }

  /**
   * Formatear número de tarjeta
   */
  formatCardNumber(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\D/g, '');
    const chunks = cleaned.match(/.{1,4}/g) || [];
    return chunks.join(' ').substr(0, 19); // Máximo 16 dígitos + 3 espacios
  }

  /**
   * Obtener mensaje de error legible
   */
  private getErrorMessage(error: any): string {
    const errorCode = error?.data?.error_code || error?.error_code;
    const errorMessages: Record<number, string> = {
      1000: 'Ocurrió un error interno en el servidor de OpenPay',
      1001: 'El formato de la petición es incorrecto',
      1002: 'La llamada no esta autenticada',
      1003: 'La operación no se pudo completar',
      1004: 'El servicio solicitado no existe',
      1005: 'Falta un parámetro requerido',
      1006: 'El valor de uno o más parámetros es incorrecto',
      1007: 'El cuerpo de la petición esta vacío',
      1008: 'La operación no esta permitida para este recurso',
      1009: 'El cuerpo de la petición es demasiado grande',
      2004: 'El dígito verificador del número de tarjeta es inválido',
      2005: 'La fecha de expiración de la tarjeta es anterior a la fecha actual',
      2006: 'El código de seguridad de la tarjeta (CVV2) no fue proporcionado',
      3001: 'La tarjeta fue rechazada',
      3002: 'La tarjeta ha expirado',
      3003: 'La tarjeta no tiene fondos suficientes',
      3004: 'La tarjeta ha sido identificada como una tarjeta robada',
      3005: 'La tarjeta ha sido rechazada por el sistema antifraudes',
    };

    return errorMessages[errorCode] || error?.data?.description || 'Error desconocido';
  }

  /**
   * Cargar el script de OpenPay dinámicamente
   */
  static async loadScript(): Promise<boolean> {
    if (Platform.OS !== 'web') return false;

    return new Promise((resolve) => {
      // Verificar si ya está cargado
      if (window.OpenPay) {
        resolve(true);
        return;
      }

      // Cargar OpenPay.js
      const openpayScript = document.createElement('script');
      openpayScript.src = 'https://js.openpay.mx/openpay.v1.min.js';
      openpayScript.async = true;
      openpayScript.onload = () => {
        // Cargar OpenPay Data
        const dataScript = document.createElement('script');
        dataScript.src = 'https://js.openpay.mx/openpay-data.v1.min.js';
        dataScript.async = true;
        dataScript.onload = () => {
          console.log('✅ OpenPay scripts cargados');
          resolve(true);
        };
        dataScript.onerror = () => {
          console.error('❌ Error cargando OpenPay Data script');
          resolve(false);
        };
        document.head.appendChild(dataScript);
      };
      openpayScript.onerror = () => {
        console.error('❌ Error cargando OpenPay script');
        resolve(false);
      };
      document.head.appendChild(openpayScript);
    });
  }
}

const openPayServiceInstance = new OpenPayService();

// Exportar instancia por defecto
export default openPayServiceInstance;

// Exportar clase para acceder a métodos estáticos
export { OpenPayService };