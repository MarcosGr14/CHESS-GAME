import { getShopItem } from '../data/shopItems';
import { debitWallet } from './economy';

export const DEFAULT_BOARD = 'board-classic';
export const DEFAULT_PIECES = 'pieces-classic';
const slotFor = (item) => (item.categoria === 'tableros' ? 'board' : 'pieces');

export function createCollection() {
  return {
    owned: [DEFAULT_BOARD, DEFAULT_PIECES],
    equipped: { board: DEFAULT_BOARD, pieces: DEFAULT_PIECES },
  };
}

export function validateCollection(value) {
  if (
    !value ||
    !Array.isArray(value.owned) ||
    value.owned.some((id) => !getShopItem(id)) ||
    new Set(value.owned).size !== value.owned.length ||
    ![DEFAULT_BOARD, DEFAULT_PIECES].every((id) => value.owned.includes(id))
  )
    throw new Error('Inventario no válido.');
  const equipped = value.equipped;
  if (
    !equipped ||
    !['board', 'pieces'].every(
      (slot) =>
        value.owned.includes(equipped[slot]) &&
        slotFor(getShopItem(equipped[slot])) === slot,
    )
  )
    throw new Error('Los estilos equipados no pertenecen al inventario.');
  return {
    owned: [...value.owned],
    equipped: { board: equipped.board, pieces: equipped.pieces },
  };
}

// Wallet and ownership form one next profile, persisted with a single store set.
// Only the catalog decides the price; callers supply an item ID, never an amount.
export function purchaseItem(profile, itemId) {
  const item = getShopItem(itemId);
  if (!item) throw new Error('Este artículo no existe.');
  const collection = validateCollection(profile.collection);
  if (collection.owned.includes(itemId))
    throw new Error('Este artículo ya está en tu inventario.');
  const wallet = debitWallet(profile.wallet, item.precio);
  return {
    ...profile,
    wallet,
    collection: { ...collection, owned: [...collection.owned, itemId] },
  };
}

export function equipItem(profile, itemId) {
  const item = getShopItem(itemId);
  if (!item) throw new Error('Este artículo no existe.');
  const collection = validateCollection(profile.collection);
  if (!collection.owned.includes(itemId))
    throw new Error('Primero añade este artículo a tu inventario.');
  const slot = slotFor(item);
  if (collection.equipped[slot] === itemId) return profile;
  return {
    ...profile,
    collection: {
      ...collection,
      equipped: { ...collection.equipped, [slot]: itemId },
    },
  };
}
