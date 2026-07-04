import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { deflateSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(here, '..', 'src', 'icons');

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([length, typeBytes, data, crc]);
}

function palette() {
  const background = [37, 99, 235];
  const ring = [219, 234, 254];
  const arrow = [255, 255, 255];
  return { background, ring, arrow };
}

function drawPixel(size, x, y) {
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const dx = x - cx;
  const dy = y - cy;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const outer = size * 0.46;
  const inner = size * 0.3;
  const colors = palette();
  if (distance > outer) {
    return [0, 0, 0, 0];
  }
  if (distance > inner) {
    const angle = Math.atan2(dy, dx);
    const gapStart = -Math.PI / 2 - 0.5;
    const gapEnd = -Math.PI / 2 + 0.5;
    if (angle > gapStart && angle < gapEnd) {
      return [...colors.ring, 0];
    }
    return [...colors.ring, 255];
  }
  if (distance > inner - Math.max(1, size * 0.06)) {
    return [...colors.background, 255];
  }
  const withinArrow = Math.abs(dx) < size * 0.16 && dy < 0 && dy > -size * 0.24;
  if (withinArrow && y < cy) {
    return [...colors.arrow, 255];
  }
  return [...colors.background, 255];
}

function buildPng(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  let offset = 0;
  for (let y = 0; y < size; y += 1) {
    raw[offset] = 0;
    offset += 1;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = drawPixel(size, x, y);
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = a;
      offset += 4;
    }
  }
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function main() {
  mkdirSync(iconsDir, { recursive: true });
  const sizes = [16, 32, 48, 96, 128];
  for (const size of sizes) {
    const png = buildPng(size);
    writeFileSync(join(iconsDir, `icon-${size}.png`), png);
  }
  process.stdout.write(`generated ${sizes.length} icons in ${iconsDir}\n`);
}

main();
