import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProfileStore } from '../store/profileStore';
import RewardSummary from '../components/RewardSummary';
import {
  COLORS,
  TIME_CONTROLS,
  PIECE_NAMES,
  exportPgn,
  getClock,
  materialBalance,
  restoreChess,
} from '../core/game';
import { downloadFile } from '../core/download';
import { useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';
import Board from '../components/Board';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import MoveList from '../components/MoveList';
import PlayerBar from '../components/PlayerBar';
import Piece from '../components/Piece';
import NewGameForm from '../components/NewGameForm';
import { getBot, otherColor } from '../core/bots';
import { retryEngine, useEngineStore } from '../engine/useBotOpponent';
import { getShopItem } from '../data/shopItems';

export default function Play() {
  const game = useGameStore();
  const settings = useSettingsStore();
  const coins = useProfileStore((state) => state.wallet.balance);
  const equipped = useProfileStore((state) => state.collection.equipped);
  const engine = useEngineStore();
  const bot = getBot(game.botId);
  const isBot = game.mode === 'bot';
  const engineError = engine.gameId === game.id ? engine.error : '';
  const { initialFen, moves } = game;
  const chess = useMemo(
    () => restoreChess({ initialFen, moves }),
    [initialFen, moves],
  );
  const [now, setNow] = useState(Date.now());
  const [modal, setModal] = useState(null);
  const [promotion, setPromotion] = useState(null);
  const turn = chess.turn();
  const botTurn = isBot && turn !== game.humanColor;
  const resigningColor = isBot ? game.humanColor : turn;
  const canUndo = isBot
    ? !game.result &&
      coins >= settings.botUndoCost &&
      game.moves.some((move) => move.color === game.humanColor)
    : !!game.moves.length;
  const flipped = isBot
    ? (game.humanColor === 'b') !== settings.flipped
    : settings.autoFlip
      ? (turn === 'b') !== settings.flipped
      : settings.flipped;
  const clocks = getClock(game, now);
  const balance = materialBalance(chess);
  const control = TIME_CONTROLS.find((item) => item.id === game.timeControl);
  const top = flipped ? 'w' : 'b';
  const bottom = flipped ? 'b' : 'w';
  const active = !game.paused && !game.result;

  useEffect(() => {
    const tick = () => {
      setNow(Date.now());
      useGameStore.getState().checkTimeout();
    };
    tick();
    if (
      game.timeControl === 'unlimited' ||
      game.paused ||
      game.result ||
      !game.started
    )
      return;
    const interval = setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [game.timeControl, game.paused, game.result, game.started, game.lastTick]);
  useEffect(() => {
    if (game.result) {
      setPromotion(null);
      setModal('result');
    }
  }, [game.result]);

  function requestMove(from, to) {
    if (game.paused || game.result || botTurn) return;
    const options = chess
      .moves({ square: from, verbose: true })
      .filter((move) => move.to === to);
    if (options.some((move) => move.promotion)) setPromotion({ from, to });
    else game.move({ from, to });
  }
  function exportGame() {
    downloadFile(
      `enroque-${game.createdAt.slice(0, 10)}.pgn`,
      exportPgn(game),
      'application/x-chess-pgn',
    );
  }
  function closeModal() {
    if (modal === 'draw') game.respondDraw(false);
    setModal(null);
  }
  const status = game.result
    ? game.result.winner
      ? `${COLORS[game.result.winner]} ganan · ${game.result.label}`
      : game.result.label
    : game.paused
      ? 'Partida en pausa'
      : chess.isCheck()
        ? `${COLORS[turn]} están en jaque`
        : botTurn
          ? engine.status === 'loading'
            ? `Preparando a ${bot.name}…`
            : `${bot.name} está pensando…`
          : isBot
            ? 'Tu turno'
            : `Turno de ${COLORS[turn].toLowerCase()}`;

  return (
    <>
      <header className="page-heading">
        <div>
          <div className="breadcrumb">Tu espacio para el ajedrez</div>
          <h1>
            Sala de juego<span className="title-period">.</span>
          </h1>
          <p>Una buena partida empieza con un movimiento.</p>
        </div>
        <button className="button primary" onClick={() => setModal('new')}>
          <Icon name="plus" size={18} /> Nueva partida
        </button>
      </header>
      <div className="play-layout">
        <section
          className="board-column"
          aria-label={isBot ? `Partida contra ${bot.name}` : 'Partida local'}
        >
          <div className="board-meta">
            <span>
              <Icon name={isBot ? 'board' : 'users'} size={16} />{' '}
              {isBot
                ? `Contra ${bot.name} · Nivel ${bot.level}`
                : '1 vs. 1 local'}
            </span>
            <span>
              <Icon name="clock" size={15} /> {control.label}
            </span>
          </div>
          <PlayerBar
            detail={
              isBot
                ? top === game.humanColor
                  ? undefined
                  : `Nivel ${bot.level} · ≈${bot.elo} Elo`
                : undefined
            }
            thinking={botTurn && top !== game.humanColor && active}
            color={top}
            name={game.names[top]}
            active={active && turn === top}
            milliseconds={clocks[top]}
            timed={game.timeControl !== 'unlimited'}
            moves={game.moves}
            advantage={top === 'w' ? balance : -balance}
          />
          <div className="board-container">
            <Board
              chess={chess}
              flipped={flipped}
              showLegal={settings.showLegal}
              colorblind={settings.colorblind}
              disabled={game.paused || !!game.result || !!promotion || botTurn}
              lastMove={game.moves.at(-1)}
              onMove={requestMove}
            />
            {game.paused && (
              <div className="board-pause">
                <Icon name="pause" size={30} />
                <h2>{engineError ? 'Una pequeña pausa.' : 'Sin prisa.'}</h2>
                <p>
                  {engineError
                    ? 'Recarga el motor para continuar.'
                    : 'La partida te espera.'}
                </p>
                <button
                  className="button primary"
                  onClick={engineError ? retryEngine : game.togglePause}
                >
                  <Icon name="play" size={16} />{' '}
                  {engineError ? 'Reintentar motor' : 'Reanudar partida'}
                </button>
              </div>
            )}
          </div>
          <PlayerBar
            detail={
              isBot
                ? bottom === game.humanColor
                  ? undefined
                  : `Nivel ${bot.level} · ≈${bot.elo} Elo`
                : undefined
            }
            thinking={botTurn && bottom !== game.humanColor && active}
            color={bottom}
            name={game.names[bottom]}
            active={active && turn === bottom}
            milliseconds={clocks[bottom]}
            timed={game.timeControl !== 'unlimited'}
            moves={game.moves}
            advantage={bottom === 'w' ? balance : -balance}
          />
          <div className="board-toolbar">
            <button
              className="toolbar-button"
              onClick={game.undo}
              disabled={!canUndo}
              title={
                isBot
                  ? game.result
                    ? 'El resultado ya está registrado'
                    : coins < settings.botUndoCost
                      ? `Necesitas ${settings.botUndoCost} monedas; tienes ${coins}`
                      : `Recuperar tu turno por ${settings.botUndoCost} monedas`
                  : 'Deshacer la última jugada'
              }
            >
              <Icon name="undo" size={18} />
              <span>
                Deshacer
                {isBot && settings.botUndoCost > 0
                  ? ` · ${settings.botUndoCost}`
                  : ''}
              </span>
            </button>
            <button
              className="toolbar-button"
              onClick={() => settings.update('flipped', !settings.flipped)}
            >
              <Icon name="flip" size={18} />
              <span>Girar tablero</span>
            </button>
            <button
              className="toolbar-button"
              onClick={game.togglePause}
              disabled={(!game.started && !isBot) || !!game.result}
            >
              <Icon name={game.paused ? 'play' : 'pause'} size={18} />
              <span>{game.paused ? 'Reanudar' : 'Pausar'}</span>
            </button>
            <button
              className="toolbar-button export-toolbar"
              onClick={exportGame}
            >
              <Icon name="download" size={18} />
              <span>PGN</span>
            </button>
          </div>
          {isBot && !game.result && settings.botUndoCost > 0 && (
            <div className="undo-cost-note">
              <span>
                Deshacer: {settings.botUndoCost} monedas · Saldo: {coins}
              </span>
              <Link to="/ajustes">Configurar</Link>
            </div>
          )}
          <div className="board-footnote">
            <Icon name="info" size={15} />
            <span>
              {botTurn && active
                ? 'Tu rival prepara su jugada. Puedes pausar o deshacer.'
                : 'Toca una pieza y su destino, o arrástrala para mover.'}
            </span>
          </div>
          <div className="play-skin-summary">
            <span>
              {getShopItem(equipped.board).nombre} ·{' '}
              {getShopItem(equipped.pieces).nombre}
              {settings.colorblind ? ' · Alto contraste activo' : ''}
            </span>
            <Link to="/tienda">Cambiar estilos</Link>
          </div>
        </section>
        <aside className="game-rail" aria-label="Detalles de la partida">
          <section className="game-status">
            <div className="section-heading">
              <h2>La partida</h2>
              <span className="small muted">
                {isBot ? `Nivel ${bot.level}` : 'Local'}
              </span>
            </div>
            <div
              className={`status-line ${chess.isCheck() && !game.result ? 'status-check' : ''}`}
              role="status"
            >
              <span
                className={`status-piece ${turn === 'w' ? 'status-white' : ''}`}
              />
              {status}
            </div>
            <p>
              {game.result
                ? 'Cada final es el comienzo de otra partida.'
                : game.paused
                  ? 'El tablero y ambos relojes están detenidos.'
                  : botTurn
                    ? bot.personality
                    : game.started
                      ? `Jugada ${Math.floor(game.moves.length / 2) + 1}. El tablero es tuyo.`
                      : 'El tablero está listo. Las blancas tienen la primera palabra.'}
            </p>
            {game.result && (
              <button
                className="text-button"
                onClick={() => setModal('result')}
              >
                Ver resultado <Icon name="arrow" size={15} />
              </button>
            )}
          </section>
          {engineError && (
            <div className="engine-error" role="alert">
              <Icon name="info" size={18} />
              <p>{engineError}</p>
              <button className="button secondary" onClick={retryEngine}>
                Reintentar motor
              </button>
            </div>
          )}
          <MoveList moves={game.moves} />
          <div className="game-actions">
            {!isBot && (
              <button
                className="button secondary"
                disabled={!!game.result || game.paused}
                onClick={() => {
                  game.offerDraw();
                  setModal('draw');
                }}
              >
                <Icon name="hand" size={17} /> Ofrecer tablas
              </button>
            )}
            <button
              className="button secondary"
              disabled={!!game.result || game.paused}
              onClick={() => setModal('resign')}
            >
              <Icon name="flag" size={17} /> Rendirse
            </button>
          </div>
          <section className="table-note">
            <span className="note-heading">
              <Icon name="shield" size={17} /> Tu partida, a salvo
            </span>
            <p>
              Guardamos cada movimiento en este navegador. Puedes volver cuando
              quieras.
            </p>
            {game.timeControl !== 'unlimited' &&
              game.started &&
              !game.paused &&
              !game.result && (
                <p>
                  El reloj sigue al salir. Pausa antes de tomarte un descanso.
                </p>
              )}
            <span className="save-indicator">
              <span /> Guardado automático local
            </span>
          </section>
        </aside>
      </div>
      {modal === 'new' && (
        <Modal title="Una nueva partida" onClose={closeModal}>
          <NewGameForm
            current={game}
            onStart={(time, names, options) => {
              if (game.newGame(time, names, options)) {
                if (options.mode === 'bot') settings.update('flipped', false);
                setModal(null);
              }
            }}
          />
        </Modal>
      )}
      {promotion && (
        <Modal title="Elige tu nueva pieza" onClose={() => setPromotion(null)}>
          <p className="muted">
            Tu peón ha llegado al otro lado. ¿En qué se convierte?
          </p>
          <div className="promotion-options">
            {['q', 'r', 'b', 'n'].map((piece) => (
              <button
                className="promotion-option"
                key={piece}
                onClick={() => {
                  game.move({ ...promotion, promotion: piece });
                  setPromotion(null);
                }}
              >
                <Piece type={piece} color={turn} />
                <span>{PIECE_NAMES[piece]}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {modal === 'resign' && (
        <Modal title="¿Terminar esta partida?" onClose={closeModal}>
          <p>
            Las {COLORS[resigningColor].toLowerCase()} se rendirán y las{' '}
            {COLORS[otherColor(resigningColor)].toLowerCase()} ganarán la
            partida.
          </p>
          <div className="modal-actions">
            <button className="button secondary" onClick={closeModal}>
              Seguir jugando
            </button>
            <button
              className="button danger"
              onClick={() => {
                game.resign();
                setModal(null);
              }}
            >
              Confirmar rendición
            </button>
          </div>
        </Modal>
      )}
      {modal === 'draw' && (
        <Modal title="Una propuesta de tablas" onClose={closeModal}>
          <p>
            Las {COLORS[game.drawOffer || turn].toLowerCase()} proponen terminar
            en empate. La decisión es de su rival.
          </p>
          <p className="muted small">
            El reloj sigue en marcha hasta que se acepte la propuesta.
          </p>
          <div className="modal-actions">
            <button className="button secondary" onClick={closeModal}>
              Rechazar y seguir
            </button>
            <button
              className="button primary"
              onClick={() => {
                game.respondDraw(true);
                setModal(null);
              }}
            >
              Aceptar tablas
            </button>
          </div>
        </Modal>
      )}
      {modal === 'result' && game.result && (
        <Modal
          title={
            game.result.winner
              ? isBot
                ? game.result.winner === game.humanColor
                  ? 'Victoria para ti'
                  : `${bot.name} gana esta vez`
                : `Ganan las ${COLORS[game.result.winner].toLowerCase()}`
              : 'Una partida en tablas'
          }
          onClose={closeModal}
        >
          <div className="result-piece">
            <Piece type="k" color={game.result.winner || 'w'} />
          </div>
          <p className="result-reason">{game.result.label}</p>
          <RewardSummary game={game} />
          <p className="muted centered">
            {game.moves.length} movimientos sobre el tablero.
            <br />
            Siempre hay algo que llevarse de una partida.
          </p>
          <div className="modal-actions">
            <button className="button secondary" onClick={exportGame}>
              <Icon name="download" size={16} /> Guardar PGN
            </button>
            <button className="button primary" onClick={() => setModal('new')}>
              Volver a jugar <Icon name="arrow" size={16} />
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
