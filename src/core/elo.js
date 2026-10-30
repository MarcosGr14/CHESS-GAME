export const INITIAL_RATING = 800;
export const ELO_K = 32;

export function calculateElo(rating, opponentRating, score) {
  if (
    !Number.isFinite(rating) ||
    !Number.isFinite(opponentRating) ||
    ![0, 0.5, 1].includes(score)
  )
    throw new Error('Datos de Elo no válidos.');
  const expected = 1 / (1 + 10 ** ((opponentRating - rating) / 400));
  return Math.max(
    100,
    Math.min(4000, Math.round(rating + ELO_K * (score - expected))),
  );
}
