import { Chess, DEFAULT_POSITION } from 'chess.js';

export const INITIAL_FEN = DEFAULT_POSITION;
export const COLORS = { w: 'Blancas', b: 'Negras' };
export const PIECE_NAMES = {
  p: 'peón',
  r: 'torre',
  n: 'caballo',
  b: 'alfil',
  q: 'dama',
  k: 'rey',
};
export const TIME_CONTROLS = [
  {
    id: 'unlimited',
    label: 'Sin tiempo',
    minutes: 0,
    increment: 0,
    detail: 'A tu ritmo',
  },
  { id: '3+2', label: '3 + 2', minutes: 3, increment: 2, detail: 'Relámpago' },
  { id: '5+0', label: '5 + 0', minutes: 5, increment: 0, detail: 'Rápida' },
  { id: '10+0', label: '10 + 0', minutes: 10, increment: 0, detail: 'Rápida' },
  {
    id: '15+10',
    label: '15 + 10',
    minutes: 15,
    increment: 10,
    detail: 'Con calma',
  },
];

export function createGame(
  timeControl = 'unlimited',
  names = { w: 'Jugador de blancas', b: 'Jugador de negras' },
) {
  const control =
    TIME_CONTROLS.find((item) => item.id === timeControl) || TIME_CONTROLS[0];
  return {
    schemaVersion: 1,
    initialFen: INITIAL_FEN,
    moves: [],
    clockHistory: [],
    timeControl: control.id,
    remaining: { w: control.minutes * 60000, b: control.minutes * 60000 },
    names,
    started: false,
    paused: false,
    lastTick: null,
    result: null,
    drawOffer: null,
    createdAt: new Date().toISOString(),
  };
}

// Replay is intentional: loading just the final FEN loses repetition history.
export function restoreChess(state) {
  const chess = new Chess(state.initialFen);
  for (const move of state.moves)
    chess.move({
      from: move.from,
      to: move.to,
      ...(move.promotion ? { promotion: move.promotion } : {}),
    });
  return chess;
}

export function getBoardResult(chess) {
  if (chess.isCheckmate())
    return {
      winner: chess.turn() === 'w' ? 'b' : 'w',
      reason: 'checkmate',
      label: 'Jaque mate',
    };
  if (chess.isStalemate())
    return { winner: null, reason: 'stalemate', label: 'Tablas por ahogado' };
  if (chess.isInsufficientMaterial())
    return {
      winner: null,
      reason: 'material',
      label: 'Tablas por material insuficiente',
    };
  if (chess.isThreefoldRepetition())
    return {
      winner: null,
      reason: 'repetition',
      label: 'Tablas por repetición triple',
    };
  if (chess.isDrawByFiftyMoves())
    return {
      winner: null,
      reason: 'fifty',
      label: 'Tablas por la regla de 50 movimientos',
    };
  if (chess.isDraw()) return { winner: null, reason: 'draw', label: 'Tablas' };
  return null;
}

export function getClock(state, now = Date.now()) {
  const remaining = { ...state.remaining };
  if (
    state.timeControl !== 'unlimited' &&
    state.started &&
    !state.paused &&
    !state.result &&
    state.lastTick !== null
  ) {
    const turn = state.moves.length % 2 === 0 ? 'w' : 'b';
    remaining[turn] = Math.max(
      0,
      remaining[turn] - Math.max(0, now - state.lastTick),
    );
  }
  return remaining;
}

export function getTimeout(state, now = Date.now()) {
  if (
    !state.started ||
    state.paused ||
    state.result ||
    state.timeControl === 'unlimited'
  )
    return null;
  const turn = state.moves.length % 2 === 0 ? 'w' : 'b';
  if (getClock(state, now)[turn] > 0) return null;
  const winner = turn === 'w' ? 'b' : 'w';
  const pieces = restoreChess(state)
    .board()
    .flat()
    .filter((piece) => piece?.color === winner);
  if (pieces.every((piece) => piece.type === 'k'))
    return {
      winner: null,
      reason: 'timeout-material',
      label: 'Tablas: tiempo agotado y rival con rey solo',
    };
  return { winner, reason: 'timeout', label: 'Tiempo agotado' };
}

export function applyMove(state, move, now = Date.now()) {
  if (state.paused || state.result) return null;
  const timeout = getTimeout(state, now);
  if (timeout)
    return {
      ...state,
      remaining: getClock(state, now),
      result: timeout,
      lastTick: null,
      drawOffer: null,
    };
  const chess = restoreChess(state);
  let played;
  try {
    played = chess.move(move);
  } catch {
    return null;
  }
  const remaining = getClock(state, now);
  const snapshot = { remaining: { ...remaining }, started: state.started };
  const control = TIME_CONTROLS.find((item) => item.id === state.timeControl);
  if (state.timeControl !== 'unlimited')
    remaining[played.color] += control.increment * 1000;
  const result = getBoardResult(chess);
  return {
    ...state,
    moves: [
      ...state.moves,
      {
        from: played.from,
        to: played.to,
        san: played.san,
        color: played.color,
        piece: played.piece,
        ...(played.promotion ? { promotion: played.promotion } : {}),
        ...(played.captured ? { captured: played.captured } : {}),
      },
    ],
    clockHistory: [...state.clockHistory, snapshot],
    remaining,
    started: true,
    lastTick: result || state.timeControl === 'unlimited' ? null : now,
    result,
    drawOffer: null,
  };
}

export function undoMove(state, now = Date.now()) {
  if (!state.moves.length) return null;
  const snapshot = state.clockHistory.at(-1);
  return {
    ...state,
    moves: state.moves.slice(0, -1),
    clockHistory: state.clockHistory.slice(0, -1),
    remaining: { ...snapshot.remaining },
    started: snapshot.started,
    lastTick:
      snapshot.started && !state.paused && state.timeControl !== 'unlimited'
        ? now
        : null,
    result: null,
    drawOffer: null,
  };
}

export function formatClock(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export function materialBalance(chess) {
  const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  return chess
    .board()
    .flat()
    .reduce(
      (sum, piece) =>
        sum + (piece ? values[piece.type] * (piece.color === 'w' ? 1 : -1) : 0),
      0,
    );
}

export function exportPgn(state) {
  const chess = restoreChess(state);
  chess.header(
    'Event',
    'Enroque · Partida local',
    'Site',
    'Local',
    'Date',
    state.createdAt.slice(0, 10).replaceAll('-', '.'),
    'White',
    state.names.w,
    'Black',
    state.names.b,
    'Result',
    state.result
      ? state.result.winner === 'w'
        ? '1-0'
        : state.result.winner === 'b'
          ? '0-1'
          : '1/2-1/2'
      : '*',
  );
  return chess.pgn();
}

export function validateGame(value) {
  if (
    !value ||
    value.schemaVersion !== 1 ||
    value.initialFen !== INITIAL_FEN ||
    !Array.isArray(value.moves) ||
    value.moves.length > 10000
  )
    throw new Error('Partida no válida.');
  if (!TIME_CONTROLS.some((control) => control.id === value.timeControl))
    throw new Error('Reloj no válido.');
  const validRemaining = (remaining) =>
    ['w', 'b'].every(
      (color) =>
        Number.isFinite(remaining?.[color]) &&
        remaining[color] >= 0 &&
        remaining[color] <= 86400000,
    );
  if (
    !validRemaining(value.remaining) ||
    !Array.isArray(value.clockHistory) ||
    value.clockHistory.length !== value.moves.length ||
    !value.clockHistory.every(
      (snapshot) =>
        validRemaining(snapshot.remaining) &&
        typeof snapshot.started === 'boolean',
    )
  )
    throw new Error('Historial de relojes no válido.');
  if (
    typeof value.started !== 'boolean' ||
    typeof value.paused !== 'boolean' ||
    (value.lastTick !== null &&
      (!Number.isFinite(value.lastTick) || value.lastTick < 0))
  )
    throw new Error('Estado no válido.');
  if (
    !['w', 'b'].every(
      (color) =>
        typeof value.names?.[color] === 'string' &&
        value.names[color].trim().length > 0 &&
        value.names[color].length <= 32,
    ) ||
    !Number.isFinite(Date.parse(value.createdAt))
  )
    throw new Error('Datos de partida no válidos.');
  if (value.drawOffer !== null && !['w', 'b'].includes(value.drawOffer))
    throw new Error('Oferta de tablas no válida.');
  const chess = restoreChess(value);
  const canonical = chess.history({ verbose: true }).map((move) => ({
    from: move.from,
    to: move.to,
    san: move.san,
    color: move.color,
    piece: move.piece,
    ...(move.promotion ? { promotion: move.promotion } : {}),
    ...(move.captured ? { captured: move.captured } : {}),
  }));
  if (
    value.result &&
    (!['w', 'b', null].includes(value.result.winner) ||
      typeof value.result.label !== 'string' ||
      value.result.label.length > 100 ||
      ![
        'checkmate',
        'stalemate',
        'material',
        'repetition',
        'fifty',
        'draw',
        'resignation',
        'agreement',
        'timeout',
        'timeout-material',
      ].includes(value.result.reason))
  )
    throw new Error('Resultado no válido.');
  const fields = Object.keys(createGame());
  return {
    ...Object.fromEntries(fields.map((key) => [key, value[key]])),
    moves: canonical,
    result: getBoardResult(chess) || value.result,
  };
}
