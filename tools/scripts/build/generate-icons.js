#!/usr/bin/env node

/**
 * Simple PWA icon generator
 * Creates placeholder icons with brand color (#7c3aed) and initials "JL"
 */

const fs = require('fs');

// Note: For production, use actual designed icons
// Base64-encoded placeholders removed (unused)

// Create SVG-based icons as temporary solution
/** @param {number} size */
const createSVGIcon = (size) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background gradient -->
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#5b21b6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" fill="url(#bg)" />

  <!-- Initials -->
  <text
    x="50%"
    y="50%"
    font-family="Arial, sans-serif"
    font-size="${size * 0.4}"
    font-weight="bold"
    fill="white"
    text-anchor="middle"
    dominant-baseline="central">
    JL
  </text>
</svg>`;
};

// Write SVG files
fs.writeFileSync('icon-192.svg', createSVGIcon(192));
fs.writeFileSync('icon-512.svg', createSVGIcon(512));

console.log('✅ SVG icons created: icon-192.svg, icon-512.svg');
console.log('📝 Note: For production, convert SVG to PNG or create custom designed icons');
console.log('   Example: Using online tools like https://svg2png.com or ImageMagick');
