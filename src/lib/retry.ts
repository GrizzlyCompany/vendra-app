/**
 * Comprehensive retry utility with exponential backoff and circuit breaker
 */

interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  jitter?: boolean;
  onRetry?: (attempt: number, error: any) => void;
  shouldRetry?: (error: any) => boolean;
}

export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private failureThreshold = 5,
    private recoveryTimeout = 30000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    jitter = true,
    onRetry,
    shouldRetry = (error) => !error?.code?.includes('401') && !error?.code?.includes('403')
  } = options;

  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on final attempt or if error shouldn't be retried
      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(backoffFactor, attempt - 1),
        maxDelay
      );

      // Add jitter to prevent thundering herd
      const finalDelay = jitter 
        ? delay + Math.random() * delay * 0.1 
        : delay;

      onRetry?.(attempt, error);

      await new Promise(resolve => setTimeout(resolve, finalDelay));
    }
  }

  throw lastError;
}

// Default circuit breaker instance for Supabase operations
export const supabaseCircuitBreaker = new CircuitBreaker(3, 15000);

// Enhanced error recovery for specific operations
export const withSupabaseRetry = <T>(
  operation: () => Promise<T>,
  context = 'Supabase operation'
) => {
  return supabaseCircuitBreaker.execute(() =>
    withRetry(operation, {
      maxAttempts: 3,
      baseDelay: 1000,
      onRetry: (attempt, error) => {
        console.warn(`${context} failed (attempt ${attempt}):`, error?.message);
      },
      shouldRetry: (error) => {
        // Retry on network errors, timeouts, but not auth or permission errors
        const code = error?.code || error?.status;
        return !['401', '403', '42501', 'PGRST301'].includes(code);
      }
    })
  );
};