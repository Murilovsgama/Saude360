export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
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
    if (response.status === 429)
      throw new HttpError(
        429,
        'A fonte de dados atingiu o limite de consultas. Aguarde um momento antes de tentar novamente.',
      );
    if (response.status >= 500)
      throw new HttpError(
        response.status,
        'A fonte de dados está ocupada. Aguarde um momento e tente novamente.',
      );
    throw new HttpError(
      response.status,
      'Não foi possível consultar a fonte de dados. Tente novamente em instantes.',
    );
  }
  return response.json() as Promise<T>;
}
