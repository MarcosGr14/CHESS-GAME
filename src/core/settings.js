import { UNDO_COSTS } from './economy.js';

export const DEFAULT_SETTINGS = {
  theme: 'light',
  showLegal: true,
  autoFlip: false,
  flipped: false,
  colorblind: false,
  botUndoCost: 5,
};
export function validateSettings(value) {
  if (value && value.botUndoCost === undefined)
    value = { ...value, botUndoCost: 5 };
  if (
    !value ||
    !['light', 'dark'].includes(value.theme) ||
    ['showLegal', 'autoFlip', 'flipped', 'colorblind'].some(
      (key) => typeof value[key] !== 'boolean',
    ) ||
    !UNDO_COSTS.includes(value.botUndoCost)
  )
    throw new Error('Ajustes no válidos.');
  return Object.fromEntries(
    Object.keys(DEFAULT_SETTINGS).map((key) => [key, value[key]]),
  );
}
