export const MAX_TOTAL_XP = 1_000_000_000_000;
export const RANKS = Object.freeze([
  { name: 'Peón', minLevel: 1, piece: 'p' },
  { name: 'Caballo', minLevel: 5, piece: 'n' },
  { name: 'Alfil', minLevel: 10, piece: 'b' },
  { name: 'Torre', minLevel: 20, piece: 'r' },
  { name: 'Dama', minLevel: 35, piece: 'q' },
  { name: 'Rey', minLevel: 50, piece: 'k' },
]);

export function xpForNextLevel(level) {
  if (!Number.isSafeInteger(level) || level < 1)
    throw new Error('Nivel no válido.');
  return Math.round(100 * level ** 1.5);
}

export function getLevelProgress(totalXp) {
  if (!Number.isSafeInteger(totalXp) || totalXp < 0 || totalXp > MAX_TOTAL_XP)
    throw new Error('XP no válida.');
  let level = 1;
  let xpIntoLevel = totalXp;
  while (xpIntoLevel >= xpForNextLevel(level)) {
    xpIntoLevel -= xpForNextLevel(level);
    level += 1;
  }
  const requiredXp = xpForNextLevel(level);
  return {
    level,
    totalXp,
    xpIntoLevel,
    requiredXp,
    remainingXp: requiredXp - xpIntoLevel,
    percent: (xpIntoLevel / requiredXp) * 100,
  };
}

export function getRank(level) {
  if (!Number.isSafeInteger(level) || level < 1)
    throw new Error('Nivel no válido.');
  return RANKS.findLast((rank) => level >= rank.minLevel);
}
