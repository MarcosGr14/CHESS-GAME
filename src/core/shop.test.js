import { describe, expect, it } from 'vitest';
import {
  createCollection,
  validateCollection,
  purchaseItem,
  equipItem,
} from './shop';
import { createProfile, validateProfile } from './profile';
import { creditWallet } from './economy';
import {
  SHOP_ITEMS,
  BOARD_ITEMS,
  PIECE_ITEMS,
  RARITY_LABELS,
} from '../data/shopItems';
import { getBoardStyle, getPieceAsset } from '../themes';
import { createBackup, validateBackup } from './backup';
import { createGame } from './game';
import { DEFAULT_SETTINGS } from './settings';

const DATE = '2026-10-30T12:00:00.000Z';
const fresh = (coins = 0) => {
  const profile = createProfile(DATE);
  return { ...profile, wallet: creditWallet(profile.wallet, coins) };
};
const rawPieces = import.meta.glob('../themes/pieces/*/*.svg', {
  eager: true,
  query: '?raw',
  import: 'default',
});
const rawTextures = import.meta.glob('../themes/boards/*.svg', {
  eager: true,
  query: '?raw',
  import: 'default',
});

describe('Catálogo completo y arte original extensible', () => {
  it('incluye al menos seis tableros y seis sets con precios enteros y rarezas válidas', () => {
    expect(BOARD_ITEMS.length).toBeGreaterThanOrEqual(6);
    expect(PIECE_ITEMS.length).toBeGreaterThanOrEqual(6);
    expect(new Set(SHOP_ITEMS.map((item) => item.id)).size).toBe(
      SHOP_ITEMS.length,
    );
    for (const item of SHOP_ITEMS) {
      expect(Number.isSafeInteger(item.precio) && item.precio >= 0).toBe(true);
      expect(RARITY_LABELS[item.rareza]).toBeTruthy();
      for (const key of ['nombre', 'categoria', 'estilo', 'descripcion'])
        expect(item[key].length).toBeGreaterThan(0);
    }
    for (const id of ['board-classic', 'pieces-classic'])
      expect(SHOP_ITEMS.find((item) => item.id === id).precio).toBe(0);
  });
  it.each(PIECE_ITEMS)(
    '$nombre dispone de las doce piezas SVG y cada una resuelve a un recurso',
    (item) => {
      for (const color of ['w', 'b'])
        for (const type of ['k', 'q', 'r', 'b', 'n', 'p']) {
          const raw =
            rawPieces[
              `../themes/pieces/${item.assetFolder}/${color}-${type}.svg`
            ];
          expect(raw).toContain('viewBox="0 0 64 64"');
          expect(raw).not.toMatch(
            /<script|<image|<foreignObject|(?:href|src)=["']https?:\/\//i,
          );
          expect(getPieceAsset(item.id, type, color)).toMatch(
            /^(data:image\/svg\+xml|\/src\/themes\/pieces\/)/,
          );
        }
    },
  );
  it('cada set tiene una silueta de caballo distinta y los materiales tienen archivos existentes', () => {
    const knights = PIECE_ITEMS.map(
      (item) => rawPieces[`../themes/pieces/${item.assetFolder}/w-n.svg`],
    );
    expect(new Set(knights).size).toBe(PIECE_ITEMS.length);
    for (const item of BOARD_ITEMS)
      for (const filename of Object.values(item.textures || {}))
        expect(rawTextures[`../themes/boards/${filename}`]).toContain('<svg');
    expect(
      new Set(BOARD_ITEMS.map((item) => JSON.stringify(item.textures || {})))
        .size,
    ).toBeGreaterThanOrEqual(6);
  });
  it('el alto contraste prevalece sobre cualquier material sin cambiar el estilo guardado', () => {
    const normal = getBoardStyle('board-marble');
    const accessible = getBoardStyle('board-marble', true);
    expect(normal['--board-light-texture']).toContain('url(');
    expect(accessible['--board-light']).toBe('#eee8d6');
    expect(accessible['--board-light-texture']).toBe('none');
    expect(getBoardStyle('board-marble')).toEqual(normal);
  });
  it('las coordenadas de todos los tableros alcanzan contraste AA sobre sus colores base', () => {
    const luminance = (hex) => {
      const channels = [1, 3, 5]
        .map((index) => parseInt(hex.slice(index, index + 2), 16) / 255)
        .map((value) =>
          value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
        );
      return channels.reduce(
        (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index],
        0,
      );
    };
    for (const { tokens } of BOARD_ITEMS)
      for (const [text, background] of [
        ['--coordinate-dark', '--board-light'],
        ['--coordinate-light', '--board-dark'],
      ]) {
        const [low, high] = [
          luminance(tokens[text]),
          luminance(tokens[background]),
        ].sort((a, b) => a - b);
        expect((high + 0.05) / (low + 0.05)).toBeGreaterThanOrEqual(4.5);
      }
  });
});

describe('Compra y equipo atómicos', () => {
  it('da los dos clásicos gratis y equipados a una cuenta nueva', () => {
    expect(fresh().collection).toEqual(createCollection());
    expect(fresh().wallet.balance).toBe(0);
  });
  it('una compra entrega el artículo y descuenta su precio sin equiparlo ni mutar el original', () => {
    const before = fresh(100);
    const snapshot = structuredClone(before);
    const next = purchaseItem(before, 'board-marble');
    expect(next.wallet).toEqual({ balance: 60, earned: 100, spent: 40 });
    expect(next.collection.owned).toContain('board-marble');
    expect(next.collection.equipped.board).toBe('board-classic');
    expect(before).toEqual(snapshot);
    expect(validateProfile(next)).toEqual(next);
  });
  it('acepta el saldo exacto y no descuenta otra vez una compra duplicada', () => {
    const next = purchaseItem(fresh(40), 'board-marble');
    const snapshot = structuredClone(next);
    expect(next.wallet.balance).toBe(0);
    expect(() => purchaseItem(next, 'board-marble')).toThrow('ya está');
    expect(next).toEqual(snapshot);
  });
  it('rechaza saldo insuficiente sin entregar ni descontar parcialmente', () => {
    const before = fresh(39);
    const snapshot = structuredClone(before);
    expect(() => purchaseItem(before, 'board-marble')).toThrow('suficientes');
    expect(before).toEqual(snapshot);
  });
  it('ignora un precio enviado por el llamador y usa solo el catálogo', () => {
    expect(purchaseItem(fresh(100), 'board-marble', 0).wallet.balance).toBe(60);
  });
  it('rechaza artículos desconocidos y objetos que intenten sustituir el ID', () => {
    const before = fresh(100);
    expect(() => purchaseItem(before, 'inexistente')).toThrow('no existe');
    expect(() =>
      purchaseItem(before, { id: 'board-marble', precio: 0 }),
    ).toThrow('no existe');
  });
  it('equipar exige propiedad, conserva la otra categoría y no cobra monedas', () => {
    let profile = purchaseItem(
      purchaseItem(fresh(100), 'board-marble'),
      'pieces-minimal',
    );
    const wallet = structuredClone(profile.wallet);
    profile = equipItem(equipItem(profile, 'board-marble'), 'pieces-minimal');
    expect(profile.collection.equipped).toEqual({
      board: 'board-marble',
      pieces: 'pieces-minimal',
    });
    expect(profile.wallet).toEqual(wallet);
    expect(equipItem(profile, 'pieces-minimal')).toBe(profile);
    expect(() => equipItem(profile, 'pieces-crystal')).toThrow('Primero');
    const classic = equipItem(profile, 'board-classic');
    expect(classic.collection.equipped.pieces).toBe('pieces-minimal');
    expect(classic.wallet).toEqual(wallet);
  });
  it.each([
    { owned: ['board-classic'] },
    { owned: ['board-classic', 'pieces-classic', 'pieces-classic'] },
    { owned: ['board-classic', 'pieces-classic', 'fake'] },
    { equipped: { board: 'pieces-classic', pieces: 'board-classic' } },
    { equipped: { board: 'board-marble', pieces: 'pieces-classic' } },
  ])('rechaza inventario corrupto %o', (patch) =>
    expect(() =>
      validateCollection({ ...createCollection(), ...patch }),
    ).toThrow(),
  );
});

describe('Migración del perfil y respaldo de la colección', () => {
  it('añade los clásicos a fase 3 sin alterar XP, estadísticas ni monedas', () => {
    const old = {
      ...fresh(60),
      schemaVersion: 1,
      name: 'Marcos',
      xp: 400,
      rating: 916,
    };
    delete old.collection;
    const next = validateProfile(old);
    expect(next).toMatchObject({
      schemaVersion: 2,
      name: 'Marcos',
      xp: 400,
      rating: 916,
      wallet: old.wallet,
      stats: old.stats,
    });
    expect(next.collection).toEqual(createCollection());
    expect(old).not.toHaveProperty('collection');
  });
  it('un JSON conserva saldo, inventario y ambos estilos; la copia fase 3 se migra', () => {
    const profile = equipItem(
      purchaseItem(fresh(100), 'pieces-minimal'),
      'pieces-minimal',
    );
    const exported = createBackup({
      game: createGame(),
      profile,
      settings: DEFAULT_SETTINGS,
      opponents: { schemaVersion: 1, defeatedBots: [] },
      exportedAt: DATE,
    });
    expect(exported.schemaVersion).toBe(4);
    expect(
      validateBackup(JSON.parse(JSON.stringify(exported))).profile,
    ).toEqual(profile);
    const old = {
      ...exported,
      schemaVersion: 3,
      profile: { ...fresh(80), schemaVersion: 1 },
    };
    delete old.profile.collection;
    expect(validateBackup(old).profile).toMatchObject({
      schemaVersion: 2,
      wallet: { balance: 80 },
      collection: createCollection(),
    });
  });
  it('valida el inventario de la copia antes de permitir restaurarla', () => {
    const exported = createBackup({
      game: createGame(),
      profile: fresh(),
      settings: DEFAULT_SETTINGS,
      opponents: { schemaVersion: 1, defeatedBots: [] },
      exportedAt: DATE,
    });
    exported.profile.collection.equipped.board = 'board-neon';
    expect(() => validateBackup(exported)).toThrow('equipados');
  });
});
