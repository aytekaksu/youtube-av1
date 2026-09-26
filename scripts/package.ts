// Package only the compiled extension and its user-facing files.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(path.join(root, 'manifest.json'), 'utf8')) as { version: string };
const output = path.resolve(process.argv[2] ?? path.join(root, 'work/packages'));
const names = [
  'manifest.json', 'INSTALL.txt', 'LICENSE', 'NOTICE.md',
  'assets/logo.svg', ...[16, 32, 48, 128].map(size => `assets/icon-${size}.png`),
  'popup/popup.html', 'popup/popup.css', 'popup/popup.js',
  'src/background.js', 'src/force-av1.js', 'src/reset-av1.js'
];
const files: Record<string, Uint8Array> = {};
for (const name of names) files[`youtube-av1/${name}`] = readFileSync(path.join(root, name));
mkdirSync(output, { recursive: true });
const archive = path.join(output, `youtube-av1-${manifest.version}.zip`);
writeFileSync(archive, zipSync(files, { level: 6 }));
console.log(archive);
