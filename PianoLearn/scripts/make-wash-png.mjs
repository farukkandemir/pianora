// Writes 1x64 vertical alpha washes of the page colour, for the Welcome hero.
// Same trick as assets/images/scrim-ink.png: a tiny PNG stretched by <Image resizeMode="stretch">.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const HEIGHT = 64;

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png([r, g, b], alphaAt) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // 8-bit RGBA
  const raw = Buffer.alloc(HEIGHT * 5);
  for (let y = 0; y < HEIGHT; y++) {
    raw[y * 5] = 0; // filter: none
    raw[y * 5 + 1] = r; raw[y * 5 + 2] = g; raw[y * 5 + 3] = b;
    raw[y * 5 + 4] = Math.round(255 * alphaAt(y / (HEIGHT - 1)));
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
const top = (t) => 0.97 * (1 - t);   // page colour at the top, clear at the bottom
const bottom = (t) => 0.97 * t;      // clear at the top, page colour at the bottom

for (const [name, color] of [['light', '#FCFBFD'], ['dark', '#26292E']]) {
  writeFileSync(`assets/images/wash-top-${name}.png`, png(hex(color), top));
  writeFileSync(`assets/images/wash-bottom-${name}.png`, png(hex(color), bottom));
}
console.log('wrote 4 wash PNGs');
