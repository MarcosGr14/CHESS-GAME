import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from './gameStore';
import { useBotStore } from './botStore';
import { storage } from '../storage';
import { restoreChess } from '../core/game';

const state = () => useGameStore.getState();
function start(color = 'w') {
  state().newGame(
    'unlimited',
    { w: color === 'w' ? 'Tú' : 'Nilo', b: color === 'w' ? 'Nilo' : 'Tú' },
    { mode: 'bot', botId: 'nilo', humanColor: color },
  );
}
function token() {
  return { id: state().id, revision: state().revision };
}
const botMove = (move) => state().botMove(move, token());
beforeEach(() => {
  useBotStore
    .getState()
    .importOpponents({ schemaVersion: 1, defeatedBots: [] });
  state().newGame('unlimited');
});

describe('Una partida entre el jugador y el bot', () => {
  it('recupera un desbloqueo si solo se alcanzó a guardar la victoria', async () => {
    start('b');
    botMove('f3');
    state().move('e5');
    botMove('g4');
    state().move('Qh4#');
    useBotStore
      .getState()
      .importOpponents({ schemaVersion: 1, defeatedBots: [] });
    await useGameStore.persist.rehydrate();
    expect(useBotStore.getState().defeatedBots).toEqual(['nilo']);
  });
  it('el jugador no controla al bot, tampoco antes de la primera jugada', () => {
    start('b');
    expect(state().move('e4')).toBe(false);
    expect(botMove('e4')).toBe(true);
    expect(state().move('e5')).toBe(true);
  });
  it('no acepta otra respuesta en el turno del jugador', () => {
    start();
    expect(botMove('e4')).toBe(false);
    expect(state().move('e4')).toBe(true);
    expect(botMove('e5')).toBe(true);
    expect(botMove('Nf3')).toBe(false);
  });
  it('deshacer durante la búsqueda cancela la respuesta pendiente', () => {
    start();
    state().move('e4');
    const pending = token();
    state().undo();
    expect(state().botMove('e5', pending)).toBe(false);
    expect(state().moves).toHaveLength(0);
  });
  it('deshacer una respuesta completa recupera el turno humano', () => {
    start();
    state().move('e4');
    botMove('e5');
    state().undo();
    expect(state().moves).toHaveLength(0);
    expect(restoreChess(state()).turn()).toBe('w');
  });
  it('jugando con negras, conserva la apertura del bot al deshacer', () => {
    start('b');
    botMove('e4');
    state().undo();
    expect(state().moves).toHaveLength(1);
    state().move('e5');
    botMove('Nf3');
    state().undo();
    expect(state().moves.map((move) => move.san)).toEqual(['e4']);
  });
  it('invalida respuestas aunque se vuelva al mismo FEN y número de jugadas', () => {
    start();
    state().move('e4');
    const stale = token();
    state().undo();
    state().move('e4');
    expect(state().botMove('e5', stale)).toBe(false);
    expect(botMove('e5')).toBe(true);
  });
  it('pausar y reanudar invalida las respuestas antiguas', () => {
    start();
    state().move('e4');
    const stale = token();
    state().togglePause();
    state().togglePause();
    expect(state().botMove('e5', stale)).toBe(false);
    expect(state().paused).toBe(false);
  });
  it('se puede pausar antes de la apertura del bot', () => {
    start('b');
    state().togglePause();
    expect(state().paused).toBe(true);
    expect(botMove('e4')).toBe(false);
  });
  it('reiniciar impide aplicar una respuesta de la partida anterior', () => {
    start();
    state().move('e4');
    const old = token();
    start();
    state().move('e4');
    expect(state().botMove('e5', old)).toBe(false);
  });
  it('rinde al humano aunque sea el turno del bot, y no ofrece tablas', () => {
    start();
    state().move('e4');
    state().offerDraw();
    expect(state().drawOffer).toBeNull();
    state().resign();
    expect(state().result).toMatchObject({
      winner: 'b',
      reason: 'resignation',
    });
    expect(useBotStore.getState().defeatedBots).toEqual([]);
  });
  it('el mate ganado desbloquea al siguiente rival una sola vez', async () => {
    start('b');
    botMove('f3');
    state().move('e5');
    botMove('g4');
    state().move('Qh4#');
    expect(state().result).toMatchObject({ winner: 'b', reason: 'checkmate' });
    expect(useBotStore.getState().defeatedBots).toEqual(['nilo']);
    useBotStore.getState().recordVictory('nilo');
    await useBotStore.persist.rehydrate();
    expect(useBotStore.getState().defeatedBots).toEqual(['nilo']);
    expect(
      state().newGame(
        'unlimited',
        { w: 'Tú', b: 'Clara' },
        { mode: 'bot', botId: 'clara', humanColor: 'w' },
      ),
    ).toBe(true);
  });
  it('rechaza un rival todavía bloqueado sin reemplazar la partida', () => {
    const id = state().id;
    expect(
      state().newGame(
        'unlimited',
        { w: 'Tú', b: 'Elena' },
        { mode: 'bot', botId: 'elena', humanColor: 'w' },
      ),
    ).toBe(false);
    expect(state().id).toBe(id);
  });
  it('el guardado migra automáticamente del sobre Zustand anterior', async () => {
    const old = { ...state(), schemaVersion: 1 };
    delete old.id;
    delete old.mode;
    delete old.botId;
    delete old.humanColor;
    storage.saveGame({ version: 1, state: JSON.parse(JSON.stringify(old)) });
    await useGameStore.persist.rehydrate();
    expect(state().schemaVersion).toBe(2);
    expect(state().mode).toBe('local');
    expect(typeof state().move).toBe('function');
  });
});
