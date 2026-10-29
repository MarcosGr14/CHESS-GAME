import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createPersistStorage } from '../storage';

export const DEFAULT_SETTINGS = {
  theme: 'light',
  showLegal: true,
  autoFlip: false,
  flipped: false,
  colorblind: false,
};
export function validateSettings(value) {
  if (
    !value ||
    !['light', 'dark'].includes(value.theme) ||
    ['showLegal', 'autoFlip', 'flipped', 'colorblind'].some(
      (key) => typeof value[key] !== 'boolean',
    )
  )
    throw new Error('Ajustes no válidos.');
  return Object.fromEntries(
    Object.keys(DEFAULT_SETTINGS).map((key) => [key, value[key]]),
  );
}
export const useSettingsStore = create(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (key, value) => {
        if (key in DEFAULT_SETTINGS) set({ [key]: value });
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
