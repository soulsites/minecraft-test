/**
 * Generates the placeholder PNG textures for the addon.
 * Run with: npm run textures
 *
 * Deliberately dependency-free: a tiny RGBA PNG encoder on top of node:zlib.
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

class Canvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.pixels = new Uint8Array(width * height * 4);
  }

  set(x, y, [r, g, b, a = 255]) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const i = (y * this.width + x) * 4;
    this.pixels[i] = r;
    this.pixels[i + 1] = g;
    this.pixels[i + 2] = b;
    this.pixels[i + 3] = a;
  }

  rect(x, y, w, h, color) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) this.set(x + dx, y + dy, color);
    }
  }

  /** Deterministic value noise so re-generating never churns the git diff. */
  noise(x, y, seed) {
    const n = Math.sin((x * 127.1 + y * 311.7 + seed) * 43758.5453);
    return n - Math.floor(n);
  }

  toPng() {
    const raw = Buffer.alloc((this.width * 4 + 1) * this.height);
    for (let y = 0; y < this.height; y++) {
      const rowStart = y * (this.width * 4 + 1);
      raw[rowStart] = 0; // filter type: none
      Buffer.from(
        this.pixels.buffer,
        y * this.width * 4,
        this.width * 4,
      ).copy(raw, rowStart + 1);
    }

    const chunk = (type, data) => {
      const len = Buffer.alloc(4);
      len.writeUInt32BE(data.length);
      const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
      const crc = Buffer.alloc(4);
      crc.writeUInt32BE(crc32(body));
      return Buffer.concat([len, body, crc]);
    };

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(this.width, 0);
    ihdr.writeUInt32BE(this.height, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // color type RGBA
    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", ihdr),
      chunk("IDAT", deflateSync(raw, { level: 9 })),
      chunk("IEND", Buffer.alloc(0)),
    ]);
  }
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const ICE_LIGHT = [201, 234, 247];
const ICE = [143, 205, 232];
const ICE_DARK = [88, 148, 184];
const STONE = [128, 128, 128];
const STONE_DARK = [104, 104, 104];
const WOOD = [107, 78, 48];
const SCULK = [47, 88, 96];
const SCULK_DARK = [26, 50, 58];
const SCULK_GLOW = [79, 220, 226];
const BOW_WOOD = [156, 113, 68];
const BOW_WOOD_DARK = [102, 70, 40];
const ARROW_SHAFT = [171, 137, 92];
const ARROW_SHAFT_DARK = [130, 100, 64];
const FLETCHING = [235, 235, 235];
const BLUE_TIP = [41, 98, 219];
const BLUE_TIP_LIGHT = [98, 150, 240];
const CLEAR = [0, 0, 0, 0];

function frostShard() {
  const c = new Canvas(16, 16);
  c.rect(0, 0, 16, 16, CLEAR);
  for (let y = 3; y < 14; y++) {
    const half = Math.max(1, Math.round((14 - y) * 0.55) + 1);
    for (let x = 8 - half; x < 8 + half; x++) {
      c.set(x, y, c.noise(x, y, 7) > 0.5 ? ICE : ICE_DARK);
    }
  }
  c.rect(7, 2, 2, 3, ICE_LIGHT);
  return c;
}

function frostWand() {
  const c = new Canvas(16, 16);
  c.rect(0, 0, 16, 16, CLEAR);
  for (let i = 0; i < 10; i++) c.rect(4 + i, 11 - i, 2, 2, WOOD);
  c.rect(10, 2, 4, 4, ICE);
  c.rect(11, 3, 2, 2, ICE_LIGHT);
  c.set(9, 6, ICE_DARK);
  c.set(14, 1, ICE_LIGHT);
  return c;
}

function frostOre() {
  const c = new Canvas(16, 16);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      c.set(x, y, c.noise(x, y, 3) > 0.5 ? STONE : STONE_DARK);
    }
  }
  const blobs = [
    [3, 3],
    [9, 2],
    [11, 9],
    [4, 10],
  ];
  for (const [bx, by] of blobs) {
    c.rect(bx, by, 3, 3, ICE);
    c.set(bx, by, ICE_LIGHT);
    c.set(bx + 2, by + 2, ICE_DARK);
  }
  return c;
}

function frostGolem() {
  const c = new Canvas(64, 64);
  c.rect(0, 0, 64, 64, CLEAR);
  // body (uv 0,0 -> 32x18), legs (32,0 -> 16x16), arms (48,0 -> 16x16), head (0,32 -> 32x16)
  const regions = [
    [0, 0, 32, 18, ICE],
    [32, 0, 16, 16, ICE_DARK],
    [48, 0, 16, 16, ICE_DARK],
    [0, 32, 32, 16, ICE_LIGHT],
  ];
  for (const [x, y, w, h, base] of regions) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const n = c.noise(x + dx, y + dy, 11);
        const shade = n > 0.75 ? 12 : n < 0.25 ? -12 : 0;
        c.set(x + dx, y + dy, [
          Math.min(255, Math.max(0, base[0] + shade)),
          Math.min(255, Math.max(0, base[1] + shade)),
          Math.min(255, Math.max(0, base[2] + shade)),
        ]);
      }
    }
  }
  // face on the head front quad (uv x 8..16, y 32..48)
  c.rect(10, 37, 2, 2, [26, 74, 110]);
  c.rect(14, 37, 2, 2, [26, 74, 110]);
  c.rect(11, 42, 4, 1, [26, 74, 110]);
  return c;
}

/**
 * A plain vanilla-style bow icon: wooden recurve limbs, a taut string, and a
 * blue-wrapped grip in the middle.
 */
function sonicBow() {
  const c = new Canvas(16, 16);
  c.rect(0, 0, 16, 16, CLEAR);
  const arc = [
    [11, 1], [12, 2], [13, 3], [13, 4], [14, 5], [14, 6],
    [14, 7], [14, 8], [14, 9], [13, 10], [13, 11], [12, 12], [11, 13],
  ];
  for (const [x, y] of arc) {
    c.set(x, y, BOW_WOOD);
    c.set(x - 1, y, BOW_WOOD_DARK);
  }
  // string, taut from tip to tip
  for (let y = 2; y <= 12; y++) {
    const x = 10 - Math.round(Math.abs(7 - y) * 0.2);
    c.set(x, y, [235, 235, 235]);
  }
  // blue leather grip wrap in the middle of the bow
  c.rect(11, 6, 3, 4, BLUE_TIP);
  c.set(12, 6, BLUE_TIP_LIGHT);
  c.set(12, 9, BLUE_TIP_LIGHT);
  return c;
}

/** A vanilla-style diagonal arrow icon, fletching at the bottom, blue head. */
function echoCharge() {
  const c = new Canvas(16, 16);
  c.rect(0, 0, 16, 16, CLEAR);
  for (let i = 0; i < 11; i++) {
    const x = 3 + i;
    const y = 12 - i;
    c.set(x, y, ARROW_SHAFT);
    c.set(x, y - 1, ARROW_SHAFT_DARK);
  }
  // arrowhead at the top-right end of the shaft
  c.rect(12, 1, 2, 2, BLUE_TIP);
  c.set(13, 0, BLUE_TIP_LIGHT);
  c.set(11, 3, BLUE_TIP);
  // fletching at the bottom-left end
  c.set(2, 13, FLETCHING);
  c.set(3, 14, FLETCHING);
  c.set(1, 14, FLETCHING);
  c.set(2, 12, FLETCHING);
  return c;
}

/** Soft radial dot used by the sonic particles. */
function sonicRing() {
  const c = new Canvas(16, 16);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5) / 7.5;
      const alpha = Math.round(Math.max(0, 1 - d * d) * 255);
      c.set(x, y, [255, 255, 255, alpha]);
    }
  }
  return c;
}

/**
 * Texture for the flying projectile's own 3D model (see
 * models/entity/sonic_boom.geo.json): a plain wooden shaft, light fletching,
 * and a blue arrowhead - a vanilla arrow with a blue tip.
 *
 * UV layout (32x16, one flat color per box so a filled bounding rect is
 * enough - no per-face unwrapping needed):
 *   shaft body: uv (0,0),  bounding box 20x10
 *   arrowhead:  uv (20,0), bounding box 10x5
 *   fletching:  uv (0,10), bounding box 8x4
 */
function arrowProjectile() {
  const c = new Canvas(32, 16);
  c.rect(0, 0, 32, 16, CLEAR);
  c.rect(0, 0, 20, 10, ARROW_SHAFT);
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 20; x++) {
      if (c.noise(x, y, 5) > 0.75) c.set(x, y, ARROW_SHAFT_DARK);
    }
  }
  c.rect(20, 0, 10, 5, BLUE_TIP);
  c.rect(20, 0, 10, 1, BLUE_TIP_LIGHT);
  c.rect(0, 10, 8, 4, FLETCHING);
  return c;
}

const OUTPUTS = {
  "packs/resource_pack/textures/items/frost_shard.png": frostShard,
  "packs/resource_pack/textures/items/frost_wand.png": frostWand,
  "packs/resource_pack/textures/blocks/frost_ore.png": frostOre,
  "packs/resource_pack/textures/entity/frost_golem.png": frostGolem,
  "packs/resource_pack/textures/items/sonic_bow.png": sonicBow,
  "packs/resource_pack/textures/items/echo_charge.png": echoCharge,
  "packs/resource_pack/textures/particle/sonic_ring.png": sonicRing,
  "packs/resource_pack/textures/entity/sonic_boom.png": arrowProjectile,
};

for (const [file, make] of Object.entries(OUTPUTS)) {
  const target = resolve(process.cwd(), file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, make().toPng());
  console.log(`wrote ${file}`);
}
