// Classic Worker bootstrap, copied next to the npm engine by prepare-engine.mjs.
// The hash carries the exact WASM URL; Stockfish.js reads it before initializing.
self.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
  self.postMessage({ type: 'engine-error' });
});
importScripts(
  new URL('./stockfish-19-lite-single.js', self.location.href).href,
);
