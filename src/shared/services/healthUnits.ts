import type { HealthUnit, OsmElement, SearchResult, UnitType } from '@/shared/types/health';
import { getJson, HttpError } from './http';
import { capitalId, getCapitalRegion, unitInRegion } from './regions';

const endpoints = [
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];
export interface UnitSearch {
  region?: string;
  type?: 'all' | UnitType;
}
const cache = new Map<string, { expires: number; result: SearchResult }>();
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
  const saved = cache.get(cacheKey);
  if (saved && saved.expires > Date.now()) return saved.result;
  let data: OverpassResponse | undefined;
  for (let attempt = 0; attempt < endpoints.length; attempt++) {
    signal?.throwIfAborted();
    try {
      data = await getJson<OverpassResponse>(endpoints[attempt], signal, {
        method: 'POST',
        body: new URLSearchParams({ data: query }),
        timeoutMs: 22000,
      });
      if (!Array.isArray(data.elements))
        throw new Error('A fonte de dados retornou uma resposta inválida.');
      if (data.remark) {
        const error = new Error(
          'A consulta não foi concluída pela fonte de dados. Selecione uma região menor e tente novamente.',
        );
        error.name = /timeout|timed out/i.test(data.remark) ? 'OverpassTimeout' : 'OverpassError';
        throw error;
      }
      break;
    } catch (error) {
      signal?.throwIfAborted();
      const name = error instanceof Error ? error.name : '';
      const retryable =
        error instanceof TypeError ||
        ['TimeoutError', 'OverpassTimeout'].includes(name) ||
        (error instanceof HttpError && error.status >= 500);
      if (attempt < endpoints.length - 1 && retryable) continue;
      if (name === 'TimeoutError')
        throw new Error(
          'A consulta demorou mais que o esperado. Escolha uma região menor ou tente novamente em alguns instantes.',
        );
      throw error;
    }
  }
  if (!data) throw new Error('A busca não foi concluída. Tente novamente.');
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
  const result = {
    units,
    consultedAt: new Date().toISOString(),
    mapUpdatedAt: data.osm3s?.timestamp_osm_base || '',
  };
  cache.set(cacheKey, { expires: Date.now() + 5 * 60 * 1000, result });
  return result;
}
export function routeUrl(unit: HealthUnit): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${unit.latitude},${unit.longitude}`;
}
