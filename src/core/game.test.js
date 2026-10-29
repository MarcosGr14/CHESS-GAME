import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import {
  applyMove,
  createGame,
  exportPgn,
  formatClock,
  getBoardResult,
  getClock,
  getTimeout,
  materialBalance,
  restoreChess,
  undoMove,
  validateGame,
} from './game';

function play(sequence, initial = createGame(), now = 1000) {
  return sequence.reduce((state, move) => {
    const next = applyMove(state, move, now);
    if (!next) throw new Error(`Illegal test move: ${move}`);
    return next;
  }, initial);
}

describe('Partida completa y reglas delegadas a chess.js', () => {
  it('llega al mate y bloquea movimientos posteriores', () => {
    const state = play(['f3', 'e5', 'g4', 'Qh4#']);
    expect(state.result).toMatchObject({ winner: 'b', reason: 'checkmate' });
    expect(applyMove(state, 'e4')).toBeNull();
    expect(restoreChess(state).isCheckmate()).toBe(true);
  });
  it('rechaza movimientos ilegales sin modificar el estado', () => {
    const state = createGame();
    expect(applyMove(state, { from: 'e2', to: 'e5' })).toBeNull();
    expect(state.moves).toEqual([]);
    expect(applyMove(state, 'e5')).toBeNull();
  });
  it('mueve torre y rey en un enroque legal y permite deshacerlo', () => {
    const state = play(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'O-O']);
    const chess = restoreChess(state);
    expect(chess.get('g1')).toMatchObject({ type: 'k' });
    expect(chess.get('f1')).toMatchObject({ type: 'r' });
    expect(restoreChess(undoMove(state)).get('e1')).toMatchObject({
      type: 'k',
    });
  });
  it('realiza captura al paso y restaura el peón al deshacer', () => {
    const state = play(['e4', 'a6', 'e5', 'd5', 'exd6']);
    expect(restoreChess(state).get('d5')).toBeUndefined();
    expect(state.moves.at(-1).captured).toBe('p');
    expect(restoreChess(undoMove(state)).get('d5')).toMatchObject({
      type: 'p',
      color: 'b',
    });
    expect(materialBalance(restoreChess(state))).toBe(1);
  });
  it.each(['q', 'r', 'b', 'n'])(
    'corona como %s a través de la API de chess.js',
    (promotion) => {
      const state = {
        ...createGame(),
        initialFen: '7k/P7/8/8/8/8/8/7K w - - 0 1',
      };
      const next = applyMove(state, { from: 'a7', to: 'a8', promotion });
      expect(restoreChess(next).get('a8')).toMatchObject({
        type: promotion,
        color: 'w',
      });
    },
  );
  it('conserva repetición triple después de guardar y cargar', () => {
    const state = play(['Nf3', 'Nf6', 'Ng1', 'Ng8']);
    const loaded = validateGame(JSON.parse(JSON.stringify(state)));
    const final = play(['Nf3', 'Nf6', 'Ng1', 'Ng8'], loaded);
    expect(final.result.reason).toBe('repetition');
  });
  it.each([
    ['7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', 'stalemate'],
    ['7k/8/6K1/8/8/8/8/8 w - - 0 1', 'material'],
    ['7k/8/6K1/8/8/8/8/R7 w - - 100 51', 'fifty'],
  ])('detecta el final en %s', (fen, reason) => {
    expect(getBoardResult(new Chess(fen)).reason).toBe(reason);
  });
  it('deshacer un mate permite continuar y no altera el estado anterior', () => {
    const state = play(['f3', 'e5', 'g4', 'Qh4#']);
    const previous = undoMove(state);
    expect(previous.result).toBeNull();
    expect(state.result.reason).toBe('checkmate');
    expect(applyMove(previous, 'Nc6')).not.toBeNull();
  });
  it('exporta PGN reproducible con nombres, jugadas y resultado', () => {
    const state = play(['f3', 'e5', 'g4', 'Qh4#']);
    const pgn = exportPgn(state);
    const loaded = new Chess();
    loaded.loadPgn(pgn);
    expect(loaded.fen()).toBe(restoreChess(state).fen());
    expect(pgn).toContain('[Result "0-1"]');
    expect(pgn).toContain('[White "Jugador de blancas"]');
  });
});

describe('Relojes sin deriva, pausas y deshacer', () => {
  it('no consume tiempo antes de empezar ni sin reloj', () => {
    expect(getClock(createGame('3+2'), 9999999)).toEqual({
      w: 180000,
      b: 180000,
    });
    expect(getClock(play(['e4']), 9999999)).toEqual({ w: 0, b: 0 });
  });
  it('aplica el incremento y descuenta solo al jugador activo', () => {
    const state = play(['e4'], createGame('3+2'), 1000);
    expect(getClock(state, 6000)).toEqual({ w: 182000, b: 175000 });
    const next = applyMove(state, 'e5', 6000);
    expect(getClock(next, 8000)).toEqual({ w: 180000, b: 177000 });
  });
  it('restaura tiempo e incremento al deshacer, incluso el primer movimiento', () => {
    const first = play(['e4'], createGame('3+2'), 1000);
    const second = applyMove(first, 'e5', 6000);
    const undone = undoMove(second, 10000);
    expect(undone.remaining).toEqual({ w: 182000, b: 175000 });
    expect(getClock(undone, 11000).b).toBe(174000);
    const initial = undoMove(undone, 11000);
    expect(initial.started).toBe(false);
    expect(initial.lastTick).toBeNull();
    expect(initial.remaining).toEqual({ w: 180000, b: 180000 });
  });
  it('el tiempo transcurrido incluye el periodo con la página cerrada', () => {
    const state = validateGame(
      JSON.parse(JSON.stringify(play(['e4'], createGame('5+0'), 1000))),
    );
    expect(getClock(state, 61000).b).toBe(240000);
  });
  it('un reloj pausado no consume tiempo ni permite mover', () => {
    const state = { ...play(['e4'], createGame('5+0'), 1000), paused: true };
    expect(getClock(state, 999999)).toEqual(state.remaining);
    expect(applyMove(state, 'e5')).toBeNull();
    expect(getTimeout(state, 999999)).toBeNull();
  });
  it('adjudica pérdida por tiempo antes de aceptar la jugada', () => {
    const state = play(['e4'], createGame('3+2'), 1000);
    const next = applyMove(state, 'e5', 181001);
    expect(next.result).toMatchObject({ winner: 'w', reason: 'timeout' });
    expect(next.moves).toHaveLength(1);
    expect(next.remaining.b).toBe(0);
  });
  it('el rey solo del rival no gana por tiempo', () => {
    const state = {
      ...createGame('5+0'),
      initialFen: '7k/8/6K1/8/8/8/8/R7 w - - 0 1',
      started: true,
      remaining: { w: 0, b: 1000 },
      lastTick: 1000,
    };
    expect(getTimeout(state, 2000)).toMatchObject({
      winner: null,
      reason: 'timeout-material',
    });
  });
  it('formatea tiempos, redondeando hacia arriba y sin negativos', () => {
    expect(formatClock(179999)).toBe('03:00');
    expect(formatClock(-1)).toBe('00:00');
    expect(formatClock(1)).toBe('00:01');
  });
});

describe('Validación de respaldos', () => {
  it('reconstruye SAN y capturas y descarta propiedades desconocidas', () => {
    const state = play(['e4']);
    state.moves[0].san = 'dato manipulado';
    const valid = validateGame({ ...state, move: 'overwrite-action' });
    expect(valid.moves[0].san).toBe('e4');
    expect(valid).not.toHaveProperty('move');
  });
  it.each([
    { schemaVersion: 99 },
    { remaining: { w: -1, b: 0 } },
    { clockHistory: [{}] },
    { names: { w: '', b: 'Rival' } },
    { lastTick: 'ayer' },
    { moves: [{ from: 'e2', to: 'e5' }] },
    { result: { winner: 'z', reason: 'draw', label: 'x' } },
  ])('rechaza datos incoherentes: %o', (patch) => {
    expect(() => validateGame({ ...createGame(), ...patch })).toThrow();
  });
});
