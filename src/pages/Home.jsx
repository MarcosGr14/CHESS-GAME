import { Link } from 'react-router-dom';
import { restoreChess, TIME_CONTROLS } from '../core/game';
import { useGameStore } from '../store/gameStore';
import Icon from '../components/Icon';
import Piece from '../components/Piece';
import { getBot } from '../core/bots';

export default function Home() {
  const game = useGameStore();
  const chess = restoreChess(game);
  const ongoing = game.moves.length > 0 && !game.result;
  const bot = getBot(game.botId);
  return (
    <>
      <header className="page-heading">
        <div>
          <div className="breadcrumb">El placer de una buena partida</div>
          <h1>
            Un momento para el ajedrez<span className="title-period">.</span>
          </h1>
          <p>Una mesa para dos o un rival a tu medida.</p>
        </div>
      </header>
      <div className="home-layout">
        <section className="home-main">
          <div className="home-copy">
            <span className="small muted">
              {bot
                ? `Contra ${bot.name} · En tu dispositivo`
                : 'Dos personas · Un mismo dispositivo'}
            </span>
            <h2>
              {ongoing
                ? 'La siguiente jugada te espera.'
                : 'Siéntate. Tu tablero está listo.'}
            </h2>
            <p>
              {ongoing
                ? `La partida entre ${game.names.w} y ${game.names.b} sigue aquí, tal como la dejaste.`
                : 'Juega con alguien en la misma pantalla o elige entre diez rivales de distintos niveles en Nueva partida.'}
            </p>
            <Link className="button primary" to="/jugar">
              {ongoing ? 'Continuar partida' : 'Ir al tablero'}
              <Icon name="arrow" size={18} />
            </Link>
          </div>
          <Link
            to="/jugar"
            className="home-board-link"
            aria-label="Abrir el tablero actual"
          >
            <div className="mini-board" aria-hidden="true">
              {chess.board().flatMap((row, rowIndex) =>
                row.map((piece, colIndex) => (
                  <div
                    className={`mini-square ${(rowIndex + colIndex) % 2 ? 'dark' : 'light'}`}
                    key={`${rowIndex}-${colIndex}`}
                  >
                    {piece && <Piece type={piece.type} color={piece.color} />}
                  </div>
                )),
              )}
            </div>
          </Link>
        </section>
        <aside className="home-aside">
          <h2>Sobre la mesa</h2>
          <dl className="game-summary">
            <div>
              <dt>Modalidad</dt>
              <dd>{bot ? `Contra ${bot.name}` : '1 vs. 1 local'}</dd>
            </div>
            <div>
              <dt>Ritmo</dt>
              <dd>
                {
                  TIME_CONTROLS.find((item) => item.id === game.timeControl)
                    .label
                }
              </dd>
            </div>
            <div>
              <dt>Movimientos</dt>
              <dd>{game.moves.length}</dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>
                {game.result
                  ? 'Finalizada'
                  : game.paused
                    ? 'En pausa'
                    : ongoing
                      ? 'En curso'
                      : 'Lista para jugar'}
              </dd>
            </div>
          </dl>
          <div className="home-guide">
            <Icon name="book" size={24} />
            <h3>Primero, lo esencial.</h3>
            <p>Repasa los movimientos, las reglas y cómo usar el tablero.</p>
            <Link className="text-button" to="/guia">
              Abrir guía rápida <Icon name="arrow" size={16} />
            </Link>
          </div>
        </aside>
      </div>
      <div className="home-bottom">
        <Icon name="shield" size={20} />
        <p>
          <strong>Una partida que se queda contigo.</strong>
          <br />
          El progreso se guarda en este navegador. Exporta una copia desde
          Ajustes para llevarlo a otro dispositivo.
        </p>
      </div>
    </>
  );
}
