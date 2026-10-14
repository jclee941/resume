const fs = require('fs');
const path = require('path');

/**
 * Copy social PNGs without embedding them in the generated Worker.
 * @param {string} baseDir - Portfolio source and build directory.
 * @returns {void}
 */
function copySocialImages(baseDir) {
  // The PNGs live under /social/ so the public /og-image*.png URLs stay on the Worker route
  // and its cache policy instead of being served directly by asset-first routing.
  const destination = path.join(baseDir, 'assets', 'social');
  fs.mkdirSync(destination, { recursive: true });
  for (const filename of ['og-image.png', 'og-image-en.png', 'og-image-ja.png']) {
    fs.copyFileSync(path.join(baseDir, filename), path.join(destination, filename));
  }
}

module.exports = { copySocialImages };
