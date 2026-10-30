import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import {
  BOTS,
  getBot,
  isBotUnlocked,
  parseUciMove,
  resolveColor,
  selectBotMove,
  toUci,
  validateOpponents,
} from './bots';
import { createGame, restoreChess, validateGame } from './game';

describe('Rivales, errores humanos y desbloqueos', () => {
  it('define diez niveles crecientes con límites válidos', () => {
    expect(BOTS.map((bot) => bot.level)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    expect(new Set(BOTS.map((bot) => bot.id)).size).toBe(10);
    for (const bot of BOTS) {
      expect(bot.skillLevel).toBeGreaterThanOrEqual(0);
      expect(bot.skillLevel).toBeLessThanOrEqual(20);
      expect(bot.depth).toBeGreaterThan(0);
      expect(bot.thinkMs).toBeGreaterThan(0);
      expect(bot.humanError).toBeGreaterThanOrEqual(0);
      expect(bot.humanError).toBeLessThanOrEqual(100);
      expect(bot.personality.length).toBeGreaterThan(20);
    }
    expect(BOTS[0].elo).toBe(400);
    expect(BOTS.at(-1).elo).toBe(2200);
  });
  it('abre al primer rival, al siguiente tras vencer y a los niveles adquiridos', () => {
    expect(isBotUnlocked(BOTS[0])).toBe(true);
    expect(isBotUnlocked(BOTS[1])).toBe(false);
    expect(isBotUnlocked(BOTS[1], ['nilo'])).toBe(true);
    expect(isBotUnlocked(BOTS[2], ['nilo'])).toBe(false);
    expect(isBotUnlocked(BOTS[9], [], 10)).toBe(true);
    expect(isBotUnlocked(BOTS[9], ['elena'])).toBe(true);
    expect(isBotUnlocked(undefined)).toBe(false);
  });
  it('resuelve el color aleatorio una sola vez dentro de los dos lados legales', () => {
    expect(resolveColor('random', () => 0)).toBe('w');
    expect(resolveColor('random', () => 0.99)).toBe('b');
    expect(resolveColor('b')).toBe('b');
    expect(resolveColor('w')).toBe('w');
  });
  it('elige un error legal y conserva el mejor movimiento en el nivel alto', () => {
    const chess = new Chess();
    const fen = chess.fen();
    expect(toUci(selectBotMove(chess, 'e2e4', BOTS[0], () => 0))).not.toBe(
      'e2e4',
    );
    expect(toUci(selectBotMove(chess, 'e2e4', BOTS[9], () => 0))).toBe('e2e4');
    expect(chess.fen()).toBe(fen);
  });
  it('la frecuencia determinista de errores se aproxima a la configuración', () => {
    const chess = new Chess();
    let seed = 456;
    let errors = 0;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 1000; i += 1)
      if (toUci(selectBotMove(chess, 'e2e4', BOTS[0], random)) !== 'e2e4')
        errors += 1;
    expect(errors).toBeGreaterThan(800);
    expect(errors).toBeLessThan(900);
  });
  it('no sustituye una única respuesta legal y respeta la promoción', () => {
    const only = new Chess('7k/8/6K1/8/8/8/8/R7 b - - 0 1');
    expect(only.moves({ verbose: true })).toHaveLength(1);
    const move = toUci(only.moves({ verbose: true })[0]);
    expect(toUci(selectBotMove(only, move, BOTS[0], () => 0))).toBe(move);
    const promotion = new Chess('7k/P7/8/8/8/8/8/7K w - - 0 1');
    expect(selectBotMove(promotion, 'a7a8n', BOTS[9])).toMatchObject({
      promotion: 'n',
    });
  });
  it('rechaza movimientos UCI inválidos e incompatibles con la posición', () => {
    expect(() => parseUciMove('a9a8')).toThrow();
    expect(() => parseUciMove('a7a8k')).toThrow();
    expect(() => selectBotMove(new Chess(), 'e2e5', BOTS[0])).toThrow();
  });
  it('valida y deduplica victorias sin aceptar rivales inventados', () => {
    expect(
      validateOpponents({ schemaVersion: 1, defeatedBots: ['nilo', 'nilo'] })
        .defeatedBots,
    ).toEqual(['nilo']);
    expect(() =>
      validateOpponents({ schemaVersion: 1, defeatedBots: ['inventado'] }),
    ).toThrow();
  });
});

describe('Compatibilidad del guardado de la fase 1', () => {
  it('migra posición y relojes sin convertir una partida local en partida bot', () => {
    const old = { ...createGame('3+2'), schemaVersion: 1 };
    delete old.id;
    delete old.mode;
    delete old.botId;
    delete old.humanColor;
    const loaded = validateGame(old);
    expect(loaded).toMatchObject({
      schemaVersion: 3,
      mode: 'local',
      botId: null,
      humanColor: 'w',
      remaining: { w: 180000, b: 180000 },
    });
    expect(restoreChess(loaded).fen()).toBe(new Chess().fen());
  });
  it('el modo, rival y color de una partida contra bot sobreviven al JSON', () => {
    const game = createGame(
      'unlimited',
      { w: 'Nilo', b: 'Tú' },
      { mode: 'bot', botId: 'nilo', humanColor: 'b' },
    );
    expect(validateGame(JSON.parse(JSON.stringify(game)))).toMatchObject({
      id: game.id,
      mode: 'bot',
      botId: 'nilo',
      humanColor: 'b',
    });
    expect(getBot(game.botId).level).toBe(1);
  });
  it.each([
    { mode: 'online' },
    { humanColor: 'random' },
    { mode: 'bot', botId: 'unknown' },
    { id: '' },
  ])('rechaza modalidad o rival no válido: %o', (patch) => {
    expect(() => validateGame({ ...createGame(), ...patch })).toThrow();
  });
});
