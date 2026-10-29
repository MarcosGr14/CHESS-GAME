import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  applyMove,
  createGame,
  getClock,
  getTimeout,
  restoreChess,
  undoMove,
  validateGame,
} from '../core/game';
import { createPersistStorage, reportStorageError } from '../storage';

export const useGameStore = create(
  persist(
    (set, get) => ({
      ...createGame(),
      newGame: (timeControl, names) => set(createGame(timeControl, names)),
      move: (move) => {
        const next = applyMove(get(), move);
        if (!next) return false;
        set(next);
        return true;
      },
      undo: () => {
        const next = undoMove(get());
        if (next) set(next);
      },
      checkTimeout: () => {
        const state = get();
        const now = Date.now();
        const result = getTimeout(state, now);
        if (result)
          set({
            remaining: getClock(state, now),
            result,
            lastTick: null,
            drawOffer: null,
          });
      },
      togglePause: () => {
        const state = get();
        if (state.result || !state.started) return;
        const now = Date.now();
        const timeout = getTimeout(state, now);
        if (timeout) {
          set({
            result: timeout,
            remaining: getClock(state, now),
            lastTick: null,
          });
          return;
        }
        set({
          remaining: getClock(state, now),
          paused: !state.paused,
          lastTick:
            state.paused && state.timeControl !== 'unlimited' ? now : null,
        });
      },
      resign: () => {
        const state = get();
        if (state.result || state.paused) return;
        const result = getTimeout(state) || {
          winner: restoreChess(state).turn() === 'w' ? 'b' : 'w',
          reason: 'resignation',
          label: 'Rendición',
        };
        set({
          result,
          remaining: getClock(state),
          lastTick: null,
          drawOffer: null,
        });
      },
      offerDraw: () => {
        const state = get();
        if (!state.result && !state.paused)
          set({ drawOffer: restoreChess(state).turn() });
      },
      respondDraw: (accept) => {
        const state = get();
        if (!state.drawOffer || state.result || state.paused) return;
        const timeout = getTimeout(state);
        if (timeout || accept)
          set({
            result: timeout || {
              winner: null,
              reason: 'agreement',
              label: 'Tablas de mutuo acuerdo',
            },
            remaining: getClock(state),
            lastTick: null,
            drawOffer: null,
          });
        else set({ drawOffer: null });
      },
      importGame: (value) => set(validateGame(value)),
    }),
    {
      name: 'enroque-game',
      version: 1,
      storage: createPersistStorage('game'),
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(
            ([, value]) => typeof value !== 'function',
          ),
        ),
      merge: (saved, current) => {
        if (!saved) return current;
        try {
          return { ...current, ...validateGame(saved) };
        } catch {
          reportStorageError(
            'La partida guardada no es válida. Se abrió un tablero nuevo.',
          );
          return current;
        }
      },
    },
  ),
);
