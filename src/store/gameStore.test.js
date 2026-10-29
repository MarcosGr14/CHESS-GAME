import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from './gameStore';
import { restoreChess } from '../core/game';

beforeEach(() => {
  vi.useRealTimers();
  useGameStore.getState().newGame('unlimited');
});

describe('Acciones de partida y persistencia', () => {
  it('guarda y rehidrata la posición con las acciones intactas', async () => {
    useGameStore.getState().move('e4');
    useGameStore.getState().move('e5');
    const fen = restoreChess(useGameStore.getState()).fen();
    await useGameStore.persist.rehydrate();
    expect(restoreChess(useGameStore.getState()).fen()).toBe(fen);
    expect(useGameStore.getState().move('Nf3')).toBe(true);
  });
  it('ofrecer no finaliza la partida y rechazar permite continuar', () => {
    useGameStore.getState().offerDraw();
    expect(useGameStore.getState().result).toBeNull();
    expect(useGameStore.getState().drawOffer).toBe('w');
    useGameStore.getState().respondDraw(false);
    expect(useGameStore.getState().drawOffer).toBeNull();
    expect(useGameStore.getState().move('e4')).toBe(true);
  });
  it('aceptar tablas cierra ambos relojes', () => {
    useGameStore.getState().offerDraw();
    useGameStore.getState().respondDraw(true);
    expect(useGameStore.getState().result.reason).toBe('agreement');
    expect(useGameStore.getState().lastTick).toBeNull();
  });
  it('rinde al jugador de turno', () => {
    useGameStore.getState().move('e4');
    useGameStore.getState().resign();
    expect(useGameStore.getState().result).toMatchObject({
      winner: 'w',
      reason: 'resignation',
    });
  });
  it('pausa y reanuda sin cobrar el intervalo de descanso', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    useGameStore.getState().newGame('5+0');
    useGameStore.getState().move('e4');
    vi.setSystemTime(6000);
    useGameStore.getState().togglePause();
    expect(useGameStore.getState().remaining.b).toBe(295000);
    vi.setSystemTime(60000);
    useGameStore.getState().togglePause();
    expect(useGameStore.getState().lastTick).toBe(60000);
    expect(useGameStore.getState().remaining.b).toBe(295000);
    vi.useRealTimers();
  });
  it('al aceptar tablas después de expirar, prevalece la pérdida por tiempo', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    useGameStore.getState().newGame('5+0');
    useGameStore.getState().move('e4');
    useGameStore.getState().offerDraw();
    vi.setSystemTime(302000);
    useGameStore.getState().respondDraw(true);
    expect(useGameStore.getState().result.reason).toBe('timeout');
    vi.useRealTimers();
  });
});
