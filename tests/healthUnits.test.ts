import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildQuery,
  identifyType,
  mapElement,
  normalizeText,
} from '../src/shared/services/healthUnits';
import { getCities } from '../src/shared/services/locations';
import { getJson } from '../src/shared/services/http';

import { MemoryStorage } from './helpers/storage';
let getHealthUnits: typeof import('../src/shared/services/healthUnits').getHealthUnits;
beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  vi.doMock('../src/shared/services/publishedUnits', () => ({ hasPublishedUnits: () => false }));
  vi.stubGlobal('localStorage', new MemoryStorage());
  ({ getHealthUnits } = await import('../src/shared/services/healthUnits'));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
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
    expect(second.units).toEqual(first.units);
    expect(second.source).toBe('cache');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('rejeita respostas parciais com erro da Overpass', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(
            new Response(JSON.stringify({ elements: [], remark: 'runtime error: timeout' })),
          ),
        ),
    );
    const assertion = expect(getHealthUnits('1100023')).rejects.toThrow(
      'temporariamente indisponível',
    );
    await vi.runAllTimersAsync();
    await assertion;
  });
  it('trata o limite da API sem apresentar lista vazia como resultado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 429 })));
    await expect(getJson('https://example.com')).rejects.toThrow('limite');
  });
});

describe('recortes e disponibilidade da busca', () => {
  it('usa POST e tenta a segunda instância uma única vez se a primeira falhar', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ elements: [] })));
    vi.stubGlobal('fetch', fetchMock);
    const pending = getHealthUnits('3518800', undefined, { type: 'UPA' });
    await vi.runAllTimersAsync();
    await pending;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain('private.coffee');
    expect(fetchMock.mock.calls[1][0]).toContain('overpass-api.de');
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
  });
  it('limita a três tentativas com espera após limite de requisições', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(new Response('', { status: 429 })));
    vi.stubGlobal('fetch', fetchMock);
    const assertion = expect(getHealthUnits('3552502', undefined, { type: 'UPA' })).rejects.toThrow(
      'temporariamente indisponível',
    );
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it('não tenta outro servidor se a busca foi cancelada pelo usuário', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockImplementation(() => {
      controller.abort();
      throw new DOMException('Aborted', 'AbortError');
    });
    vi.stubGlobal('fetch', fetchMock);
    await expect(getHealthUnits('3513801', controller.signal)).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('separa cache por região e tipo e exclui unidades fora do recorte', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            elements: [
              { type: 'node', id: 1, lat: -23.54, lon: -46.455, tags: { name: 'UBS Itaquera' } },
              { type: 'node', id: 2, lat: -23.566, lon: -46.693, tags: { name: 'UBS Pinheiros' } },
              { type: 'node', id: 3, lat: -23.54, lon: -46.455, tags: { name: 'UPA Itaquera' } },
            ],
          }),
        ),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const east = await getHealthUnits('3550308', undefined, { region: 'leste', type: 'UBS' });
    const west = await getHealthUnits('3550308', undefined, { region: 'oeste', type: 'UBS' });
    const emergency = await getHealthUnits('3550308', undefined, { region: 'leste', type: 'UPA' });
    expect(east.units.map((unit) => unit.name)).toEqual(['UBS Itaquera']);
    expect(west.units.map((unit) => unit.name)).toEqual(['UBS Pinheiros']);
    expect(emergency.units.map((unit) => unit.name)).toEqual(['UPA Itaquera']);
    await getHealthUnits('3550308', undefined, { region: 'leste', type: 'UBS' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
