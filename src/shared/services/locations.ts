import type { City, State } from '@/shared/types/health';
import { getJson } from './http';

const baseUrl = 'https://servicodados.ibge.gov.br/api/v1/localidades';
export function getStates(signal?: AbortSignal): Promise<State[]> {
  return getJson(`${baseUrl}/estados?orderBy=nome`, signal);
}
export function getCities(state: string, signal?: AbortSignal): Promise<City[]> {
  if (!/^[A-Z]{2}$/.test(state)) throw new Error('Selecione um estado válido.');
  return getJson(`${baseUrl}/estados/${state}/municipios?orderBy=nome`, signal);
}
