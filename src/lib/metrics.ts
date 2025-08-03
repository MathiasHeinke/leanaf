// 🔒 DSGVO-konforme Performance-Metriken

// Simple User-ID Hashing für Client-Side 
async function hashUserId(userId: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    // Fallback für ältere Browser
    return `usr_${userId.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) & 0xffffffff, 0).toString(16).substring(0, 8)}`;
  }
  
  const encoder = new TextEncoder();
  const data = encoder.encode(userId + 'client_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `usr_${hashHex.substring(0, 12)}`;
}

function sanitizeLogData(data: any): any {
  const sanitized = { ...data };
  if (sanitized.message && typeof sanitized.message === 'string') {
    sanitized.message = sanitized.message.substring(0, 50) + '...';
  }
  return sanitized;
}

export async function mark(event: string, fields: Record<string, unknown> = {}) {
  // 🔒 DSGVO: Hash User-ID if present
  const sanitizedFields = { ...fields };
  if (sanitizedFields.userId && typeof sanitizedFields.userId === 'string') {
    sanitizedFields.userId = await hashUserId(sanitizedFields.userId);
  }
  
  // Minimal: console.log JSON; later to OTEL/Honeycomb
  console.log(JSON.stringify({ 
    ts: Date.now(), 
    event, 
    ...sanitizeLogData(sanitizedFields)
  }));
}

export async function markPerformance(operation: string, startTime: number, additionalFields: Record<string, unknown> = {}) {
  const duration = Date.now() - startTime;
  
  await mark(`${operation}_completed`, {
    duration_ms: duration,
    ...additionalFields
  });
  
  // 📊 Enhanced performance tracking with thresholds
  if (duration > 5000) {
    await mark(`${operation}_slow`, { duration_ms: duration });
  }
  if (duration > 10000) {
    await mark(`${operation}_critical_slow`, { duration_ms: duration });
  }
}

export async function markError(operation: string, error: Error | string, additionalFields: Record<string, unknown> = {}) {
  await mark(`${operation}_error`, {
    error: typeof error === 'string' ? error : error.message,
    ...additionalFields
  });
}