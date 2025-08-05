// 🔥 PRODUCTION-READY Circuit breaker with exponential backoff
let failureCount = 0;
let lastFailureTime = 0;
const FAILURE_THRESHOLD = 3; // Reduced threshold for faster recovery
const RECOVERY_TIMEOUT = 90000; // 90s for OpenAI rate limits (60s) + buffer
const MAX_BACKOFF_TIME = 300000; // 5 min max backoff
const BACKOFF_MULTIPLIER = 2;

export function withCircuitBreaker<T>(fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  
  // Calculate exponential backoff time
  const backoffTime = Math.min(
    RECOVERY_TIMEOUT * Math.pow(BACKOFF_MULTIPLIER, Math.min(failureCount - FAILURE_THRESHOLD, 8)),
    MAX_BACKOFF_TIME
  );
  
  // Reset failure count after full recovery timeout
  if (now - lastFailureTime > backoffTime) {
    failureCount = 0;
  }
  
  // Circuit is open - reject with backoff info
  if (failureCount >= FAILURE_THRESHOLD) {
    const remainingTime = Math.round((backoffTime - (now - lastFailureTime)) / 1000);
    console.warn(`🚫 Circuit breaker OPEN - retry in ${remainingTime}s (failures: ${failureCount})`);
    return Promise.reject(new Error(`Circuit breaker open. Retry in ${remainingTime}s.`));
  }
  
  return fn().catch(error => {
    failureCount++;
    lastFailureTime = now;
    console.warn(`🔥 Circuit breaker: failure ${failureCount}/${FAILURE_THRESHOLD} - next backoff: ${Math.round(backoffTime/1000)}s`);
    throw error;
  });
}

// Rate limiting for API calls
const rateLimiter = {
  tokens: 50,
  maxTokens: 50,
  refillRate: 10, // tokens per second
  lastRefill: Date.now(),
  
  consume(): boolean {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + timePassed * this.refillRate);
    this.lastRefill = now;
    
    if (this.tokens >= 1) {
      this.tokens--;
      return true;
    }
    return false;
  }
};

export function withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  if (!rateLimiter.consume()) {
    return Promise.reject(new Error('Rate limit exceeded - please slow down'));
  }
  return fn();
}

// Combined resilience wrapper
export async function withResilience<T>(fn: () => Promise<T>): Promise<T> {
  return withCircuitBreaker(() => withRateLimit(fn));
}

// Concurrency limiter
let activeCalls = 0;
const MAX_CONCURRENT_CALLS = 10;

export function withConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const attempt = async () => {
      if (activeCalls >= MAX_CONCURRENT_CALLS) {
        setTimeout(attempt, 100); // Retry after 100ms
        return;
      }
      
      activeCalls++;
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        activeCalls--;
      }
    };
    
    attempt();
  });
}