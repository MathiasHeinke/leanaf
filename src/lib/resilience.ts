// Circuit breaker for API reliability
let failureCount = 0;
let lastFailureTime = 0;
const FAILURE_THRESHOLD = 5;
const RECOVERY_TIMEOUT = 30000; // 30 seconds

export function withCircuitBreaker<T>(fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  
  // Reset failure count after recovery timeout
  if (now - lastFailureTime > RECOVERY_TIMEOUT) {
    failureCount = 0;
  }
  
  // Circuit is open - reject immediately
  if (failureCount >= FAILURE_THRESHOLD) {
    return Promise.reject(new Error('Circuit breaker is open - service temporarily unavailable'));
  }
  
  return fn().catch(error => {
    failureCount++;
    lastFailureTime = now;
    console.warn(`Circuit breaker: failure ${failureCount}/${FAILURE_THRESHOLD}`);
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