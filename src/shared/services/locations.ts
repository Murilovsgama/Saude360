import type { City, State } from '@/shared/types/health';
import coverage from '@/shared/data/publishedCities.json';
import { getJson } from './http';

const baseUrl = 'https://servicodados.ibge.gov.br/api/v1/localidades';
export function getStates(signal?: AbortSignal, onFallback?: () => void): Promise<State[]> {
  return getJson<State[]>(`${baseUrl}/estados?orderBy=nome`, signal, { timeoutMs: 5000 }).catch(
    () => {
      signal?.throwIfAborted();
      onFallback?.();
      return [{ id: 35, sigla: 'SP', nome: 'São Paulo' }];
    },
  );
}
export function getCities(
  state: string,
  signal?: AbortSignal,
  onFallback?: () => void,
): Promise<City[]> {
  if (!/^[A-Z]{2}$/.test(state)) throw new Error('Selecione um estado válido.');
  return getJson<City[]>(`${baseUrl}/estados/${state}/municipios?orderBy=nome`, signal, {
    timeoutMs: 5000,
  }).catch((error) => {
    signal?.throwIfAborted();
    if (state !== 'SP') throw error;
    onFallback?.();
    return coverage.map((city) => ({ id: Number(city.id), nome: city.nome }));
  });
}
