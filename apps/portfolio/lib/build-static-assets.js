const fs = require('fs');
const path = require('path');

/**
 * Copy social PNGs without embedding them in the generated Worker.
 * @param {string} baseDir - Portfolio source and build directory.
 * @returns {void}
 */
function copySocialImages(baseDir) {
  // A private asset subpath keeps asset-first routing from bypassing the
  // Worker's cache headers on the public /og-image*.png routes.
  const destination = path.join(baseDir, 'assets', 'social');
  fs.mkdirSync(destination, { recursive: true });
  for (const filename of ['og-image.png', 'og-image-en.png', 'og-image-ja.png']) {
    fs.copyFileSync(path.join(baseDir, filename), path.join(destination, filename));
  }
}

module.exports = { copySocialImages };
