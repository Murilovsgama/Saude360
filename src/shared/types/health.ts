export interface State {
  id: number;
  sigla: string;
  nome: string;
}
export interface City {
  id: number;
  nome: string;
}
export type UnitType = 'UBS' | 'UPA';
export interface HealthUnit {
  id: string;
  name: string;
  type: UnitType;
  latitude: number;
  longitude: number;
  street: string;
  neighborhood: string;
  phone: string;
  hours: string;
  operator: string;
  cnes: string;
  editedAt: string;
  sourceUrl: string;
  dataSource?: 'osm' | 'geosampa' | 'cnes';
}
export interface SearchResult {
  units: HealthUnit[];
  consultedAt: string;
  mapUpdatedAt: string;
  source: 'network' | 'cache' | 'published';
  publishedAt?: string;
  publishedRevision?: string;
  sourceName?: string;
  stale: boolean;
  availabilityMessage?: string;
  retryAt?: number;
}
export interface OsmElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  timestamp?: string;
  tags?: Record<string, string>;
}
