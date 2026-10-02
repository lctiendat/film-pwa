import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
}

const crcTable = createCRC32Table();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcBuf = Buffer.alloc(4);
  const typeAndData = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(typeAndData), 0);

  return Buffer.concat([lenBuf, typeAndData, crcBuf]);
}

function generatePNG(width, height, isMaskable = false) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data with scanline filter byte 0
  const rowSize = width * 4;
  const rawData = Buffer.alloc(height * (rowSize + 1));

  const cx = width / 2;
  const cy = height / 2;
  const maxR = width / 2;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (rowSize + 1);
    rawData[rowOffset] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Distance from center
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background gradient (Deep Dark Violet #0f172a to Crimson #e11d48)
      const gradRatio = (x + y) / (width + height);
      let r = Math.round(15 + gradRatio * (225 - 15));
      let g = Math.round(23 + gradRatio * (29 - 23));
      let b = Math.round(42 + gradRatio * (72 - 42));
      let a = 255;

      if (!isMaskable) {
        // Rounded squircle icon if not maskable
        const cornerRadius = width * 0.22;
        const cornerDist = Math.max(
          Math.abs(dx) - (cx - cornerRadius),
          Math.abs(dy) - (cy - cornerRadius),
          0
        );
        if (
          Math.abs(dx) > cx - cornerRadius &&
          Math.abs(dy) > cy - cornerRadius
        ) {
          const cornerD = Math.sqrt(
            Math.pow(Math.abs(dx) - (cx - cornerRadius), 2) +
            Math.pow(Math.abs(dy) - (cy - cornerRadius), 2)
          );
          if (cornerD > cornerRadius) {
            a = 0;
          }
        }
      }

      // Draw Play Symbol Triangle in center (white / gold)
      // Triangle coords: (-r, -r) to (+r, 0) to (-r, +r)
      const playSize = width * 0.28;
      const p1x = cx - playSize * 0.5;
      const p1y = cy - playSize * 0.7;
      const p2x = cx + playSize * 0.75;
      const p2y = cy;
      const p3x = cx - playSize * 0.5;
      const p3y = cy + playSize * 0.7;

      // Check if point (x, y) is inside triangle
      function sign(p1x, p1y, p2x, p2y, p3x, p3y) {
        return (p1x - p3x) * (p2y - p3y) - (p2x - p3x) * (p1y - p3y);
      }
      const d1 = sign(x, y, p1x, p1y, p2x, p2y);
      const d2 = sign(x, y, p2x, p2y, p3x, p3y);
      const d3 = sign(x, y, p3x, p3y, p1x, p1y);
      const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
      const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
      const inTriangle = !(hasNeg && hasPos);

      // Play icon glow circle
      if (dist < width * 0.38) {
        // subtle highlight ring
        if (dist > width * 0.35) {
          r = Math.min(255, r + 60);
          g = Math.min(255, g + 40);
          b = Math.min(255, b + 90);
        }
      }

      if (inTriangle && a > 0) {
        r = 255;
        g = 255;
        b = 255;
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Ensure public/icons directory
const iconsDir = path.resolve('public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('Generating PWA icons...');

fs.writeFileSync(path.join(iconsDir, 'pwa-192x192.png'), generatePNG(192, 192, false));
console.log('Created pwa-192x192.png');

fs.writeFileSync(path.join(iconsDir, 'pwa-512x512.png'), generatePNG(512, 512, false));
console.log('Created pwa-512x512.png');

fs.writeFileSync(path.join(iconsDir, 'pwa-maskable-512x512.png'), generatePNG(512, 512, true));
console.log('Created pwa-maskable-512x512.png');

fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), generatePNG(180, 180, false));
console.log('Created apple-touch-icon.png');

// Also create a 64x64 favicon.ico
fs.writeFileSync(path.resolve('public/favicon.ico'), generatePNG(64, 64, false));
console.log('Created favicon.ico');

console.log('All icons generated successfully!');
