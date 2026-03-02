const svg = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <!-- Background gradient (purple/blue) -->
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#5b21b6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#grad)"/>

      <!-- Language badge (top-right) -->
      <rect x="1000" y="30" width="170" height="50" rx="25" fill="#ffffff" opacity="0.1" stroke="#ffffff" stroke-width="2"/>
      <text
        x="1085"
        y="65"
        font-family="Inter, sans-serif"
        font-size="20"
        font-weight="600"
        fill="#ffffff"
        text-anchor="middle"
      >한국어</text>

      <!-- Content -->
      <g transform="translate(600, 315)">
        <!-- Name/Title -->
        <text
          x="0"
          y="-80"
          font-family="Inter, sans-serif"
          font-size="72"
          font-weight="800"
          fill="#ffffff"
          text-anchor="middle"
          letter-spacing="-0.02em"
        >이재철</text>

        <!-- Subtitle -->
        <text
          x="0"
          y="0"
          font-family="Inter, sans-serif"
          font-size="48"
          font-weight="600"
          fill="#e0e7ff"
          text-anchor="middle"
        >AIOps &amp; Infrastructure Engineer</text>

        <!-- Stats -->
        <text
          x="0"
          y="80"
          font-family="Inter, sans-serif"
          font-size="32"
          font-weight="500"
          fill="#c7d2fe"
          text-anchor="middle"
        >8.8+ 년 경력 | 15+ 보안 솔루션</text>

        <!-- URL -->
        <text
          x="0"
          y="140"
          font-family="Inter, sans-serif"
          font-size="28"
          font-weight="400"
          fill="#a5b4fc"
          text-anchor="middle"
        >resume.jclee.me</text>
      </g>
    </svg>
  `;

console.log('SVG length:', svg.length);
console.log('SVG preview:', svg.substring(0, 200));

const sharp = require('sharp');
sharp(Buffer.from(svg)).png().toFile('./test-og.png').then(() => {
  console.log('Generated successfully');
}).catch(err => {
  console.error('Error:', err.message);
});
