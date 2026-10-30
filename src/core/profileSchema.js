import { createCollection } from './shop';

export const PROFILE_SCHEMA_VERSION = 2;

export function migrateProfile(value) {
  if (value?.schemaVersion === 1)
    return { ...value, schemaVersion: 2, collection: createCollection() };
  return value;
}
