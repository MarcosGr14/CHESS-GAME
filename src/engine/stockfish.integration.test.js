import { afterEach, describe, expect, it } from 'vitest';
import { Chess, DEFAULT_POSITION } from 'chess.js';
import { StockfishClient } from './stockfishClient';
import { createNodeEngineWorker } from '../../scripts/node-engine-worker.mjs';
import { BOTS, parseUciMove, selectBotMove } from '../core/bots';

let client;
afterEach(() => client?.dispose());
describe('Stockfish WASM lite real, con UCI completo', () => {
  it.each(BOTS)(
    'nivel $level: $name responde con una jugada legal',
    async (bot) => {
      client = new StockfishClient({ createWorker: createNodeEngineWorker });
      const chess = new Chess();
      chess.move('e4');
      const uci = await client.search({
        initialFen: DEFAULT_POSITION,
        moves: chess.history({ verbose: true }),
        bot,
      });
      expect(
        chess.move(selectBotMove(chess, uci, bot, () => 0.99)),
      ).not.toBeNull();
    },
    10000,
  );
  it('encuentra mate en uno, incluso después de reutilizar el motor', async () => {
    client = new StockfishClient({ createWorker: createNodeEngineWorker });
    await client.search({
      initialFen: DEFAULT_POSITION,
      moves: [],
      bot: BOTS[0],
    });
    const chess = new Chess();
    for (const move of ['f3', 'e5', 'g4']) chess.move(move);
    const uci = await client.search({
      initialFen: DEFAULT_POSITION,
      moves: chess.history({ verbose: true }),
      bot: BOTS[9],
    });
    chess.move(parseUciMove(uci));
    expect(chess.isCheckmate()).toBe(true);
  }, 10000);
});
