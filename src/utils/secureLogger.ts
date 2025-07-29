// Secure logging utility for production-ready applications
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname.includes('lovableapp.com');

export const secureLogger = {
  // Info level logging
  info: (message: string, data?: any) => {
    if (isDevelopment) {
      console.log(`[INFO] ${message}`, data);
    }
  },

  // Warning level logging
  warn: (message: string, data?: any) => {
    if (isDevelopment) {
      console.warn(`[WARN] ${message}`, data);
    }
  },

  // Error level logging - always log errors but sanitize sensitive data
  error: (message: string, error?: any) => {
    const sanitizedError = error ? {
      message: error.message,
      stack: isDevelopment ? error.stack : undefined,
      code: error.code,
      status: error.status
    } : undefined;
    
    console.error(`[ERROR] ${message}`, sanitizedError);
  },

  // Debug level logging - only in development
  debug: (message: string, data?: any) => {
    if (isDevelopment) {
      console.debug(`[DEBUG] ${message}`, data);
    }
  },

  // Security logging - special handling for security events
  security: (message: string, data?: any) => {
    if (isDevelopment) {
      console.warn(`[SECURITY] ${message}`, data);
    }
    // In production, this could be sent to a security monitoring service
  }
};