import { getBoardStyle } from '../themes';
import Piece from './Piece';

// Read-only presentation: trying a skin never moves or replaces the saved game.
export default function SkinBoard({
  position,
  boardId,
  pieceSetId,
  className = '',
}) {
  return (
    <div
      className={`board-frame skin-board ${className}`}
      style={getBoardStyle(boardId)}
      data-board-theme={boardId}
      role="img"
      aria-label="Vista previa del tablero y las piezas; conserva tu posición actual"
    >
      <div className="skin-board-grid" aria-hidden="true">
        {position.flatMap((row, rowIndex) =>
          row.map((piece, colIndex) => (
            <div
              className={`skin-square ${(rowIndex + colIndex) % 2 ? 'dark' : 'light'}`}
              key={`${rowIndex}-${colIndex}`}
            >
              {piece && (
                <Piece
                  type={piece.type}
                  color={piece.color}
                  setId={pieceSetId}
                />
              )}
              {colIndex === 0 && (
                <span className="rank-coordinate">{8 - rowIndex}</span>
              )}
              {rowIndex === 7 && (
                <span className="file-coordinate">{'abcdefgh'[colIndex]}</span>
              )}
            </div>
          )),
        )}
      </div>
    </div>
  );
}

export function SkinSwatch({ item }) {
  if (item.categoria === 'tableros')
    return (
      <div
        className="skin-swatch-board"
        style={getBoardStyle(item.id)}
        aria-hidden="true"
      >
        {Array.from({ length: 32 }, (_, index) => (
          <span
            className={`skin-square ${(Math.floor(index / 8) + (index % 8)) % 2 ? 'dark' : 'light'}`}
            key={index}
          >
            {index === 13 && (
              <Piece type="n" color="b" setId="pieces-classic" />
            )}
            {index === 18 && (
              <Piece type="k" color="w" setId="pieces-classic" />
            )}
          </span>
        ))}
      </div>
    );
  return (
    <div className="skin-swatch-pieces" aria-hidden="true">
      {['w', 'b'].flatMap((color) =>
        ['k', 'n', 'q'].map((type) => (
          <Piece
            key={`${color}-${type}`}
            color={color}
            type={type}
            setId={item.id}
          />
        )),
      )}
    </div>
  );
}
