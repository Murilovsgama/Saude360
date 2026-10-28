import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { MemoryStorage } from './helpers/storage';
import { getPublishedUnits, publishedCities } from '../src/shared/services/publishedUnits';
import { isHealthUnit } from '../src/shared/services/healthValidation';
import { unitInRegion, getCapitalRegion } from '../src/shared/services/regions';

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage());
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('recortes oficiais publicados', () => {
  it.each(publishedCities)(
    'valida a coleção real de $nome e a origem dos registros',
    async (city) => {
      const data = JSON.parse(readFileSync(`public/data/health-units/${city.id}.json`, 'utf8'));
      expect(data.cityId).toBe(city.id);
      expect(data.complete).toBe(true);
      expect(data.units).toHaveLength(city.units);
      expect(data.unitCount).toBe(city.units);
      expect(data.units.every(isHealthUnit)).toBe(true);
      expect(new Set(data.units.map((unit: { id: string }) => unit.id)).size).toBe(city.units);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(data))));
      const result = await getPublishedUnits(city.id, {});
      expect(result.source).toBe('published');
      expect(result.publishedAt).toBe(data.collectedAt);
      expect(result.units).toHaveLength(city.units);
    },
  );
  it('filtra Zona Leste e UBS sobre os dados reais da capital', async () => {
    const data = readFileSync('public/data/health-units/3550308.json', 'utf8');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(data)));
    const result = await getPublishedUnits('3550308', { region: 'leste', type: 'UBS' });
    expect(result.units.length).toBeGreaterThan(0);
    expect(
      result.units.every(
        (unit) => unit.type === 'UBS' && unitInRegion(unit, getCapitalRegion('leste')!),
      ),
    ).toBe(true);
  });
  it('não transforma um arquivo publicado incompleto em ausência de unidades', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ schemaVersion: 1, cityId: '3550308', complete: false, units: [] }),
          ),
        ),
    );
    await expect(getPublishedUnits('3550308', {})).rejects.toThrow('incompleto');
  });
  it('não consulta a Overpass para uma cidade coberta, mesmo durante cooldown', async () => {
    const data = readFileSync('public/data/health-units/3518800.json', 'utf8');
    localStorage.setItem('saude360:overpass:retry-at:v1', String(Date.now() + 60000));
    const mock = vi.fn().mockResolvedValue(new Response(data));
    vi.stubGlobal('fetch', mock);
    const { getHealthUnits } = await import('../src/shared/services/healthUnits');
    const result = await getHealthUnits('3518800');
    expect(result.source).toBe('published');
    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock.mock.calls[0][0]).toContain('data/health-units/3518800.json');
  });
});
