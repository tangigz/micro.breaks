// Draws the extension icon (a green battery on the dark background) as PNGs,
// without dependencies. Run: node scripts/make-icons.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [0x0b, 0x0b, 0x0c];
const INK = [0xf5, 0xf5, 0xf7];
const POS = [0x6f, 0xcf, 0x7a];

// Rounded-rectangle test in a 0..1 square.
const inRound = (x, y, x0, y0, x1, y1, r) => {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};

// Colour of a point: background tile, battery outline, cap and fill (spec › Battery: 220 × 440, 6 px outline).
function sample(x, y) {
  if (!inRound(x, y, 0, 0, 1, 1, 0.22)) return null;
  const body = [0.33, 0.24, 0.67, 0.9];
  if (inRound(x, y, 0.43, 0.15, 0.57, 0.24, 0.02)) return INK;
  if (inRound(x, y, body[0] + 0.07, body[1] + 0.3, body[2] - 0.07, body[3] - 0.07, 0.05)) return POS;
  const outer = inRound(x, y, ...body, 0.09);
  const inner = inRound(x, y, body[0] + 0.045, body[1] + 0.045, body[2] - 0.045, body[3] - 0.045, 0.05);
  if (outer && !inner) return INK;
  return BG;
}

function png(size) {
  const ss = 4;
  const rows = [];
  for (let py = 0; py < size; py++) {
    const row = [0];
    for (let px = 0; px < size; px++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let sy = 0; sy < ss; sy++)
        for (let sx = 0; sx < ss; sx++) {
          const c = sample((px + (sx + 0.5) / ss) / size, (py + (sy + 0.5) / ss) / size);
          if (c) {
            r += c[0];
            g += c[1];
            b += c[2];
            a += 1;
          }
        }
      const n = ss * ss;
      row.push(
        a ? Math.round(r / a) : 0,
        a ? Math.round(g / a) : 0,
        a ? Math.round(b / a) : 0,
        Math.round((a / n) * 255),
      );
    }
    rows.push(Buffer.from(row));
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const x of buf) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public/icon', { recursive: true });
for (const size of [16, 32, 48, 128]) writeFileSync(`public/icon/${size}.png`, png(size));
console.log('Wrote public/icon/{16,32,48,128}.png');
