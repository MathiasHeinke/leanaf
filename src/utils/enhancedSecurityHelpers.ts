/**
 * Enhanced Security Helpers - Production-Ready Security Implementation
 * 
 * This file provides comprehensive security utilities for:
 * - Input sanitization and validation
 * - Error message sanitization  
 * - Rate limiting
 * - Content Security Policy
 * - Enhanced authentication checks
 */

// Enhanced Content Security Policy headers for maximum security
export const getEnhancedSecurityHeaders = () => ({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: https: blob:;
    font-src 'self' data: https://fonts.gstatic.com;
    connect-src 'self' https: wss:;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
    upgrade-insecure-requests;
  `.replace(/\s+/g, ' ').trim()
});

// Enhanced input sanitization with comprehensive validation
export const enhancedSanitizeInput = {
  text: (input: string, maxLength: number = 1000, allowHtml: boolean = false): string => {
    if (!input || typeof input !== 'string') return '';
    
    let sanitized = input.trim();
    
    // Remove null bytes and control characters except newlines and tabs
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    if (!allowHtml) {
      // Escape HTML entities
      sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }
    
    return sanitized.slice(0, maxLength);
  },
  
  number: (input: any, min: number = 0, max: number = Number.MAX_SAFE_INTEGER): number => {
    const num = parseFloat(input);
    if (isNaN(num) || !isFinite(num)) return min;
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
  
  object: (input: any, allowedKeys: string[], maxDepth: number = 3): any => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
    if (maxDepth <= 0) return {};
    
    const sanitized: any = {};
    allowedKeys.forEach(key => {
      if (input.hasOwnProperty(key)) {
        const value = input[key];
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Recursively sanitize nested objects
          sanitized[key] = enhancedSanitizeInput.object(value, allowedKeys, maxDepth - 1);
        } else {
          sanitized[key] = value;
        }
      }
    });
    
    return sanitized;
  },

  email: (email: string): string => {
    if (!email || typeof email !== 'string') return '';
    
    const sanitized = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    return emailRegex.test(sanitized) ? sanitized : '';
  },

  url: (url: string): string => {
    if (!url || typeof url !== 'string') return '';
    
    try {
      const parsed = new URL(url);
      // Only allow http and https protocols
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return '';
      }
      return parsed.toString();
    } catch {
      return '';
    }
  }
};

// Enhanced validation utilities
export const enhancedValidateInput = {
  email: (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email) && email.length <= 254;
  },
  
  uuid: (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  },
  
  url: (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  },
  
  positiveNumber: (num: any): boolean => {
    return typeof num === 'number' && num > 0 && isFinite(num);
  },

  safeString: (str: string, maxLength: number = 1000): boolean => {
    if (typeof str !== 'string') return false;
    if (str.length > maxLength) return false;
    
    // Check for potentially dangerous patterns
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /data:text\/html/i,
      /onclick=/i,
      /onerror=/i,
      /onload=/i
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(str));
  }
};

// Enhanced error message sanitization for production
export const enhancedSanitizeErrorMessage = (error: Error | string): string => {
  const message = typeof error === 'string' ? error : error.message || 'Unknown error';
  
  // Comprehensive list of sensitive patterns to redact
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
    /deno\.env/gi,
    /\.env/gi,
    /credentials/gi,
    /config/gi,
    /localhost/gi,
    /127\.0\.0\.1/gi,
    /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, // IP addresses
    /[a-f0-9]{32,}/gi // Long hex strings (potential tokens)
  ];
  
  let sanitized = message;
  sensitivePatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });
  
  // Remove any remaining sensitive-looking patterns
  sanitized = sanitized.replace(/([a-zA-Z0-9_-]{20,})/g, '[REDACTED]');
  
  // Limit message length and ensure it's safe for JSON
  return sanitized.slice(0, 200).replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
};

// Enhanced rate limiting with memory cleanup
export class EnhancedClientRateLimit {
  private requests: Map<string, number[]> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor(
    private maxRequests: number = 10, 
    private windowMs: number = 60000,
    private cleanupIntervalMs: number = 300000 // 5 minutes
  ) {
    // Periodic cleanup to prevent memory leaks
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.cleanupIntervalMs);
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
    const windowStart = now - this.windowMs;
    
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => time > windowStart);
      
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
  
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.requests.clear();
  }
}

// Enhanced authentication context validation
export const validateAuthContext = (authHeader: string | null): { isValid: boolean; error?: string } => {
  if (!authHeader) {
    return { isValid: false, error: 'Missing authorization header' };
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    return { isValid: false, error: 'Invalid authorization format' };
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  // Basic JWT format validation (without decoding)
  const jwtParts = token.split('.');
  if (jwtParts.length !== 3) {
    return { isValid: false, error: 'Invalid token format' };
  }
  
  // Check for reasonable token length
  if (token.length < 100 || token.length > 2000) {
    return { isValid: false, error: 'Invalid token length' };
  }
  
  return { isValid: true };
};

// Legacy compatibility exports
export const sanitizeErrorMessage = enhancedSanitizeErrorMessage;
export const getSecurityHeaders = getEnhancedSecurityHeaders;
export const validateInput = enhancedValidateInput;

// Security logger for monitoring
export const securityLogger = {
  logSecurityEvent: (event: string, details: any = {}) => {
    console.log(`[SECURITY] ${event}:`, details);
  },
  logAuthAttempt: (success: boolean, details: any = {}) => {
    console.log(`[AUTH] ${success ? 'SUCCESS' : 'FAILED'}:`, details);
  },
  logSuspiciousActivity: (activity: string, details: any = {}) => {
    console.warn(`[SECURITY ALERT] ${activity}:`, details);
  }
};