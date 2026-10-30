import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createProfile, settleGame, validateProfile } from '../core/profile';
import { createPersistStorage, reportStorageError } from '../storage';
import { localDayKey } from '../lib/dates';

export const useProfileStore = create(
  persist(
    (set, get) => ({
      ...createProfile(new Date().toISOString()),
      registerGame: (game) => {
        const result = settleGame(get(), game, {
          dayKey: localDayKey(new Date(game.finishedAt)),
        });
        if (result.applied) set(result.profile);
        return result;
      },
      rename: (name) => {
        const trimmed = name.trim();
        if (!trimmed || trimmed.length > 32) return false;
        set({ name: trimmed });
        return true;
      },
      importProfile: (profile) => set(validateProfile(profile)),
    }),
    {
      name: 'enroque-profile',
      version: 1,
      storage: createPersistStorage('profile'),
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(
            ([, value]) => typeof value !== 'function',
          ),
        ),
      merge: (saved, current) => {
        if (!saved) return current;
        try {
          return { ...current, ...validateProfile(saved) };
        } catch {
          reportStorageError(
            'El perfil guardado no es válido. Importa un respaldo desde Ajustes para recuperarlo.',
          );
          return current;
        }
      },
    },
  ),
);
