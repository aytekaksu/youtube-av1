import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file: string): string => readFileSync(path.join(root, file), 'utf8');
const manifest = JSON.parse(read('manifest.json')) as {
  manifest_version: number; version: string; permissions: string[];
  host_permissions: string[]; background: { service_worker: string };
  action: { default_popup: string; default_icon: Record<string, string> };
  icons: Record<string, string>;
};
const pkg = JSON.parse(read('package.json')) as { version: string; devDependencies: { typescript: string } };
const compiler = JSON.parse(read('node_modules/typescript/package.json')) as { version: string };
assert.equal(manifest.version, pkg.version);
assert.equal(compiler.version, pkg.devDependencies.typescript);
for (const file of ['src/background', 'src/force-av1', 'src/reset-av1', 'popup/popup']) {
  assert.ok(existsSync(path.join(root, `${file}.ts`)), `Missing TypeScript source: ${file}`);
  new vm.Script(read(`${file}.js`), { filename: `${file}.js` });
}
for (const file of ['src/force-av1.js', 'src/reset-av1.js']) {
  assert.ok(read(file).includes(`'${manifest.version}'`), `Stale compiled version: ${file}`);
}
assert.equal(manifest.manifest_version, 3);
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
assert.deepEqual(manifest.permissions, ['storage', 'scripting']);
assert.deepEqual(manifest.host_permissions, [
  'https://www.youtube.com/*', 'https://m.youtube.com/*', 'https://www.youtube-nocookie.com/*'
]);
for (const file of [
  manifest.background.service_worker, manifest.action.default_popup,
  'src/force-av1.js', 'src/reset-av1.js', 'popup/popup.js', 'popup/popup.css', 'assets/logo.svg',
  ...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon)
]) assert.ok(existsSync(path.join(root, file)), `Missing asset: ${file}`);
for (const [size, file] of Object.entries(manifest.icons)) {
  const png = readFileSync(path.join(root, file));
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), Number(size));
  assert.equal(png.readUInt32BE(20), Number(size));
}
for (const file of ['README.md', 'CONTRIBUTING.md', 'PRIVACY.md', 'NOTICE.md']) {
  const body = read(file);
  for (const match of body.matchAll(/\]\(([^)]+)\)|(?:src|href)="([^"]+)"/g)) {
    const link = match[1] ?? match[2];
    if (!link || /^(?:https?:|#|mailto:)/.test(link)) continue;
    assert.ok(existsSync(path.resolve(root, path.dirname(file), link.split('#')[0] ?? '')),
      `Broken local reference in ${file}: ${link}`);
  }
  assert.ok(!body.includes('/Users/'), `Private local path in ${file}`);
}
assert.match(read('LICENSE'), /MIT License/);
assert.match(read('.github/CODEOWNERS'), /^\* @aytekaksu$/m);
console.log('PASS: compiled classic scripts, pinned compiler, versions, manifest, assets, documentation, license, and code owner.');
