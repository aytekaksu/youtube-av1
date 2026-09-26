'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const manifest = JSON.parse(read('manifest.json'));
assert.equal(manifest.manifest_version, 3);
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
assert.deepEqual(manifest.permissions, ['storage', 'scripting']);
assert.deepEqual(manifest.host_permissions, [
  'https://www.youtube.com/*',
  'https://m.youtube.com/*',
  'https://www.youtube-nocookie.com/*'
]);
for (const file of [manifest.background.service_worker, manifest.action.default_popup,
  'src/force-av1.js', 'src/reset-av1.js', 'popup/popup.js', 'popup/popup.css', 'assets/logo.svg',
  ...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon)]) {
  assert.ok(fs.existsSync(path.join(root, file)), `Missing asset: ${file}`);
}
for (const folder of ['src', 'popup', 'scripts', 'tests']) {
  for (const file of fs.readdirSync(path.join(root, folder))) {
    if (/\.(?:js|cjs)$/.test(file)) new vm.Script(read(`${folder}/${file}`), { filename: file });
  }
}
for (const [size, file] of Object.entries(manifest.icons)) {
  const png = fs.readFileSync(path.join(root, file));
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), Number(size));
  assert.equal(png.readUInt32BE(20), Number(size));
}
const docs = ['README.md', 'CONTRIBUTING.md', 'PRIVACY.md', 'NOTICE.md', 'docs/how-it-works.md'];
for (const file of docs) {
  const text = read(file);
  const links = [...text.matchAll(/\]\(([^)]+)\)|(?:src|href)="([^"]+)"/g)];
  for (const match of links) {
    const link = match[1] || match[2];
    if (/^(?:https?:|#|mailto:)/.test(link)) continue;
    assert.ok(fs.existsSync(path.resolve(root, path.dirname(file), link.split('#')[0])),
      `Broken local reference in ${file}: ${link}`);
  }
  assert.ok(!text.includes('/Users/'), `Private local path in ${file}`);
}
assert.match(read('LICENSE'), /MIT License/);
assert.match(read('.github/CODEOWNERS'), /^\* @aytekaksu$/m);
console.log('PASS: source syntax, manifest, assets, icon sizes, documentation links, MIT license, and code owner.');
