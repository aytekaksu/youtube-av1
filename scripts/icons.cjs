'use strict';
const path = require('node:path');
const sharp = require('sharp');
const assets = path.resolve(__dirname, '../assets');
(async () => {
  for (const size of [16, 32, 48, 128]) {
    await sharp(path.join(assets, 'logo.svg')).resize(size, size).png()
      .toFile(path.join(assets, `icon-${size}.png`));
  }
  console.log('Exported toolbar icons from assets/logo.svg.');
})();
