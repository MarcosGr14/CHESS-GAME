import { useRef, useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useGameStore } from '../store/gameStore';
import { createBackup, validateBackup } from '../core/backup';
import { useProfileStore } from '../store/profileStore';
import { localDayKey } from '../lib/dates';
import { UNDO_COSTS } from '../core/economy';
import { downloadFile } from '../core/download';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import { useBotStore } from '../store/botStore';

function Toggle({ title, detail, checked, onChange }) {
  return (
    <label className="toggle-row">
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <input
        className="toggle"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

export default function Settings() {
  const settings = useSettingsStore();
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(null);
  const fileRef = useRef(null);
  function exportBackup() {
    const backup = createBackup({
      game: useGameStore.getState(),
      settings,
      opponents: useBotStore.getState(),
      profile: useProfileStore.getState(),
      exportedAt: new Date().toISOString(),
    });
    downloadFile(
      `enroque-respaldo-${localDayKey(new Date())}.json`,
      JSON.stringify(backup, null, 2),
      'application/json',
    );
    setMessage(
      'Copia exportada con tu perfil, inventario, monedas y partidas. Se restaurará en pausa.',
    );
  }
  async function readBackup(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    try {
      if (file.size > 5000000)
        throw new Error('El archivo debe pesar menos de 5 MB.');
      setPending(validateBackup(JSON.parse(await file.text())));
      setMessage('');
    } catch (error) {
      setMessage(
        error instanceof SyntaxError
          ? 'El archivo no contiene un JSON válido.'
          : error.message,
      );
    }
  }
  return (
    <>
      <header className="page-heading">
        <div>
          <div className="breadcrumb">A tu manera</div>
          <h1>
            Ajustes<span className="title-period">.</span>
          </h1>
          <p>Pequeños detalles para sentirte en tu tablero.</p>
        </div>
        <span className="saved-label">
          <Icon name="check" size={15} /> Cambios automáticos
        </span>
      </header>
      <section className="settings-section">
        <div>
          <h2>Ambiente</h2>
          <p className="muted">La misma calma, con una luz diferente.</p>
        </div>
        <div className="settings-panel">
          <div className="theme-choices">
            {[
              { id: 'light', label: 'Claro', icon: 'sun' },
              { id: 'dark', label: 'Oscuro', icon: 'moon' },
            ].map((theme) => (
              <button
                key={theme.id}
                className={`theme-choice ${settings.theme === theme.id ? 'chosen' : ''}`}
                aria-pressed={settings.theme === theme.id}
                onClick={() => settings.update('theme', theme.id)}
              >
                <Icon name={theme.icon} size={22} />
                <span>{theme.label}</span>
                {settings.theme === theme.id && <Icon name="check" size={16} />}
              </button>
            ))}
          </div>
          <Toggle
            title="Tablero de alto contraste"
            detail="Casillas azules y marfil, con marcas de forma para los movimientos."
            checked={settings.colorblind}
            onChange={(value) => settings.update('colorblind', value)}
          />
        </div>
      </section>
      <section className="settings-section">
        <div>
          <h2>Sobre el tablero</h2>
          <p className="muted">Elige cuánta ayuda necesitas al jugar.</p>
        </div>
        <div className="settings-panel">
          <Toggle
            title="Mostrar movimientos legales"
            detail="Al seleccionar una pieza, verás sus destinos posibles."
            checked={settings.showLegal}
            onChange={(value) => settings.update('showLegal', value)}
          />
          <Toggle
            title="Girar automáticamente"
            detail="En partidas locales, el jugador activo queda abajo. Contra bots, conservas tu lado."
            checked={settings.autoFlip}
            onChange={(value) => settings.update('autoFlip', value)}
          />
        </div>
      </section>
      <section className="settings-section">
        <div>
          <h2>Recuperar tu turno</h2>
          <p className="muted">
            Contra bots, deshacer vuelve a tu última decisión. En partidas
            locales es gratuito.
          </p>
        </div>
        <div className="settings-panel">
          <label htmlFor="undo-cost" className="form-label">
            Costo por deshacer contra bots
          </label>
          <select
            id="undo-cost"
            className="settings-select"
            value={settings.botUndoCost}
            onChange={(event) =>
              settings.update('botUndoCost', Number(event.target.value))
            }
          >
            {UNDO_COSTS.map((cost) => (
              <option value={cost} key={cost}>
                {cost === 0 ? 'Gratis' : `${cost} monedas`}
              </option>
            ))}
          </select>
          <p className="setting-description">
            Se descuenta solo si se puede deshacer. Después de registrar un
            resultado, empieza otra partida para volver a jugar.
          </p>
        </div>
      </section>
      <section className="settings-section">
        <div>
          <h2>Tu guardado</h2>
          <p className="muted">
            La partida y los ajustes viven en este navegador. Una copia JSON
            permite trasladarlos o recuperarlos.
          </p>
        </div>
        <div className="settings-panel">
          <div className="backup-description">
            <Icon name="shield" size={22} />
            <p>
              <strong>Un respaldo para tu tranquilidad.</strong>
              <br />
              <span className="muted">
                Incluye tu perfil, XP, Elo, monedas, inventario, estilos
                equipados y rivales desbloqueados. Las copias se exportan con la
                partida en pausa.
              </span>
            </p>
          </div>
          <div className="backup-actions">
            <button className="button secondary" onClick={exportBackup}>
              <Icon name="download" size={16} /> Exportar copia
            </button>
            <button
              className="button secondary"
              onClick={() => fileRef.current.click()}
            >
              Importar copia
            </button>
            <input
              className="sr-only"
              tabIndex={-1}
              type="file"
              accept=".json,application/json"
              ref={fileRef}
              onChange={readBackup}
              aria-label="Archivo de respaldo JSON"
            />
          </div>
          <p className="settings-message" role="status">
            {message}
          </p>
        </div>
      </section>
      {pending && (
        <Modal title="¿Restaurar esta copia?" onClose={() => setPending(null)}>
          <p>
            Se restaurará una partida con {pending.game.moves.length}{' '}
            {pending.game.moves.length === 1 ? 'movimiento' : 'movimientos'} y
            sus ajustes.{' '}
            {pending.profile
              ? 'También se reemplazará tu perfil completo, incluidas XP, monedas e inventario.'
              : 'Esta copia antigua conservará el perfil y las monedas actuales.'}
          </p>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setPending(null)}
            >
              Cancelar
            </button>
            <button
              className="button primary"
              onClick={() => {
                if (pending.opponents)
                  useBotStore.getState().importOpponents(pending.opponents);
                if (pending.profile)
                  useProfileStore.getState().importProfile(pending.profile);
                useGameStore.getState().importGame(pending.game);
                settings.importSettings(pending.settings);
                setPending(null);
                setMessage(
                  'Copia restaurada. Tu partida está lista en la sala de juego.',
                );
              }}
            >
              Restaurar copia
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
