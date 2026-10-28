import type { SearchResult } from '@/shared/types/health';

import { isHealthUnit } from './healthValidation';

const prefix = 'saude360:units:v1:';
const cooldownKey = 'saude360:overpass:retry-at:v1';
export const CACHE_FRESH_MS = 15 * 60 * 1000;
export const CACHE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const maxEntries = 20;
type Snapshot = Pick<
  SearchResult,
  'units' | 'consultedAt' | 'mapUpdatedAt' | 'publishedAt' | 'publishedRevision' | 'sourceName'
>;
const memory = new Map<string, Snapshot>();
let memoryCooldown = 0;

function isSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== 'object') return false;
  const data = value as Snapshot;
  const age = Date.now() - Date.parse(data.consultedAt);
  return (
    typeof data.consultedAt === 'string' &&
    Number.isFinite(age) &&
    age >= 0 &&
    age <= CACHE_RETENTION_MS &&
    typeof data.mapUpdatedAt === 'string' &&
    (data.publishedAt === undefined ||
      (typeof data.publishedAt === 'string' && Number.isFinite(Date.parse(data.publishedAt)))) &&
    (data.publishedRevision === undefined ||
      (typeof data.publishedRevision === 'string' &&
        /^[a-f0-9]{64}$/.test(data.publishedRevision))) &&
    (data.sourceName === undefined || typeof data.sourceName === 'string') &&
    Array.isArray(data.units) &&
    data.units.every(isHealthUnit)
  );
}
export function readSearchCache(key: string): Snapshot | undefined {
  const remembered = memory.get(key);
  const recentMemory = remembered && isSnapshot(remembered) ? remembered : undefined;
  if (!recentMemory) memory.delete(key);
  try {
    const raw = localStorage.getItem(prefix + key);
    if (raw !== null) {
      let saved: unknown;
      try {
        saved = JSON.parse(raw);
      } catch {
        saved = null;
      }
      if (isSnapshot(saved)) {
        return recentMemory && Date.parse(recentMemory.consultedAt) > Date.parse(saved.consultedAt)
          ? recentMemory
          : saved;
      }
      localStorage.removeItem(prefix + key);
    }
  } catch {
    /* O cache em memória continua disponível quando o navegador bloqueia o armazenamento. */
  }
  return recentMemory;
}
export function saveSearchCache(key: string, result: Snapshot): void {
  if (!isSnapshot(result)) return;
  const snapshot = {
    units: result.units,
    consultedAt: result.consultedAt,
    mapUpdatedAt: result.mapUpdatedAt,
    publishedAt: result.publishedAt,
    publishedRevision: result.publishedRevision,
    sourceName: result.sourceName,
  };
  memory.delete(key);
  memory.set(key, snapshot);
  while (memory.size > maxEntries) memory.delete(memory.keys().next().value!);
  try {
    const entries: { key: string; time: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const storedKey = localStorage.key(i);
      if (!storedKey?.startsWith(prefix)) continue;
      try {
        const data: unknown = JSON.parse(localStorage.getItem(storedKey) || 'null');
        if (isSnapshot(data)) entries.push({ key: storedKey, time: Date.parse(data.consultedAt) });
        else entries.push({ key: storedKey, time: 0 });
      } catch {
        entries.push({ key: storedKey, time: 0 });
      }
    }
    const previous = entries
      .filter((entry) => entry.key !== prefix + key)
      .sort((a, b) => a.time - b.time);
    while (previous.length >= maxEntries) localStorage.removeItem(previous.shift()!.key);
    localStorage.setItem(prefix + key, JSON.stringify(snapshot));
  } catch {
    /* Falta de espaço ou modo privado não invalida uma consulta bem-sucedida. */
  }
}
export function readCooldown(): number {
  try {
    const saved = Number(localStorage.getItem(cooldownKey));
    return Number.isFinite(saved) ? Math.max(saved, memoryCooldown) : memoryCooldown;
  } catch {
    return memoryCooldown;
  }
}
export function setCooldown(until: number): void {
  memoryCooldown = Math.max(memoryCooldown, until);
  try {
    localStorage.setItem(cooldownKey, String(memoryCooldown));
  } catch {
    /* Memória como alternativa. */
  }
}
