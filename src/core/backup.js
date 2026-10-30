import { getClock, validateGame } from './game.js';
import { validateSettings } from './settings.js';
import { validateOpponents } from './bots.js';
import { validateProfile } from './profile.js';

export function validateBackup(value) {
  if (
    !value ||
    value.app !== 'enroque' ||
    ![1, 2, 3].includes(value.schemaVersion)
  )
    throw new Error('La copia no es compatible con esta versión de Enroque.');
  return {
    game: validateGame(value.game),
    settings: validateSettings(value.settings),
    opponents:
      value.schemaVersion >= 2 ? validateOpponents(value.opponents) : null,
    profile: value.schemaVersion >= 3 ? validateProfile(value.profile) : null,
  };
}

export function createBackup({
  game,
  settings,
  opponents,
  profile,
  exportedAt,
}) {
  if (!Number.isFinite(Date.parse(exportedAt)))
    throw new Error('Fecha de respaldo no válida.');
  const frozen = {
    ...game,
    remaining: getClock(game, Date.parse(exportedAt)),
    lastTick: null,
    paused:
      (game.started || game.mode === 'bot') && !game.result
        ? true
        : game.paused,
  };
  const backup = {
    app: 'enroque',
    schemaVersion: 3,
    exportedAt,
    game: frozen,
    settings,
    opponents,
    profile,
  };
  return {
    app: 'enroque',
    schemaVersion: 3,
    exportedAt,
    ...validateBackup(backup),
  };
}
