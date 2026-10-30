import bots from '../data/bots.json' with { type: 'json' };

export const BOTS = Object.freeze(bots.map((bot) => Object.freeze(bot)));
export const getBot = (id) => BOTS.find((bot) => bot.id === id);
export const otherColor = (color) => (color === 'w' ? 'b' : 'w');
export const resolveColor = (choice, random = Math.random) =>
  choice === 'random' ? (random() < 0.5 ? 'w' : 'b') : choice;

export function isBotUnlocked(bot, defeatedBots = [], playerLevel = 1) {
  return (
    !!bot &&
    (playerLevel >= bot.unlockLevel ||
      defeatedBots.includes(bot.id) ||
      defeatedBots.includes(BOTS[bot.level - 2]?.id))
  );
}

export function validateOpponents(value) {
  if (
    !value ||
    value.schemaVersion !== 1 ||
    !Array.isArray(value.defeatedBots) ||
    value.defeatedBots.some((id) => !getBot(id))
  )
    throw new Error('Progreso de rivales no válido.');
  return { schemaVersion: 1, defeatedBots: [...new Set(value.defeatedBots)] };
}

export const toUci = (move) => `${move.from}${move.to}${move.promotion || ''}`;

export function parseUciMove(uci) {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci))
    throw new Error('El motor devolvió una jugada no válida.');
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    ...(uci[4] ? { promotion: uci[4] } : {}),
  };
}

// chess.js supplies every candidate. The error branch deliberately omits the
// engine's preferred move, making the first opponents approachable.
export function selectBotMove(chess, engineMove, bot, random = Math.random) {
  const legal = chess.moves({ verbose: true });
  const best = legal.find((move) => toUci(move) === engineMove);
  if (!best)
    throw new Error('La respuesta del motor no coincide con la posición.');
  const alternatives = legal.filter((move) => move !== best);
  if (alternatives.length && random() * 100 < bot.humanError) {
    const index = Math.min(
      alternatives.length - 1,
      Math.floor(random() * alternatives.length),
    );
    return parseUciMove(toUci(alternatives[index]));
  }
  return parseUciMove(engineMove);
}

export function undoHumanTurn(state, undo, now) {
  if (state.mode !== 'bot') return undo(state, now);
  const index = state.moves.findLastIndex(
    (move) => move.color === state.humanColor,
  );
  if (index < 0) return null;
  let next = state;
  while (next.moves.length > index) next = undo(next, now);
  return next;
}
