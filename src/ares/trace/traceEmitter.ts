type AresEvent = {
  component: string;
  event: string;
  traceId?: string | null;
  meta?: any;
};

export const ARES_EMIT = {
  queue: [] as AresEvent[],
  
  push(e: AresEvent) {
    this.queue.push(e);
    if (this.queue.length >= 10) {
      this.flush();
    }
  },
  
  flush() {
    const batch = this.queue.splice(0, this.queue.length);
    if (!batch.length) return;
    
    try {
      const body = JSON.stringify({ events: batch });
      const url = `${window.location.origin}/functions/v1/ares-ingest-events`;
      
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, body);
      } else {
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body
        }).catch(() => {
          // Ignore telemetry failures
        });
      }
    } catch (error) {
      // Telemetry should never throw
      console.debug('[ARES-EMIT] Failed to send events:', error);
    }
  }
};

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => ARES_EMIT.flush());
}