import { HttpError } from './http';

export const MAX_ATTEMPTS = 3;
export interface SearchProgress {
  phase: 'request' | 'waiting';
  attempt: number;
  maxAttempts: number;
  retryAt?: number;
}
export function isRetryable(error: unknown): boolean {
  return (
    error instanceof TypeError ||
    (error instanceof Error && ['TimeoutError', 'OverpassTimeout'].includes(error.name)) ||
    (error instanceof HttpError && (error.status >= 500 || [429, 406].includes(error.status)))
  );
}
export function retryDelay(error: unknown, attempt: number): number {
  const base = error instanceof HttpError && [429, 406].includes(error.status) ? 30000 : 5000;
  return Math.max(base * 2 ** (attempt - 1), error instanceof HttpError ? error.retryAfterMs : 0);
}
export function waitForRetry(milliseconds: number, signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    function abort(): void {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      reject(signal?.reason ?? new DOMException('Busca cancelada', 'AbortError'));
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, milliseconds);
    signal?.addEventListener('abort', abort, { once: true });
  });
}
