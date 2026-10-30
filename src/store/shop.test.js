import { beforeEach, describe, expect, it } from 'vitest';
import { useProfileStore } from './profileStore';
import { createProfile } from '../core/profile';
import { creditWallet } from '../core/economy';
import { createCollection } from '../core/shop';
import { storage } from '../storage';
import { useGameStore } from './gameStore';
import { restoreChess } from '../core/game';

const DATE = '2026-10-30T12:00:00.000Z';
const profile = () => useProfileStore.getState();
beforeEach(() => {
  const fresh = createProfile(DATE);
  profile().importProfile({
    ...fresh,
    wallet: creditWallet(fresh.wallet, 100),
  });
});

describe('Compra, equipo y persistencia en un solo registro', () => {
  it('la compra persiste juntos el cargo y la propiedad, equipar y recargar conserva ambos estilos', async () => {
    profile().purchase('board-marble');
    profile().purchase('pieces-minimal');
    expect(storage.getProfile().state).toMatchObject({
      wallet: { balance: 0, spent: 100 },
      collection: {
        owned: [
          'board-classic',
          'pieces-classic',
          'board-marble',
          'pieces-minimal',
        ],
      },
    });
    profile().equip('board-marble');
    profile().equip('pieces-minimal');
    await useProfileStore.persist.rehydrate();
    expect(profile().wallet.balance).toBe(0);
    expect(profile().collection.equipped).toEqual({
      board: 'board-marble',
      pieces: 'pieces-minimal',
    });
    expect(typeof profile().purchase).toBe('function');
  });
  it('dos compras consecutivas del mismo artículo solo permiten un cargo', () => {
    profile().purchase('board-marble');
    const saved = storage.getProfile();
    expect(() => profile().purchase('board-marble')).toThrow('ya está');
    expect(storage.getProfile()).toEqual(saved);
    expect(profile().wallet.balance).toBe(60);
  });
  it('un intento sin saldo conserva exactamente el guardado anterior', () => {
    const saved = storage.getProfile();
    expect(() => profile().purchase('pieces-crystal')).toThrow('suficientes');
    expect(storage.getProfile()).toEqual(saved);
  });
  it('un estilo no poseído no puede equiparse ni alterar el saldo', () => {
    const saved = storage.getProfile();
    expect(() => profile().equip('board-marble')).toThrow('Primero');
    expect(storage.getProfile()).toEqual(saved);
  });
  it('cambiar los estilos conserva posición, ID y revisión de la partida', () => {
    useGameStore.getState().newGame();
    useGameStore.getState().move('e4');
    const before = useGameStore.getState();
    const fen = restoreChess(before).fen();
    profile().purchase('board-marble');
    profile().equip('board-marble');
    const after = useGameStore.getState();
    expect(after.id).toBe(before.id);
    expect(after.revision).toBe(before.revision);
    expect(restoreChess(after).fen()).toBe(fen);
  });
  it('rehidrata el registro Zustand v1 de fase 3 y persiste su migración', async () => {
    const old = {
      ...createProfile(DATE),
      schemaVersion: 1,
      name: 'Marcos',
      xp: 200,
    };
    delete old.collection;
    storage.saveProfile({ state: old, version: 1 });
    await useProfileStore.persist.rehydrate();
    expect(profile()).toMatchObject({
      name: 'Marcos',
      xp: 200,
      schemaVersion: 2,
      collection: createCollection(),
    });
    expect(storage.getProfile().version).toBe(2);
  });
});
