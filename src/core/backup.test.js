import { describe, expect, it } from 'vitest';
import { createBackup, validateBackup } from './backup';
import { applyMove, createGame } from './game';
import { createProfile, settleGame } from './profile';
import { DEFAULT_SETTINGS, validateSettings } from './settings';

const DATE = '2026-10-30T12:00:00.000Z';
const NOW = Date.parse(DATE);
function backup() {
  let game = createGame(
    'unlimited',
    { w: 'Nilo', b: 'Jugador' },
    { mode: 'bot', botId: 'nilo', humanColor: 'b' },
  );
  for (const move of ['f3', 'e5', 'g4', 'Qh4#'])
    game = applyMove(game, move, NOW);
  const profile = settleGame(createProfile(DATE), game, {
    dayKey: '2026-10-30',
  }).profile;
  return createBackup({
    game,
    profile,
    settings: DEFAULT_SETTINGS,
    opponents: { schemaVersion: 1, defeatedBots: ['nilo'] },
    exportedAt: DATE,
  });
}

describe('Respaldo completo de progreso y compatibilidad', () => {
  it('conserva perfil, monedas, límite diario y recibos después de un JSON completo', () => {
    const exported = backup();
    const restored = validateBackup(JSON.parse(JSON.stringify(exported)));
    expect(restored.profile).toEqual(exported.profile);
    expect(restored.profile.wallet.balance).toBe(20);
    expect(restored.settings.botUndoCost).toBe(5);
    expect(
      settleGame(restored.profile, restored.game, { dayKey: '2026-10-30' })
        .applied,
    ).toBe(false);
  });
  it('congela el reloj del respaldo sin modificar la partida activa', () => {
    const game = applyMove(createGame('5+0'), 'e4', NOW - 4000);
    const exported = createBackup({ ...backup(), game, exportedAt: DATE });
    expect(exported.game.remaining.b).toBe(296000);
    expect(exported.game.paused).toBe(true);
    expect(exported.game.lastTick).toBeNull();
    expect(game.paused).toBe(false);
    expect(game.remaining.b).toBe(300000);
  });
  it.each([1, 2])(
    'migra la copia v%i sin reemplazar el perfil actual ni premiar un final antiguo',
    (schemaVersion) => {
      const old = backup();
      old.schemaVersion = schemaVersion;
      old.game.schemaVersion = schemaVersion;
      delete old.profile;
      delete old.settings.botUndoCost;
      const restored = validateBackup(old);
      expect(restored.profile).toBeNull();
      expect(restored.game.schemaVersion).toBe(3);
      expect(restored.game.progressTracking).toBe(false);
      expect(restored.settings.botUndoCost).toBe(5);
      expect(restored.opponents).toEqual(
        schemaVersion === 1 ? null : old.opponents,
      );
    },
  );
  it('rechaza la copia completa si una sección tiene monedas incoherentes', () => {
    const exported = backup();
    exported.profile.wallet.balance = 1000;
    expect(() => validateBackup(exported)).toThrow('saldo');
  });
  it('rechaza versiones desconocidas, costos no permitidos y finales sin fecha', () => {
    expect(() => validateBackup({ ...backup(), schemaVersion: 99 })).toThrow();
    expect(() =>
      validateSettings({ ...DEFAULT_SETTINGS, botUndoCost: -5 }),
    ).toThrow();
    const exported = backup();
    exported.game.finishedAt = null;
    expect(() => validateBackup(exported)).toThrow();
  });
});
