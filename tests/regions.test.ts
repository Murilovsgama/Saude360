import { describe, expect, it } from 'vitest';
import {
  capitalRegions,
  citiesInGroup,
  getCapitalRegion,
  unitInRegion,
} from '../src/shared/services/regions';
import { buildQuery } from '../src/shared/services/healthUnits';

describe('regiões geográficas', () => {
  it.each([
    ['leste', -46.455, -23.54],
    ['oeste', -46.693, -23.566],
    ['centro', -46.633, -23.55],
    ['norte', -46.625, -23.499],
    ['sul', -46.707, -23.654],
  ])('localiza um ponto de referência na região %s', (id, longitude, latitude) => {
    const matches = capitalRegions.filter((region) =>
      unitInRegion({ longitude, latitude }, region),
    );
    expect(matches.map((region) => region.id)).toEqual([id]);
  });
  it('exclui Guarulhos e Suzano dos polígonos da capital', () => {
    for (const point of [
      { longitude: -46.533, latitude: -23.46 },
      { longitude: -46.31, latitude: -23.54 },
    ]) {
      expect(capitalRegions.some((region) => unitInRegion(point, region))).toBe(false);
    }
  });
  it('respeita buracos internos dos polígonos', () => {
    const region = {
      id: 'test',
      label: 'test',
      bounds: [0, 0, 10, 10],
      polygons: [
        [
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
          ],
          [
            [4, 4],
            [6, 4],
            [6, 6],
            [4, 6],
            [4, 4],
          ],
        ],
      ],
    };
    expect(unitInRegion({ longitude: 2, latitude: 2 }, region)).toBe(true);
    expect(unitInRegion({ longitude: 5, latitude: 5 }, region)).toBe(false);
  });
  it('usa sete municípios do ABC e mantém Suzano e Guarulhos separados', () => {
    const cities = [
      3513801, 3529401, 3543303, 3544103, 3547809, 3548708, 3548807, 3550308, 3518800, 3552502,
    ].map((id) => ({ id, nome: String(id) }));
    expect(citiesInGroup(cities, 'abc').map((city) => city.id)).toEqual([
      3513801, 3529401, 3543303, 3544103, 3547809, 3548708, 3548807,
    ]);
    expect(citiesInGroup(cities, 'suzano').map((city) => city.id)).toEqual([3552502]);
    expect(citiesInGroup(cities, 'guarulhos').map((city) => city.id)).toEqual([3518800]);
    expect(citiesInGroup(cities, 'all')).toEqual(cities);
  });
  it('limita a consulta pelo retângulo da região e pelo tipo antes de buscar', () => {
    const query = buildQuery('3550308', { region: 'leste', type: 'UPA' });
    expect(query).toContain(`nwr(${getCapitalRegion('leste')!.bounds.join(',')})`);
    expect(query).not.toContain('area.city');
    expect(query).not.toContain('USF');
    expect(query).not.toContain('UBS|');
    expect(() => buildQuery('3518800', { region: 'leste' })).toThrow();
    expect(() => buildQuery('3550308', { region: 'desconhecida' })).toThrow();
  });
});
