const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let value = n;
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function insideRoundedRect(x, y, left, top, width, height, radius) {
  const right = left + width - 1;
  const bottom = top + height - 1;
  const nearestX = Math.max(left + radius, Math.min(x, right - radius));
  const nearestY = Math.max(top + radius, Math.min(y, bottom - radius));
  return (x - nearestX) ** 2 + (y - nearestY) ** 2 <= radius ** 2;
}

function createIcon(size, maskable = false) {
  const pixels = Buffer.alloc((size * 4 + 1) * size);
  const scale = size / 512;
  const blue = [37, 99, 235, 255];
  const pale = [191, 219, 254, 255];
  const white = [255, 255, 255, 255];
  const transparent = [0, 0, 0, 0];
  const outerRadius = maskable ? 0 : 96 * scale;
  const tileSize = (maskable ? 120 : 144) * scale;
  const tileRadius = (maskable ? 24 : 28) * scale;
  const first = (maskable ? 112 : 88) * scale;
  const second = 280 * scale;

  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    pixels[row] = 0;
    for (let x = 0; x < size; x += 1) {
      let color = outerRadius === 0 || insideRoundedRect(x, y, 0, 0, size, size, outerRadius) ? blue : transparent;
      if (insideRoundedRect(x, y, first, first, tileSize, tileSize, tileRadius)) color = white;
      if (insideRoundedRect(x, y, second, first, tileSize, tileSize, tileRadius)) color = pale;
      if (insideRoundedRect(x, y, first, second, tileSize, tileSize, tileRadius)) color = pale;
      const crossCenter = (maskable ? 346 : 352) * scale;
      const crossLength = (maskable ? 126 : 144) * scale;
      const crossWidth = (maskable ? 40 : 44) * scale;
      if ((Math.abs(x - crossCenter) <= crossWidth / 2 && Math.abs(y - crossCenter) <= crossLength / 2) ||
          (Math.abs(y - crossCenter) <= crossWidth / 2 && Math.abs(x - crossCenter) <= crossLength / 2)) color = white;
      pixels.set(color, row + 1 + x * 4);
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(pixels, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outputDir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "app-icon-192.png"), createIcon(192));
fs.writeFileSync(path.join(outputDir, "app-icon-512.png"), createIcon(512));
fs.writeFileSync(path.join(outputDir, "app-icon-maskable-512.png"), createIcon(512, true));
