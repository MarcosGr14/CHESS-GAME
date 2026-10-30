export const SCHEMA_VERSION = 1;
// The game has its own pure migration, also applied to manual JSON imports.
export { migrateGame } from '../core/gameSchema';

// Accept legacy unwrapped records. Add future schema migrations here in order.
export function migrateRecord(record) {
  if (!record || typeof record !== 'object')
    throw new Error('Guardado no válido.');
  if (record.schemaVersion === undefined && 'state' in record)
    return { schemaVersion: 1, data: record };
  if (record.schemaVersion !== SCHEMA_VERSION)
    throw new Error(
      'Este guardado necesita una versión más reciente de Enroque.',
    );
  return record;
}
