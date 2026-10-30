import { formatClock } from '../core/game';
import Icon from './Icon';
import Piece from './Piece';

export default function PlayerBar({
  color,
  name,
  active,
  milliseconds,
  timed,
  moves,
  advantage,
  detail,
  thinking = false,
}) {
  const captures = moves
    .filter((move) => move.color === color && move.captured)
    .map((move) => move.captured)
    .sort((a, b) => 'qrbnp'.indexOf(a) - 'qrbnp'.indexOf(b));
  return (
    <div className={`player-bar ${active ? 'player-active' : ''}`}>
      <div className={`player-symbol player-symbol-${color}`}>
        <Piece type="k" color={color} />
      </div>
      <div className="player-info">
        <div className="player-name">
          {name}
          <span
            className={`turn-dot ${active ? 'on' : ''}`}
            aria-hidden="true"
          />
        </div>
        <div className="player-detail">
          {captures.length ? (
            <span
              className="captured-pieces"
              aria-label={`Piezas capturadas: ${captures.length}`}
            >
              {captures.map((type, index) => (
                <Piece
                  key={`${type}-${index}`}
                  type={type}
                  color={color === 'w' ? 'b' : 'w'}
                />
              ))}
            </span>
          ) : (
            <span>
              {thinking
                ? 'Pensando…'
                : detail ||
                  (color === 'w' ? 'Piezas blancas' : 'Piezas negras')}
            </span>
          )}
          {advantage > 0 && (
            <span
              className="material-advantage"
              aria-label={`Ventaja de material: ${advantage}`}
            >
              +{advantage}
            </span>
          )}
        </div>
      </div>
      <div
        className={`player-clock ${active ? 'clock-active' : ''} ${timed && milliseconds < 30000 ? 'clock-low' : ''}`}
        aria-label={
          timed
            ? `Tiempo de ${name}: ${formatClock(milliseconds)}`
            : `${name}, sin límite de tiempo`
        }
      >
        <Icon name="clock" size={16} />
        <span>{timed ? formatClock(milliseconds) : '∞'}</span>
      </div>
    </div>
  );
}
