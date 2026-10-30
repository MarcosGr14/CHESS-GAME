import { getBot } from './bots.js';
import { calculateElo, INITIAL_RATING } from './elo.js';
import { creditWallet, debitWallet, validateWallet } from './economy.js';
import {
  DAILY_REWARD_FACTORS,
  getGameOutcome,
  getMatchReward,
  OUTCOME_LABELS,
} from './rewards.js';
import { getLevelProgress } from './xp.js';
import { createCollection, validateCollection } from './shop';
import { PROFILE_SCHEMA_VERSION, migrateProfile } from './profileSchema';

export { PROFILE_SCHEMA_VERSION } from './profileSchema';
const validInteger = (value) => Number.isSafeInteger(value) && value >= 0;
const validTimestamp = (value) =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));
export function isDayKey(value) {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  );
}

export function createProfile(createdAt) {
  if (!validTimestamp(createdAt)) throw new Error('Fecha de perfil no válida.');
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    name: 'Jugador',
    createdAt,
    xp: 0,
    rating: INITIAL_RATING,
    wallet: { balance: 0, earned: 0, spent: 0 },
    collection: createCollection(),
    stats: { games: 0, wins: 0, losses: 0, draws: 0, streak: 0, bestStreak: 0 },
    processedGameIds: [],
    rewardDays: {},
    recentGames: [],
    lastReceipt: null,
  };
}

export function findReceipt(profile, gameId) {
  return profile.lastReceipt?.gameId === gameId
    ? profile.lastReceipt
    : profile.recentGames.find((receipt) => receipt.gameId === gameId) || null;
}

// Both the completion time and the local day are inputs, making settlement
// deterministic and reusable on a future server without any browser APIs.
export function settleGame(profile, game, { dayKey }) {
  if (game.mode !== 'bot' || !game.result || !game.progressTracking)
    return { profile, receipt: null, applied: false };
  if (profile.processedGameIds.includes(game.id))
    return { profile, receipt: findReceipt(profile, game.id), applied: false };
  if (
    !isDayKey(dayKey) ||
    !validTimestamp(game.finishedAt) ||
    !getBot(game.botId)
  )
    throw new Error('No se pudo registrar el resultado.');
  const bot = getBot(game.botId);
  const outcome = getGameOutcome(game);
  const eligible = game.moves.some((move) => move.color === game.humanColor);
  const previous = profile.rewardDays[dayKey]?.[bot.id] || 0;
  const reward = eligible
    ? getMatchReward(bot, outcome, previous)
    : { xp: 0, coins: 0, factor: 0 };
  const rating = eligible
    ? calculateElo(
        profile.rating,
        bot.elo,
        outcome === 'win' ? 1 : outcome === 'draw' ? 0.5 : 0,
      )
    : profile.rating;
  const nextXp = profile.xp + reward.xp;
  const receipt = {
    gameId: game.id,
    botId: bot.id,
    outcome,
    completedAt: game.finishedAt,
    dayKey,
    eligible,
    xp: reward.xp,
    coins: reward.coins,
    factor: reward.factor,
    ratingBefore: profile.rating,
    ratingAfter: rating,
    levelBefore: getLevelProgress(profile.xp).level,
    levelAfter: getLevelProgress(nextXp).level,
  };
  const streak = outcome === 'win' ? profile.stats.streak + 1 : 0;
  const stats = eligible
    ? {
        games: profile.stats.games + 1,
        wins: profile.stats.wins + (outcome === 'win' ? 1 : 0),
        losses: profile.stats.losses + (outcome === 'loss' ? 1 : 0),
        draws: profile.stats.draws + (outcome === 'draw' ? 1 : 0),
        streak,
        bestStreak: Math.max(profile.stats.bestStreak, streak),
      }
    : profile.stats;
  return {
    applied: true,
    receipt,
    profile: {
      ...profile,
      xp: nextXp,
      rating,
      wallet: creditWallet(profile.wallet, reward.coins),
      stats,
      processedGameIds: [...profile.processedGameIds, game.id],
      rewardDays: eligible
        ? {
            ...profile.rewardDays,
            [dayKey]: {
              ...profile.rewardDays[dayKey],
              [bot.id]: Math.min(previous + 1, DAILY_REWARD_FACTORS.length),
            },
          }
        : profile.rewardDays,
      recentGames: eligible
        ? [receipt, ...profile.recentGames].slice(0, 20)
        : profile.recentGames,
      lastReceipt: receipt,
    },
  };
}

export function chargeUndo(profile, cost) {
  return { ...profile, wallet: debitWallet(profile.wallet, cost) };
}

function validateReceipt(value) {
  if (
    !value ||
    typeof value.gameId !== 'string' ||
    value.gameId.length > 100 ||
    !value.gameId ||
    !getBot(value.botId) ||
    !Object.hasOwn(OUTCOME_LABELS, value.outcome) ||
    !validTimestamp(value.completedAt) ||
    !isDayKey(value.dayKey) ||
    typeof value.eligible !== 'boolean' ||
    ![0, 0.25, 0.5, 0.75, 1].includes(value.factor)
  )
    throw new Error('Historial de resultados no válido.');
  for (const key of [
    'xp',
    'coins',
    'ratingBefore',
    'ratingAfter',
    'levelBefore',
    'levelAfter',
  ])
    if (!validInteger(value[key]))
      throw new Error('Recompensa guardada no válida.');
  if (
    value.ratingBefore < 100 ||
    value.ratingBefore > 4000 ||
    value.ratingAfter < 100 ||
    value.ratingAfter > 4000 ||
    value.levelBefore < 1 ||
    value.levelAfter < value.levelBefore
  )
    throw new Error('Progreso de partida no válido.');
  return Object.fromEntries(
    [
      'gameId',
      'botId',
      'outcome',
      'completedAt',
      'dayKey',
      'eligible',
      'xp',
      'coins',
      'factor',
      'ratingBefore',
      'ratingAfter',
      'levelBefore',
      'levelAfter',
    ].map((key) => [key, value[key]]),
  );
}

export function validateProfile(value) {
  value = migrateProfile(value);
  if (
    !value ||
    value.schemaVersion !== PROFILE_SCHEMA_VERSION ||
    typeof value.name !== 'string' ||
    !value.name.trim() ||
    value.name.length > 32 ||
    !validTimestamp(value.createdAt)
  )
    throw new Error('Perfil no válido.');
  getLevelProgress(value.xp);
  if (!validInteger(value.rating) || value.rating < 100 || value.rating > 4000)
    throw new Error('Elo no válido.');
  const wallet = validateWallet(value.wallet);
  const collection = validateCollection(value.collection);
  const stats = value.stats;
  if (
    !stats ||
    ['games', 'wins', 'losses', 'draws', 'streak', 'bestStreak'].some(
      (key) => !validInteger(stats[key]),
    ) ||
    stats.games !== stats.wins + stats.losses + stats.draws ||
    stats.streak > stats.bestStreak ||
    stats.bestStreak > stats.wins
  )
    throw new Error('Estadísticas no válidas.');
  if (
    !Array.isArray(value.processedGameIds) ||
    value.processedGameIds.length > 100000 ||
    value.processedGameIds.some(
      (id) => typeof id !== 'string' || !id || id.length > 100,
    ) ||
    new Set(value.processedGameIds).size !== value.processedGameIds.length ||
    stats.games > value.processedGameIds.length
  )
    throw new Error('Registro de partidas no válido.');
  if (
    !value.rewardDays ||
    typeof value.rewardDays !== 'object' ||
    Array.isArray(value.rewardDays)
  )
    throw new Error('Registro diario no válido.');
  const rewardDays = {};
  for (const [day, counts] of Object.entries(value.rewardDays)) {
    if (
      !isDayKey(day) ||
      !counts ||
      typeof counts !== 'object' ||
      Array.isArray(counts) ||
      Object.entries(counts).some(
        ([id, count]) =>
          !getBot(id) ||
          !validInteger(count) ||
          count > DAILY_REWARD_FACTORS.length,
      )
    )
      throw new Error('Límite diario no válido.');
    rewardDays[day] = { ...counts };
  }
  if (!Array.isArray(value.recentGames) || value.recentGames.length > 20)
    throw new Error('Historial demasiado largo.');
  const recentGames = value.recentGames.map(validateReceipt);
  const lastReceipt =
    value.lastReceipt === null ? null : validateReceipt(value.lastReceipt);
  const ids = new Set(value.processedGameIds);
  if (
    new Set(recentGames.map((receipt) => receipt.gameId)).size !==
      recentGames.length ||
    recentGames.some(
      (receipt) => !receipt.eligible || !ids.has(receipt.gameId),
    ) ||
    (lastReceipt && !ids.has(lastReceipt.gameId))
  )
    throw new Error('El historial no coincide con el perfil.');
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    name: value.name.trim(),
    createdAt: value.createdAt,
    xp: value.xp,
    rating: value.rating,
    wallet,
    collection,
    stats: Object.fromEntries(
      ['games', 'wins', 'losses', 'draws', 'streak', 'bestStreak'].map(
        (key) => [key, stats[key]],
      ),
    ),
    processedGameIds: [...value.processedGameIds],
    rewardDays,
    recentGames,
    lastReceipt,
  };
}
