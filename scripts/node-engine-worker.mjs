import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// Test-only transport: the exact npm WASM build speaks the same UCI protocol.
// The browser application always uses a real Web Worker instead of this helper.
export function createNodeEngineWorker() {
  const path = require('stockfish').findEngine('lite-single');
  const process = spawn(globalThis.process.execPath, [path], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let buffer = '';
  let terminated = false;
  const worker = {
    onmessage: null,
    onerror: null,
    onmessageerror: null,
    postMessage: (line) => process.stdin.write(`${line}\n`),
    terminate: () => {
      terminated = true;
      process.kill();
    },
  };
  process.stdout.setEncoding('utf8');
  process.stdout.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) worker.onmessage?.({ data: line });
  });
  process.stdin.on('error', () => {
    if (!terminated) worker.onerror?.({ preventDefault() {} });
  });
  process.on('error', () => worker.onerror?.({ preventDefault() {} }));
  process.on('exit', () => {
    if (!terminated) worker.onerror?.({ preventDefault() {} });
  });
  return worker;
}
