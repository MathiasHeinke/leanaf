export function mark(event: string, fields: Record<string, unknown> = {}) {
  // Minimal: console.log JSON; later to OTEL/Honeycomb
  console.log(JSON.stringify({ 
    ts: Date.now(), 
    event, 
    ...fields 
  }));
}

export function markPerformance(operation: string, startTime: number, additionalFields: Record<string, unknown> = {}) {
  const duration = Date.now() - startTime;
  mark(`${operation}_completed`, {
    duration_ms: duration,
    ...additionalFields
  });
  
  // Warn on high latency
  if (duration > 5000) {
    mark(`${operation}_slow`, { duration_ms: duration });
  }
}

export function markError(operation: string, error: Error | string, additionalFields: Record<string, unknown> = {}) {
  mark(`${operation}_error`, {
    error: typeof error === 'string' ? error : error.message,
    ...additionalFields
  });
}