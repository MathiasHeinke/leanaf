/**
 * Security helpers for input validation and sanitization
 */

// Content Security Policy headers for enhanced security
export const getSecurityHeaders = () => ({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';"
});

// Input sanitization utilities
export const sanitizeInput = {
  text: (input: string, maxLength: number = 1000): string => {
    if (!input || typeof input !== 'string') return '';
    return input.trim().slice(0, maxLength);
  },
  
  number: (input: any, min: number = 0, max: number = Number.MAX_SAFE_INTEGER): number => {
    const num = parseFloat(input);
    if (isNaN(num)) return min;
    return Math.max(min, Math.min(max, num));
  },
  
  array: (input: any, maxLength: number = 100): any[] => {
    if (!Array.isArray(input)) return [];
    return input.slice(0, maxLength);
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
  }
};

// Input validation utilities
export const validateInput = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  uuid: (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  },
  
  url: (url: string): boolean => {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  },
  
  positiveNumber: (num: any): boolean => {
    return typeof num === 'number' && num > 0 && isFinite(num);
  }
};

// Enhanced error message sanitization for production safety
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
    /process\.env/gi
  ];
  
  let sanitized = message;
  sensitivePatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });
  
  // Limit message length for security
  return sanitized.slice(0, 200);
};

// Enhanced error response for edge functions
export const createSecureErrorResponse = (error: any, statusCode: number = 500) => {
  const sanitizedMessage = sanitizeErrorMessage(error);
  
  return new Response(
    JSON.stringify({
      error: sanitizedMessage,
      timestamp: new Date().toISOString(),
      code: statusCode
    }),
    {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        ...getSecurityHeaders()
      }
    }
  );
};

// Rate limiting helper (client-side)
export class ClientRateLimit {
  private requests: Map<string, number[]> = new Map();
  
  constructor(private maxRequests: number = 10, private windowMs: number = 60000) {}
  
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
}