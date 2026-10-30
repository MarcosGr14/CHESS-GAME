import { useEffect } from 'react';
import { create } from 'zustand';
import { useGameStore } from '../store/gameStore';
import { getClock, restoreChess } from '../core/game';
import { getBot, selectBotMove } from '../core/bots';
import { abortError, StockfishClient } from './stockfishClient';

const client = new StockfishClient();
export const useEngineStore = create(() => ({
  status: 'idle',
  error: '',
  gameId: null,
}));

function waitForMove(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }
    const cancel = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', cancel);
      resolve();
    }, milliseconds);
    signal.addEventListener('abort', cancel, { once: true });
  });
}

export function retryEngine() {
  useEngineStore.setState({ error: '', status: 'idle' });
  const state = useGameStore.getState();
  if (state.paused && !state.result) state.togglePause();
}

export function useBotOpponent() {
  const game = useGameStore();
  const { id, revision, mode, paused, result, humanColor, botId } = game;
  useEffect(() => {
    const state = useGameStore.getState();
    const chess = restoreChess(state);
    if (mode !== 'bot' || paused || result || chess.turn() === humanColor) {
      client.cancel();
      const engine = useEngineStore.getState();
      if (!engine.error || engine.gameId !== id || result)
        useEngineStore.setState({ status: 'idle', error: '', gameId: id });
      return;
    }
    const controller = new AbortController();
    const { signal } = controller;
    const token = { id, revision };
    const bot = getBot(botId);
    useEngineStore.setState({ status: 'loading', error: '', gameId: id });
    const startedAt = Date.now();
    const remaining = getClock(state)[chess.turn()];
    const thinkMs =
      state.timeControl === 'unlimited'
        ? bot.thinkMs
        : Math.min(bot.thinkMs, Math.max(20, remaining - 250));
    client
      .search({
        initialFen: state.initialFen,
        moves: state.moves,
        bot,
        thinkMs,
        signal,
        onReady: () => {
          if (!signal.aborted) useEngineStore.setState({ status: 'thinking' });
        },
      })
      .then(async (uci) => {
        // The pause is cancellable and shrinks when little clock time remains.
        const minimum =
          state.timeControl === 'unlimited'
            ? 550
            : Math.min(550, Math.max(0, remaining - thinkMs - 250));
        await waitForMove(
          Math.max(0, minimum - (Date.now() - startedAt)),
          signal,
        );
        if (signal.aborted) return;
        const current = useGameStore.getState();
        if (
          current.id !== id ||
          current.revision !== revision ||
          current.paused ||
          current.result
        )
          return;
        const move = selectBotMove(chess, uci, bot);
        current.botMove(move, token);
      })
      .catch((error) => {
        if (signal.aborted || error.name === 'AbortError') return;
        const current = useGameStore.getState();
        if (current.id !== id || current.revision !== revision) return;
        useEngineStore.setState({
          status: 'error',
          error: error.message,
          gameId: id,
        });
        if (!current.paused && !current.result) current.togglePause();
      });
    return () => controller.abort();
  }, [id, revision, mode, paused, result, humanColor, botId]);
  useEffect(() => () => client.dispose(), []);
}
