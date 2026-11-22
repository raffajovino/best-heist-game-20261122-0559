// serve.ts — dev-only static server for the game. Run `node serve.ts`, then open
// http://localhost:8080 (the game is plain static files under game/, no build step).
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'game');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };

createServer((req, res) => {
  const path = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const file = join(root, decodeURIComponent(path));
  if (!file.startsWith(root) || !existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(8080, () => console.log('BLUEPRINT — The Halcyon Heist at http://localhost:8080'));
