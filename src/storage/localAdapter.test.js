import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocalStorageAdapter, getStorageError } from './localAdapter';
import { migrateRecord } from './migrations';

afterEach(() => vi.unstubAllGlobals());
describe('Adaptador de almacenamiento y migraciones', () => {
  it('guarda un sobre versionado y recupera el contenido', () => {
    const entries = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key) => entries.get(key),
      setItem: (key, value) => entries.set(key, value),
    });
    const adapter = new LocalStorageAdapter();
    adapter.saveGame({ state: { moves: [] }, version: 1 });
    expect(JSON.parse(entries.get('enroque:game')).schemaVersion).toBe(1);
    expect(adapter.getGame()).toEqual({ state: { moves: [] }, version: 1 });
  });
  it('no rompe la partida si el navegador rechaza el guardado', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('Quota exceeded');
      },
    });
    expect(() =>
      new LocalStorageAdapter().saveSettings({ theme: 'dark' }),
    ).not.toThrow();
    expect(getStorageError()).toContain('Exporta una copia');
  });
  it('tolera JSON corrupto y avisa para recuperar una copia', () => {
    vi.stubGlobal('localStorage', { getItem: () => '{incorrecto' });
    expect(new LocalStorageAdapter().getGame()).toBeNull();
    expect(getStorageError()).toContain('No se pudo leer');
  });
  it('migra el formato anterior y rechaza versiones futuras', () => {
    expect(migrateRecord({ state: { moves: [] }, version: 0 })).toMatchObject({
      schemaVersion: 1,
      data: { state: { moves: [] } },
    });
    expect(() => migrateRecord({ schemaVersion: 999 })).toThrow();
  });
});
