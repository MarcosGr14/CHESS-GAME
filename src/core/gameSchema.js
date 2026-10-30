export const GAME_SCHEMA_VERSION = 3;

export function migrateGame(value) {
  if (value?.schemaVersion === 1) {
    value = {
      ...value,
      schemaVersion: 2,
      id: `legacy-${value.createdAt}`,
      mode: 'local',
      botId: null,
      humanColor: 'w',
    };
  }
  if (value?.schemaVersion === 2)
    return {
      ...value,
      schemaVersion: 3,
      progressTracking: !value.result,
      finishedAt: value.result ? value.createdAt : null,
    };
  return value;
}
