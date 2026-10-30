import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createPersistStorage } from '../storage';
import { getBot, validateOpponents } from '../core/bots';

export const useBotStore = create(
  persist(
    (set, get) => ({
      schemaVersion: 1,
      defeatedBots: [],
      recordVictory: (id) => {
        if (getBot(id) && !get().defeatedBots.includes(id))
          set({ defeatedBots: [...get().defeatedBots, id] });
      },
      importOpponents: (value) => set(validateOpponents(value)),
    }),
    {
      name: 'enroque-opponents',
      version: 1,
      storage: createPersistStorage('opponents'),
      partialize: ({ schemaVersion, defeatedBots }) => ({
        schemaVersion,
        defeatedBots,
      }),
      merge: (saved, current) => {
        try {
          return { ...current, ...validateOpponents(saved) };
        } catch {
          return current;
        }
      },
    },
  ),
);
