import { afterEach, describe, expect, it, vi } from 'vitest';
import { StockfishClient } from './stockfishClient';
import { createGame } from '../core/game';
import { BOTS } from '../core/bots';

class FakeWorker {
  constructor() {
    this.commands = [];
    this.terminated = false;
  }
  postMessage(line) {
    this.commands.push(line);
  }
  terminate() {
    this.terminated = true;
  }
  emit(data) {
    this.onmessage?.({ data });
  }
  boot() {
    this.emit('uciok');
    this.emit('readyok');
  }
}
const clients = [];
const flush = async () => {
  for (let i = 0; i < 4; i += 1) await Promise.resolve();
};
function setup() {
  const workers = [];
  const client = new StockfishClient({
    createWorker: () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    },
    startupTimeout: 1000,
  });
  clients.push(client);
  return {
    client,
    workers,
    search: (signal, patch = {}) =>
      client.search({ ...createGame(), bot: BOTS[0], signal, ...patch }),
  };
}
afterEach(() => {
  clients.forEach((client) => client.dispose());
  clients.length = 0;
  vi.useRealTimers();
});

describe('Cliente UCI y ciclo de vida', () => {
  it('informa inmediatamente un rechazo de descarga del WASM', async () => {
    const { workers, search } = setup();
    const result = search();
    const rejected = expect(result).rejects.toThrow('No se pudo cargar');
    workers[0].emit({ type: 'engine-error' });
    await rejected;
    expect(workers[0].terminated).toBe(true);
  });
  it('espera uciok y readyok antes de buscar y conserva el historial', async () => {
    const { workers, search } = setup();
    const result = search(undefined, {
      moves: [
        { from: 'e2', to: 'e4' },
        { from: 'e7', to: 'e5' },
      ],
    });
    expect(workers[0].commands).toEqual(['uci']);
    workers[0].emit('uciok');
    await flush();
    expect(workers[0].commands).toContain('isready');
    expect(workers[0].commands.some((line) => line.startsWith('go '))).toBe(
      false,
    );
    workers[0].emit('readyok');
    await flush();
    expect(workers[0].commands).toContain('setoption name Skill Level value 0');
    expect(workers[0].commands).toContain('go depth 1 movetime 250');
    expect(
      workers[0].commands.find((line) => line.startsWith('position ')),
    ).toContain('moves e2e4 e7e5');
    workers[0].emit('info depth 1 pv g1f3\nbestmove g1f3 ponder b8c6');
    await expect(result).resolves.toBe('g1f3');
  });
  it('cancela durante la carga y puede crear un Worker nuevo', async () => {
    const { workers, search } = setup();
    const controller = new AbortController();
    const result = search(controller.signal);
    const rejected = expect(result).rejects.toMatchObject({
      name: 'AbortError',
    });
    controller.abort();
    await rejected;
    expect(workers[0].terminated).toBe(true);
    const next = search();
    workers[1].boot();
    await flush();
    workers[1].emit('bestmove e2e4');
    await expect(next).resolves.toBe('e2e4');
  });
  it('descarta una respuesta vieja al cancelar y reiniciar', async () => {
    const { client, workers, search } = setup();
    const old = search();
    const rejected = expect(old).rejects.toMatchObject({ name: 'AbortError' });
    workers[0].boot();
    await flush();
    client.cancel();
    await rejected;
    expect(workers[0].commands).toContain('stop');
    const next = search();
    workers[1].boot();
    await flush();
    workers[0].emit('bestmove a2a4');
    expect(client.pending).not.toBeNull();
    workers[1].emit('bestmove e2e4');
    await expect(next).resolves.toBe('e2e4');
  });
  it('un aborto de la petición anterior no cancela la siguiente', async () => {
    const { workers, search } = setup();
    const controller = new AbortController();
    const old = search(controller.signal);
    const rejected = expect(old).rejects.toMatchObject({ name: 'AbortError' });
    const next = search();
    controller.abort();
    workers[1].boot();
    await flush();
    workers[1].emit('bestmove d2d4');
    await rejected;
    await expect(next).resolves.toBe('d2d4');
  });
  it('rechaza resultados vacíos o no UCI', async () => {
    const { workers, search } = setup();
    const result = search();
    const rejected = expect(result).rejects.toThrow('no encontró');
    workers[0].boot();
    await flush();
    workers[0].emit('bestmove (none)');
    await rejected;
  });
  it('recupera un fallo de carga sin dejar promesas pendientes', async () => {
    const { workers, search } = setup();
    const result = search();
    const rejected = expect(result).rejects.toThrow('No se pudo iniciar');
    workers[0].onerror({ preventDefault() {} });
    await rejected;
    expect(workers[0].terminated).toBe(true);
    const next = search();
    workers[1].boot();
    await flush();
    workers[1].emit('bestmove b1c3');
    await expect(next).resolves.toBe('b1c3');
  });
  it('limita el tiempo de inicialización', async () => {
    vi.useFakeTimers();
    const { workers, search } = setup();
    const result = search();
    const rejected = expect(result).rejects.toThrow('tardó demasiado');
    await vi.advanceTimersByTimeAsync(1001);
    await rejected;
    expect(workers[0].terminated).toBe(true);
  });
  it('limita una búsqueda que nunca contesta', async () => {
    vi.useFakeTimers();
    const { workers, search } = setup();
    const result = search();
    const rejected = expect(result).rejects.toThrow('dejó de responder');
    workers[0].boot();
    await flush();
    await vi.advanceTimersByTimeAsync(5001);
    await rejected;
    expect(workers[0].terminated).toBe(true);
  });
  it('no crea ningún Worker cuando la señal ya está cancelada', async () => {
    const { workers, search } = setup();
    const controller = new AbortController();
    controller.abort();
    await expect(search(controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(workers).toHaveLength(0);
  });
});
