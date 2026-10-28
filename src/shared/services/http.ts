export async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(35000);
  const response = await fetch(url, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!response.ok) {
    if (response.status === 429 || response.status === 504) {
      throw new Error('A fonte de dados está ocupada. Aguarde um momento e tente novamente.');
    }
    throw new Error('Não foi possível consultar a fonte de dados. Tente novamente em instantes.');
  }
  return response.json() as Promise<T>;
}
