// 🔒 DSGVO-konforme User-ID Hashing Utilities für Edge Functions

export async function hashUserId(userId: string): Promise<string> {
  // Verwende Web Crypto API für sicheres Hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(userId + 'edge_salt_dsgvo_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Kürze auf erste 12 Zeichen für bessere Lesbarkeit in Logs
  return `usr_${hashHex.substring(0, 12)}`;
}

export function sanitizeLogData(data: any): any {
  // Entferne oder hashe persönliche Daten aus Log-Objekten
  const sanitized = { ...data };
  
  if (sanitized.userId && !sanitized.userId.startsWith('usr_')) {
    // User-ID sollte bereits gehasht sein, aber falls nicht...
    sanitized.userId = '[SHOULD_BE_HASHED]';
  }
  
  if (sanitized.email) {
    sanitized.email = '[REDACTED]';
  }
  
  if (sanitized.message && typeof sanitized.message === 'string') {
    // Kürze Nachrichten für Logs (erste 100 Zeichen)
    sanitized.message = sanitized.message.substring(0, 100) + 
      (sanitized.message.length > 100 ? '...' : '');
  }
  
  // Entferne potentiell sensible Felder
  delete sanitized.phone;
  delete sanitized.address;
  delete sanitized.personalData;
  
  return sanitized;
}