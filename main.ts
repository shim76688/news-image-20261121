// The World Today - Saturday 21 November 2026.
// A program that draws one newspaper front page summing up the day's world
// news, using only the Node standard library. It writes /output/entry.png
// (or $MAKEFUN_OUTPUT_DIR/entry.png outside the grader). Deterministic:
// no clock, no randomness, no network. Every pixel is drawn by this file.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------------------
// 5x7 bitmap font, drawn by hand in this file. Each glyph is 7 rows of 5
// bits, written as strings of 0/1, left to right, top to bottom.
// ---------------------------------------------------------------------------
const FONT: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  ';': ['00000', '01100', '01100', '00000', '01100', '00100', '01000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
  '·': ['00000', '00000', '00000', '00000', '01100', '01100', '00000'],
  '"': ['01010', '01010', '00000', '00000', '00000', '00000', '00000'],
};

// ---------------------------------------------------------------------------
// Canvas: a plain RGB buffer, 1024 x 1024.
// ---------------------------------------------------------------------------
const W = 1024;
const H = 1024;
const PAPER: RGB = [246, 239, 221];
const INK: RGB = [26, 26, 26];
const NAVY: RGB = [22, 35, 63];
const GOLD: RGB = [217, 164, 65];
const RED: RGB = [179, 38, 30];
const TEAL: RGB = [15, 118, 110];
const GREY: RGB = [90, 90, 90];
const WHITE: RGB = [255, 255, 255];
const BLUE: RGB = [31, 78, 160];
const LIGHTBLUE: RGB = [120, 170, 220];

type RGB = [number, number, number];

const px = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) {
  px[i * 3] = PAPER[0];
  px[i * 3 + 1] = PAPER[1];
  px[i * 3 + 2] = PAPER[2];
}

function setPx(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const o = (y * W + x) * 3;
  px[o] = c[0];
  px[o + 1] = c[1];
  px[o + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) setPx(xx, yy, c);
  }
}

function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) setPx(x, y, c);
    }
  }
}

function fillEllipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
  for (let y = cy - ry; y <= cy + ry; y++) {
    for (let x = cx - rx; x <= cx + rx; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) setPx(x, y, c);
    }
  }
}

// Thick line: stamp small discs along a Bresenham walk.
function drawLine(x0: number, y0: number, x1: number, y1: number, w: number, c: RGB): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  const r = Math.max(1, Math.floor(w / 2));
  for (;;) {
    fillCircle(x, y, r, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

function fillTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
  const minY = Math.min(y0, y1, y2);
  const maxY = Math.max(y0, y1, y2);
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    const edges: Array<[number, number, number, number]> = [
      [x0, y0, x1, y1],
      [x1, y1, x2, y2],
      [x2, y2, x0, y0],
    ];
    for (const [ax, ay, bx, by] of edges) {
      if ((ay <= y && by > y) || (by <= y && ay > y)) {
        xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
      }
    }
    if (xs.length >= 2) {
      const lo = Math.floor(Math.min(...xs));
      const hi = Math.ceil(Math.max(...xs));
      for (let x = lo; x <= hi; x++) setPx(x, y, c);
    }
  }
}

// ---------------------------------------------------------------------------
// Text: draw a string in the bitmap font at integer scale.
// ---------------------------------------------------------------------------
function drawChar(ch: string, x: number, y: number, s: number, c: RGB): void {
  const g = FONT[ch];
  if (!g) return;
  for (let r = 0; r < 7; r++) {
    for (let col = 0; col < 5; col++) {
      if (g[r][col] === '1') fillRect(x + col * s, y + r * s, s, s, c);
    }
  }
}

function drawText(text: string, x: number, y: number, s: number, c: RGB): void {
  let cx = x;
  for (const ch of text) {
    drawChar(ch, cx, y, s, c);
    cx += 6 * s;
  }
}

function textWidth(text: string, s: number): number {
  return text.length * 6 * s;
}

function drawTextCentred(text: string, cx: number, y: number, s: number, c: RGB): void {
  drawText(text, cx - Math.floor(textWidth(text, s) / 2), y, s, c);
}

// Greedy word wrap to a maximum width in characters.
function wrap(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur === '') {
      cur = w;
    } else if (cur.length + 1 + w.length <= maxChars) {
      cur += ' ' + w;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== '') lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------------------
// Pictograms, all drawn from rectangles, discs and triangles.
// ---------------------------------------------------------------------------
function star(cx: number, cy: number, r: number, c: RGB): void {
  // A five-pointed asterisk star: five spokes from the centre.
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
    const x1 = Math.round(cx + Math.cos(a) * r);
    const y1 = Math.round(cy + Math.sin(a) * r);
    drawLine(cx, cy, x1, y1, 2, c);
  }
  fillCircle(cx, cy, Math.max(1, Math.floor(r / 3)), c);
}

function flagUS(x: number, y: number, w: number, h: number): void {
  const stripe = Math.floor(h / 7);
  for (let i = 0; i < 7; i++) {
    fillRect(x, y + i * stripe, w, stripe, i % 2 === 0 ? RED : WHITE);
  }
  const cw = Math.floor(w * 0.42);
  const ch = stripe * 4;
  fillRect(x, y, cw, ch, NAVY);
  for (let r = 0; r < 3; r++) {
    for (let col = 0; col < 3; col++) {
      fillCircle(x + 5 + col * 9, y + 5 + r * 8, 2, WHITE);
    }
  }
}

function flagCN(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, RED);
  star(x + 16, y + 16, 9, GOLD);
  fillCircle(x + 34, y + 9, 2, GOLD);
  fillCircle(x + 42, y + 16, 2, GOLD);
  fillCircle(x + 40, y + 26, 2, GOLD);
  fillCircle(x + 32, y + 30, 2, GOLD);
}

function flagRU(x: number, y: number, w: number, h: number): void {
  const band = Math.floor(h / 3);
  fillRect(x, y, w, band, WHITE);
  fillRect(x, y + band, w, band, BLUE);
  fillRect(x, y + 2 * band, w, h - 2 * band, RED);
}

function megaphone(cx: number, cy: number, s: number): void {
  // Cone pointing up-left, handle below.
  fillTriangle(cx - 34 * s, cy - 26 * s, cx - 34 * s, cy + 10 * s, cx + 8 * s, cy - 8 * s, RED);
  fillTriangle(cx - 34 * s, cy + 10 * s, cx + 8 * s, cy - 8 * s, cx + 8 * s, cy + 10 * s, RED);
  fillRect(cx - 2 * s, cy + 8 * s, 12 * s, 22 * s, INK);
  drawLine(cx + 22 * s, cy - 30 * s, cx + 34 * s, cy - 38 * s, 3, INK);
  drawLine(cx + 26 * s, cy - 8 * s, cx + 40 * s, cy - 8 * s, 3, INK);
  drawLine(cx + 22 * s, cy + 14 * s, cx + 34 * s, cy + 22 * s, 3, INK);
}

function missile(cx: number, cy: number, s: number): void {
  // Slim rocket climbing to the upper right, with a blast star at the tail.
  drawLine(cx - 30 * s, cy + 30 * s, cx + 26 * s, cy - 26 * s, 10 * s, GREY);
  fillTriangle(cx + 26 * s, cy - 26 * s, cx + 10 * s, cy - 34 * s, cx + 34 * s, cy - 10 * s, RED);
  fillTriangle(cx - 30 * s, cy + 30 * s, cx - 44 * s, cy + 26 * s, cx - 26 * s, cy + 44 * s, RED);
  star(cx - 44 * s, cy + 44 * s, 12 * s, GOLD);
}

function globe(cx: number, cy: number, r: number): void {
  // Solid ring outline (a distance check over the bounding box, so the
  // circle has no gaps), with latitude lines and a leaf.
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
      if (d <= r && d >= r - 2) setPx(x, y, TEAL);
    }
  }
  drawLine(cx - r + 4, cy - Math.floor(r / 2), cx + r - 4, cy - Math.floor(r / 2), 2, TEAL);
  drawLine(cx - r + 4, cy + Math.floor(r / 2), cx + r - 4, cy + Math.floor(r / 2), 2, TEAL);
  drawLine(cx, cy - r, cx, cy + r, 2, TEAL);
  fillTriangle(cx + 6, cy - r - 14, cx + 26, cy - r - 2, cx + 2, cy - r + 2, [34, 139, 34]);
  drawLine(cx + 6, cy - r - 14, cx + 26, cy - r - 2, 2, [34, 139, 34]);
}

function robot(cx: number, cy: number, s: number): void {
  // Friendly robot head: square skull, antenna, square eyes, grill mouth.
  drawLine(cx, cy - 34 * s, cx, cy - 20 * s, 3, INK);
  fillCircle(cx, cy - 36 * s, 4 * s, RED);
  fillRect(cx - 26 * s, cy - 20 * s, 52 * s, 44 * s, LIGHTBLUE);
  fillRect(cx - 26 * s, cy - 20 * s, 52 * s, 5 * s, BLUE);
  fillRect(cx - 18 * s, cy - 8 * s, 10 * s, 10 * s, INK);
  fillRect(cx + 8 * s, cy - 8 * s, 10 * s, 10 * s, INK);
  drawLine(cx - 14 * s, cy + 12 * s, cx + 14 * s, cy + 12 * s, 3, INK);
  fillRect(cx - 30 * s, cy - 6 * s, 4 * s, 16 * s, GREY);
  fillRect(cx + 26 * s, cy - 6 * s, 4 * s, 16 * s, GREY);
}

// ---------------------------------------------------------------------------
// Layout: masthead, lead story, 2x2 grid, footer.
// ---------------------------------------------------------------------------

// Masthead
fillRect(0, 0, W, 148, NAVY);
drawTextCentred('THE WORLD TODAY', W / 2, 24, 5, WHITE);
drawTextCentred('SATURDAY 21 NOVEMBER 2026', W / 2, 82, 3, GOLD);
fillRect(0, 148, W, 6, GOLD);

// Lead story: the Shenzhen summit
const LEAD_X = 36;
drawText('SHENZHEN · DIPLOMACY', LEAD_X, 172, 2, RED);
const leadHead = ['TRUMP, XI AND PUTIN', 'END HISTORIC SUMMIT', 'IN SHENZHEN'];
leadHead.forEach((line, i) => drawText(line, LEAD_X, 202 + i * 34, 4, INK));
const leadSummary = wrap(
  'FIRST-EVER MEETING OF THE THREE LEADERS ENDS WITH A PLEDGE: A NUCLEAR WAR CANNOT BE WON AND MUST NEVER BE FOUGHT.',
  50,
);
leadSummary.forEach((line, i) => drawText(line, LEAD_X, 318 + i * 18, 2, GREY));

// Lead pictogram: the three flags over a round table
fillRect(672, 176, 320, 236, WHITE);
fillRect(672, 176, 320, 4, GOLD);
flagUS(688, 196, 92, 64);
flagCN(788, 196, 92, 64);
flagRU(888, 196, 92, 64);
// Thin ink borders so the flags read against the white panel: the Russian
// flag's white band would otherwise vanish into the background.
for (const fx of [688, 788, 888]) {
  fillRect(fx - 2, 194, 96, 2, INK);
  fillRect(fx - 2, 260, 96, 2, INK);
  fillRect(fx - 2, 194, 2, 68, INK);
  fillRect(fx + 92, 194, 2, 68, INK);
}
drawTextCentred('AROUND ONE ROUND TABLE', 832, 276, 2, INK);
fillEllipse(832, 340, 110, 30, NAVY);
fillEllipse(832, 332, 110, 30, [44, 62, 110]);
fillCircle(760, 322, 7, GOLD);
fillCircle(832, 312, 7, GOLD);
fillCircle(904, 322, 7, GOLD);
drawTextCentred('US · CHINA · RUSSIA', 832, 384, 2, GREY);

fillRect(24, 436, 976, 3, INK);

// Grid cell helper
function storyCell(
  x: number,
  y: number,
  w: number,
  h: number,
  rule: RGB,
  kicker: string,
  headline: string[],
  summary: string,
  pic: (px0: number, py0: number) => void,
): void {
  fillRect(x, y, w, 5, rule);
  drawText(kicker, x + 16, y + 16, 2, rule);
  headline.forEach((line, i) => drawText(line, x + 16, y + 42 + i * 25, 3, INK));
  const sumY = y + 42 + headline.length * 25 + 12;
  wrap(summary, 25).forEach((line, i) => drawText(line, x + 16, sumY + i * 17, 2, GREY));
  pic(x + w - 150, y + 30);
}

// Row 1
storyCell(
  24,
  452,
  476,
  224,
  TEAL,
  'EUROPE · PROTESTS',
  ['YOUTH PROTESTS', 'SWEEP EUROPE'],
  'TENS OF THOUSANDS MARCH IN 25 COUNTRIES OVER LIVING COSTS AND ARMS SPENDING.',
  (bx, by) => megaphone(bx + 70, by + 70, 1),
);
storyCell(
  524,
  452,
  476,
  224,
  RED,
  'UKRAINE · WAR',
  ['RUSSIA POUNDS', 'UKRAINE ANEW'],
  'PUTIN VOWED RETALIATION. POLAND CALLS A CRASHED RUSSIAN MISSILE A PROVOCATION.',
  (bx, by) => missile(bx + 70, by + 70, 1),
);

// Row 2
storyCell(
  24,
  692,
  476,
  224,
  TEAL,
  'CLIMATE · COP31',
  ['COP31 TALKS', 'DRAG ON, NO', 'DEAL IN SIGHT'],
  'NEGOTIATORS STILL SPLIT AS THE CLIMATE SUMMIT REACHES CRUNCH TIME.',
  (bx, by) => globe(bx + 70, by + 62, 44),
);
storyCell(
  524,
  692,
  476,
  224,
  RED,
  'SCIENCE · MATHS',
  ["CLAUDE 'SOLVES'", "MATHS' GREATEST", 'RIDDLE'],
  'AN ANTHROPIC RESEARCHER SAYS THE CHATBOT PROVED THE 167-YEAR-OLD PROBLEM.',
  (bx, by) => robot(bx + 70, by + 66, 1),
);

// Footer: also today + sources. Each line is 14px tall at scale 2, so the
// rows sit 16px apart and the sources line has a clear gap below the last.
fillRect(24, 924, 976, 3, INK);
drawText('ALSO TODAY', 36, 934, 2, RED);
drawText('BANGLADESH HIT BY FRESH ARSON ATTACKS. BOLSONARO IN HOSPITAL.', 36, 952, 2, INK);
drawText('GUPTA GETS 19 1/2 YEARS IN SIKH MURDER PLOT.', 36, 968, 2, INK);
drawText('VOYAGER 1 NOW A LIGHT-DAY FROM EARTH, 49 YEARS ON.', 36, 984, 2, INK);
drawText('SOURCES: WSJ · AL JAZEERA · DAWN · AFP · AP · THE HINDU', 36, 1006, 2, GREY);

// ---------------------------------------------------------------------------
// PNG encoder: 8-bit RGB, no interlace, one deflate stream.
// ---------------------------------------------------------------------------
function crc32(buf: Buffer): number {
  let table = (crc32 as unknown as { t?: Uint32Array }).t;
  if (!table) {
    table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    (crc32 as unknown as { t?: Uint32Array }).t = table;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}

const raw = Buffer.alloc(H * (1 + W * 3));
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 3)] = 0; // filter: none
  Buffer.from(px.buffer, y * W * 3, W * 3).copy(raw, y * (1 + W * 3) + 1);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // colour type: RGB
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  pngChunk('IHDR', ihdr),
  pngChunk('IDAT', deflateSync(raw, { level: 9 })),
  pngChunk('IEND', Buffer.alloc(0)),
]);

writeFileSync(join(process.env.MAKEFUN_OUTPUT_DIR ?? '/output', 'entry.png'), png);
