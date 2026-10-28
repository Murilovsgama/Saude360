import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryStorage } from './helpers/storage';
import type { SearchProgress } from '../src/shared/services/retry';

let service: typeof import('../src/shared/services/healthUnits');
let storage: MemoryStorage;
const key = 'saude360:units:v1:3518800:all:all';
const now = new Date('2026-10-28T12:00:00Z');
const unit = {
  id: 'node/1',
  name: 'UBS Centro',
  type: 'UBS',
  latitude: -23.46,
  longitude: -46.53,
  street: '',
  neighborhood: '',
  phone: '',
  hours: '',
  operator: '',
  cnes: '',
  editedAt: '',
  sourceUrl: 'https://www.openstreetmap.org/node/1',
};
function seed(age: number, units: unknown[] = [unit]): string {
  const consultedAt = new Date(Date.now() - age).toISOString();
  storage.setItem(key, JSON.stringify({ units, consultedAt, mapUpdatedAt: '' }));
  return consultedAt;
}
function response(): Response {
  return new Response(
    JSON.stringify({
      elements: [{ type: 'node', id: 1, lat: -23.46, lon: -46.53, tags: { name: 'UBS Centro' } }],
    }),
  );
}
beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.resetModules();
  storage = new MemoryStorage();
  vi.stubGlobal('localStorage', storage);
  service = await import('../src/shared/services/healthUnits');
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('espera progressiva e limites', () => {
  it('aguarda 5 e 10 segundos, limita a três chamadas e preserva o cooldown após a falha', async () => {
    const calls: number[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        calls.push(Date.now());
        return Promise.resolve(new Response('capacity', { status: 502 }));
      }),
    );
    const states: SearchProgress[] = [];
    const pending = expect(
      service.getHealthUnits('3518800', undefined, { onProgress: (state) => states.push(state) }),
    ).rejects.toBeInstanceOf(service.SearchUnavailableError);
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(4999);
    expect(calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(9999);
    expect(calls).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(calls.map((time) => time - now.getTime())).toEqual([0, 5000, 15000]);
    expect(
      states.filter((state) => state.phase === 'waiting').map((state) => state.attempt),
    ).toEqual([2, 3]);
    await expect(service.getHealthUnits('3552502')).rejects.toBeInstanceOf(
      service.SearchUnavailableError,
    );
    expect(calls).toHaveLength(3);
  });
  it('respeita Retry-After e permite cancelar a espera sem nova requisição', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('', { status: 503, headers: { 'Retry-After': '40' } }));
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    const pending = expect(
      service.getHealthUnits('3518800', controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(39000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    controller.abort();
    await pending;
    await vi.advanceTimersByTimeAsync(60000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('não faz repetição automática quando Retry-After exige uma espera longa', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('', { status: 429, headers: { 'Retry-After': '120' } }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(service.getHealthUnits('3518800')).rejects.toMatchObject({
      retryAt: now.getTime() + 120000,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('entende Retry-After em segundos e data HTTP', async () => {
    const { parseRetryAfter } = await import('../src/shared/services/http');
    expect(parseRetryAfter('30')).toBe(30000);
    expect(parseRetryAfter(new Date(Date.now() + 60000).toUTCString())).toBe(60000);
    expect(parseRetryAfter('invalid')).toBe(0);
  });
});

describe('resultados salvos e indisponibilidade', () => {
  it('persiste um resultado válido e o reutiliza após recarregar o módulo sem chamada à API', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(response()));
    vi.stubGlobal('fetch', fetchMock);
    const first = await service.getHealthUnits('3518800');
    expect(first.source).toBe('network');
    expect(storage.getItem(key)).not.toBeNull();
    vi.resetModules();
    service = await import('../src/shared/services/healthUnits');
    const second = await service.getHealthUnits('3518800');
    expect(second).toMatchObject({ source: 'cache', stale: false, consultedAt: first.consultedAt });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('mostra os dados anteriores e a data original após falha sem sobrescrever o cache', async () => {
    const consultedAt = seed(60 * 60 * 1000);
    const original = storage.getItem(key);
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(new Response('', { status: 502 })));
    vi.stubGlobal('fetch', fetchMock);
    const pending = service.getHealthUnits('3518800');
    await vi.runAllTimersAsync();
    const result = await pending;
    expect(result).toMatchObject({
      source: 'cache',
      stale: true,
      consultedAt,
      availabilityMessage: expect.stringContaining('indisponível'),
    });
    expect(result.units).toHaveLength(1);
    expect(storage.getItem(key)).toBe(original);
  });
  it('não usa um resultado antigo vazio para apresentar falha como ausência de unidades', async () => {
    seed(60 * 60 * 1000, []);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => Promise.resolve(new Response('', { status: 502 }))),
    );
    const assertion = expect(service.getHealthUnits('3518800')).rejects.toBeInstanceOf(
      service.SearchUnavailableError,
    );
    await vi.runAllTimersAsync();
    await assertion;
  });
  it('não considera uma resposta parcial ou inválida um resultado vazio válido', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ elements: [null] }))),
    );
    await expect(service.getHealthUnits('3518800')).rejects.toBeInstanceOf(
      service.SearchUnavailableError,
    );
    expect(storage.getItem(key)).toBeNull();
  });
  it('descarta cache corrompido e dados com mais de sete dias', async () => {
    storage.setItem(key, '{invalid');
    const { readSearchCache } = await import('../src/shared/services/searchCache');
    expect(readSearchCache('3518800:all:all')).toBeUndefined();
    seed(8 * 24 * 60 * 60 * 1000);
    expect(readSearchCache('3518800:all:all')).toBeUndefined();
  });
  it('conclui a busca mesmo quando o navegador bloqueia o armazenamento', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => Promise.resolve(response())),
    );
    await expect(service.getHealthUnits('3518800')).resolves.toMatchObject({
      source: 'network',
      stale: false,
    });
    await expect(service.getHealthUnits('3518800')).resolves.toMatchObject({
      source: 'cache',
      stale: false,
    });
  });
});

it('mantém o resultado mais recente em memória quando o navegador fica sem espaço', async () => {
  seed(60 * 1000);
  const cache = await import('../src/shared/services/searchCache');
  vi.spyOn(storage, 'setItem').mockImplementation(() => {
    throw new Error('QuotaExceededError');
  });
  cache.saveSearchCache('3518800:all:all', {
    units: [{ ...unit, type: 'UBS', name: 'UBS Atualizada' }],
    consultedAt: new Date().toISOString(),
    mapUpdatedAt: '',
  });
  expect(cache.readSearchCache('3518800:all:all')?.units[0].name).toBe('UBS Atualizada');
});

it('limita o armazenamento a vinte consultas e descarta as mais antigas', async () => {
  const cache = await import('../src/shared/services/searchCache');
  for (let index = 0; index < 25; index++) {
    vi.setSystemTime(now.getTime() + index * 1000);
    cache.saveSearchCache(`query-${index}`, {
      units: [{ ...unit, type: 'UBS' }],
      consultedAt: new Date().toISOString(),
      mapUpdatedAt: '',
    });
  }
  expect(storage.length).toBe(20);
  expect(cache.readSearchCache('query-0')).toBeUndefined();
  expect(cache.readSearchCache('query-24')?.units).toHaveLength(1);
});
