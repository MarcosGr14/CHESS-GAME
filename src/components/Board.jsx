import { useRef, useState } from 'react';
import { COLORS, PIECE_NAMES } from '../core/game';
import Piece from './Piece';
import { useProfileStore } from '../store/profileStore';
import { getBoardStyle } from '../themes';

const FILES = 'abcdefgh';
export default function Board({
  chess,
  flipped,
  showLegal,
  colorblind,
  disabled,
  lastMove,
  onMove,
}) {
  const boardId = useProfileStore((state) => state.collection.equipped.board);
  const [selected, setSelected] = useState(null);
  const [focusSquare, setFocusSquare] = useState('e2');
  const [drag, setDrag] = useState(null);
  const gesture = useRef(null);
  const boardRef = useRef(null);
  const squareRefs = useRef({});
  const [notice, setNotice] = useState('');
  const files = flipped ? [...FILES].reverse() : [...FILES];
  const ranks = flipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
  const legalMoves =
    selected && !disabled
      ? chess.moves({ square: selected, verbose: true })
      : [];
  const destinations = new Map(legalMoves.map((move) => [move.to, move]));
  const currentFen = chess.fen();
  const inCheck = chess.isCheck();
  const selectionFen = useRef(currentFen);
  // A move, undo or imported position invalidates the current selection.
  if (selectionFen.current !== currentFen) {
    selectionFen.current = currentFen;
    if (selected) setSelected(null);
  }

  function choose(square) {
    if (disabled) return;
    const piece = chess.get(square);
    if (selected && destinations.has(square)) {
      onMove(selected, square);
      setSelected(null);
      setNotice('');
    } else if (piece?.color === chess.turn()) {
      setSelected(selected === square ? null : square);
      setNotice(
        `${PIECE_NAMES[piece.type]} en ${square}. Elige una casilla de destino.`,
      );
    } else {
      if (selected)
        setNotice('Ese movimiento no es legal. Elige una casilla resaltada.');
      setSelected(null);
    }
  }

  function pointerDown(event, square) {
    if (disabled || event.button !== 0 || !event.isPrimary) return;
    gesture.current = {
      square,
      x: event.clientX,
      y: event.clientY,
      dragging: false,
      piece: chess.get(square),
      pointerId: event.pointerId,
    };
    boardRef.current.setPointerCapture(event.pointerId);
  }
  function pointerMove(event) {
    const start = gesture.current;
    if (
      !start ||
      start.pointerId !== event.pointerId ||
      !start.piece ||
      start.piece.color !== chess.turn() ||
      disabled
    )
      return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 7)
      start.dragging = true;
    if (!start.dragging) return;
    const rect = boardRef.current.getBoundingClientRect();
    setSelected(start.square);
    setDrag({
      square: start.square,
      piece: start.piece,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }
  function pointerUp(event) {
    const start = gesture.current;
    if (!start || start.pointerId !== event.pointerId) return;
    gesture.current = null;
    setDrag(null);
    if (boardRef.current.hasPointerCapture(event.pointerId))
      boardRef.current.releasePointerCapture(event.pointerId);
    if (!start.dragging) {
      choose(start.square);
      return;
    }
    const rect = boardRef.current.getBoundingClientRect();
    const col = Math.floor((event.clientX - rect.left) / (rect.width / 8));
    const row = Math.floor((event.clientY - rect.top) / (rect.height / 8));
    const destination =
      col >= 0 && col < 8 && row >= 0 && row < 8
        ? `${files[col]}${ranks[row]}`
        : null;
    if (
      destination &&
      chess
        .moves({ square: start.square, verbose: true })
        .some((move) => move.to === destination)
    ) {
      onMove(start.square, destination);
      setSelected(null);
    } else setNotice('Movimiento cancelado. La pieza vuelve a su casilla.');
  }
  function keyboard(event, row, col) {
    const offsets = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    if (event.key === 'Escape') {
      setSelected(null);
      return;
    }
    if (!offsets[event.key]) return;
    event.preventDefault();
    const [dy, dx] = offsets[event.key];
    const square = `${files[Math.max(0, Math.min(7, col + dx))]}${ranks[Math.max(0, Math.min(7, row + dy))]}`;
    setFocusSquare(square);
    squareRefs.current[square]?.focus();
  }
  return (
    <div
      className={`board-frame ${colorblind ? 'colorblind' : ''}`}
      style={getBoardStyle(boardId, colorblind)}
      data-board-theme={boardId}
    >
      <div
        className="board"
        ref={boardRef}
        role="grid"
        aria-label="Tablero de ajedrez. Usa las flechas para navegar y Enter para seleccionar y mover."
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={() => {
          gesture.current = null;
          setDrag(null);
        }}
      >
        {ranks.map((rank, row) => (
          <div role="row" className="board-row" key={rank}>
            {files.map((file, col) => {
              const square = `${file}${rank}`;
              const piece = chess.get(square);
              const light = (FILES.indexOf(file) + rank) % 2 === 0;
              const legal = destinations.get(square);
              const checked =
                piece?.type === 'k' && piece.color === chess.turn() && inCheck;
              const isLast =
                lastMove?.from === square || lastMove?.to === square;
              const animation =
                piece &&
                lastMove?.to === square &&
                lastMove.color === piece.color &&
                !flipped
                  ? {
                      '--move-x': `${(FILES.indexOf(lastMove.from[0]) - FILES.indexOf(file)) * 100}%`,
                      '--move-y': `${(Number(rank) - Number(lastMove.from[1])) * 100}%`,
                    }
                  : undefined;
              return (
                <div role="gridcell" key={square} className="square-cell">
                  <button
                    ref={(node) => {
                      squareRefs.current[square] = node;
                    }}
                    tabIndex={focusSquare === square ? 0 : -1}
                    type="button"
                    className={`square ${light ? 'light' : 'dark'} ${selected === square ? 'selected' : ''} ${isLast ? 'last-move' : ''} ${checked ? 'in-check' : ''} ${legal && showLegal ? (legal.captured ? 'legal-capture' : 'legal-move') : ''}`}
                    data-square={square}
                    aria-label={`${square}${piece ? `, ${PIECE_NAMES[piece.type]} ${piece.color === 'w' ? (['r', 'q'].includes(piece.type) ? 'blanca' : 'blanco') : ['r', 'q'].includes(piece.type) ? 'negra' : 'negro'}` : ', vacía'}${checked ? ', en jaque' : ''}${selected === square ? ', seleccionada' : ''}${legal && showLegal ? ', destino legal' : ''}`}
                    aria-pressed={selected === square}
                    aria-disabled={disabled}
                    onFocus={() => setFocusSquare(square)}
                    onKeyDown={(event) => keyboard(event, row, col)}
                    onPointerDown={(event) => pointerDown(event, square)}
                    onClick={(event) => {
                      if (event.detail === 0) choose(square);
                    }}
                  >
                    {col === 0 && (
                      <span className="rank-coordinate">{rank}</span>
                    )}
                    {row === 7 && (
                      <span className="file-coordinate">{file}</span>
                    )}
                    {piece && (
                      <Piece
                        type={piece.type}
                        color={piece.color}
                        className={`${drag?.square === square ? 'drag-source' : ''} ${animation ? 'piece-moved' : ''}`}
                        style={animation}
                      />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
        {drag && (
          <div className="drag-piece" style={{ left: drag.x, top: drag.y }}>
            <Piece type={drag.piece.type} color={drag.piece.color} />
          </div>
        )}
      </div>
      <span className="sr-only" role="status">
        {notice || `Turno de ${COLORS[chess.turn()]}`}
      </span>
    </div>
  );
}
