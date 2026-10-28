import type { HealthUnit } from '@/shared/types/health';

export function isHealthUnit(value: unknown): value is HealthUnit {
  if (!value || typeof value !== 'object') return false;
  const unit = value as HealthUnit;
  const textFields = [
    'id',
    'name',
    'street',
    'neighborhood',
    'phone',
    'hours',
    'operator',
    'cnes',
    'editedAt',
    'sourceUrl',
  ] as const;
  if (
    !textFields.every((field) => typeof unit[field] === 'string') ||
    !unit.name.trim() ||
    !['UBS', 'UPA'].includes(unit.type) ||
    !Number.isFinite(unit.latitude) ||
    Math.abs(unit.latitude) > 90 ||
    !Number.isFinite(unit.longitude) ||
    Math.abs(unit.longitude) > 180
  )
    return false;
  if (/^(node|way|relation)\/\d+$/.test(unit.id))
    return (
      (!unit.dataSource || unit.dataSource === 'osm') &&
      unit.sourceUrl === `https://www.openstreetmap.org/${unit.id}`
    );
  if (/^cnes\/\d{7}$/.test(unit.id))
    return (
      unit.dataSource === 'cnes' &&
      unit.sourceUrl ===
        `https://apidadosabertos.saude.gov.br/cnes/estabelecimentos/${unit.id.split('/')[1]}`
    );
  if (/^geosampa\/(ubs|upa)\/\d+$/.test(unit.id) && unit.dataSource === 'geosampa') {
    try {
      const url = new URL(unit.sourceUrl);
      const [, kind, id] = unit.id.split('/');
      const layer =
        kind === 'ubs'
          ? 'equipamento_saude_ubs_posto_centro'
          : 'equipamento_saude_urgencia_emergencia';
      return (
        unit.type.toLowerCase() === kind &&
        url.origin === 'https://wfs.geosampa.prefeitura.sp.gov.br' &&
        url.pathname === '/geoserver/geoportal/wfs' &&
        url.searchParams.get('featureID') === `${layer}.${id}`
      );
    } catch {
      return false;
    }
  }
  return false;
}
export function unitSourceLabel(unit: HealthUnit): string {
  return unit.dataSource === 'geosampa'
    ? 'GeoSampa · Prefeitura de SP'
    : unit.dataSource === 'cnes'
      ? 'CNES · Ministério da Saúde'
      : 'OpenStreetMap';
}
