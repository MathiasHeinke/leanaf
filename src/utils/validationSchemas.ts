import { z } from 'zod';

// Authentication validation schemas
export const emailSchema = z
  .string()
  .email('Bitte geben Sie eine gültige E-Mail-Adresse ein')
  .min(1, 'E-Mail ist erforderlich')
  .max(254, 'E-Mail ist zu lang');

export const passwordSchema = z
  .string()
  .min(8, 'Passwort muss mindestens 8 Zeichen lang sein')
  .max(128, 'Passwort ist zu lang')
  .refine((password) => {
    // Simple character checks without complex regex
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    const criteria = [hasLower, hasUpper, hasNumber].filter(Boolean).length;
    return criteria >= 2;
  }, 'Passwort muss mindestens 2 der folgenden enthalten: Großbuchstabe, Kleinbuchstabe, oder Zahl');

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Passwort bestätigen ist erforderlich'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwörter stimmen nicht überein',
  path: ['confirmPassword'],
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Passwort ist erforderlich'),
});

// Meal input validation schemas
export const mealTextSchema = z
  .string()
  .min(1, 'Mahlzeit-Beschreibung ist erforderlich')
  .max(2000, 'Beschreibung ist zu lang')
  .refine(
    (text) => {
      // Check for potential XSS patterns
      const xssPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /<iframe/i,
        /<object/i,
        /<embed/i,
      ];
      return !xssPatterns.some(pattern => pattern.test(text));
    },
    'Beschreibung enthält nicht erlaubte Zeichen'
  );

export const mealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'other'], {
  message: 'Ungültiger Mahlzeit-Typ',
});

// File upload validation schemas
export const imageFileSchema = z
  .instanceof(File)
  .refine((file) => file.size <= 10 * 1024 * 1024, 'Datei darf maximal 10MB groß sein')
  .refine(
    (file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
    'Nur JPEG, PNG und WebP Dateien sind erlaubt'
  );

// Weight tracking validation
export const weightSchema = z
  .number()
  .min(20, 'Gewicht muss mindestens 20kg betragen')
  .max(500, 'Gewicht darf maximal 500kg betragen')
  .refine((weight) => Number.isFinite(weight), 'Ungültiges Gewicht');

// Body measurements validation
export const bodyMeasurementSchema = z
  .number()
  .min(10, 'Messwert zu klein')
  .max(300, 'Messwert zu groß')
  .refine((measurement) => Number.isFinite(measurement), 'Ungültiger Messwert')
  .optional();

export const bodyMeasurementsSchema = z.object({
  neck: bodyMeasurementSchema,
  chest: bodyMeasurementSchema,
  waist: bodyMeasurementSchema,
  hips: bodyMeasurementSchema,
  arms: bodyMeasurementSchema,
  thigh: bodyMeasurementSchema,
  belly: bodyMeasurementSchema,
});

// Sleep tracking validation
export const sleepHoursSchema = z
  .number()
  .min(0, 'Schlafstunden können nicht negativ sein')
  .max(24, 'Schlafstunden können nicht mehr als 24 sein')
  .refine((hours) => Number.isFinite(hours), 'Ungültige Schlafstunden');

export const sleepQualitySchema = z
  .number()
  .int('Schlafqualität muss eine ganze Zahl sein')
  .min(1, 'Schlafqualität muss mindestens 1 sein')
  .max(10, 'Schlafqualität darf maximal 10 sein');

// Exercise validation
export const exerciseNameSchema = z
  .string()
  .min(1, 'Übungsname ist erforderlich')
  .max(100, 'Übungsname ist zu lang')
  .regex(/^[a-zA-ZäöüßÄÖÜ0-9\s\-\.()]+$/, 'Übungsname enthält ungültige Zeichen');

export const exerciseSetSchema = z.object({
  weight: z.number().min(0).max(1000).optional(),
  reps: z.number().int().min(0).max(1000).optional(),
  duration: z.number().min(0).max(86400).optional(), // max 24 hours in seconds
  distance: z.number().min(0).max(1000000).optional(), // max 1000km in meters
});

// Profile validation schemas
export const displayNameSchema = z
  .string()
  .min(1, 'Anzeigename ist erforderlich')
  .max(50, 'Anzeigename ist zu lang')
  .regex(/^[a-zA-ZäöüßÄÖÜ0-9\s\-\.]+$/, 'Anzeigename enthält ungültige Zeichen');

export const ageSchema = z
  .number()
  .int('Alter muss eine ganze Zahl sein')
  .min(13, 'Mindestens 13 Jahre alt')
  .max(120, 'Maximal 120 Jahre alt');

export const heightSchema = z
  .number()
  .int('Körpergröße muss eine ganze Zahl sein')
  .min(50, 'Körpergröße muss mindestens 50cm betragen')
  .max(300, 'Körpergröße darf maximal 300cm betragen');

// Security validation helpers
export const sanitizeHtml = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type);
};

export const validateFileSize = (file: File, maxSizeInMB: number): boolean => {
  return file.size <= maxSizeInMB * 1024 * 1024;
};

// Rate limiting for client-side actions
export class ClientRateLimit {
  private attempts: Map<string, number[]> = new Map();
  
  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 15 * 60 * 1000 // 15 minutes
  ) {}
  
  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.attempts.has(key)) {
      this.attempts.set(key, []);
    }
    
    const keyAttempts = this.attempts.get(key)!;
    
    // Remove old attempts outside the window
    const validAttempts = keyAttempts.filter(time => time > windowStart);
    this.attempts.set(key, validAttempts);
    
    if (validAttempts.length >= this.maxAttempts) {
      return false;
    }
    
    // Add current attempt
    validAttempts.push(now);
    return true;
  }
  
  getRemainingAttempts(key: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.attempts.has(key)) {
      return this.maxAttempts;
    }
    
    const validAttempts = this.attempts.get(key)!.filter(time => time > windowStart);
    return Math.max(0, this.maxAttempts - validAttempts.length);
  }
}