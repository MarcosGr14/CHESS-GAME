import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { useGameStore } from './gameStore';
import { useProfileStore } from './profileStore';
import { useSettingsStore } from './settingsStore';
import { useBotStore } from './botStore';
import { createProfile } from '../core/profile';
import { creditWallet } from '../core/economy';
import { DEFAULT_SETTINGS } from '../core/settings';
import { getLevelProgress, xpForNextLevel } from '../core/xp';
import { storage } from '../storage';

const DATE = '2026-10-30T12:00:00.000Z';
const game = () => useGameStore.getState();
const profile = () => useProfileStore.getState();
function start(color = 'w', timeControl = 'unlimited') {
  return game().newGame(
    timeControl,
    { w: 'Blancas', b: 'Negras' },
    { mode: 'bot', botId: 'nilo', humanColor: color },
  );
}
const token = () => ({ id: game().id, revision: game().revision });
const botMove = (move) => game().botMove(move, token());
function win() {
  start('b');
  botMove('f3');
  game().move('e5');
  botMove('g4');
  game().move('Qh4#');
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(DATE));
  profile().importProfile(createProfile(DATE));
  useSettingsStore.getState().importSettings(DEFAULT_SETTINGS);
  useBotStore
    .getState()
    .importOpponents({ schemaVersion: 1, defeatedBots: [] });
  game().newGame();
});
afterEach(() => vi.useRealTimers());

describe('Progreso integrado con juego y persistencia', () => {
  it('registra un mate una vez y recargar conserva XP, saldo, Elo y estadísticas', async () => {
    win();
    const expected = storage.getProfile();
    expect(profile()).toMatchObject({
      xp: 60,
      rating: 803,
      wallet: { balance: 20 },
      stats: { games: 1, wins: 1 },
    });
    await useProfileStore.persist.rehydrate();
    await useGameStore.persist.rehydrate();
    expect(storage.getProfile()).toEqual(expected);
    expect(game().undo()).toBe(false);
    game().importGame(game());
    expect(storage.getProfile()).toEqual(expected);
  });
  it('recupera una recompensa si el guardado de la partida precedió al del perfil', async () => {
    win();
    profile().importProfile(createProfile(DATE));
    await useGameStore.persist.rehydrate();
    expect(profile().wallet.balance).toBe(20);
    expect(profile().stats.games).toBe(1);
    await useGameStore.persist.rehydrate();
    expect(profile().wallet.balance).toBe(20);
  });
  it('subir de nivel abre rivales sin necesitar victorias previas', () => {
    const xp = Array.from({ length: 4 }, (_, index) =>
      xpForNextLevel(index + 1),
    ).reduce((a, b) => a + b, 0);
    profile().importProfile({ ...createProfile(DATE), xp });
    expect(getLevelProgress(profile().xp).level).toBe(5);
    expect(
      game().newGame(
        'unlimited',
        { w: 'Jugador', b: 'Tomás' },
        { mode: 'bot', botId: 'tomas', humanColor: 'w' },
      ),
    ).toBe(true);
    expect(useBotStore.getState().defeatedBots).toEqual([]);
  });
  it('paga una vez al deshacer un turno y rechaza respuestas pendientes', async () => {
    profile().importProfile({
      ...createProfile(DATE),
      wallet: creditWallet(createProfile(DATE).wallet, 20),
    });
    start();
    game().move('e4');
    const pending = token();
    expect(game().undo()).toBe(true);
    expect(profile().wallet.balance).toBe(15);
    expect(game().botMove('e5', pending)).toBe(false);
    expect(game().undo()).toBe(false);
    expect(profile().wallet.balance).toBe(15);
    await useProfileStore.persist.rehydrate();
    await useGameStore.persist.rehydrate();
    expect(profile().wallet.spent).toBe(5);
    expect(game().moves).toHaveLength(0);
  });
  it('no muta ni guarda movimientos o monedas cuando no hay saldo', () => {
    start();
    game().move('e4');
    botMove('e5');
    const savedGame = storage.getGame();
    const savedProfile = storage.getProfile();
    const revision = game().revision;
    expect(game().undo()).toBe(false);
    expect(storage.getGame()).toEqual(savedGame);
    expect(storage.getProfile()).toEqual(savedProfile);
    expect(game().revision).toBe(revision);
  });
  it('permite configurar deshacer gratis y el modo local no paga ni cobra', () => {
    start();
    game().move('e4');
    useSettingsStore.getState().update('botUndoCost', 0);
    expect(game().undo()).toBe(true);
    useSettingsStore.getState().update('botUndoCost', 20);
    game().newGame();
    for (const move of ['f3', 'e5', 'g4', 'Qh4#']) game().move(move);
    expect(profile().xp).toBe(0);
    expect(profile().stats.games).toBe(0);
    expect(game().undo()).toBe(true);
    expect(profile().wallet.spent).toBe(0);
  });
  it('la rendición y la pérdida por tiempo registran solo una derrota cada una', () => {
    start();
    game().move('e4');
    game().resign();
    game().resign();
    expect(game().finishedAt).toBe(DATE);
    expect(profile().stats.losses).toBe(1);
    start('w', '5+0');
    game().move('e4');
    botMove('e5');
    vi.advanceTimersByTime(301000);
    game().checkTimeout();
    game().checkTimeout();
    expect(game().result.reason).toBe('timeout');
    expect(profile().stats.losses).toBe(2);
    expect(profile().xp).toBe(20);
  });
  it('el nombre del perfil persiste y una entrada vacía no lo reemplaza', async () => {
    expect(profile().rename('  Marcos  ')).toBe(true);
    expect(profile().rename('   ')).toBe(false);
    await useProfileStore.persist.rehydrate();
    expect(profile().name).toBe('Marcos');
    expect(typeof profile().registerGame).toBe('function');
  });
});
