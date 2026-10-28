import snapshot from '@/shared/data/saoPauloRegions.json';
import type { City, HealthUnit } from '@/shared/types/health';

export interface CapitalRegion {
  id: string;
  label: string;
  bounds: number[]; // sul, oeste, norte, leste
  polygons: number[][][][]; // polígonos → anéis → [longitude, latitude]
}
export const capitalRegions: CapitalRegion[] = snapshot.regions;
export const capitalId = '3550308';
export const cityGroups = [
  { id: 'all', label: 'Todas as cidades', cities: [] as string[] },
  { id: 'capital', label: 'São Paulo · Capital', cities: [capitalId] },
  {
    id: 'abc',
    label: 'Grande ABC',
    cities: ['3513801', '3529401', '3544103', '3543303', '3547809', '3548708', '3548807'],
  },
  { id: 'suzano', label: 'Suzano', cities: ['3552502'] },
  { id: 'guarulhos', label: 'Guarulhos', cities: ['3518800'] },
];
export function getCapitalRegion(id: string): CapitalRegion | undefined {
  return capitalRegions.find((region) => region.id === id);
}
export function citiesInGroup(cities: City[], groupId: string): City[] {
  const group = cityGroups.find((item) => item.id === groupId);
  if (!group || group.id === 'all') return cities;
  return cities.filter((city) => group.cities.includes(String(city.id)));
}
function inRing(lon: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    // Inclui pontos sobre a borda para evitar lacunas entre subprefeituras.
    const cross = (lon - xi) * (yj - yi) - (lat - yi) * (xj - xi);
    if (
      Math.abs(cross) < 1e-12 &&
      lon >= Math.min(xi, xj) &&
      lon <= Math.max(xi, xj) &&
      lat >= Math.min(yi, yj) &&
      lat <= Math.max(yi, yj)
    )
      return true;
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export function unitInRegion(
  unit: Pick<HealthUnit, 'longitude' | 'latitude'>,
  region: CapitalRegion,
): boolean {
  const { longitude: lon, latitude: lat } = unit;
  return region.polygons.some(
    (rings) => inRing(lon, lat, rings[0]) && !rings.slice(1).some((hole) => inRing(lon, lat, hole)),
  );
}
