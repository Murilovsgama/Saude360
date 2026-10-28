import coverage from '@/shared/data/publishedCities.json';
import type { HealthUnit, SearchResult } from '@/shared/types/health';
import { getJson } from './http';
import { isHealthUnit } from './healthValidation';
import { getCapitalRegion, unitInRegion } from './regions';

export const publishedCities = coverage;
export function publishedVersion(cityId: string): string | undefined {
  return publishedCities.find((city) => city.id === cityId)?.revision;
}
export function hasPublishedUnits(cityId: string): boolean {
  return publishedCities.some((city) => city.id === cityId);
}
interface PublishedDataset {
  schemaVersion: number;
  revision: string;
  complete: boolean;
  unitCount: number;
  cityId: string;
  collectedAt: string;
  sourceName: string;
  units: HealthUnit[];
}
export async function getPublishedUnits(
  cityId: string,
  options: { region?: string; type?: string; refresh?: boolean },
  signal?: AbortSignal,
): Promise<SearchResult> {
  const city = publishedCities.find((item) => item.id === cityId);
  if (!city) throw new Error('Não há recorte publicado para esta cidade.');
  const data = await getJson<PublishedDataset>(
    `${import.meta.env.BASE_URL}data/health-units/${cityId}.json`,
    signal,
    { timeoutMs: 10000, ...(options.refresh ? { cache: 'reload' as const } : {}) },
  );
  signal?.throwIfAborted();
  if (
    !data ||
    data.schemaVersion !== 1 ||
    typeof data.revision !== 'string' ||
    !/^[a-f0-9]{64}$/.test(data.revision) ||
    data.complete !== true ||
    data.cityId !== cityId ||
    !Number.isFinite(Date.parse(data.collectedAt)) ||
    typeof data.sourceName !== 'string' ||
    !Array.isArray(data.units) ||
    data.units.length === 0 ||
    data.units.length !== data.unitCount ||
    new Set(data.units.map((unit) => unit.id)).size !== data.units.length ||
    !data.units.every(isHealthUnit)
  )
    throw new Error(
      'O recorte publicado está incompleto ou inválido. Não foi possível verificar as unidades.',
    );
  const region = options.region ? getCapitalRegion(options.region) : undefined;
  const units = data.units.filter(
    (unit) =>
      (!region || unitInRegion(unit, region)) &&
      (!options.type || options.type === 'all' || unit.type === options.type),
  );
  return {
    units,
    consultedAt: new Date().toISOString(),
    mapUpdatedAt: '',
    source: 'published',
    publishedAt: data.collectedAt,
    publishedRevision: data.revision,
    sourceName: data.sourceName,
    stale: false,
  };
}
