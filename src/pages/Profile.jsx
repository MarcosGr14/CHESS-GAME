import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProfileStore } from '../store/profileStore';
import { useBotStore } from '../store/botStore';
import { BOTS, getBot, isBotUnlocked } from '../core/bots';
import { getLevelProgress, getRank, RANKS } from '../core/xp';
import { OUTCOME_LABELS } from '../core/rewards';
import { formatNumber, formatLocalDate } from '../lib/dates';
import Piece from '../components/Piece';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import XPProgress from '../components/XPProgress';

export default function Profile() {
  const profile = useProfileStore();
  const defeated = useBotStore((state) => state.defeatedBots);
  const progress = getLevelProgress(profile.xp);
  const rank = getRank(progress.level);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [error, setError] = useState('');
  const stats = [
    { label: 'Partidas', value: profile.stats.games },
    { label: 'Victorias', value: profile.stats.wins },
    { label: 'Derrotas', value: profile.stats.losses },
    { label: 'Tablas', value: profile.stats.draws },
    { label: 'Racha actual', value: profile.stats.streak, unit: 'victorias' },
    {
      label: 'Mejor racha',
      value: profile.stats.bestStreak,
      unit: 'victorias',
    },
  ];
  return (
    <>
      <header className="page-heading">
        <div>
          <div className="breadcrumb">Cada partida deja huella</div>
          <h1>
            Tu recorrido<span className="title-period">.</span>
          </h1>
          <p>El tablero cambia. Lo que aprendes se queda contigo.</p>
        </div>
        <Link to="/jugar" className="button primary">
          Ir a jugar <Icon name="arrow" size={17} />
        </Link>
      </header>
      <div className="profile-overview">
        <section className="profile-identity">
          <div className="profile-intro">
            <div className="rank-portrait">
              <Piece type={rank.piece} color="w" />
            </div>
            <div>
              <span className="small muted">Rango {rank.name}</span>
              <h2>{profile.name}</h2>
              <button
                className="text-button"
                onClick={() => {
                  setName(profile.name);
                  setEditing(true);
                  setError('');
                }}
              >
                Cambiar nombre
              </button>
            </div>
          </div>
          <XPProgress xp={profile.xp} />
          <div className="profile-total-xp">
            <span>{formatNumber(profile.xp)} XP acumulados</span>
            <span>
              {
                BOTS.filter((bot) =>
                  isBotUnlocked(bot, defeated, progress.level),
                ).length
              }{' '}
              de 10 rivales disponibles
            </span>
          </div>
        </section>
        <section className="profile-wallet" aria-labelledby="wallet-title">
          <div className="profile-wallet-heading">
            <h2 id="wallet-title">Tu monedero</h2>
            <Icon name="coin" size={20} />
          </div>
          <strong className="wallet-balance">
            {formatNumber(profile.wallet.balance)}
            <small>monedas</small>
          </strong>
          <dl>
            <div>
              <dt>Ganadas</dt>
              <dd>{formatNumber(profile.wallet.earned)}</dd>
            </div>
            <div>
              <dt>Gastadas</dt>
              <dd>{formatNumber(profile.wallet.spent)}</dd>
            </div>
          </dl>
          <p>
            Gana monedas al vencer o empatar contra bots. Puedes usarlas para
            recuperar tu turno.
          </p>
        </section>
      </div>
      <div className="profile-record">
        <section className="profile-statistics" aria-labelledby="stats-title">
          <div className="section-heading">
            <h2 id="stats-title">Tu juego, en números</h2>
            <span className="small muted">Contra bots</span>
          </div>
          <dl className="stats-grid">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt>{stat.label}</dt>
                <dd>
                  {formatNumber(stat.value)}
                  {stat.unit && (
                    <small>{stat.value === 1 ? 'victoria' : stat.unit}</small>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="profile-rating">
          <h2>Elo interno</h2>
          <strong>{formatNumber(profile.rating)}</strong>
          <p>Se ajusta al resultado y la fuerza del rival. Empiezas en 800.</p>
          <span>
            {profile.stats.games
              ? `${formatNumber(profile.stats.games)} ${profile.stats.games === 1 ? 'partida registrada' : 'partidas registradas'}`
              : 'Tu primera partida marcará el comienzo.'}
          </span>
        </section>
      </div>
      <section className="rank-journey" aria-labelledby="ranks-title">
        <div className="section-heading">
          <h2 id="ranks-title">De peón a rey</h2>
          <span className="small muted">Tu rango crece con el nivel</span>
        </div>
        <ol>
          {RANKS.map((item) => (
            <li
              key={item.name}
              className={rank.name === item.name ? 'current-rank' : ''}
              aria-current={rank.name === item.name ? 'step' : undefined}
            >
              <Piece type={item.piece} color="w" />
              <strong>{item.name}</strong>
              <span>Nivel {item.minLevel}</span>
              <small>
                {rank.name === item.name
                  ? 'Tu rango'
                  : progress.level >= item.minLevel
                    ? 'Alcanzado'
                    : 'Por alcanzar'}
              </small>
            </li>
          ))}
        </ol>
      </section>
      <section className="profile-history" aria-labelledby="history-title">
        <div className="section-heading">
          <h2 id="history-title">Últimas partidas</h2>
          <span className="small muted">Hasta 20 resultados</span>
        </div>
        {profile.recentGames.length ? (
          <div className="history-table-wrap">
            <table>
              <caption className="sr-only">
                Resultados y recompensas de las últimas partidas contra bots
              </caption>
              <thead>
                <tr>
                  <th>Rival</th>
                  <th>Resultado</th>
                  <th>XP</th>
                  <th>Monedas</th>
                  <th>Elo</th>
                </tr>
              </thead>
              <tbody>
                {profile.recentGames.map((game) => {
                  const delta = game.ratingAfter - game.ratingBefore;
                  return (
                    <tr key={game.gameId}>
                      <td>
                        <strong>{getBot(game.botId).name}</strong>
                        <small>{formatLocalDate(game.completedAt)}</small>
                      </td>
                      <td>{OUTCOME_LABELS[game.outcome]}</td>
                      <td>+{formatNumber(game.xp)}</td>
                      <td>+{formatNumber(game.coins)}</td>
                      <td>
                        {delta > 0 ? '+' : ''}
                        {delta === 0 ? '—' : delta}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="history-empty">
            <Icon name="book" size={25} />
            <div>
              <h3>Tu primera partida abre la planilla.</h3>
              <p>
                Completa una partida contra un bot para registrar tu resultado y
                progreso.
              </p>
              <Link to="/jugar" className="text-button">
                Encontrar un rival <Icon name="arrow" size={15} />
              </Link>
            </div>
          </div>
        )}
      </section>
      <p className="profile-policy">
        Cada partida se registra una sola vez. Las cinco primeras partidas de
        cada día contra el mismo bot pueden dar XP y monedas; las recompensas
        disminuyen al repetir. El modo local no afecta a tu perfil.
      </p>
      {editing && (
        <Modal title="Tu nombre en el club" onClose={() => setEditing(false)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (profile.rename(name)) setEditing(false);
              else setError('Escribe un nombre de entre 1 y 32 caracteres.');
            }}
          >
            <label className="form-label" htmlFor="profile-name">
              Nombre
            </label>
            <input
              id="profile-name"
              maxLength={32}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
            />
            <p className="profile-name-error" role="status">
              {error}
            </p>
            <div className="modal-actions">
              <button
                className="button secondary"
                type="button"
                onClick={() => setEditing(false)}
              >
                Cancelar
              </button>
              <button className="button primary" type="submit">
                Guardar nombre
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
