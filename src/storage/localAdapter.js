import { migrateRecord, SCHEMA_VERSION } from './migrations';

let storageError = '';
const listeners = new Set();
const memory = new Map();
export function reportStorageError(message) {
  storageError = message;
  listeners.forEach((listener) => listener());
}
export const subscribeStorage = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const getStorageError = () => storageError;

export class LocalStorageAdapter {
  getRecord(key) {
    try {
      const raw =
        globalThis.localStorage?.getItem(`enroque:${key}`) ?? memory.get(key);
      return raw ? migrateRecord(JSON.parse(raw)).data : null;
    } catch {
      reportStorageError(
        'No se pudo leer el guardado local. Puedes importar una copia desde Ajustes.',
      );
      return null;
    }
  }
  saveRecord(key, data) {
    const raw = JSON.stringify({ schemaVersion: SCHEMA_VERSION, data });
    memory.set(key, raw);
    try {
      if (!globalThis.localStorage) throw new Error('Storage unavailable');
      globalThis.localStorage.setItem(`enroque:${key}`, raw);
    } catch {
      reportStorageError(
        'El navegador no permite guardar el progreso. Exporta una copia antes de cerrar.',
      );
    }
  }
  removeRecord(key) {
    memory.delete(key);
    try {
      globalThis.localStorage?.removeItem(`enroque:${key}`);
    } catch {
      reportStorageError('No se pudo borrar el guardado.');
    }
  }
  getGame() {
    return this.getRecord('game');
  }
  saveGame(value) {
    this.saveRecord('game', value);
  }
  getSettings() {
    return this.getRecord('settings');
  }
  saveSettings(value) {
    this.saveRecord('settings', value);
  }
  getProfile() {
    return this.getRecord('profile');
  }
  saveProfile(value) {
    this.saveRecord('profile', value);
  }
}
