/**
 * Enhanced input validation and sanitization utilities for security
 */

// Input sanitization for different data types
export const sanitizeInput = {
  // Text input sanitization
  text: (input: string, maxLength: number = 1000, allowHtml: boolean = false): string => {
    if (!input || typeof input !== 'string') return '';
    
    let sanitized = input.trim();
    
    // Remove dangerous patterns
    if (!allowHtml) {
      sanitized = sanitized
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, ''); // Remove event handlers
    }
    
    // Remove control characters except newlines and tabs
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    return sanitized.slice(0, maxLength);
  },

  // Numeric input sanitization
  number: (input: any, min: number = 0, max: number = Number.MAX_SAFE_INTEGER): number => {
    const num = parseFloat(input);
    if (isNaN(num) || !isFinite(num)) return min;
    return Math.max(min, Math.min(max, num));
  },

  // Email sanitization
  email: (email: string): string => {
    if (!email || typeof email !== 'string') return '';
    return email.toLowerCase().trim().slice(0, 254); // RFC 5321 limit
  },

  // URL sanitization
  url: (url: string): string => {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    
    // Only allow http and https protocols
    if (!trimmed.match(/^https?:\/\//i)) {
      return '';
    }
    
    try {
      const parsed = new URL(trimmed);
      return parsed.toString();
    } catch {
      return '';
    }
  },

  // Array sanitization
  array: (input: any, maxLength: number = 100, itemValidator?: (item: any) => boolean): any[] => {
    if (!Array.isArray(input)) return [];
    
    let sanitized = input.slice(0, maxLength);
    
    if (itemValidator) {
      sanitized = sanitized.filter(itemValidator);
    }
    
    return sanitized;
  },

  // Object sanitization with allowed keys
  object: (input: any, allowedKeys: string[], maxDepth: number = 3): any => {
    if (!input || typeof input !== 'object' || Array.isArray(input) || maxDepth <= 0) {
      return {};
    }
    
    const sanitized: any = {};
    
    allowedKeys.forEach(key => {
      if (input.hasOwnProperty(key)) {
        const value = input[key];
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Recursively sanitize nested objects
          sanitized[key] = sanitizeInput.object(value, allowedKeys, maxDepth - 1);
        } else {
          sanitized[key] = value;
        }
      }
    });
    
    return sanitized;
  }
};

// Input validation utilities
export const validateInput = {
  // Email validation
  email: (email: string): boolean => {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email) && email.length <= 254;
  },

  // UUID validation
  uuid: (uuid: string): boolean => {
    if (!uuid || typeof uuid !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  },

  // URL validation
  url: (url: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  },

  // Positive number validation
  positiveNumber: (num: any): boolean => {
    return typeof num === 'number' && num > 0 && isFinite(num);
  },

  // Safe string validation (no dangerous patterns)
  safeString: (str: string, maxLength: number = 1000): boolean => {
    if (!str || typeof str !== 'string') return false;
    
    // Check for dangerous patterns
    const dangerousPatterns = [
      /<script/i,
      /<iframe/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /data:text\/html/i,
      /vbscript:/i
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(str)) && 
           str.length <= maxLength;
  },

  // File upload validation
  file: (file: File, allowedTypes: string[], maxSize: number = 10 * 1024 * 1024): boolean => {
    if (!file || !(file instanceof File)) return false;
    
    return allowedTypes.includes(file.type) && 
           file.size <= maxSize &&
           file.name.length <= 255;
  }
};

// Rate limiting for client-side protection
export class ClientRateLimit {
  private requests: Map<string, number[]> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private maxRequests: number = 10,
    private windowMs: number = 60000,
    private cleanupIntervalMs: number = 300000 // 5 minutes
  ) {
    // Cleanup old entries periodically
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
  }

  isAllowed(key: string, customLimit?: number): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const limit = customLimit || this.maxRequests;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const keyRequests = this.requests.get(key)!;
    
    // Remove old requests outside the window
    const validRequests = keyRequests.filter(time => time > windowStart);
    this.requests.set(key, validRequests);
    
    if (validRequests.length >= limit) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    return true;
  }

  getRemainingRequests(key: string, customLimit?: number): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const limit = customLimit || this.maxRequests;
    
    if (!this.requests.has(key)) {
      return limit;
    }
    
    const validRequests = this.requests.get(key)!.filter(time => time > windowStart);
    return Math.max(0, limit - validRequests.length);
  }

  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.windowMs * 2; // Keep some history
    
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => time > cutoff);
      
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.requests.clear();
  }
}

// Security headers for API responses
export const getSecurityHeaders = () => ({
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
});

// Error message sanitization
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
    /supabase_url/gi,
    /anon_key/gi,
    /service_role/gi,
    /jwt/gi,
    /env\./gi,
    /process\.env/gi,
    /localhost/gi,
    /127\.0\.0\.1/gi,
    /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g // IP addresses
  ];
  
  let sanitized = message;
  sensitivePatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });
  
  // Limit message length for security
  return sanitized.slice(0, 200);
};