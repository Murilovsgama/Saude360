import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildQuery,
  getHealthUnits,
  identifyType,
  mapElement,
  normalizeText,
} from '../src/shared/services/healthUnits';
import { getCities } from '../src/shared/services/locations';
import { getJson } from '../src/shared/services/http';

afterEach(() => vi.unstubAllGlobals());
describe('identificação e normalização de unidades', () => {
  it.each([
    ['UBS Centro', 'UBS'],
    ['Unidade Básica de Saúde São João', 'UBS'],
    ['USF Jardim', 'UBS'],
    ['Clínica da Família Vila', 'UBS'],
    ['UPA Norte', 'UPA'],
    ['Unidade de Pronto Atendimento', 'UPA'],
    ['Clínica Particular', null],
    ['Hospital Itupava', null],
  ])('%s → %s', (name, expected) => {
    expect(identifyType(name)).toBe(expected);
  });
  it('permite busca sem acentos', () => {
    expect(normalizeText('São João')).toBe('sao joao');
  });
  it('ignora registros privados ou sem coordenadas válidas', () => {
    expect(mapElement({ type: 'node', id: 1, tags: { name: 'UBS Centro' } })).toBeNull();
    expect(
      mapElement({
        type: 'node',
        id: 2,
        lat: 0,
        lon: 0,
        tags: { name: 'UBS Centro', 'operator:type': 'private' },
      }),
    ).toBeNull();
    expect(
      mapElement({ type: 'node', id: 3, lat: 100, lon: 0, tags: { name: 'UPA Centro' } }),
    ).toBeNull();
  });
  it('usa o centro de contornos e preserva campos ausentes sem inventar dados', () => {
    const unit = mapElement({
      type: 'way',
      id: 4,
      center: { lat: -23.5, lon: -46.6 },
      tags: { name: 'UPA Centro' },
    });
    expect(unit).toMatchObject({
      id: 'way/4',
      latitude: -23.5,
      phone: '',
      street: '',
      hours: '',
      sourceUrl: 'https://www.openstreetmap.org/way/4',
    });
  });
});
describe('consultas externas', () => {
  it('valida o código do município antes de construir a consulta', () => {
    expect(buildQuery('3550308')).toContain('"ref:IBGE"="3550308"');
    expect(() => buildQuery('3550308"];out;')).toThrow();
    expect(() => getCities('../municipios')).toThrow();
  });
  it('remove duplicações próximas e reutiliza a consulta por município', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          elements: [
            { type: 'node', id: 1, lat: -23.5, lon: -46.6, tags: { name: 'UBS Centro' } },
            {
              type: 'way',
              id: 2,
              center: { lat: -23.50001, lon: -46.60001 },
              tags: { name: 'UBS Centro' },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const first = await getHealthUnits('1100015');
    const second = await getHealthUnits('1100015');
    expect(first.units).toHaveLength(1);
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('rejeita respostas parciais com erro da Overpass', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ elements: [], remark: 'runtime error: timeout' })),
        ),
    );
    await expect(getHealthUnits('1100023')).rejects.toThrow('não foi concluída');
  });
  it('trata o limite da API sem apresentar lista vazia como resultado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 429 })));
    await expect(getJson('https://example.com')).rejects.toThrow('ocupada');
  });
});
