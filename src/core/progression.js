import { undoMove } from './game.js';
import { undoHumanTurn } from './bots.js';
import { chargeUndo } from './profile.js';
import { UNDO_COSTS } from './economy.js';

// Calculate both states first. Insufficient funds cannot consume a move or coins.
export function planUndo(profile, game, cost, now) {
  if (!UNDO_COSTS.includes(cost))
    throw new Error('Costo de deshacer no válido.');
  if (game.mode === 'bot' && game.result) return null;
  const nextGame = undoHumanTurn(game, undoMove, now);
  if (!nextGame) return null;
  return {
    game: nextGame,
    profile: game.mode === 'bot' ? chargeUndo(profile, cost) : profile,
    cost: game.mode === 'bot' ? cost : 0,
  };
}
