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
}
export interface SearchResult {
  units: HealthUnit[];
  consultedAt: string;
  mapUpdatedAt: string;
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
