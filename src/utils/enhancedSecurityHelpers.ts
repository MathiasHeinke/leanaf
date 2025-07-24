/**
 * Enhanced security helpers for comprehensive input validation, 
 * sanitization, and error handling
 */

// Enhanced input sanitization utilities
export const sanitizeInput = {
  text: (input: string, maxLength: number = 1000): string => {
    if (!input || typeof input !== 'string') return '';
    // Remove potential XSS patterns and trim
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim()
      .slice(0, maxLength);
  },
  
  number: (input: any, min: number = 0, max: number = Number.MAX_SAFE_INTEGER): number => {
    const num = parseFloat(input);
    if (isNaN(num)) return min;
    return Math.max(min, Math.min(max, num));
  },
  
  array: (input: any, maxLength: number = 100, itemValidator?: (item: any) => boolean): any[] => {
    if (!Array.isArray(input)) return [];
    let sanitized = input.slice(0, maxLength);
    if (itemValidator) {
      sanitized = sanitized.filter(itemValidator);
    }
    return sanitized;
  },
  
  object: (input: any, allowedKeys: string[]): any => {
    if (!input || typeof input !== 'object') return {};
    const sanitized: any = {};
    allowedKeys.forEach(key => {
      if (input.hasOwnProperty(key)) {
        sanitized[key] = input[key];
      }
    });
    return sanitized;
  },

  email: (input: string): string => {
    if (!input || typeof input !== 'string') return '';
    return input.toLowerCase().trim().slice(0, 254); // RFC 5321 limit
  }
};

// Enhanced input validation utilities
export const validateInput = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  },
  
  uuid: (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  },
  
  url: (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  },
  
  positiveNumber: (num: any): boolean => {
    return typeof num === 'number' && num > 0 && isFinite(num);
  },

  phoneNumber: (phone: string): boolean => {
    const phoneRegex = /^\+?[\d\s\-\(\)]{7,15}$/;
    return phoneRegex.test(phone);
  },

  strongPassword: (password: string): boolean => {
    return password.length >= 10 &&
           /[A-Z]/.test(password) &&
           /[a-z]/.test(password) &&
           /\d/.test(password) &&
           /[^A-Za-z0-9]/.test(password);
  },

  fileName: (fileName: string): boolean => {
    const dangerous = /[<>:"/\\|?*\x00-\x1f]/;
    return !dangerous.test(fileName) && fileName.length <= 255;
  }
};

// Error message sanitization - never expose sensitive info
export const sanitizeErrorMessage = (error: Error | string): string => {
  const message = typeof error === 'string' ? error : error.message;
  
  // Remove potentially sensitive information
  const sensitivePatterns = [
    /password/gi,
    /token/gi,
    /key/gi,
    /secret/gi,
    /api[_-]?key/gi,
    /bearer/gi,
    /authorization/gi,
    /database/gi,
    /connection/gi,
    /internal/gi,
    /localhost/gi,
    /127\.0\.0\.1/gi,
    /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, // IP addresses
    /postgres:\/\/[^\s]+/gi, // Database URLs
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi // Email addresses
  ];
  
  let sanitized = message;
  sensitivePatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });
  
  // Limit message length and add helpful context
  const truncated = sanitized.slice(0, 200);
  return truncated + (sanitized.length > 200 ? '...' : '');
};

// Rate limiting helper (client-side)
export class ClientRateLimit {
  private requests: Map<string, number[]> = new Map();
  
  constructor(
    private maxRequests: number = 10, 
    private windowMs: number = 60000
  ) {}
  
  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const keyRequests = this.requests.get(key)!;
    
    // Remove old requests outside the window
    const validRequests = keyRequests.filter(time => time > windowStart);
    this.requests.set(key, validRequests);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    return true;
  }
  
  getRemainingRequests(key: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(key)) {
      return this.maxRequests;
    }
    
    const validRequests = this.requests.get(key)!.filter(time => time > windowStart);
    return Math.max(0, this.maxRequests - validRequests.length);
  }
  
  getTimeUntilReset(key: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(key)) {
      return 0;
    }
    
    const validRequests = this.requests.get(key)!.filter(time => time > windowStart);
    if (validRequests.length === 0) {
      return 0;
    }
    
    const oldestRequest = Math.min(...validRequests);
    return Math.max(0, (oldestRequest + this.windowMs) - now);
  }
}

// Security headers for enhanced protection
export const getSecurityHeaders = () => ({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';"
});

// Enhanced request validation
export const validateRequest = {
  hasRequiredFields: (body: any, requiredFields: string[]): string | null => {
    for (const field of requiredFields) {
      if (!body[field]) {
        return `Missing required field: ${field}`;
      }
    }
    return null;
  },

  isValidContentType: (contentType: string | null): boolean => {
    return contentType === 'application/json';
  },

  isValidMethod: (method: string, allowedMethods: string[]): boolean => {
    return allowedMethods.includes(method.toUpperCase());
  },

  hasValidAuthHeader: (authHeader: string | null): boolean => {
    return authHeader !== null && authHeader.startsWith('Bearer ');
  }
};

// File upload validation
export const validateFileUpload = {
  isValidImageType: (mimeType: string): boolean => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    return allowedTypes.includes(mimeType.toLowerCase());
  },

  isValidFileSize: (size: number, maxSize: number = 10 * 1024 * 1024): boolean => {
    return size > 0 && size <= maxSize; // Default 10MB limit
  },

  sanitizeFileName: (fileName: string): string => {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .slice(0, 100);
  }
};

// SQL injection prevention helpers
export const sqlSafe = {
  escapeString: (input: string): string => {
    return input.replace(/'/g, "''").replace(/\\/g, '\\\\');
  },

  isValidTableName: (tableName: string): boolean => {
    const tableRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    return tableRegex.test(tableName) && tableName.length <= 63;
  },

  isValidColumnName: (columnName: string): boolean => {
    const columnRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    return columnRegex.test(columnName) && columnName.length <= 63;
  }
};

// Logging helpers for security events
export const securityLogger = {
  logAttempt: (type: string, details: any = {}) => {
    console.log(`[SECURITY-LOG] ${type}:`, {
      timestamp: new Date().toISOString(),
      type,
      ...details
    });
  },

  logSuspiciousActivity: (activity: string, request: any, details: any = {}) => {
    console.warn(`[SECURITY-ALERT] ${activity}:`, {
      timestamp: new Date().toISOString(),
      activity,
      userAgent: request.headers?.get('user-agent'),
      origin: request.headers?.get('origin'),
      ...details
    });
  },

  logBlockedRequest: (reason: string, request: any) => {
    console.error(`[SECURITY-BLOCK] ${reason}:`, {
      timestamp: new Date().toISOString(),
      reason,
      method: request.method,
      url: request.url,
      userAgent: request.headers?.get('user-agent'),
      origin: request.headers?.get('origin')
    });
  }
};