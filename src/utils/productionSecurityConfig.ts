// Production Security Configuration
// This file contains enhanced security configurations for production deployment

export const PRODUCTION_SECURITY_CONFIG = {
  // Enhanced Content Security Policy
  csp: {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Required for Vite dev mode - remove in production
      "https://cdn.jsdelivr.net",
      "https://unpkg.com"
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for dynamic styles
      "https://fonts.googleapis.com"
    ],
    'font-src': [
      "'self'",
      "https://fonts.gstatic.com"
    ],
    'img-src': [
      "'self'",
      "data:",
      "blob:",
      "https:"
    ],
    'connect-src': [
      "'self'",
      "https://gzczjscctgyxjyodhnhk.supabase.co",
      "https://api.openai.com",
      "https://api.ipify.org",
      "wss://gzczjscctgyxjyodhnhk.supabase.co"
    ],
    'media-src': ["'self'", "blob:"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': true
  },

  // Enhanced DOMPurify configuration for different content types
  domPurify: {
    // Strict configuration for user-generated content
    strict: {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'span'],
      ALLOWED_ATTR: [],
      FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'input', 'button', 'link', 'meta', 'base'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'style', 'javascript:'],
      ALLOW_DATA_ATTR: false,
      SANITIZE_DOM: true,
      KEEP_CONTENT: false
    },

    // Moderate configuration for trusted content
    moderate: {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div'],
      ALLOWED_ATTR: ['class'],
      FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'input', 'button', 'link', 'meta', 'base'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'style', 'javascript:'],
      ALLOW_DATA_ATTR: false,
      SANITIZE_DOM: true,
      KEEP_CONTENT: false
    },

    // Rich configuration for admin content
    rich: {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
        'span', 'div', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'td', 'th'
      ],
      ALLOWED_ATTR: ['class', 'id'],
      FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'input', 'button', 'link', 'meta', 'base'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'style', 'javascript:'],
      ALLOW_DATA_ATTR: false,
      SANITIZE_DOM: true,
      KEEP_CONTENT: false
    }
  },

  // Rate limiting configuration
  rateLimiting: {
    // Authentication endpoints
    auth: {
      maxAttempts: 5,
      windowMinutes: 15,
      blockDurationMinutes: 30
    },

    // API endpoints
    api: {
      maxRequests: 100,
      windowMinutes: 60,
      burstLimit: 20
    },

    // Chat/AI endpoints
    chat: {
      maxRequests: 30,
      windowMinutes: 60,
      concurrentLimit: 3
    },

    // File upload endpoints
    upload: {
      maxUploads: 10,
      windowMinutes: 60,
      maxFileSizeMB: 10
    }
  },

  // Input validation patterns
  validation: {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    safeString: /^[a-zA-Z0-9\s\-_.,!?()]*$/,
    phone: /^\+?[\d\s\-()]{10,}$/,
    
    // Password strength requirements
    password: {
      minLength: 12,
      requireUpper: true,
      requireLower: true,
      requireNumbers: true,
      requireSymbols: true,
      forbiddenPatterns: [
        'password', '123456', 'qwerty', 'admin', 'user',
        'test', 'guest', 'demo', 'root', 'null'
      ]
    }
  },

  // Security headers for different environments
  headers: {
    production: {
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': [
        'camera=("self")',
        'microphone=("self")',
        'geolocation=()',
        'payment=()',
        'usb=()',
        'magnetometer=()',
        'gyroscope=()',
        'accelerometer=()'
      ].join(', ')
    },
    
    development: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  },

  // Logging configuration
  logging: {
    // Events that should always be logged
    securityEvents: [
      'authentication_failed',
      'authorization_denied', 
      'suspicious_activity',
      'rate_limit_exceeded',
      'data_access_violation',
      'privilege_escalation_attempt',
      'sql_injection_attempt',
      'xss_attempt',
      'csrf_attempt'
    ],

    // Sensitive data that should never be logged
    sensitiveFields: [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'cookie',
      'session',
      'auth',
      'pin',
      'ssn',
      'credit_card',
      'cvv'
    ],

    // Data retention periods
    retention: {
      security_events: '90 days',
      access_logs: '30 days',
      error_logs: '7 days',
      debug_logs: '1 day'
    }
  },

  // File upload security
  uploads: {
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'text/csv'
    ],
    
    maxFileSize: 10 * 1024 * 1024, // 10MB
    
    forbiddenExtensions: [
      '.exe', '.bat', '.cmd', '.com', '.scr', '.pif',
      '.js', '.vbs', '.jar', '.app', '.deb', '.pkg',
      '.dmg', '.zip', '.rar', '.7z'
    ],
    
    virusScanRequired: true,
    quarantinePeriod: 24 * 60 * 60 * 1000 // 24 hours
  }
};

// Utility functions for security enforcement
export const SecurityUtils = {
  // Enhanced input sanitization
  sanitizeInput: (input: string, level: 'strict' | 'moderate' | 'rich' = 'strict'): string => {
    if (!input || typeof input !== 'string') return '';
    
    // Remove null bytes and control characters
    let cleaned = input.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
    
    // Apply length limits based on security level
    const maxLengths = { strict: 100, moderate: 500, rich: 2000 };
    cleaned = cleaned.slice(0, maxLengths[level]);
    
    return cleaned.trim();
  },

  // Enhanced validation
  validateInput: (input: string, pattern: RegExp, maxLength: number = 100): boolean => {
    if (!input || typeof input !== 'string') return false;
    if (input.length > maxLength) return false;
    return pattern.test(input);
  },

  // Check for suspicious patterns
  detectSuspiciousPatterns: (input: string): string[] => {
    const patterns = [
      { name: 'sql_injection', regex: /(union|select|insert|update|delete|drop|exec|script)/i },
      { name: 'xss_attempt', regex: /(<script|javascript:|on\w+\s*=)/i },
      { name: 'path_traversal', regex: /(\.\.\/|\.\.\\)/i },
      { name: 'command_injection', regex: /[;&|`$()]/i }
    ];
    
    return patterns
      .filter(pattern => pattern.regex.test(input))
      .map(pattern => pattern.name);
  },

  // Generate secure random tokens
  generateSecureToken: (length: number = 32): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
};

export default PRODUCTION_SECURITY_CONFIG;