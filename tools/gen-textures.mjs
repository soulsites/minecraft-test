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
const ARROW_SHAFT = [171, 137, 92];
const ARROW_SHAFT_DARK = [130, 100, 64];
const FLETCHING = [235, 235, 235];
const BLUE_TIP = [60, 116, 209];
const BLUE_TIP_LIGHT = [127, 168, 239];
const GOLD = [237, 201, 80];
const GOLD_DARK = [189, 152, 46];
const CLEAR = [0, 0, 0, 0];

/**
 * Exact pixel data lifted from Mojang's public bedrock-samples resource pack
 * (textures/items/bow_standby.png and textures/items/arrow.png), as
 * [x, y, "#rrggbb"] triples. Used so our reskin is pixel-identical to vanilla
 * except for the explicitly recolored grip / arrowhead tones.
 */
const VANILLA_BOW_PIXELS = [[11,1,"#493615"],[12,1,"#493615"],[13,1,"#493615"],[14,1,"#493615"],[8,2,"#493615"],[9,2,"#493615"],[10,2,"#493615"],[11,2,"#896727"],[12,2,"#684e1e"],[13,2,"#684e1e"],[14,2,"#896727"],[15,2,"#281e0b"],[6,3,"#493615"],[7,3,"#493615"],[8,3,"#896727"],[9,3,"#684e1e"],[10,3,"#896727"],[11,3,"#281e0b"],[12,3,"#281e0b"],[13,3,"#281e0b"],[14,3,"#281e0b"],[5,4,"#493615"],[6,4,"#6b6b6b"],[7,4,"#684e1e"],[8,4,"#281e0b"],[9,4,"#281e0b"],[10,4,"#281e0b"],[13,4,"#444444"],[4,5,"#493615"],[5,5,"#6b6b6b"],[6,5,"#969696"],[7,5,"#6b6b6b"],[12,5,"#444444"],[3,6,"#493615"],[4,6,"#6b6b6b"],[5,6,"#969696"],[6,6,"#6b6b6b"],[11,6,"#444444"],[3,7,"#493615"],[4,7,"#684e1e"],[5,7,"#6b6b6b"],[10,7,"#444444"],[2,8,"#493615"],[3,8,"#896727"],[4,8,"#281e0b"],[9,8,"#444444"],[2,9,"#493615"],[3,9,"#684e1e"],[4,9,"#281e0b"],[8,9,"#444444"],[2,10,"#493615"],[3,10,"#896727"],[4,10,"#281e0b"],[7,10,"#444444"],[1,11,"#493615"],[2,11,"#896727"],[3,11,"#281e0b"],[6,11,"#444444"],[1,12,"#493615"],[2,12,"#684e1e"],[3,12,"#281e0b"],[5,12,"#444444"],[1,13,"#493615"],[2,13,"#684e1e"],[3,13,"#281e0b"],[4,13,"#444444"],[1,14,"#493615"],[2,14,"#896727"],[3,14,"#281e0b"],[2,15,"#281e0b"]];

const VANILLA_ARROW_ITEM_PIXELS = [[12,2,"#969696"],[13,2,"#ffffff"],[14,2,"#444444"],[10,3,"#969696"],[11,3,"#d8d8d8"],[12,3,"#d8d8d8"],[13,3,"#969696"],[14,3,"#444444"],[10,4,"#444444"],[11,4,"#896727"],[12,4,"#d8d8d8"],[13,4,"#444444"],[10,5,"#896727"],[11,5,"#281e0b"],[12,5,"#969696"],[13,5,"#444444"],[9,6,"#896727"],[10,6,"#281e0b"],[12,6,"#444444"],[8,7,"#896727"],[9,7,"#281e0b"],[7,8,"#896727"],[8,8,"#281e0b"],[6,9,"#896727"],[7,9,"#281e0b"],[5,10,"#896727"],[6,10,"#281e0b"],[3,11,"#e0e0e0"],[4,11,"#c6c6c6"],[5,11,"#281e0b"],[2,12,"#e0e0e0"],[3,12,"#c6c6c6"],[4,12,"#e0e0e0"],[5,12,"#3f3f3f"],[2,13,"#3f3f3f"],[3,13,"#e0e0e0"],[4,13,"#3f3f3f"],[3,14,"#3f3f3f"]];

/**
 * Vanilla's three bow "pulling" frames (textures/items/bow_pulling_0/1/2.png)
 * - the string draws back further and the limbs bend more each stage. Same
 * recolor treatment as VANILLA_BOW_PIXELS: only the grip tones change.
 */
const VANILLA_BOW_PULLING_PIXELS = [
  [[1,0,"#ffffff"],[1,1,"#b1b1b1"],[2,1,"#d8d8d8"],[11,1,"#493615"],[12,1,"#493615"],[13,1,"#493615"],[14,1,"#493615"],[2,2,"#281e0b"],[3,2,"#896727"],[8,2,"#493615"],[9,2,"#493615"],[10,2,"#493615"],[11,2,"#896727"],[12,2,"#684e1e"],[13,2,"#684e1e"],[14,2,"#896727"],[15,2,"#281e0b"],[3,3,"#281e0b"],[4,3,"#896727"],[6,3,"#493615"],[7,3,"#493615"],[8,3,"#896727"],[9,3,"#684e1e"],[10,3,"#896727"],[11,3,"#281e0b"],[12,3,"#281e0b"],[13,3,"#281e0b"],[14,3,"#281e0b"],[4,4,"#281e0b"],[5,4,"#896727"],[6,4,"#6b6b6b"],[7,4,"#684e1e"],[8,4,"#281e0b"],[9,4,"#281e0b"],[10,4,"#281e0b"],[14,4,"#444444"],[4,5,"#493615"],[5,5,"#281e0b"],[6,5,"#896727"],[7,5,"#6b6b6b"],[13,5,"#444444"],[3,6,"#493615"],[4,6,"#6b6b6b"],[5,6,"#969696"],[6,6,"#281e0b"],[7,6,"#896727"],[13,6,"#444444"],[3,7,"#493615"],[4,7,"#684e1e"],[5,7,"#6b6b6b"],[7,7,"#281e0b"],[8,7,"#896727"],[12,7,"#444444"],[2,8,"#493615"],[3,8,"#896727"],[4,8,"#281e0b"],[8,8,"#281e0b"],[9,8,"#896727"],[11,8,"#444444"],[2,9,"#493615"],[3,9,"#684e1e"],[4,9,"#281e0b"],[9,9,"#281e0b"],[10,9,"#896727"],[11,9,"#444444"],[2,10,"#493615"],[3,10,"#896727"],[4,10,"#281e0b"],[10,10,"#444444"],[1,11,"#493615"],[2,11,"#896727"],[3,11,"#281e0b"],[8,11,"#444444"],[9,11,"#444444"],[1,12,"#493615"],[2,12,"#684e1e"],[3,12,"#281e0b"],[7,12,"#444444"],[1,13,"#493615"],[2,13,"#684e1e"],[3,13,"#281e0b"],[5,13,"#444444"],[6,13,"#444444"],[1,14,"#493615"],[2,14,"#896727"],[3,14,"#281e0b"],[4,14,"#444444"],[2,15,"#281e0b"]],
  [[2,1,"#ffffff"],[12,1,"#493615"],[13,1,"#493615"],[14,1,"#493615"],[2,2,"#b1b1b1"],[3,2,"#d8d8d8"],[8,2,"#493615"],[9,2,"#493615"],[10,2,"#493615"],[11,2,"#493615"],[12,2,"#896727"],[13,2,"#684e1e"],[14,2,"#896727"],[15,2,"#281e0b"],[3,3,"#281e0b"],[4,3,"#896727"],[6,3,"#493615"],[7,3,"#493615"],[8,3,"#896727"],[9,3,"#684e1e"],[10,3,"#896727"],[11,3,"#896727"],[12,3,"#281e0b"],[13,3,"#281e0b"],[14,3,"#281e0b"],[4,4,"#281e0b"],[5,4,"#896727"],[6,4,"#6b6b6b"],[7,4,"#684e1e"],[8,4,"#281e0b"],[9,4,"#281e0b"],[10,4,"#281e0b"],[11,4,"#281e0b"],[14,4,"#444444"],[4,5,"#493615"],[5,5,"#281e0b"],[6,5,"#896727"],[7,5,"#6b6b6b"],[14,5,"#444444"],[3,6,"#493615"],[4,6,"#6b6b6b"],[5,6,"#969696"],[6,6,"#281e0b"],[7,6,"#896727"],[13,6,"#444444"],[3,7,"#493615"],[4,7,"#684e1e"],[5,7,"#6b6b6b"],[7,7,"#281e0b"],[8,7,"#896727"],[13,7,"#444444"],[2,8,"#493615"],[3,8,"#896727"],[4,8,"#281e0b"],[8,8,"#281e0b"],[9,8,"#896727"],[12,8,"#444444"],[2,9,"#493615"],[3,9,"#684e1e"],[4,9,"#281e0b"],[9,9,"#281e0b"],[10,9,"#896727"],[12,9,"#444444"],[2,10,"#493615"],[3,10,"#896727"],[4,10,"#281e0b"],[10,10,"#281e0b"],[11,10,"#896727"],[2,11,"#493615"],[3,11,"#896727"],[4,11,"#281e0b"],[10,11,"#444444"],[1,12,"#493615"],[2,12,"#896727"],[3,12,"#281e0b"],[8,12,"#444444"],[9,12,"#444444"],[1,13,"#493615"],[2,13,"#684e1e"],[3,13,"#281e0b"],[6,13,"#444444"],[7,13,"#444444"],[1,14,"#493615"],[2,14,"#896727"],[3,14,"#281e0b"],[4,14,"#444444"],[5,14,"#444444"],[2,15,"#281e0b"]],
  [[3,2,"#ffffff"],[8,2,"#493615"],[9,2,"#493615"],[10,2,"#493615"],[11,2,"#493615"],[12,2,"#493615"],[13,2,"#493615"],[14,2,"#493615"],[3,3,"#b1b1b1"],[4,3,"#d8d8d8"],[6,3,"#493615"],[7,3,"#493615"],[8,3,"#896727"],[9,3,"#684e1e"],[10,3,"#896727"],[11,3,"#896727"],[12,3,"#896727"],[13,3,"#684e1e"],[14,3,"#896727"],[15,3,"#281e0b"],[4,4,"#281e0b"],[5,4,"#896727"],[6,4,"#6b6b6b"],[7,4,"#684e1e"],[8,4,"#281e0b"],[9,4,"#281e0b"],[10,4,"#281e0b"],[11,4,"#281e0b"],[12,4,"#281e0b"],[13,4,"#281e0b"],[14,4,"#281e0b"],[4,5,"#493615"],[5,5,"#281e0b"],[6,5,"#896727"],[7,5,"#6b6b6b"],[14,5,"#444444"],[3,6,"#493615"],[4,6,"#6b6b6b"],[5,6,"#969696"],[6,6,"#281e0b"],[7,6,"#896727"],[14,6,"#444444"],[3,7,"#493615"],[4,7,"#684e1e"],[5,7,"#6b6b6b"],[7,7,"#281e0b"],[8,7,"#896727"],[13,7,"#444444"],[2,8,"#493615"],[3,8,"#896727"],[4,8,"#281e0b"],[8,8,"#281e0b"],[9,8,"#896727"],[13,8,"#444444"],[2,9,"#493615"],[3,9,"#684e1e"],[4,9,"#281e0b"],[9,9,"#281e0b"],[10,9,"#896727"],[13,9,"#444444"],[2,10,"#493615"],[3,10,"#896727"],[4,10,"#281e0b"],[10,10,"#281e0b"],[11,10,"#896727"],[13,10,"#444444"],[2,11,"#493615"],[3,11,"#896727"],[4,11,"#281e0b"],[11,11,"#281e0b"],[12,11,"#896727"],[2,12,"#493615"],[3,12,"#896727"],[4,12,"#281e0b"],[11,12,"#444444"],[2,13,"#493615"],[3,13,"#684e1e"],[4,13,"#281e0b"],[7,13,"#444444"],[8,13,"#444444"],[9,13,"#444444"],[10,13,"#444444"],[2,14,"#493615"],[3,14,"#896727"],[4,14,"#281e0b"],[5,14,"#444444"],[6,14,"#444444"],[3,15,"#281e0b"]],
];

function hexToRgb(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Plots an exact vanilla pixel grid, remapping only the given hex colors. */
function plotVanillaSprite(pixels, recolorByHex) {
  const c = new Canvas(16, 16);
  c.rect(0, 0, 16, 16, CLEAR);
  for (const [x, y, hex] of pixels) {
    c.set(x, y, hexToRgb(recolorByHex[hex] ?? hex));
  }
  return c;
}

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
 * Pixel-identical to vanilla's bow (standby) icon, except the grey leather
 * grip wrap (#6b6b6b / #969696) is recolored blue. Everything else - wood,
 * string, outline - is untouched.
 */
const BOW_GRIP_RECOLOR = { "#6b6b6b": "#3c74d1", "#969696": "#7fa8ef" };

function sonicBow() {
  return plotVanillaSprite(VANILLA_BOW_PIXELS, BOW_GRIP_RECOLOR);
}

/** Draw stage 0, 1 or 2 of the bow being pulled back, same grip recolor. */
function sonicBowPulling(stage) {
  return plotVanillaSprite(VANILLA_BOW_PULLING_PIXELS[stage], BOW_GRIP_RECOLOR);
}

/**
 * Pixel-identical to vanilla's arrow item icon, except the silvery arrowhead
 * (#969696 / #ffffff / #d8d8d8) is recolored blue. Shaft, fletching and dark
 * outline are untouched.
 */
function echoCharge() {
  return plotVanillaSprite(VANILLA_ARROW_ITEM_PIXELS, {
    "#969696": "#3c74d1",
    "#ffffff": "#bfe0ff",
    "#d8d8d8": "#7fa8ef",
  });
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

/**
 * A small arrow drawn across the bow's grip, on the same 16x16 canvas and
 * transform as the bow icon itself - overlaid as a second texture_mesh on
 * the pulling-stage geometry (see models/entity/sonic_bow.geo.json), so it
 * lines up with the grip without needing any separate 3D placement math.
 */
function bowArrowNock() {
  const c = new Canvas(16, 16);
  c.rect(0, 0, 16, 16, CLEAR);
  for (let i = 0; i < 11; i++) {
    const x = 2 + i;
    const y = 13 - i;
    c.set(x, y, ARROW_SHAFT);
    c.set(x, y - 1, ARROW_SHAFT_DARK);
  }
  c.rect(11, 1, 2, 2, BLUE_TIP);
  c.set(12, 0, BLUE_TIP_LIGHT);
  c.set(2, 13, FLETCHING);
  c.set(1, 14, FLETCHING);
  c.set(2, 14, FLETCHING);
  return c;
}

/** A solid 2x2 blue dot - the crosshair overlay added to hud_screen.json. */
function crosshairDot() {
  const c = new Canvas(2, 2);
  c.rect(0, 0, 2, 2, BLUE_TIP);
  return c;
}

/**
 * Every non-transparent pixel as [x, y, r, g, b], read directly off the
 * user's own reference screenshot (a dark-blue lumpy nugget), the same way
 * as WARDEN_HAMMER_PIXELS below - exact RGB per cell, no palette.
 */
const WARDEN_INGOT_PIXELS = [
  [10, 2, 8, 5, 60], [11, 2, 8, 5, 60],
  [7, 3, 8, 5, 60], [8, 3, 8, 5, 60], [9, 3, 8, 5, 60], [10, 3, 22, 18, 113], [11, 3, 22, 18, 113], [12, 3, 10, 7, 74],
  [4, 4, 8, 5, 60], [5, 4, 8, 5, 60], [6, 4, 8, 5, 60], [7, 4, 22, 18, 113], [8, 4, 22, 18, 113], [9, 4, 28, 23, 139], [10, 4, 28, 23, 139], [11, 4, 28, 23, 139], [12, 4, 22, 18, 113], [13, 4, 10, 7, 74],
  [1, 5, 8, 5, 60], [2, 5, 8, 5, 60], [3, 5, 8, 5, 60], [4, 5, 22, 18, 113], [5, 5, 30, 25, 141], [6, 5, 28, 23, 139], [7, 5, 26, 19, 177], [8, 5, 26, 19, 177], [9, 5, 26, 19, 177], [10, 5, 26, 19, 177], [11, 5, 28, 23, 139], [12, 5, 28, 23, 139], [13, 5, 22, 18, 113], [14, 5, 10, 7, 74],
  [0, 6, 8, 5, 60], [1, 6, 28, 23, 139], [2, 6, 17, 12, 115], [3, 6, 17, 12, 115], [4, 6, 30, 25, 141], [5, 6, 30, 25, 141], [6, 6, 28, 23, 139], [7, 6, 28, 23, 139], [8, 6, 26, 19, 177], [9, 6, 26, 19, 177], [10, 6, 26, 19, 177], [11, 6, 26, 19, 177], [12, 6, 110, 103, 243], [13, 6, 110, 103, 243], [14, 6, 28, 23, 139], [15, 6, 10, 7, 74],
  [0, 7, 8, 5, 60], [1, 7, 17, 12, 115], [2, 7, 110, 103, 243], [3, 7, 26, 19, 177], [4, 7, 28, 23, 139], [5, 7, 28, 23, 139], [6, 7, 28, 23, 139], [7, 7, 28, 23, 139], [8, 7, 17, 12, 115], [9, 7, 110, 103, 243], [10, 7, 110, 103, 243], [11, 7, 110, 103, 243], [12, 7, 28, 23, 139], [13, 7, 17, 14, 67], [14, 7, 28, 23, 139], [15, 7, 6, 4, 44],
  [0, 8, 8, 5, 60], [1, 8, 9, 4, 84], [2, 8, 9, 4, 84], [3, 8, 110, 103, 243], [4, 8, 26, 19, 177], [5, 8, 26, 19, 177], [6, 8, 110, 103, 243], [7, 8, 110, 103, 243], [8, 8, 110, 103, 243], [9, 8, 28, 23, 139], [10, 8, 17, 12, 115], [11, 8, 19, 17, 80], [12, 8, 17, 14, 67], [13, 8, 17, 12, 115], [14, 8, 28, 23, 139], [15, 8, 6, 4, 44],
  [0, 9, 8, 5, 60], [1, 9, 28, 23, 139], [2, 9, 28, 23, 139], [3, 9, 28, 23, 139], [4, 9, 110, 103, 243], [5, 9, 110, 103, 243], [6, 9, 28, 23, 139], [7, 9, 17, 12, 115], [8, 9, 19, 17, 80], [9, 9, 19, 17, 80], [10, 9, 19, 17, 80], [11, 9, 17, 14, 67], [12, 9, 28, 23, 139], [13, 9, 28, 23, 139], [14, 9, 28, 23, 139], [15, 9, 6, 4, 44],
  [0, 10, 8, 5, 60], [1, 10, 17, 12, 115], [2, 10, 28, 23, 139], [3, 10, 28, 23, 139], [4, 10, 26, 19, 177], [5, 10, 28, 23, 139], [6, 10, 23, 20, 101], [7, 10, 19, 17, 80], [8, 10, 17, 14, 67], [9, 10, 17, 14, 67], [10, 10, 17, 12, 115], [11, 10, 28, 23, 139], [12, 10, 17, 12, 115], [13, 10, 6, 4, 44], [14, 10, 6, 4, 44],
  [1, 11, 10, 7, 74], [2, 11, 17, 12, 115], [3, 11, 28, 23, 139], [4, 11, 26, 19, 177], [5, 11, 17, 12, 115], [6, 11, 19, 17, 80], [7, 11, 17, 14, 67], [8, 11, 17, 12, 115], [9, 11, 17, 12, 115], [10, 11, 6, 4, 44], [11, 11, 6, 4, 44], [12, 11, 6, 4, 44],
  [2, 12, 10, 7, 74], [3, 12, 17, 12, 115], [4, 12, 28, 23, 139], [5, 12, 17, 12, 115], [6, 12, 17, 14, 67], [7, 12, 6, 4, 44], [8, 12, 6, 4, 44], [9, 12, 6, 4, 44],
  [3, 13, 10, 7, 74], [4, 13, 10, 7, 74], [5, 13, 6, 4, 44], [6, 13, 6, 4, 44],
];

function wardenIngot() {
  const c = new Canvas(16, 16);
  c.rect(0, 0, 16, 16, CLEAR);
  for (const [x, y, r, g, b] of WARDEN_INGOT_PIXELS) c.set(x, y, [r, g, b]);
  return c;
}

/**
 * Every non-transparent pixel as [x, y, r, g, b], read directly off the
 * user's own shadow-free reference screenshot (sampled at each of the
 * 16x16 grid's cell centers, exact RGB - no palette substitution) so the
 * colors match precisely, not just the shape.
 */
const WARDEN_HAMMER_PIXELS = [
  [10, 0, 174, 174, 174], [9, 1, 174, 174, 174], [10, 1, 202, 202, 202], [11, 1, 174, 174, 174],
  [8, 2, 175, 175, 175], [9, 2, 218, 218, 218], [10, 2, 213, 213, 213], [11, 2, 223, 223, 223], [12, 2, 248, 215, 72],
  [7, 3, 174, 174, 174], [8, 3, 218, 218, 218], [9, 3, 213, 213, 213], [10, 3, 248, 215, 72], [11, 3, 248, 214, 72], [12, 3, 248, 215, 72], [13, 3, 248, 214, 72],
  [7, 4, 174, 174, 174], [8, 4, 202, 202, 202], [9, 4, 223, 223, 223], [10, 4, 248, 215, 72], [11, 4, 100, 164, 214], [12, 4, 248, 215, 72], [13, 4, 222, 222, 222], [14, 4, 174, 174, 174],
  [8, 5, 174, 174, 174], [9, 5, 202, 202, 202], [10, 5, 213, 213, 213], [11, 5, 246, 214, 81], [12, 5, 248, 214, 72], [13, 5, 210, 210, 210], [14, 5, 204, 204, 204], [15, 5, 175, 175, 175],
  [9, 6, 175, 175, 175], [10, 6, 202, 202, 202], [11, 6, 223, 223, 223], [12, 6, 213, 213, 213], [13, 6, 218, 218, 218], [14, 6, 205, 205, 206], [15, 6, 174, 174, 174],
  [8, 7, 81, 56, 14], [9, 7, 58, 40, 7], [10, 7, 174, 174, 174], [11, 7, 202, 202, 202], [12, 7, 218, 218, 218], [13, 7, 177, 177, 177], [14, 7, 174, 174, 174],
  [7, 8, 81, 56, 14], [8, 8, 58, 40, 7], [11, 8, 174, 174, 174], [12, 8, 177, 177, 177], [13, 8, 175, 175, 175],
  [6, 9, 81, 56, 14], [7, 9, 58, 40, 7], [12, 9, 175, 175, 175],
  [5, 10, 81, 56, 14], [6, 10, 58, 40, 7],
  [4, 11, 81, 56, 14], [5, 11, 58, 40, 7],
  [3, 12, 81, 56, 14], [4, 12, 58, 40, 7],
  [2, 13, 81, 56, 14], [3, 13, 58, 40, 7],
  [1, 14, 81, 56, 14], [2, 14, 58, 40, 7],
  [0, 15, 81, 56, 14], [1, 15, 58, 40, 7],
];

function wardenHammer() {
  const c = new Canvas(16, 16);
  c.rect(0, 0, 16, 16, CLEAR);
  for (const [x, y, r, g, b] of WARDEN_HAMMER_PIXELS) c.set(x, y, [r, g, b]);
  return c;
}

const OUTPUTS = {
  "packs/resource_pack/textures/ui/sonic_bow_crosshair.png": crosshairDot,
  "packs/resource_pack/textures/items/warden_ingot.png": wardenIngot,
  "packs/resource_pack/textures/items/warden_hammer.png": wardenHammer,
  "packs/resource_pack/textures/items/frost_shard.png": frostShard,
  "packs/resource_pack/textures/items/frost_wand.png": frostWand,
  "packs/resource_pack/textures/blocks/frost_ore.png": frostOre,
  "packs/resource_pack/textures/entity/frost_golem.png": frostGolem,
  "packs/resource_pack/textures/items/sonic_bow.png": sonicBow,
  "packs/resource_pack/textures/items/sonic_bow_pulling_0.png": () => sonicBowPulling(0),
  "packs/resource_pack/textures/items/sonic_bow_pulling_1.png": () => sonicBowPulling(1),
  "packs/resource_pack/textures/items/sonic_bow_pulling_2.png": () => sonicBowPulling(2),
  "packs/resource_pack/textures/items/sonic_bow_arrow_nock.png": bowArrowNock,
  "packs/resource_pack/textures/items/echo_charge.png": echoCharge,
  "packs/resource_pack/textures/entity/sonic_boom.png": arrowProjectile,
};

for (const [file, make] of Object.entries(OUTPUTS)) {
  const target = resolve(process.cwd(), file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, make().toPng());
  console.log(`wrote ${file}`);
}
