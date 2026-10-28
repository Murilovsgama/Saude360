import type { HealthUnit, OsmElement, SearchResult, UnitType } from '@/shared/types/health';
import { getJson } from './http';

const endpoint = 'https://overpass-api.de/api/interpreter';
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
export function buildQuery(cityId: string): string {
  if (!/^\d{7}$/.test(cityId)) throw new Error('Selecione um município válido.');
  return `[out:json][timeout:25];area["ref:IBGE"="${cityId}"]["admin_level"="8"]->.city;(nwr(area.city)["amenity"~"^(clinic|hospital|doctors)$"]["name"~"${namePattern}",i];nwr(area.city)["healthcare"~"^(clinic|hospital|centre|doctor)$"]["name"~"${namePattern}",i];);out meta center;`;
}
interface OverpassResponse {
  elements: OsmElement[];
  osm3s?: { timestamp_osm_base?: string };
  remark?: string;
}
export async function getHealthUnits(cityId: string, signal?: AbortSignal): Promise<SearchResult> {
  const saved = cache.get(cityId);
  if (saved && saved.expires > Date.now()) return saved.result;
  const params = new URLSearchParams({ data: buildQuery(cityId) });
  const data = await getJson<OverpassResponse>(`${endpoint}?${params}`, signal);
  if (!Array.isArray(data.elements) || data.remark)
    throw new Error('A consulta não foi concluída pela fonte de dados. Tente novamente.');
  const mapped = data.elements.map(mapElement).filter((unit): unit is HealthUnit => unit !== null);
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
  cache.set(cityId, { expires: Date.now() + 5 * 60 * 1000, result });
  return result;
}
export function routeUrl(unit: HealthUnit): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${unit.latitude},${unit.longitude}`;
}
