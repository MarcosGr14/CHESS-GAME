import { Chess, DEFAULT_POSITION } from 'chess.js';
import { BOTS, selectBotMove, parseUciMove } from '../src/core/bots.js';
import { StockfishClient } from '../src/engine/stockfishClient.js';
import { createNodeEngineWorker } from './node-engine-worker.mjs';

const client = new StockfishClient({ createWorker: createNodeEngineWorker });
const reference = { skillLevel: 20, depth: 7, thinkMs: 120 };
const results = [];
let seed = 27102026;
const random = () => {
  seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
  return seed / 4294967296;
};
try {
  for (const bot of BOTS.slice(0, 3)) {
    for (let game = 0; game < 4; game += 1) {
      const chess = new Chess();
      const botColor = game % 2 ? 'b' : 'w';
      while (!chess.isGameOver() && chess.history().length < 220) {
        const isBotTurn = chess.turn() === botColor;
        const opponent = isBotTurn ? bot : reference;
        const uci = await client.search({
          initialFen: DEFAULT_POSITION,
          moves: chess.history({ verbose: true }),
          bot: opponent,
        });
        chess.move(
          isBotTurn
            ? selectBotMove(chess, uci, bot, random)
            : parseUciMove(uci),
        );
      }
      const result = chess.isCheckmate()
        ? chess.turn() === botColor
          ? 'derrota'
          : 'victoria'
        : 'tablas';
      results.push({
        bot: bot.name,
        level: bot.level,
        color: botColor,
        result,
        plies: chess.history().length,
      });
      console.log(JSON.stringify(results.at(-1)));
    }
  }
  console.log(
    JSON.stringify({
      summary: BOTS.slice(0, 3).map((bot) => ({
        bot: bot.name,
        losses: results.filter(
          (row) => row.bot === bot.name && row.result === 'derrota',
        ).length,
        wins: results.filter(
          (row) => row.bot === bot.name && row.result === 'victoria',
        ).length,
        draws: results.filter(
          (row) => row.bot === bot.name && row.result === 'tablas',
        ).length,
        games: 4,
      })),
    }),
  );
} finally {
  client.dispose();
}
