import { getBot } from './bots.js';

export const DAILY_REWARD_FACTORS = Object.freeze([1, 1, 0.75, 0.5, 0.25]);
export const OUTCOME_LABELS = Object.freeze({
  win: 'Victoria',
  loss: 'Derrota',
  draw: 'Tablas',
});

export function getMatchReward(bot, outcome, previousGamesToday = 0) {
  if (
    !bot ||
    !Number.isInteger(bot.level) ||
    bot.level < 1 ||
    bot.level > 10 ||
    !Object.hasOwn(OUTCOME_LABELS, outcome) ||
    !Number.isSafeInteger(previousGamesToday) ||
    previousGamesToday < 0
  )
    throw new Error('Recompensa de partida no válida.');
  const multiplier = 1 + ((bot.level - 1) * 2) / 9;
  const baseXp =
    10 +
    (outcome === 'win'
      ? Math.round(50 * multiplier)
      : outcome === 'draw'
        ? 25
        : 0);
  const baseCoins =
    outcome === 'win'
      ? Math.round(20 + ((bot.level - 1) * 80) / 9)
      : outcome === 'draw'
        ? 10
        : 0;
  const factor = DAILY_REWARD_FACTORS[previousGamesToday] ?? 0;
  return {
    xp: Math.floor(baseXp * factor),
    coins: Math.floor(baseCoins * factor),
    baseXp,
    baseCoins,
    factor,
  };
}

// Rates for the future lesson/puzzle/mission/tournament completion handlers.
// Completion and first-time validation belong to those handlers, never the UI.
export function getActivityReward(kind, { participants = 4 } = {}) {
  const rewards = {
    lesson: { xp: 30, coins: 10 },
    puzzle: { xp: 15, coins: 5 },
    mission: { xp: 20, coins: 30 },
    tournament: { xp: 200, coins: participants === 8 ? 500 : 150 },
  };
  if (
    !Object.hasOwn(rewards, kind) ||
    (kind === 'tournament' && ![4, 8].includes(participants))
  )
    throw new Error('Actividad no válida.');
  return { ...rewards[kind] };
}

export function getGameOutcome(game) {
  if (
    !game.result ||
    !getBot(game.botId) ||
    !['w', 'b', null].includes(game.result.winner) ||
    !['w', 'b'].includes(game.humanColor)
  )
    throw new Error('La partida todavía no tiene resultado.');
  return game.result.winner === null
    ? 'draw'
    : game.result.winner === game.humanColor
      ? 'win'
      : 'loss';
}
