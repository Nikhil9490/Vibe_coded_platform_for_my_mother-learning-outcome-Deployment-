/**
 * Generates app icons (192x192 and 512x512) as PNG files.
 * Maroon fill with gold border — matches the site's color theme.
 * Run: node scripts/generate-icons.js
 */
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

function crc32(buf) {
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const t   = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function createIcon(size) {
  const border  = Math.max(8, Math.floor(size * 0.06));
  const radius  = Math.floor(size * 0.18); // rounded corner radius

  // maroon + gold palette
  const MAROON = [139, 26, 26];
  const GOLD   = [201, 146, 10];
  const DARK   = [44,  24, 16];

  const rowLen = 1 + size * 3;
  const raw    = Buffer.alloc(size * rowLen, 0);

  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0; // PNG filter: None
    for (let x = 0; x < size; x++) {
      // Rounded-corner mask (corner pixels become dark background)
      const cx = Math.min(x, size - 1 - x);
      const cy = Math.min(y, size - 1 - y);
      const inCorner = cx < radius && cy < radius;
      const dist     = inCorner ? Math.hypot(radius - cx, radius - cy) : 0;
      const outside  = inCorner && dist > radius;

      const isBorder = !outside && (
        x < border || x >= size - border ||
        y < border || y >= size - border
      );

      let [r, g, b] = outside ? DARK : isBorder ? GOLD : MAROON;

      // Inner decorative circle — lighter maroon ring
      const mx = size / 2, my = size / 2;
      const d  = Math.hypot(x - mx, y - my);
      const inner = size * 0.28;
      const outer = size * 0.32;
      if (!outside && !isBorder && d >= inner && d <= outer) {
        [r, g, b] = GOLD;
      }

      const idx = y * rowLen + 1 + x * 3;
      raw[idx] = r; raw[idx + 1] = g; raw[idx + 2] = b;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

for (const size of [192, 512]) {
  const file = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(file, createIcon(size));
  console.log(`Created ${file}`);
}
console.log('Done.');
