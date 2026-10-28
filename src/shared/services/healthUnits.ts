import type { HealthUnit, OsmElement, SearchResult, UnitType } from '@/shared/types/health';
import { getJson } from './http';
import {
  CACHE_FRESH_MS,
  readSearchCache,
  saveSearchCache,
  readCooldown,
  setCooldown,
} from './searchCache';
import { MAX_ATTEMPTS, isRetryable, retryDelay, waitForRetry, type SearchProgress } from './retry';
import { capitalId, getCapitalRegion, unitInRegion } from './regions';

const endpoints = [
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];
export interface UnitSearch {
  region?: string;
  type?: 'all' | UnitType;
  refresh?: boolean;
  onProgress?: (progress: SearchProgress) => void;
}
export class SearchUnavailableError extends Error {
  constructor(public retryAt: number) {
    super(
      'A fonte de dados está temporariamente indisponível ou sem capacidade. Não foi possível verificar as unidades desta região agora.',
    );
    this.name = 'SearchUnavailableError';
  }
}
const namePattern =
  '(^|[^a-z])(UBS|UPA|USF|ESF)([^a-z]|$)|unidade b[aá]sica|unidade de pronto atendimento|unidade de sa[uú]de da fam[ií]lia|posto de sa[uú]de|cl[ií]nica da fam[ií]lia';

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
export function identifyType(name: string): UnitType | null {
  const text = normalizeText(name);
  if (/(^|[^a-z])upa([^a-z]|$)|unidade de pronto atendimento/.test(text)) return 'UPA';
  if (
    /(^|[^a-z])(ubs|usf|esf)([^a-z]|$)|unidade basica|unidade de saude da familia|posto de saude|clinica da familia/.test(
      text,
    )
  )
    return 'UBS';
  return null;
}
export function mapElement(element: OsmElement): HealthUnit | null {
  const tags = element.tags ?? {};
  const name = tags.name?.trim();
  const type = name ? identifyType(name) : null;
  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;
  if (
    !name ||
    !type ||
    latitude == null ||
    longitude == null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  )
    return null;
  if (tags.access === 'private' || tags['operator:type'] === 'private') return null;
  return {
    id: `${element.type}/${element.id}`,
    name,
    type,
    latitude,
    longitude,
    street: [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(', '),
    neighborhood: tags['addr:suburb'] || tags['addr:neighbourhood'] || '',
    phone: tags['contact:phone'] || tags.phone || '',
    hours: tags.opening_hours || '',
    operator: tags.operator || '',
    cnes: tags['ref:CNES'] || tags['ref:cnes'] || '',
    editedAt: element.timestamp || '',
    sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
  };
}
export function buildQuery(cityId: string, options: UnitSearch = {}): string {
  if (!/^\d{7}$/.test(cityId)) throw new Error('Selecione um município válido.');
  const region = options.region ? getCapitalRegion(options.region) : undefined;
  if (options.region && (cityId !== capitalId || !region))
    throw new Error('Selecione uma região válida para São Paulo.');
  if (options.type && !['all', 'UBS', 'UPA'].includes(options.type))
    throw new Error('Selecione um tipo de unidade válido.');
  const pattern =
    options.type === 'UPA'
      ? '(^|[^a-z])UPA([^a-z]|$)|unidade de pronto atendimento'
      : options.type === 'UBS'
        ? namePattern.replace('UBS|UPA|', 'UBS|').replace('|unidade de pronto atendimento', '')
        : namePattern;
  // O retângulo reduz a busca no servidor; o polígono oficial refina os resultados no navegador.
  const scope = region ? `(${region.bounds.join(',')})` : '(area.city)';
  const area = region ? '' : `area["ref:IBGE"="${cityId}"]["admin_level"="8"]->.city;`;
  return `[out:json][timeout:18];${area}(nwr${scope}["amenity"~"^(clinic|hospital|doctors)$"]["name"~"${pattern}",i];nwr${scope}["healthcare"~"^(clinic|hospital|centre|doctor)$"]["name"~"${pattern}",i];);out meta center;`;
}
interface OverpassResponse {
  elements: OsmElement[];
  osm3s?: { timestamp_osm_base?: string };
  remark?: string;
}
export async function getHealthUnits(
  cityId: string,
  signal?: AbortSignal,
  options: UnitSearch = {},
): Promise<SearchResult> {
  const query = buildQuery(cityId, options);
  const cacheKey = `${cityId}:${options.region || 'all'}:${options.type || 'all'}`;
  signal?.throwIfAborted();
  const saved = readSearchCache(cacheKey);
  if (saved && !options.refresh && Date.now() - Date.parse(saved.consultedAt) < CACHE_FRESH_MS)
    return { ...saved, source: 'cache', stale: false };
  function unavailable(retryAt: number): SearchResult {
    const error = new SearchUnavailableError(retryAt);
    if (saved?.units.length)
      return {
        ...saved,
        source: 'cache',
        stale: true,
        availabilityMessage: error.message,
        retryAt,
      };
    throw error;
  }
  const cooldown = readCooldown();
  if (cooldown > Date.now()) return unavailable(cooldown);
  let data: OverpassResponse | undefined;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    signal?.throwIfAborted();
    options.onProgress?.({ phase: 'request', attempt, maxAttempts: MAX_ATTEMPTS });
    try {
      data = await getJson<OverpassResponse>(endpoints[(attempt - 1) % endpoints.length], signal, {
        method: 'POST',
        body: new URLSearchParams({ data: query }),
        timeoutMs: 22000,
      });
      signal?.throwIfAborted();
      if (!data || !Array.isArray(data.elements))
        throw new Error('Resposta inválida da fonte de dados.');
      if (data.remark) {
        const error = new Error('Consulta incompleta.');
        error.name = /timeout|timed out|capacity|busy/i.test(data.remark)
          ? 'OverpassTimeout'
          : 'OverpassError';
        throw error;
      }
      if (
        !data.elements.every(
          (element) =>
            element &&
            typeof element === 'object' &&
            ['node', 'way', 'relation'].includes(element.type) &&
            Number.isInteger(element.id) &&
            (!element.tags ||
              (typeof element.tags === 'object' &&
                !Array.isArray(element.tags) &&
                Object.values(element.tags).every((value) => typeof value === 'string'))),
        )
      )
        throw new Error('Registros inválidos na resposta da fonte de dados.');
      break;
    } catch (error) {
      signal?.throwIfAborted();
      const delay = retryDelay(error, attempt);
      const retryAt = Date.now() + delay;
      setCooldown(retryAt);
      // Limite global: três chamadas no total. Uma espera longa indicada pela API exige ação posterior.
      if (!isRetryable(error) || attempt === MAX_ATTEMPTS || delay > 60000)
        return unavailable(retryAt);
      options.onProgress?.({
        phase: 'waiting',
        attempt: attempt + 1,
        maxAttempts: MAX_ATTEMPTS,
        retryAt,
      });
      await waitForRetry(delay, signal);
    }
  }
  if (!data) return unavailable(Date.now() + 20000);
  const region = options.region ? getCapitalRegion(options.region) : undefined;
  const mapped = data.elements
    .map(mapElement)
    .filter((unit): unit is HealthUnit => unit !== null)
    .filter(
      (unit) =>
        (!region || unitInRegion(unit, region)) &&
        (!options.type || options.type === 'all' || unit.type === options.type),
    );
  // Um mesmo local pode estar cadastrado como ponto e como contorno no mapa.
  const units = mapped
    .filter(
      (unit, index, all) =>
        !all
          .slice(0, index)
          .some(
            (other) =>
              normalizeText(other.name) === normalizeText(unit.name) &&
              Math.abs(other.latitude - unit.latitude) < 0.0005 &&
              Math.abs(other.longitude - unit.longitude) < 0.0005,
          ),
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const result: SearchResult = {
    source: 'network',
    stale: false,
    units,
    consultedAt: new Date().toISOString(),
    mapUpdatedAt: data.osm3s?.timestamp_osm_base || '',
  };
  saveSearchCache(cacheKey, result);
  return result;
}
export function routeUrl(unit: HealthUnit): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${unit.latitude},${unit.longitude}`;
}
