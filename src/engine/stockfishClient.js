import { toUci } from '../core/bots.js';

export const abortError = () =>
  new DOMException('Búsqueda cancelada.', 'AbortError');

function createEngineWorker() {
  const base = new URL(
    `${import.meta.env.BASE_URL}engine/`,
    window.location.href,
  );
  const url = new URL('stockfish.worker.js', base);
  url.hash = encodeURIComponent(
    new URL('stockfish-19-lite-single.wasm', base).href,
  );
  return new Worker(url, { name: 'enroque-stockfish-lite' });
}

export class StockfishClient {
  constructor({
    createWorker = createEngineWorker,
    startupTimeout = 30000,
  } = {}) {
    this.createWorker = createWorker;
    this.startupTimeout = startupTimeout;
    this.worker = null;
    this.starting = null;
    this.ready = false;
    this.pending = null;
    this.requestId = 0;
  }

  initialize() {
    if (this.ready) return Promise.resolve();
    if (this.starting) return this.starting.promise;
    let resolve, reject;
    const promise = new Promise((yes, no) => {
      resolve = yes;
      reject = no;
    });
    this.starting = {
      promise,
      resolve,
      reject,
      timer: setTimeout(
        () =>
          this.fail(
            new Error(
              'El motor tardó demasiado en cargar. Revisa la conexión y vuelve a intentarlo.',
            ),
          ),
        this.startupTimeout,
      ),
    };
    try {
      const worker = this.createWorker();
      this.worker = worker;
      worker.onmessage = ({ data }) => {
        if (this.worker !== worker) return;
        if (data?.type === 'engine-error') {
          this.fail(
            new Error(
              'No se pudo cargar Stockfish. Comprueba la conexión y vuelve a intentarlo.',
            ),
          );
          return;
        }
        if (typeof data !== 'string') return;
        for (const line of data.split('\n')) this.receive(line.trim());
      };
      worker.onerror = (event) => {
        event.preventDefault?.();
        if (this.worker === worker)
          this.fail(
            new Error(
              'No se pudo iniciar Stockfish. Vuelve a cargar el motor.',
            ),
          );
      };
      worker.onmessageerror = () => {
        if (this.worker === worker)
          this.fail(new Error('Se perdió la comunicación con el motor.'));
      };
      worker.postMessage('uci');
    } catch {
      this.fail(
        new Error('Este navegador no pudo iniciar el motor de ajedrez.'),
      );
    }
    return promise;
  }

  receive(line) {
    if (line === 'uciok' && this.starting) {
      this.worker.postMessage('setoption name Hash value 16');
      this.worker.postMessage('setoption name UCI_LimitStrength value false');
      this.worker.postMessage('isready');
    } else if (line === 'readyok' && this.starting) {
      const starting = this.starting;
      clearTimeout(starting.timer);
      this.starting = null;
      this.ready = true;
      starting.resolve();
    } else if (line.startsWith('bestmove ') && this.pending) {
      const move = line.split(/\s+/)[1];
      const pending = this.pending;
      this.pending = null;
      clearTimeout(pending.timer);
      if (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)) pending.resolve(move);
      else
        pending.reject(
          new Error('El motor no encontró una jugada para esta posición.'),
        );
    }
  }

  async search({
    initialFen,
    moves,
    bot,
    thinkMs = bot.thinkMs,
    signal,
    onReady,
  }) {
    this.cancel();
    const requestId = ++this.requestId;
    if (signal?.aborted) throw abortError();
    const cancel = () => {
      if (requestId === this.requestId) this.cancel();
    };
    signal?.addEventListener('abort', cancel, { once: true });
    try {
      await this.initialize();
      if (signal?.aborted || requestId !== this.requestId) throw abortError();
      onReady?.();
      return await new Promise((resolve, reject) => {
        this.pending = {
          resolve,
          reject,
          timer: setTimeout(
            () =>
              this.fail(
                new Error(
                  'El motor dejó de responder. Puedes reintentarlo sin perder la partida.',
                ),
              ),
            Math.max(5000, thinkMs + 4000),
          ),
        };
        try {
          this.worker.postMessage('ucinewgame');
          this.worker.postMessage(
            `setoption name Skill Level value ${bot.skillLevel}`,
          );
          const history = moves.map(toUci).join(' ');
          this.worker.postMessage(
            `position fen ${initialFen}${history ? ` moves ${history}` : ''}`,
          );
          this.worker.postMessage(
            `go depth ${bot.depth} movetime ${Math.max(20, Math.floor(thinkMs))}`,
          );
        } catch {
          this.fail(new Error('Se perdió la conexión con el motor.'));
        }
      });
    } finally {
      signal?.removeEventListener('abort', cancel);
    }
  }

  fail(error) {
    if (this.starting) {
      clearTimeout(this.starting.timer);
      this.starting.reject(error);
      this.starting = null;
    }
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.reject(error);
      this.pending = null;
    }
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
  }

  cancel() {
    if (!this.starting && !this.pending) return;
    this.requestId += 1;
    try {
      this.worker?.postMessage('stop');
    } catch {
      /* Termination below also handles a failed worker. */
    }
    this.fail(abortError());
  }

  dispose() {
    this.fail(abortError());
  }
}
