import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  applyMove,
  createGame,
  getClock,
  getTimeout,
  restoreChess,
  validateGame,
} from '../core/game';
import { getBot, isBotUnlocked, otherColor } from '../core/bots';
import { planUndo } from '../core/progression';
import { getLevelProgress } from '../core/xp';
import { createPersistStorage, reportStorageError } from '../storage';
import { useBotStore } from './botStore';
import { useProfileStore } from './profileStore';
import { useSettingsStore } from './settingsStore';

function recordResult(state) {
  if (state.mode === 'bot' && state.result?.winner === state.humanColor)
    useBotStore.getState().recordVictory(state.botId);
  if (state.mode === 'bot' && state.result && state.progressTracking)
    useProfileStore.getState().registerGame(state);
}

export const useGameStore = create(
  persist(
    (set, get) => {
      // Every change invalidates in-flight answers, including returning to an old FEN.
      const commit = (patch) => {
        if (patch.result && !get().result && !patch.finishedAt)
          patch = { ...patch, finishedAt: new Date().toISOString() };
        set({ ...patch, revision: get().revision + 1 });
        recordResult(get());
      };
      return {
        ...createGame(),
        revision: 0,
        newGame: (timeControl, names, options = {}) => {
          if (
            options.mode === 'bot' &&
            !isBotUnlocked(
              getBot(options.botId),
              useBotStore.getState().defeatedBots,
              getLevelProgress(useProfileStore.getState().xp).level,
            )
          )
            return false;
          commit(createGame(timeControl, names, options));
          return true;
        },
        move: (move) => {
          const state = get();
          if (
            state.mode === 'bot' &&
            restoreChess(state).turn() !== state.humanColor
          )
            return false;
          const next = applyMove(state, move);
          if (!next) return false;
          commit(next);
          return true;
        },
        botMove: (move, token) => {
          const state = get();
          if (
            !token ||
            state.mode !== 'bot' ||
            state.id !== token.id ||
            state.revision !== token.revision ||
            restoreChess(state).turn() === state.humanColor
          )
            return false;
          const next = applyMove(state, move);
          if (!next) return false;
          commit(next);
          return true;
        },
        undo: () => {
          try {
            const plan = planUndo(
              useProfileStore.getState(),
              get(),
              useSettingsStore.getState().botUndoCost,
              Date.now(),
            );
            if (!plan) return false;
            if (plan.cost)
              useProfileStore.getState().importProfile(plan.profile);
            commit(plan.game);
            return true;
          } catch {
            return false;
          }
        },
        checkTimeout: () => {
          const state = get();
          const now = Date.now();
          const result = getTimeout(state, now);
          if (result)
            commit({
              remaining: getClock(state, now),
              result,
              lastTick: null,
              drawOffer: null,
            });
        },
        togglePause: () => {
          const state = get();
          if (state.result || (!state.started && state.mode !== 'bot')) return;
          const now = Date.now();
          const timeout = getTimeout(state, now);
          if (timeout) {
            commit({
              result: timeout,
              remaining: getClock(state, now),
              lastTick: null,
              drawOffer: null,
            });
            return;
          }
          commit({
            remaining: getClock(state, now),
            paused: !state.paused,
            lastTick:
              state.paused && state.started && state.timeControl !== 'unlimited'
                ? now
                : null,
          });
        },
        resign: () => {
          const state = get();
          if (state.result || state.paused) return;
          const color =
            state.mode === 'bot'
              ? state.humanColor
              : restoreChess(state).turn();
          commit({
            result: getTimeout(state) || {
              winner: otherColor(color),
              reason: 'resignation',
              label: 'Rendición',
            },
            remaining: getClock(state),
            lastTick: null,
            drawOffer: null,
          });
        },
        offerDraw: () => {
          const state = get();
          if (state.mode === 'local' && !state.result && !state.paused)
            commit({ drawOffer: restoreChess(state).turn() });
        },
        respondDraw: (accept) => {
          const state = get();
          if (
            state.mode !== 'local' ||
            !state.drawOffer ||
            state.result ||
            state.paused
          )
            return;
          const timeout = getTimeout(state);
          if (timeout || accept)
            commit({
              result: timeout || {
                winner: null,
                reason: 'agreement',
                label: 'Tablas de mutuo acuerdo',
              },
              remaining: getClock(state),
              lastTick: null,
              drawOffer: null,
            });
          else commit({ drawOffer: null });
        },
        importGame: (value) => commit(validateGame(value)),
      };
    },
    {
      name: 'enroque-game',
      version: 3,
      storage: createPersistStorage('game'),
      onRehydrateStorage: () => (state, error) => {
        if (error)
          reportStorageError(
            'No se pudo migrar la partida guardada. Puedes recuperar un respaldo desde Ajustes.',
          );
        else if (state) recordResult(state);
      },
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(
            ([key, value]) => typeof value !== 'function' && key !== 'revision',
          ),
        ),
      migrate: (saved) => validateGame(saved),
      merge: (saved, current) => {
        if (!saved) return current;
        try {
          return {
            ...current,
            ...validateGame(saved),
            revision: current.revision + 1,
          };
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
