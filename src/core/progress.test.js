import { describe, expect, it } from 'vitest';
import { createGame, applyMove, validateGame, restoreChess } from './game';
import { getLevelProgress, getRank, xpForNextLevel, MAX_TOTAL_XP } from './xp';
import { creditWallet, debitWallet, validateWallet } from './economy';
import { calculateElo } from './elo';
import {
  createProfile,
  settleGame,
  validateProfile,
  isDayKey,
} from './profile';
import { getActivityReward, getMatchReward } from './rewards';
import { BOTS } from './bots';
import { planUndo } from './progression';

const DATE = '2026-10-29T20:00:00.000Z';
const DAY = '2026-10-29';
const newProfile = () => createProfile(DATE);
function match(outcome = 'win', id = 'game-1', botId = 'nilo') {
  let game = {
    ...createGame(
      'unlimited',
      { w: 'Nilo', b: 'Jugador' },
      { mode: 'bot', botId, humanColor: 'b' },
    ),
    id,
  };
  for (const move of ['f3', 'e5', 'g4'])
    game = applyMove(game, move, Date.parse(DATE));
  if (outcome === 'win') return applyMove(game, 'Qh4#', Date.parse(DATE));
  return {
    ...game,
    finishedAt: DATE,
    result: {
      winner: outcome === 'draw' ? null : 'w',
      reason: outcome === 'draw' ? 'agreement' : 'resignation',
      label: outcome === 'draw' ? 'Tablas' : 'Rendición',
    },
  };
}
const settle = (profile, game, dayKey = DAY) =>
  settleGame(profile, game, { dayKey });

describe('Curva XP, límites y rangos', () => {
  it('utiliza el costo por nivel, acumulando sin perder el sobrante', () => {
    expect(xpForNextLevel(1)).toBe(100);
    expect(xpForNextLevel(2)).toBe(283);
    expect(xpForNextLevel(3)).toBe(520);
    expect(getLevelProgress(99)).toMatchObject({
      level: 1,
      xpIntoLevel: 99,
      remainingXp: 1,
    });
    expect(getLevelProgress(100)).toMatchObject({
      level: 2,
      xpIntoLevel: 0,
      requiredXp: 283,
    });
    expect(getLevelProgress(400)).toMatchObject({
      level: 3,
      xpIntoLevel: 17,
      requiredXp: 520,
    });
    expect(getLevelProgress(903)).toMatchObject({ level: 4, xpIntoLevel: 0 });
  });
  it.each([
    [1, 'Peón'],
    [4, 'Peón'],
    [5, 'Caballo'],
    [10, 'Alfil'],
    [20, 'Torre'],
    [35, 'Dama'],
    [50, 'Rey'],
    [90, 'Rey'],
  ])('nivel %i corresponde a %s', (level, rank) =>
    expect(getRank(level).name).toBe(rank),
  );
  it.each([-1, 1.5, NaN, Infinity, MAX_TOTAL_XP + 1])(
    'rechaza XP inválida %s',
    (xp) => expect(() => getLevelProgress(xp)).toThrow(),
  );
  it.each([0, -1, 1.5, NaN])('rechaza niveles inválidos %s', (level) =>
    expect(() => xpForNextLevel(level)).toThrow(),
  );
});

describe('Monedero puro y sin descuentos parciales', () => {
  it('conserva la identidad saldo = ganadas − gastadas', () => {
    const initial = newProfile().wallet;
    const earned = creditWallet(initial, 20);
    const spent = debitWallet(earned, 5);
    expect(spent).toEqual({ balance: 15, earned: 20, spent: 5 });
    expect(initial.balance).toBe(0);
    expect(earned.balance).toBe(20);
  });
  it('permite gastar el saldo exacto y un costo cero', () => {
    expect(debitWallet(creditWallet(newProfile().wallet, 5), 5).balance).toBe(
      0,
    );
    expect(debitWallet(newProfile().wallet, 0).balance).toBe(0);
  });
  it('no altera el monedero si el saldo es insuficiente', () => {
    const wallet = creditWallet(newProfile().wallet, 3);
    const before = JSON.stringify(wallet);
    expect(() => debitWallet(wallet, 5)).toThrow('suficientes');
    expect(JSON.stringify(wallet)).toBe(before);
  });
  it.each([-5, 0.5, NaN, Infinity, '5'])(
    'rechaza cantidades no enteras o negativas: %s',
    (amount) =>
      expect(() => creditWallet(newProfile().wallet, amount)).toThrow(),
  );
  it('rechaza saldos incoherentes y desbordamiento aritmético', () => {
    expect(() =>
      validateWallet({ balance: 20, earned: 30, spent: 5 }),
    ).toThrow();
    expect(() =>
      creditWallet(
        {
          balance: Number.MAX_SAFE_INTEGER,
          earned: Number.MAX_SAFE_INTEGER,
          spent: 0,
        },
        1,
      ),
    ).toThrow();
  });
});

describe('Elo interno', () => {
  it('contra un rival igual suma 16, resta 16 o conserva el Elo', () => {
    expect(calculateElo(800, 800, 1)).toBe(816);
    expect(calculateElo(800, 800, 0)).toBe(784);
    expect(calculateElo(800, 800, 0.5)).toBe(800);
  });
  it('pondera la fuerza rival y evita caer por debajo del mínimo', () => {
    expect(calculateElo(800, 1200, 1)).toBeGreaterThan(
      calculateElo(800, 400, 1),
    );
    expect(calculateElo(100, 100, 0)).toBe(100);
  });
  it('rechaza resultados fuera de victoria, tablas o derrota', () =>
    expect(() => calculateElo(800, 800, 0.2)).toThrow());
});

describe('Recompensas por resultado y antifarmeo', () => {
  it('suma partida jugada y premio según la fuerza del bot', () => {
    expect(getMatchReward(BOTS[0], 'win')).toMatchObject({ xp: 60, coins: 20 });
    expect(getMatchReward(BOTS[9], 'win')).toMatchObject({
      xp: 160,
      coins: 100,
    });
    expect(getMatchReward(BOTS[0], 'draw')).toMatchObject({
      xp: 35,
      coins: 10,
    });
    expect(getMatchReward(BOTS[0], 'loss')).toMatchObject({ xp: 10, coins: 0 });
  });
  it('reduce las cinco primeras partidas diarias y bloquea premios posteriores', () => {
    let profile = newProfile();
    const rewards = [];
    for (let i = 0; i < 7; i += 1) {
      const next = settle(profile, match('win', `game-${i}`));
      profile = next.profile;
      rewards.push([next.receipt.xp, next.receipt.coins]);
    }
    expect(rewards).toEqual([
      [60, 20],
      [60, 20],
      [45, 15],
      [30, 10],
      [15, 5],
      [0, 0],
      [0, 0],
    ]);
    expect(profile.wallet.balance).toBe(70);
    expect(profile.xp).toBe(210);
    expect(profile.stats.wins).toBe(7);
    expect(profile.rewardDays[DAY].nilo).toBe(5);
  });
  it('el límite se separa por bot y por fecha local, no por fecha UTC', () => {
    let profile = newProfile();
    for (let i = 0; i < 5; i += 1)
      profile = settle(profile, match('win', `game-${i}`)).profile;
    expect(
      settle(profile, match('win', 'other-bot', 'clara')).receipt.factor,
    ).toBe(1);
    expect(
      settle(profile, match('win', 'tomorrow'), '2026-10-30').receipt.factor,
    ).toBe(1);
    expect(settle(profile, match('win', 'today-again')).receipt.factor).toBe(0);
  });
  it('ni las derrotas repetidas ni recargar reinician el contador', () => {
    let profile = newProfile();
    for (let i = 0; i < 5; i += 1)
      profile = settle(profile, match('loss', `loss-${i}`)).profile;
    profile = validateProfile(JSON.parse(JSON.stringify(profile)));
    expect(settle(profile, match('loss', 'loss-6')).receipt.xp).toBe(0);
  });
  it('expone las tasas de las actividades de las siguientes fases', () => {
    expect(getActivityReward('lesson')).toEqual({ xp: 30, coins: 10 });
    expect(getActivityReward('puzzle')).toEqual({ xp: 15, coins: 5 });
    expect(getActivityReward('mission')).toEqual({ xp: 20, coins: 30 });
    expect(getActivityReward('tournament')).toEqual({ xp: 200, coins: 150 });
    expect(getActivityReward('tournament', { participants: 8 }).coins).toBe(
      500,
    );
    expect(() => getActivityReward('inventado')).toThrow();
  });
});

describe('Registro único, estadísticas y migración', () => {
  it('un mismo resultado nunca paga dos veces ni cambia estadísticas o Elo', () => {
    const game = match();
    const first = settle(newProfile(), game);
    const snapshot = JSON.stringify(first.profile);
    const again = settle(first.profile, game);
    expect(again.applied).toBe(false);
    expect(again.profile).toBe(first.profile);
    expect(JSON.stringify(first.profile)).toBe(snapshot);
  });
  it('actualiza las rachas y conserva la mejor al perder o empatar', () => {
    let profile = newProfile();
    for (const [index, outcome] of [
      'win',
      'win',
      'loss',
      'win',
      'draw',
    ].entries())
      profile = settle(profile, match(outcome, `game-${index}`)).profile;
    expect(profile.stats).toEqual({
      games: 5,
      wins: 3,
      losses: 1,
      draws: 1,
      streak: 0,
      bestStreak: 2,
    });
  });
  it('no recompensa rendirse antes de mover, pero marca el ID como procesado', () => {
    const game = {
      ...createGame(
        'unlimited',
        { w: 'Jugador', b: 'Nilo' },
        { mode: 'bot', botId: 'nilo', humanColor: 'w' },
      ),
      finishedAt: DATE,
      result: { winner: 'b', reason: 'resignation', label: 'Rendición' },
    };
    const next = settle(newProfile(), game);
    expect(next.receipt.eligible).toBe(false);
    expect(next.profile.stats.games).toBe(0);
    expect(next.profile.rating).toBe(800);
    expect(next.profile.processedGameIds).toContain(game.id);
  });
  it('las partidas locales y los finales anteriores a fase 3 no dan progreso', () => {
    const profile = newProfile();
    expect(settle(profile, { ...match(), mode: 'local' }).profile).toBe(
      profile,
    );
    const old = validateGame({ ...match(), schemaVersion: 2 });
    expect(old.progressTracking).toBe(false);
    expect(settle(profile, old).profile).toBe(profile);
  });
  it('una partida antigua en curso puede registrar el final una vez', () => {
    const old = { ...match(), schemaVersion: 2, result: null };
    const loaded = validateGame({
      ...old,
      moves: old.moves.slice(0, -1),
      clockHistory: old.clockHistory.slice(0, -1),
    });
    expect(loaded.progressTracking).toBe(true);
    const final = applyMove(loaded, 'Qh4#', Date.parse(DATE));
    expect(settle(newProfile(), final).receipt.coins).toBe(20);
  });
  it('limita la planilla a 20 sin olvidar IDs antiguos ni volver a pagarlos', () => {
    let profile = newProfile();
    const firstGame = match('win', 'oldest');
    profile = settle(profile, firstGame).profile;
    for (let i = 0; i < 24; i += 1)
      profile = settle(profile, match('draw', `game-${i}`)).profile;
    expect(profile.recentGames).toHaveLength(20);
    expect(profile.processedGameIds).toHaveLength(25);
    expect(settle(profile, firstGame).applied).toBe(false);
  });
  it('preserva totales y elimina claves ajenas al importar el perfil', () => {
    const profile = settle(newProfile(), match()).profile;
    const imported = validateProfile({
      ...JSON.parse(JSON.stringify(profile)),
      registerGame: 'overwrite',
    });
    expect(imported).toEqual(profile);
    expect(imported).not.toHaveProperty('registerGame');
  });
  it.each([
    { schemaVersion: 99 },
    { xp: -1 },
    { rating: NaN },
    { name: '   ' },
    { wallet: { balance: 10, earned: 0, spent: 0 } },
    { processedGameIds: ['x', 'x'] },
    {
      stats: {
        games: 1,
        wins: 0,
        losses: 0,
        draws: 0,
        streak: 0,
        bestStreak: 0,
      },
    },
  ])('rechaza perfil corrupto: %o', (patch) =>
    expect(() => validateProfile({ ...newProfile(), ...patch })).toThrow(),
  );
  it('no permite una fecha inexistente ni límites para rivales inventados', () => {
    expect(isDayKey('2026-02-30')).toBe(false);
    expect(isDayKey('2024-02-29')).toBe(true);
    expect(() =>
      validateProfile({ ...newProfile(), rewardDays: { [DAY]: { falso: 4 } } }),
    ).toThrow();
  });
});

describe('Deshacer con monedas', () => {
  it('propone un único descuento por un turno completo y no altera los originales', () => {
    let game = createGame(
      'unlimited',
      { w: 'Jugador', b: 'Nilo' },
      { mode: 'bot', botId: 'nilo', humanColor: 'w' },
    );
    game = applyMove(applyMove(game, 'e4'), 'e5');
    const profile = {
      ...newProfile(),
      wallet: creditWallet(newProfile().wallet, 20),
    };
    const next = planUndo(profile, game, 5, Date.parse(DATE));
    expect(next.game.moves).toHaveLength(0);
    expect(next.profile.wallet.balance).toBe(15);
    expect(profile.wallet.balance).toBe(20);
    expect(game.moves).toHaveLength(2);
  });
  it('sin saldo no cambia ni el tablero ni el perfil', () => {
    const game = applyMove(
      createGame(
        'unlimited',
        { w: 'Jugador', b: 'Nilo' },
        { mode: 'bot', botId: 'nilo', humanColor: 'w' },
      ),
      'e4',
    );
    const profile = newProfile();
    const fen = restoreChess(game).fen();
    expect(() => planUndo(profile, game, 5, Date.parse(DATE))).toThrow(
      'suficientes',
    );
    expect(restoreChess(game).fen()).toBe(fen);
    expect(profile.wallet.balance).toBe(0);
  });
  it('no cobra si no hay turno que recuperar ni en partidas locales', () => {
    const profile = newProfile();
    const game = createGame();
    expect(planUndo(profile, game, 5, Date.parse(DATE))).toBeNull();
    const local = planUndo(
      profile,
      applyMove(game, 'e4'),
      20,
      Date.parse(DATE),
    );
    expect(local.profile).toBe(profile);
    expect(local.cost).toBe(0);
  });
  it('impide deshacer un resultado definitivo contra un bot', () =>
    expect(planUndo(newProfile(), match(), 0, Date.parse(DATE))).toBeNull());
});
