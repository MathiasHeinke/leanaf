// Enhanced input validation for production security
import DOMPurify from 'isomorphic-dompurify';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitized?: string;
}

// Enhanced input sanitization with XSS protection
export function sanitizeInput(input: string, allowHtml: boolean = false): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Basic sanitization
  let sanitized = input.trim();
  
  if (!allowHtml) {
    // Remove all HTML tags and entities
    sanitized = DOMPurify.sanitize(sanitized, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
  } else {
    // Allow safe HTML only
    sanitized = DOMPurify.sanitize(sanitized, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u'],
      ALLOWED_ATTR: []
    });
  }

  return sanitized;
}

// Validate email with security considerations
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  const sanitized = sanitizeInput(email);
  
  if (!sanitized) {
    errors.push('Email is required');
    return { isValid: false, errors };
  }

  // Enhanced email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(sanitized)) {
    errors.push('Please enter a valid email address');
  }

  if (sanitized.length > 254) {
    errors.push('Email address is too long');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}

// Validate password with strength requirements
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];
  
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.length > 128) {
    errors.push('Password is too long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check for common weak passwords
  const commonPasswords = ['password', '123456', 'qwerty', 'abc123', 'password123'];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: password // Don't sanitize passwords
  };
}

// Validate general text input
export function validateTextInput(
  input: string, 
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    allowHtml?: boolean;
    pattern?: RegExp;
  } = {}
): ValidationResult {
  const errors: string[] = [];
  const sanitized = sanitizeInput(input, options.allowHtml);
  
  if (options.required && !sanitized) {
    errors.push('This field is required');
    return { isValid: false, errors };
  }

  if (options.minLength && sanitized.length < options.minLength) {
    errors.push(`Must be at least ${options.minLength} characters long`);
  }

  if (options.maxLength && sanitized.length > options.maxLength) {
    errors.push(`Must be no more than ${options.maxLength} characters long`);
  }

  if (options.pattern && !options.pattern.test(sanitized)) {
    errors.push('Invalid format');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}

// Rate limiting for client-side protection
class ClientRateLimit {
  private attempts: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxAttempts: number;

  constructor(windowMs: number = 60000, maxAttempts: number = 5) {
    this.windowMs = windowMs;
    this.maxAttempts = maxAttempts;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get existing attempts for this key
    let attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    attempts = attempts.filter(time => time > windowStart);
    
    // Check if we're within limits
    if (attempts.length >= this.maxAttempts) {
      return false;
    }

    // Add current attempt
    attempts.push(now);
    this.attempts.set(key, attempts);
    
    return true;
  }

  getRemainingAttempts(key: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    let attempts = this.attempts.get(key) || [];
    attempts = attempts.filter(time => time > windowStart);
    
    return Math.max(0, this.maxAttempts - attempts.length);
  }
}

export const authRateLimit = new ClientRateLimit(300000, 5); // 5 attempts per 5 minutes
export const generalRateLimit = new ClientRateLimit(60000, 10); // 10 attempts per minute