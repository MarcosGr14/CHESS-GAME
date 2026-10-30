import { useState } from 'react';
import { COLORS, TIME_CONTROLS } from '../core/game';
import {
  BOTS,
  getBot,
  isBotUnlocked,
  otherColor,
  resolveColor,
} from '../core/bots';
import { useBotStore } from '../store/botStore';
import Icon from './Icon';
import Piece from './Piece';

export default function NewGameForm({ current, onStart }) {
  const defeated = useBotStore((state) => state.defeatedBots);
  const [mode, setMode] = useState(current.mode);
  const [control, setControl] = useState(current.timeControl);
  const [names, setNames] = useState(
    current.mode === 'local'
      ? current.names
      : { w: 'Jugador de blancas', b: 'Jugador de negras' },
  );
  const [playerName, setPlayerName] = useState(
    current.mode === 'bot' ? current.names[current.humanColor] : 'Tú',
  );
  const [color, setColor] = useState(
    current.mode === 'bot' ? current.humanColor : 'w',
  );
  const [botId, setBotId] = useState(
    isBotUnlocked(getBot(current.botId), defeated) ? current.botId : BOTS[0].id,
  );
  const bot = getBot(botId);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (mode === 'local')
          onStart(
            control,
            {
              w: names.w.trim() || 'Jugador de blancas',
              b: names.b.trim() || 'Jugador de negras',
            },
            { mode },
          );
        else {
          const humanColor = resolveColor(color);
          onStart(
            control,
            {
              [humanColor]: playerName.trim() || 'Tú',
              [otherColor(humanColor)]: bot.name,
            },
            { mode, botId, humanColor },
          );
        }
      }}
    >
      <div className="mode-options" aria-label="Modalidad de juego">
        {[
          { id: 'local', label: '1 vs. 1 local', icon: 'users' },
          { id: 'bot', label: 'Contra la máquina', icon: 'board' },
        ].map((item) => (
          <button
            type="button"
            key={item.id}
            className={`mode-option ${mode === item.id ? 'chosen' : ''}`}
            aria-pressed={mode === item.id}
            onClick={() => setMode(item.id)}
          >
            <Icon name={item.icon} size={17} />
            {item.label}
          </button>
        ))}
      </div>
      {mode === 'local' ? (
        <>
          <p className="muted">
            Dos personas, un tablero y todas las posibilidades.
          </p>
          <div className="name-fields">
            {['w', 'b'].map((side) => (
              <label key={side}>
                {COLORS[side]}
                <input
                  maxLength={32}
                  value={names[side]}
                  onChange={(event) =>
                    setNames({ ...names, [side]: event.target.value })
                  }
                  autoComplete="off"
                />
              </label>
            ))}
          </div>
        </>
      ) : (
        <div className="bot-setup">
          <label className="form-label" htmlFor="bot-choice">
            Tu rival
          </label>
          <select
            id="bot-choice"
            value={botId}
            onChange={(event) => setBotId(event.target.value)}
          >
            {BOTS.map((item, index) => (
              <option
                key={item.id}
                value={item.id}
                disabled={!isBotUnlocked(item, defeated)}
              >
                {item.name} · Nivel {item.level} · ≈{item.elo} Elo
                {isBotUnlocked(item, defeated)
                  ? defeated.includes(item.id)
                    ? ' · Vencido'
                    : ''
                  : ` · Vence a ${BOTS[index - 1].name}`}
              </option>
            ))}
          </select>
          <div className="bot-introduction">
            <div className="bot-portrait">
              <Piece
                type={bot.level < 4 ? 'n' : bot.level < 8 ? 'r' : 'k'}
                color="b"
              />
            </div>
            <div>
              <strong>
                {bot.name}
                <span>
                  Nivel {bot.level} · ≈{bot.elo} Elo
                </span>
              </strong>
              <p>{bot.personality}</p>
            </div>
          </div>
          <p className="bot-unlock-note">
            Vence a cada rival para desbloquear el siguiente. El Elo es
            orientativo.
          </p>
          <label className="form-label" htmlFor="player-name">
            Tu nombre
          </label>
          <input
            id="player-name"
            maxLength={32}
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            autoComplete="off"
          />
          <fieldset className="color-fieldset">
            <legend>Juegas con</legend>
            <div className="color-options">
              {[
                { id: 'w', label: 'Blancas' },
                { id: 'b', label: 'Negras' },
                { id: 'random', label: 'Al azar' },
              ].map((item) => (
                <label
                  className={`color-option ${color === item.id ? 'chosen' : ''}`}
                  key={item.id}
                >
                  <input
                    type="radio"
                    name="color"
                    value={item.id}
                    checked={color === item.id}
                    onChange={() => setColor(item.id)}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      )}
      <fieldset className="time-fieldset">
        <legend>Ritmo de juego</legend>
        <div className="time-options">
          {TIME_CONTROLS.map((item) => (
            <label
              className={`time-option ${control === item.id ? 'chosen' : ''}`}
              key={item.id}
            >
              <input
                type="radio"
                name="time"
                value={item.id}
                checked={control === item.id}
                onChange={() => setControl(item.id)}
              />
              <span>{item.label}</span>
              <small>{item.detail}</small>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="small muted">
        Minutos por persona + segundos por jugada. El reloj empieza con el
        primer movimiento.
      </p>
      {current.moves.length > 0 && (
        <p className="replacement-note">
          <Icon name="info" size={16} /> La nueva partida reemplazará la actual.
          Puedes guardar antes su PGN.
        </p>
      )}
      <button className="button primary full-width" type="submit">
        {mode === 'bot' ? `Jugar contra ${bot.name}` : 'Comenzar partida'}{' '}
        <Icon name="arrow" size={18} />
      </button>
    </form>
  );
}
