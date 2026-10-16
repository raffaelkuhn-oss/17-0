/** Minimal indexed-colour (palette) PNG encoder; zlib via the platform CompressionStream. */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(parts: Uint8Array[]): number {
  let c = 0xffffffff;
  for (const p of parts) for (let i = 0; i < p.length; i++) c = CRC_TABLE[(c ^ p[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  const t = new TextEncoder().encode(type);
  out.set(t, 4);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32([t, data]));
  return out;
}

async function zlib(data: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream("deflate");
  const w = cs.writable.getWriter();
  void w.write(data as Uint8Array<ArrayBuffer>);
  void w.close();
  return new Uint8Array(await new Response(cs.readable).arrayBuffer());
}

/** pixels: one palette index per pixel (row-major). palette: RGB triplets (<= 256 entries). */
export async function encodeIndexedPng(w: number, h: number, pixels: Uint8Array, palette: number[]): Promise<Uint8Array> {
  const raw = new Uint8Array(h * (w + 1));
  for (let y = 0; y < h; y++) raw.set(pixels.subarray(y * w, (y + 1) * w), y * (w + 1) + 1); // filter 0
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w);
  dv.setUint32(4, h);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 3; // indexed colour
  const plte = new Uint8Array(palette.length * 3);
  palette.forEach((c, i) => {
    plte[i * 3] = (c >> 16) & 255;
    plte[i * 3 + 1] = (c >> 8) & 255;
    plte[i * 3 + 2] = c & 255;
  });
  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("PLTE", plte),
    chunk("IDAT", await zlib(raw)),
    chunk("IEND", new Uint8Array(0)),
  ];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
