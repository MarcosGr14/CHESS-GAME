import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createPersistStorage } from '../storage';
import { DEFAULT_SETTINGS, validateSettings } from '../core/settings';

export { DEFAULT_SETTINGS, validateSettings } from '../core/settings';

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,
      update: (key, value) => {
        if (key in DEFAULT_SETTINGS)
          set(validateSettings({ ...get(), [key]: value }));
      },
      importSettings: (value) => set(validateSettings(value)),
    }),
    {
      name: 'enroque-settings',
      version: 1,
      storage: createPersistStorage('settings'),
      partialize: (state) =>
        Object.fromEntries(
          Object.keys(DEFAULT_SETTINGS).map((key) => [key, state[key]]),
        ),
      merge: (saved, current) => {
        try {
          return { ...current, ...validateSettings(saved) };
        } catch {
          return current;
        }
      },
    },
  ),
);
