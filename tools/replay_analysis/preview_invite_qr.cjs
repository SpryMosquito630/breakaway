// Owner-only helper: input path contains a capability, so never print its contents.
const fs = require("node:fs");
const zlib = require("node:zlib");
const { toQR } = require("toqr");
const [input, output] = process.argv.slice(2);
if (!input || !output)
  throw Error("Provide private URL input and ignored PNG output paths.");
const q = toQR(fs.readFileSync(input, "utf8").trim());
const n = Math.sqrt(q.length),
  scale = 10,
  quiet = 4,
  width = (n + quiet * 2) * scale;
const rows = Buffer.alloc((width + 1) * width, 255);
for (let y = 0; y < width; y++) {
  rows[y * (width + 1)] = 0;
  for (let x = 0; x < width; x++) {
    const cx = Math.floor(x / scale) - quiet,
      cy = Math.floor(y / scale) - quiet;
    rows[y * (width + 1) + x + 1] =
      cx >= 0 && cy >= 0 && cx < n && cy < n && q[cy * n + cx] ? 0 : 255;
  }
}
function crc(buffer) {
  let c = 0xffffffff;
  for (const value of buffer) {
    c ^= value;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type),
    size = Buffer.alloc(4),
    checksum = Buffer.alloc(4);
  size.writeUInt32BE(data.length);
  checksum.writeUInt32BE(crc(Buffer.concat([name, data])));
  return Buffer.concat([size, name, data, checksum]);
}
const header = Buffer.alloc(13);
header.writeUInt32BE(width, 0);
header.writeUInt32BE(width, 4);
header[8] = 8;
fs.writeFileSync(
  output,
  Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]),
  { mode: 0o600 },
);
fs.chmodSync(output, 0o600);
console.log("Private preview QR prepared (capability hidden).");
