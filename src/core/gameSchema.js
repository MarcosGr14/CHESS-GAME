export const GAME_SCHEMA_VERSION = 2;

export function migrateGame(value) {
  if (value?.schemaVersion === 1) {
    return {
      ...value,
      schemaVersion: 2,
      id: `legacy-${value.createdAt}`,
      mode: 'local',
      botId: null,
      humanColor: 'w',
    };
  }
  return value;
}
