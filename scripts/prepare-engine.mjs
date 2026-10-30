import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const destination = new URL('public/engine/', root);
await mkdir(destination, { recursive: true });
for (const filename of [
  'stockfish-19-lite-single.js',
  'stockfish-19-lite-single.wasm',
]) {
  await copyFile(
    new URL(`node_modules/stockfish/bin/${filename}`, root),
    new URL(filename, destination),
  );
}
await copyFile(
  new URL('src/engine/stockfish.worker.js', root),
  new URL('stockfish.worker.js', destination),
);
await copyFile(
  new URL('node_modules/stockfish/Copying.txt', root),
  new URL('COPYING.txt', destination),
);
await writeFile(
  new URL('SOURCE.txt', destination),
  'Stockfish.js 19.0.1 — GPL-3.0\nUnmodified lite single-threaded JS and WASM from the stockfish npm package.\nCorresponding source and build instructions: https://github.com/nmrugg/stockfish.js/tree/v19.0.1\nStockfish authors: https://github.com/nmrugg/stockfish.js/blob/v19.0.1/AUTHORS\nLicense: ./COPYING.txt\n',
);
console.log(
  `Stockfish lite de un hilo preparado en ${fileURLToPath(destination)}`,
);
