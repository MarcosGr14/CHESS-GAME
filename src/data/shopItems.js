// A new skin needs only its JSON definition and original SVG files.
const definitions = import.meta.glob('../themes/{boards,pieces}/*.json', {
  eager: true,
  import: 'default',
});

export const SHOP_ITEMS = Object.values(definitions).sort(
  (a, b) => a.categoria.localeCompare(b.categoria) || a.precio - b.precio,
);
export const BOARD_ITEMS = SHOP_ITEMS.filter(
  (item) => item.categoria === 'tableros',
);
export const PIECE_ITEMS = SHOP_ITEMS.filter(
  (item) => item.categoria === 'piezas',
);
export const getShopItem = (id) =>
  SHOP_ITEMS.find((item) => item.id === id) || null;
export const RARITY_LABELS = Object.freeze({
  común: 'Común',
  raro: 'Raro',
  épico: 'Épico',
  legendario: 'Legendario',
});
