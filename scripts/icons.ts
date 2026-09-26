import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const assets = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets');
for (const size of [16, 32, 48, 128]) {
  await sharp(path.join(assets, 'logo.svg')).resize(size, size).png()
    .toFile(path.join(assets, `icon-${size}.png`));
}
console.log('Exported toolbar icons from assets/logo.svg.');
