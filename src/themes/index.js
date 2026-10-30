import { getShopItem } from '../data/shopItems';
import { DEFAULT_BOARD, DEFAULT_PIECES } from '../core/shop';

const pieceAssets = import.meta.glob('./pieces/*/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});
const boardAssets = import.meta.glob('./boards/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});

export function getPieceAsset(setId, type, color) {
  const item = getShopItem(setId);
  const folder =
    item?.categoria === 'piezas'
      ? item.assetFolder
      : getShopItem(DEFAULT_PIECES).assetFolder;
  return pieceAssets[`./pieces/${folder}/${color}-${type}.svg`];
}

export function getBoardStyle(boardId, colorblind = false) {
  const selected = getShopItem(boardId);
  const board =
    selected?.categoria === 'tableros' ? selected : getShopItem(DEFAULT_BOARD);
  const style = {
    ...board.tokens,
    '--board-light-texture': 'none',
    '--board-dark-texture': 'none',
  };
  for (const [tone, filename] of Object.entries(board.textures || {})) {
    style[`--board-${tone}-texture`] =
      `url("${boardAssets[`./boards/${filename}`]}")`;
  }
  if (colorblind)
    Object.assign(style, {
      '--board-light': '#eee8d6',
      '--board-dark': '#4e7084',
      '--board-edge': '#304955',
      '--coordinate-dark': '#294557',
      '--coordinate-light': '#fff8e8',
      '--legal': '#102e3a',
      '--last': '#f0c951',
      '--board-light-texture': 'none',
      '--board-dark-texture': 'none',
    });
  return style;
}
