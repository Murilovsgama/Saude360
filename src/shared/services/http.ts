export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public retryAfterMs = 0,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
export function parseRetryAfter(value: string | null): number {
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0)
    return Number.isFinite(seconds * 1000) ? seconds * 1000 : 0;
  const time = Date.parse(value);
  return Number.isFinite(time) ? Math.max(0, time - Date.now()) : 0;
}
export async function getJson<T>(
  url: string,
  signal?: AbortSignal,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const { timeoutMs = 35000, ...requestOptions } = options;
  const timeout = AbortSignal.timeout(timeoutMs);
  const response = await fetch(url, {
    ...requestOptions,
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!response.ok) {
    const retryAfterMs = parseRetryAfter(response.headers.get('Retry-After'));
    if ([429, 406].includes(response.status))
      throw new HttpError(
        response.status,
        'A fonte de dados atingiu o limite de consultas. Aguarde um momento antes de tentar novamente.',
        retryAfterMs,
      );
    if (response.status >= 500)
      throw new HttpError(
        response.status,
        'A fonte de dados está ocupada. Aguarde um momento e tente novamente.',
        retryAfterMs,
      );
    throw new HttpError(
      response.status,
      'Não foi possível consultar a fonte de dados. Tente novamente em instantes.',
      retryAfterMs,
    );
  }
  return response.json() as Promise<T>;
}
