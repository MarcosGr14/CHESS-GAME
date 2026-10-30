import { LocalStorageAdapter } from './localAdapter';

// Replace this adapter to change persistence; neither UI nor stores touch browser storage.
export const storage = new LocalStorageAdapter();
export {
  subscribeStorage,
  getStorageError,
  reportStorageError,
} from './localAdapter';

export function createPersistStorage(record) {
  const access = {
    profile: {
      get: () => storage.getProfile(),
      save: (value) => storage.saveProfile(value),
    },
    opponents: {
      get: () => storage.getOpponents(),
      save: (value) => storage.saveOpponents(value),
    },
    game: {
      get: () => storage.getGame(),
      save: (value) => storage.saveGame(value),
    },
    settings: {
      get: () => storage.getSettings(),
      save: (value) => storage.saveSettings(value),
    },
  }[record];
  return {
    getItem: () => access.get(),
    setItem: (_key, value) => access.save(value),
    removeItem: () => storage.removeRecord(record),
  };
}
