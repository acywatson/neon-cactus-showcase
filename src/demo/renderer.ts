/**
 * Neon Cactus demo renderer — a 16-bit style pipeline on top of Canvas 2D.
 *
 * World logic runs in a 960×540 coordinate space. Everything is drawn into a
 * 480×270 low-resolution buffer, then upscaled with nearest-neighbour sampling
 * for crisp pixels. Emissive elements are also drawn into a glow buffer that
 * is composited additively with blur. HUD and CRT overlay draw at full size.
 */

export const WORLD_W = 960;
export const WORLD_H = 540;
export const FLOOR = 438;

const LOW_W = 480;
const LOW_H = 270;
const S = LOW_W / WORLD_W; // world → low-res scale (0.5)
const FLOOR_LOW = FLOOR * S;

export type Palette = {
  night: string;
  raised: string;
  cyan: string;
  pink: string;
  green: string;
  amber: string;
  rust: string;
  ink: string;
  paper: string;
};

export type PlayerState = {
  x: number; // feet centre, world px
  y: number; // feet baseline, world px
  velocityY: number;
  runPhase: number;
  moving: boolean;
  flash: number; // muzzle flash frames remaining
  recoil: number;
};

export type DroneState = {
  x: number;
  y: number;
  speed: number;
  alive: boolean;
  phase: number;
};

export type BulletState = {x: number; y: number; px: number};

type Particle = {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number; color: string; glow: boolean; gravity: number;
};

type Ring = {x: number; y: number; r: number; maxR: number; life: number; color: string};

type RainDrop = {x: number; y: number; len: number; speed: number};

export type FrameState = {
  player: PlayerState;
  drones: DroneState[];
  bullets: BulletState[];
  score: number;
  breaches: number;
  running: boolean;
  lost: boolean;
};

// ─── Sprite art ────────────────────────────────────────────────────────────

const ART = {
  K: '#0b0b12', // outline
  C: '#262a45', // coat
  c: '#3a4066', // coat highlight
  S: '#c9a27e', // skin
  s: '#9a7358', // skin shadow
  H: '#1c1c2a', // hat
  h: '#34344a', // hat highlight
  R: '#ff9e64', // scarf
  M: '#b8c4d6', // chrome
  m: '#7b8698', // chrome shadow
  G: '#3b4261', // gun metal
  L: '#1e1f30', // pants
  B: '#2a2230', // boots
  W: '#e8ecf7', // skull bone
  w: '#a9b0c4', // bone shadow
  E: '#7dcfff', // cyan glow
  P: '#ff007c', // pink glow
  A: '#e0af68', // amber
  Y: '#fff6d6', // hot white
} as const;

type ArtKey = keyof typeof ART;
const GLOW_KEYS = new Set<ArtKey>(['E', 'P', 'A', 'Y']);

const PLAYER_TOP = [
  '......HHHH......',
  '.....HhHHHH.....',
  '.....HHHHHH.....',
  '..HHHHHHHHHHHH..',
  '...HHHHHHHHHH...',
  '.....SSSSSS.....',
  '.....SSsEES.....',
  '.....sSSSSs.....',
  '....RRRRRRRR....',
  '...RRCCCCCCRR...',
  '..CCCCCCCCCCMM..',
  '..CcCCCCCCCCMGGG',
  '..CcCCCCCCCCmGGG',
  '..CcCCCCCCCCm...',
  '..CECCCCCCCC....',
  '..CECCCCcCCC....',
  '..CECCCC.CCC....',
  '..CcCCC...CCC...',
  '..CCCC.....CCC..',
];

const LEGS = {
  stand: ['...LLL....LLL...', '...LLL....LLL...', '...LLL....LLL...', '..BBBB....BBBB..', '..BBBB....BBBB..'],
  run0: ['..LLL......LLL..', '.LLL........LLL.', '.LLL........LLL.', 'BBBB........BBBB', 'BBBB........BBBB'],
  run1: ['....LLL..LLL....', '....LLL..LLL....', '.....LLLLLL.....', '....BBBBBBBB....', '....BBBBBBBB....'],
  run2: ['...LLL....LLL...', '..LLL......LLL..', '..LLL......LLL..', '.BBBB......BBBB.', '.BBBB......BBBB.'],
  jump: ['....LLL...LLL...', '...LLL....LLL...', '...LLL.....LLL..', '..BBBB....BBBB..', '................'],
};

const DRONE_FRAMES = [
  [
    '..mMMMMMMMMm..',
    '......GG......',
    '....KKKKKK....',
    '...KWWWWWWK...',
    '..KWWWWWWWWK..',
    '..KWPWWWWPWK..',
    '..KWPPWWWPPWK.',
    '..KWWWWKWWWWK.',
    '...KWWKKKWWK..',
    '...KWKWKWKWK..',
    '....KKKKKKK...',
    '...E.......E..',
  ],
  [
    '.mMm.MMMM.mMm.',
    '......GG......',
    '....KKKKKK....',
    '...KWWWWWWK...',
    '..KWWWWWWWWK..',
    '..KWPWWWWPWK..',
    '..KWPPWWWPPWK.',
    '..KWWWWKWWWWK.',
    '...KWWKKKWWK..',
    '...KWKWKWKWK..',
    '....KKKKKKK...',
    '...E.......E..',
  ],
];

const MUZZLE = [
  ['..Y..', '.YAY.', 'YAYAY', '.YAY.', '..Y..'],
  ['..A..', '.AYA.', 'AY.YA', '.AYA.', '..A..'],
];

const spriteCache = new Map<string, HTMLCanvasElement>();

function sprite(key: string, rows: string[], scale: number, glowOnly = false): HTMLCanvasElement {
  const cacheKey = `${key}:${scale}:${glowOnly ? 'g' : 'c'}`;
  const hit = spriteCache.get(cacheKey);
  if (hit) return hit;
  const w = rows[0].length;
  const h = rows.length;
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d')!;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x] as ArtKey | '.';
      if (ch === '.' || !(ch in ART)) continue;
      if (glowOnly && !GLOW_KEYS.has(ch)) continue;
      ctx.fillStyle = ART[ch];
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  spriteCache.set(cacheKey, canvas);
  return canvas;
}

// ─── Layer generation ──────────────────────────────────────────────────────

function seeded(seed: number) {
  let r = seed >>> 0;
  return () => ((r = (r * 1664525 + 1013904223) >>> 0) / 0xffffffff);
}

function layer(w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  paint(ctx);
  return canvas;
}

function makeSky(p: Palette): HTMLCanvasElement {
  return layer(LOW_W, LOW_H, ctx => {
    const g = ctx.createLinearGradient(0, 0, 0, LOW_H);
    g.addColorStop(0, '#07070d');
    g.addColorStop(0.45, '#14152a');
    g.addColorStop(0.72, '#2a1631');
    g.addColorStop(0.86, '#4a1a3a');
    g.addColorStop(1, '#1a1420');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, LOW_W, LOW_H);
    const rand = seeded(11);
    for (let i = 0; i < 140; i++) {
      const x = Math.floor(rand() * LOW_W);
      const y = Math.floor(rand() * LOW_H * 0.6);
      ctx.fillStyle = rand() > 0.85 ? p.cyan : '#c0caf5';
      ctx.globalAlpha = 0.25 + rand() * 0.6;
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;
    // second moon, dim and huge behind the city
    const mx = 372;
    const my = 118;
    const mg = ctx.createRadialGradient(mx, my, 10, mx, my, 62);
    mg.addColorStop(0, 'rgba(255, 158, 100, 0.55)');
    mg.addColorStop(0.55, 'rgba(255, 0, 124, 0.22)');
    mg.addColorStop(1, 'rgba(255, 0, 124, 0)');
    ctx.fillStyle = mg;
    ctx.fillRect(mx - 70, my - 70, 140, 140);
    ctx.fillStyle = '#3a2233';
    ctx.beginPath();
    ctx.arc(mx, my, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a2a3d';
    ctx.beginPath();
    ctx.arc(mx - 8, my - 6, 26, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(mx - 30 + i * 9, my - 20 + (i % 3) * 14, 6, 3);
    }
  });
}

function makeMesas(): HTMLCanvasElement {
  return layer(LOW_W * 2, LOW_H, ctx => {
    const rand = seeded(23);
    const base = 176;
    ctx.fillStyle = '#12101c';
    ctx.beginPath();
    ctx.moveTo(0, LOW_H);
    ctx.lineTo(0, base);
    let x = 0;
    while (x < LOW_W * 2) {
      const w = 40 + rand() * 90;
      const h = 12 + rand() * 42;
      const top = base - h;
      ctx.lineTo(x + w * 0.18, top);
      ctx.lineTo(x + w * 0.82, top);
      ctx.lineTo(x + w, base);
      x += w + 8 + rand() * 30;
      ctx.lineTo(x, base);
    }
    ctx.lineTo(LOW_W * 2, LOW_H);
    ctx.closePath();
    ctx.fill();
    // rim light on mesa tops
    ctx.strokeStyle = 'rgba(255,0,124,0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();
  });
}

function makeCity(p: Palette): HTMLCanvasElement {
  return layer(LOW_W * 2, LOW_H, ctx => {
    const rand = seeded(47);
    const base = 190;
    let x = -10;
    while (x < LOW_W * 2 + 20) {
      const w = 14 + Math.floor(rand() * 26);
      const h = 30 + Math.floor(rand() * 95);
      const top = base - h;
      ctx.fillStyle = rand() > 0.5 ? '#0d0d16' : '#111120';
      ctx.fillRect(x, top, w, h);
      // roof detail
      ctx.fillStyle = '#080810';
      ctx.fillRect(x + 2, top - 3, Math.max(2, w * 0.3), 3);
      // windows
      for (let wy = top + 4; wy < base - 6; wy += 5) {
        for (let wx = x + 2; wx < x + w - 3; wx += 4) {
          const v = rand();
          if (v > 0.58) {
            ctx.fillStyle = v > 0.93 ? p.pink : v > 0.86 ? p.cyan : v > 0.7 ? '#e0af68' : '#3b4261';
            ctx.globalAlpha = 0.6 + rand() * 0.4;
            ctx.fillRect(wx, wy, 2, 3);
          }
        }
      }
      ctx.globalAlpha = 1;
      // neon strips + signs
      if (rand() > 0.55) {
        ctx.fillStyle = rand() > 0.5 ? p.pink : p.cyan;
        ctx.fillRect(x + w - 2, top + 6, 1, Math.min(h - 10, 18 + rand() * 30));
      }
      if (rand() > 0.72 && w > 20) {
        ctx.fillStyle = rand() > 0.5 ? p.amber : p.green;
        ctx.fillRect(x + 3, top + 8, w - 6, 3);
      }
      x += w + 1 + Math.floor(rand() * 4);
    }
    // haze at the base of the skyline
    const g = ctx.createLinearGradient(0, base - 40, 0, base + 6);
    g.addColorStop(0, 'rgba(58, 18, 51, 0)');
    g.addColorStop(1, 'rgba(58, 18, 51, 0.75)');
    ctx.fillStyle = g;
    ctx.fillRect(0, base - 40, LOW_W * 2, 46);
  });
}

function makeMid(): HTMLCanvasElement {
  return layer(LOW_W * 2, LOW_H, ctx => {
    const rand = seeded(91);
    // telegraph poles with sagging wires
    const poles: number[] = [];
    for (let x = 30; x < LOW_W * 2; x += 120 + rand() * 60) poles.push(Math.floor(x));
    ctx.strokeStyle = '#1a1a26';
    ctx.lineWidth = 1;
    for (let i = 0; i < poles.length - 1; i++) {
      const a = poles[i];
      const b = poles[i + 1];
      ctx.beginPath();
      ctx.moveTo(a, 158);
      ctx.quadraticCurveTo((a + b) / 2, 172, b, 158);
      ctx.stroke();
    }
    ctx.fillStyle = '#15121c';
    for (const x of poles) {
      ctx.fillRect(x - 1, 152, 3, FLOOR_LOW - 152);
      ctx.fillRect(x - 7, 156, 15, 2);
      ctx.fillRect(x - 5, 162, 11, 2);
    }
    // fence line
    for (let x = 0; x < LOW_W * 2; x += 9) {
      ctx.fillRect(x, FLOOR_LOW - 14, 2, 14);
    }
    ctx.fillRect(0, FLOOR_LOW - 11, LOW_W * 2, 1);
    ctx.fillRect(0, FLOOR_LOW - 5, LOW_W * 2, 1);
    // dark cacti silhouettes behind the fence
    for (let i = 0; i < 14; i++) {
      const x = Math.floor(rand() * LOW_W * 2);
      const h = 14 + rand() * 22;
      ctx.fillStyle = '#0f1a14';
      ctx.fillRect(x, FLOOR_LOW - h, 4, h);
      ctx.fillRect(x - 5, FLOOR_LOW - h * 0.6, 5, 2);
      ctx.fillRect(x - 5, FLOOR_LOW - h * 0.6 - 7, 2, 8);
      ctx.fillRect(x + 4, FLOOR_LOW - h * 0.75, 5, 2);
      ctx.fillRect(x + 7, FLOOR_LOW - h * 0.75 - 9, 2, 10);
    }
  });
}

type Puddle = {x: number; w: number};

function makeGround(puddles: Puddle[]): HTMLCanvasElement {
  return layer(LOW_W * 2, LOW_H - FLOOR_LOW, ctx => {
    const rand = seeded(133);
    const h = LOW_H - FLOOR_LOW;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2a1d24');
    g.addColorStop(0.2, '#1d151c');
    g.addColorStop(1, '#0d0a10');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, LOW_W * 2, h);
    // road edge
    ctx.fillStyle = '#3b2b33';
    ctx.fillRect(0, 0, LOW_W * 2, 1);
    ctx.fillStyle = '#4a3340';
    for (let x = 0; x < LOW_W * 2; x += 2) if (rand() > 0.4) ctx.fillRect(x, 1, 1, 1);
    // cracks and pebbles
    ctx.fillStyle = '#0a070c';
    for (let i = 0; i < 220; i++) {
      const x = rand() * LOW_W * 2;
      const y = 4 + rand() * (h - 6);
      const len = 2 + rand() * 9;
      ctx.fillRect(x, y, len, 1);
      if (rand() > 0.6) ctx.fillRect(x + len, y + 1, 1 + rand() * 4, 1);
    }
    ctx.fillStyle = '#3a2a33';
    for (let i = 0; i < 120; i++) ctx.fillRect(rand() * LOW_W * 2, 3 + rand() * (h - 4), 1, 1);
    // puddle basins (reflections drawn live)
    for (const pd of puddles) {
      ctx.fillStyle = '#0a0a14';
      ctx.beginPath();
      ctx.ellipse(pd.x, 12, pd.w / 2, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// ─── Renderer ──────────────────────────────────────────────────────────────

export type Renderer = {
  render(state: FrameState, time: number, dt: number): void;
  emitHit(x: number, y: number): void;
  emitExplosion(x: number, y: number): void;
  emitDust(x: number, y: number, strength: number): void;
  emitBreach(): void;
  shake(power: number): void;
};

export function createRenderer(display: HTMLCanvasElement, p: Palette): Renderer {
  const out = display.getContext('2d')!;
  const low = document.createElement('canvas');
  low.width = LOW_W;
  low.height = LOW_H;
  const ctx = low.getContext('2d')!;
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = LOW_W;
  glowCanvas.height = LOW_H;
  const glow = glowCanvas.getContext('2d')!;

  const puddles: Puddle[] = [{x: 140, w: 46}, {x: 410, w: 62}, {x: 640, w: 38}, {x: 860, w: 70}];
  const sky = makeSky(p);
  const mesas = makeMesas();
  const city = makeCity(p);
  const mid = makeMid();
  const ground = makeGround(puddles);

  const rain: RainDrop[] = Array.from({length: 110}, () => ({
    x: Math.random() * LOW_W,
    y: Math.random() * LOW_H,
    len: 5 + Math.random() * 7,
    speed: 170 + Math.random() * 90,
  }));

  const particles: Particle[] = [];
  const rings: Ring[] = [];
  let shakePower = 0;
  let breachFlash = 0;
  let saloonDamage = 0;

  const scanlines = layer(1, 4, c => {
    c.fillStyle = 'rgba(0,0,0,0.22)';
    c.fillRect(0, 0, 1, 1);
    c.fillStyle = 'rgba(0,0,0,0.08)';
    c.fillRect(0, 1, 1, 1);
  });
  const scanPattern = out.createPattern(scanlines, 'repeat')!;

  const vignette = layer(WORLD_W, WORLD_H, c => {
    const g = c.createRadialGradient(WORLD_W / 2, WORLD_H / 2, WORLD_H * 0.35, WORLD_W / 2, WORLD_H / 2, WORLD_H * 0.85);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    c.fillStyle = g;
    c.fillRect(0, 0, WORLD_W, WORLD_H);
  });

  function emit(count: number, x: number, y: number, color: string, speed: number, life: number, size: number, glowing: boolean, gravity: number, spread = Math.PI * 2, angle = 0) {
    for (let i = 0; i < count; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const v = speed * (0.4 + Math.random() * 0.8);
      particles.push({x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, maxLife: life, size, color, glow: glowing, gravity});
    }
  }

  function drawSaloon(t: number) {
    // Facade occupies world x 0..220 → low 0..110
    const x0 = 0;
    const w = 112;
    const top = 62;
    const flicker = Math.sin(t * 0.013) > 0.92 || Math.random() > 0.992 ? 0.35 : 1;
    // body planks
    ctx.fillStyle = '#231a24';
    ctx.fillRect(x0, top, w, FLOOR_LOW - top);
    ctx.fillStyle = '#1b141c';
    for (let y = top + 3; y < FLOOR_LOW; y += 4) ctx.fillRect(x0, y, w, 1);
    // side shadow
    const sg = ctx.createLinearGradient(x0 + w - 24, 0, x0 + w, 0);
    sg.addColorStop(0, 'rgba(0,0,0,0)');
    sg.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = sg;
    ctx.fillRect(x0 + w - 24, top, 24, FLOOR_LOW - top);
    // roofline + false front
    ctx.fillStyle = '#2d2130';
    ctx.fillRect(x0, top - 6, w + 4, 8);
    ctx.fillStyle = '#3a2a3b';
    ctx.fillRect(x0, top - 8, w + 4, 2);
    // balcony
    ctx.fillStyle = '#17111a';
    ctx.fillRect(x0, top + 52, w + 6, 3);
    ctx.fillStyle = '#2a1f2c';
    for (let bx = x0 + 2; bx < x0 + w + 4; bx += 5) ctx.fillRect(bx, top + 42, 1, 10);
    ctx.fillRect(x0, top + 41, w + 6, 1);
    // windows (amber, damaged ones flicker/dark)
    const windows = [[10, 20], [34, 20], [58, 20], [82, 20], [16, 72], [72, 72]];
    windows.forEach(([wx, wy], i) => {
      const broken = i < saloonDamage;
      ctx.fillStyle = '#0d0910';
      ctx.fillRect(x0 + wx - 1, top + wy - 1, 14, 18);
      const lit = broken ? (Math.random() > 0.5 ? '#3a2a1a' : '#120c10') : p.amber;
      ctx.fillStyle = lit;
      ctx.globalAlpha = broken ? 0.6 : 0.85 * flicker + 0.15;
      ctx.fillRect(x0 + wx, top + wy, 12, 16);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#0d0910';
      ctx.fillRect(x0 + wx + 5, top + wy, 2, 16);
      ctx.fillRect(x0 + wx, top + wy + 7, 12, 1);
      if (!broken) {
        glow.fillStyle = 'rgba(224,175,104,0.55)';
        glow.fillRect(x0 + wx, top + wy, 12, 16);
      } else if (Math.random() > 0.9) {
        emit(2, (x0 + wx + 6) / S, (top + wy + 8) / S, p.amber, 60, 0.4, 1, true, 200);
      }
    });
    // saloon doors
    ctx.fillStyle = '#0d0910';
    ctx.fillRect(x0 + 44, FLOOR_LOW - 34, 24, 34);
    ctx.fillStyle = '#2a1f2c';
    ctx.fillRect(x0 + 46, FLOOR_LOW - 32, 9, 24);
    ctx.fillRect(x0 + 57, FLOOR_LOW - 32, 9, 24);
    const dg = ctx.createLinearGradient(0, FLOOR_LOW - 34, 0, FLOOR_LOW);
    dg.addColorStop(0, 'rgba(224,175,104,0.35)');
    dg.addColorStop(1, 'rgba(224,175,104,0)');
    ctx.fillStyle = dg;
    ctx.fillRect(x0 + 44, FLOOR_LOW - 34, 24, 34);
    // neon marquee: LAST CALL
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(x0 + 6, top + 2, w - 14, 14);
    ctx.font = 'bold 10px "IBM Plex Mono", monospace';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = flicker < 1 ? '#7a3a5a' : p.pink;
    ctx.fillText('LAST CALL', x0 + 14, top + 9);
    glow.font = ctx.font;
    glow.textBaseline = 'middle';
    glow.fillStyle = p.pink;
    glow.globalAlpha = flicker;
    glow.fillText('LAST CALL', x0 + 14, top + 9);
    glow.globalAlpha = 1;
    // neon cactus sign on the roof
    const cx = x0 + w - 6;
    const cy = top - 8;
    const drawCactusSign = (c: CanvasRenderingContext2D) => {
      c.fillStyle = p.green;
      c.fillRect(cx - 2, cy - 34, 4, 34);
      c.fillRect(cx - 12, cy - 22, 10, 3);
      c.fillRect(cx - 12, cy - 30, 3, 9);
      c.fillRect(cx + 2, cy - 16, 9, 3);
      c.fillRect(cx + 8, cy - 26, 3, 11);
      c.fillStyle = p.pink;
      c.fillRect(cx - 3, cy - 37, 6, 3);
    };
    drawCactusSign(ctx);
    glow.globalAlpha = 0.9 * flicker;
    drawCactusSign(glow);
    glow.globalAlpha = 1;
    // sign post
    ctx.fillStyle = '#3b4261';
    ctx.fillRect(cx - 1, cy, 2, 8);
  }

  function drawPlayer(pl: PlayerState, t: number) {
    const scale = 3;
    const px = Math.round(pl.x * S) - 24;
    const py = Math.round(pl.y * S) - 72;
    const airborne = pl.y < FLOOR - 0.5;
    let legs = LEGS.stand;
    let bob = 0;
    if (airborne) legs = LEGS.jump;
    else if (pl.moving) {
      const f = Math.floor(pl.runPhase) % 4;
      legs = [LEGS.run0, LEGS.run1, LEGS.run2, LEGS.run1][f];
      bob = f % 2 === 1 ? 1 : 0;
    }
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(px + 24, FLOOR_LOW + 1, airborne ? 12 : 18, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    const rows = [...PLAYER_TOP, ...legs];
    const recoil = Math.round(pl.recoil);
    ctx.drawImage(sprite('player-body', rows, scale), px - recoil, py + bob);
    glow.drawImage(sprite('player-body', rows, scale, true), px - recoil, py + bob);
    if (pl.flash > 0) {
      const frame = MUZZLE[pl.flash % 2];
      const mx = px + 46;
      const my = py + 30 + bob;
      ctx.drawImage(sprite(`muzzle-${pl.flash % 2}`, frame, 3), mx, my);
      glow.drawImage(sprite(`muzzle-${pl.flash % 2}`, frame, 3, true), mx - 2, my - 2);
      // muzzle light on the ground
      glow.fillStyle = 'rgba(224,175,104,0.35)';
      glow.fillRect(px, FLOOR_LOW - 2, 90, 3);
    }
    void t;
  }

  function drawDrone(d: DroneState, t: number) {
    const bobY = Math.sin(t * 0.004 + d.phase) * 4;
    const dx = Math.round(d.x * S) - 21;
    const dy = Math.round((d.y + bobY) * S) - 18;
    const frame = Math.floor(t / 45) % 2;
    // shadow on the ground
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(dx + 21, FLOOR_LOW + 1, 14, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(sprite(`drone-${frame}`, DRONE_FRAMES[frame], 3), dx, dy);
    glow.drawImage(sprite(`drone-${frame}`, DRONE_FRAMES[frame], 3, true), dx, dy);
    // exhaust trail
    if (Math.random() > 0.5) emit(1, d.x + 30, d.y + bobY + 30, p.cyan, 30, 0.35, 1, true, -40, 0.6, Math.PI / 2);
    // search beam every few seconds
    if (Math.sin(t * 0.002 + d.phase * 3) > 0.96) {
      glow.fillStyle = 'rgba(255,0,124,0.25)';
      glow.beginPath();
      glow.moveTo(dx + 18, dy + 24);
      glow.lineTo(dx - 14, FLOOR_LOW);
      glow.lineTo(dx + 46, FLOOR_LOW);
      glow.closePath();
      glow.fill();
    }
  }

  function drawBullets(bullets: BulletState[]) {
    for (const b of bullets) {
      const x = b.x * S;
      const y = b.y * S;
      const px = b.px * S;
      // trail
      const trail = ctx.createLinearGradient(px - 12, 0, x, 0);
      trail.addColorStop(0, 'rgba(224,175,104,0)');
      trail.addColorStop(1, 'rgba(255,246,214,0.9)');
      ctx.fillStyle = trail;
      ctx.fillRect(Math.min(px, x) - 12, y - 1, Math.abs(x - px) + 12, 2);
      ctx.fillStyle = ART.Y;
      ctx.fillRect(x - 3, y - 1, 6, 2);
      glow.fillStyle = p.amber;
      glow.fillRect(x - 8, y - 2, 12, 4);
    }
  }

  function updateParticles(dt: number) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const q = particles[i];
      q.life -= dt;
      if (q.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      q.vy += q.gravity * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      if (q.y > FLOOR && q.gravity > 0) {
        q.y = FLOOR;
        q.vy *= -0.35;
        q.vx *= 0.6;
      }
      const a = q.life / q.maxLife;
      ctx.globalAlpha = a;
      ctx.fillStyle = q.color;
      const sz = Math.max(1, Math.round(q.size * (0.5 + a)));
      ctx.fillRect(Math.round(q.x * S), Math.round(q.y * S), sz, sz);
      if (q.glow) {
        glow.globalAlpha = a;
        glow.fillStyle = q.color;
        glow.fillRect(Math.round(q.x * S) - 1, Math.round(q.y * S) - 1, sz + 2, sz + 2);
        glow.globalAlpha = 1;
      }
    }
    ctx.globalAlpha = 1;
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.life -= dt;
      r.r += (r.maxR - r.r) * Math.min(1, dt * 9);
      if (r.life <= 0) {
        rings.splice(i, 1);
        continue;
      }
      glow.strokeStyle = r.color;
      glow.globalAlpha = Math.max(0, r.life * 2.2);
      glow.lineWidth = 2;
      glow.beginPath();
      glow.arc(r.x * S, r.y * S, r.r * S, 0, Math.PI * 2);
      glow.stroke();
      glow.globalAlpha = 1;
    }
  }

  function drawRain(dt: number) {
    ctx.strokeStyle = 'rgba(180, 220, 255, 0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const d of rain) {
      d.y += d.speed * dt;
      d.x += 22 * dt;
      if (d.y > FLOOR_LOW + 2) {
        // splash
        emit(1, d.x / S, FLOOR / 1 - 2, '#9fd8ff', 20, 0.18, 1, false, 300, 1.2, -Math.PI / 2);
        d.y = -10 - Math.random() * 20;
        d.x = Math.random() * LOW_W;
      }
      if (d.x > LOW_W) d.x -= LOW_W;
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - 1, d.y - d.len);
    }
    ctx.stroke();
  }

  function drawPuddles(t: number, scroll: number) {
    for (const pd of puddles) {
      const x = ((pd.x - scroll) % (LOW_W * 2) + LOW_W * 2) % (LOW_W * 2);
      if (x < -60 || x > LOW_W + 60) continue;
      const shimmer = 0.35 + Math.sin(t * 0.006 + pd.x) * 0.15;
      const g = ctx.createLinearGradient(0, FLOOR_LOW + 8, 0, FLOOR_LOW + 16);
      g.addColorStop(0, `rgba(255,0,124,${shimmer})`);
      g.addColorStop(0.5, `rgba(125,207,255,${shimmer * 0.7})`);
      g.addColorStop(1, 'rgba(125,207,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, FLOOR_LOW + 12, pd.w / 2 - 1, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      glow.fillStyle = `rgba(255,0,124,${shimmer * 0.5})`;
      glow.beginPath();
      glow.ellipse(x, FLOOR_LOW + 12, pd.w / 2 - 2, 2.5, 0, 0, Math.PI * 2);
      glow.fill();
    }
  }

  function drawTiled(img: HTMLCanvasElement, scroll: number, y: number) {
    const w = img.width;
    const off = ((scroll % w) + w) % w;
    ctx.drawImage(img, -off, y);
    ctx.drawImage(img, w - off, y);
  }

  function drawHud(state: FrameState, t: number) {
    out.save();
    out.font = '600 16px "IBM Plex Mono", monospace';
    out.textBaseline = 'middle';
    const panel = (x: number, w: number, label: string, color: string) => {
      out.fillStyle = 'rgba(15, 15, 23, 0.82)';
      out.fillRect(x, 16, w, 36);
      out.fillStyle = color;
      out.fillRect(x, 16, 3, 36);
      out.shadowColor = color;
      out.shadowBlur = 12;
      out.fillStyle = color;
      out.fillText(label, x + 14, 34);
      out.shadowBlur = 0;
    };
    panel(18, 236, `BOUNTY ¢${String(state.score).padStart(5, '0')}`, p.green);
    const hp = Math.max(0, 3 - state.breaches);
    panel(WORLD_W - 250, 232, `SALOON ${'▮'.repeat(hp)}${'▯'.repeat(3 - hp)}`, hp <= 1 ? p.pink : p.paper);
    // wave ticker
    out.fillStyle = 'rgba(192,202,245,0.55)';
    out.font = '500 12px "IBM Plex Mono", monospace';
    out.textAlign = 'center';
    out.fillText(`SHINJUKU MESA // ${Math.floor(t / 1000) % 2 === 0 ? 'HELIX POSSE INBOUND' : 'HOLD THE LINE'}`, WORLD_W / 2, 34);
    out.textAlign = 'start';
    out.restore();
  }

  function drawOverlay(state: FrameState) {
    out.save();
    out.fillStyle = 'rgba(9, 9, 15, 0.66)';
    out.fillRect(0, 0, WORLD_W, WORLD_H);
    out.textAlign = 'center';
    out.textBaseline = 'middle';
    const title = state.lost ? 'BOUNTY LOST' : 'DRAW FAST';
    out.font = 'italic 900 72px "Barlow Condensed", sans-serif';
    out.fillStyle = p.pink;
    out.fillText(title, WORLD_W / 2 + 3, WORLD_H / 2 - 18 + 3);
    out.fillStyle = p.cyan;
    out.fillText(title, WORLD_W / 2 - 3, WORLD_H / 2 - 18 - 3);
    out.shadowColor = state.lost ? p.pink : p.green;
    out.shadowBlur = 28;
    out.fillStyle = state.lost ? p.paper : p.green;
    out.fillText(title, WORLD_W / 2, WORLD_H / 2 - 18);
    out.shadowBlur = 0;
    out.font = '500 15px "IBM Plex Mono", monospace';
    out.fillStyle = p.paper;
    out.fillText(state.lost ? 'THE HELIX POSSE TOOK THE LAST CALL' : 'THE HELIX POSSE IS RIDING IN — DEFEND THE SALOON', WORLD_W / 2, WORLD_H / 2 + 30);
    out.fillStyle = 'rgba(192,202,245,0.6)';
    out.fillText('A / D MOVE  ·  W JUMP  ·  SPACE FIRE', WORLD_W / 2, WORLD_H / 2 + 56);
    out.restore();
  }

  return {
    emitHit(x, y) {
      emit(10, x, y, p.cyan, 220, 0.35, 2, true, 500);
      emit(6, x, y, ART.Y, 160, 0.2, 1, true, 0);
      shakePower = Math.max(shakePower, 2.5);
    },
    emitExplosion(x, y) {
      emit(26, x, y, p.pink, 260, 0.7, 2, true, 420);
      emit(16, x, y, ART.W, 200, 0.6, 2, false, 600);
      emit(10, x, y, p.amber, 140, 0.9, 3, true, 300);
      rings.push({x, y, r: 6, maxR: 70, life: 0.42, color: p.pink});
      rings.push({x, y, r: 2, maxR: 40, life: 0.3, color: ART.Y});
      shakePower = Math.max(shakePower, 7);
    },
    emitDust(x, y, strength) {
      emit(Math.round(3 * strength), x, y, '#4a3a3f', 70 * strength, 0.4, 2, false, 120, 1.4, -Math.PI / 2 - 0.4);
    },
    emitBreach() {
      breachFlash = 0.5;
      saloonDamage = Math.min(6, saloonDamage + 2);
      shakePower = Math.max(shakePower, 11);
      emit(30, 180, 300, p.amber, 260, 0.8, 2, true, 400);
    },
    shake(power) {
      shakePower = Math.max(shakePower, power);
    },
    render(state, time, dt) {
      if (!state.running && state.breaches === 0) saloonDamage = 0;
      const scroll = time * 0.001;

      glow.clearRect(0, 0, LOW_W, LOW_H);
      ctx.drawImage(sky, 0, 0);
      drawTiled(mesas, scroll * 4, 0);
      drawTiled(city, scroll * 9, 0);
      // city glow bleed into the sky
      glow.globalAlpha = 0.35;
      drawTiledOn(glow, city, scroll * 9, 0);
      glow.globalAlpha = 1;
      drawTiled(mid, scroll * 22, 0);
      drawTiled(ground, scroll * 60, FLOOR_LOW);
      drawPuddles(time, scroll * 60);
      drawSaloon(time);

      for (const d of state.drones) if (d.alive) drawDrone(d, time);
      drawPlayer(state.player, time);
      drawBullets(state.bullets);
      updateParticles(dt);
      drawRain(dt);

      // atmosphere: pink haze on the right where the posse rides in
      const haze = ctx.createLinearGradient(LOW_W - 140, 0, LOW_W, 0);
      haze.addColorStop(0, 'rgba(255,0,124,0)');
      haze.addColorStop(1, 'rgba(255,0,124,0.14)');
      ctx.fillStyle = haze;
      ctx.fillRect(LOW_W - 140, 0, 140, LOW_H);

      // glow composite
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.filter = 'blur(2px)';
      ctx.globalAlpha = 0.75;
      ctx.drawImage(glowCanvas, 0, 0);
      ctx.filter = 'blur(7px)';
      ctx.globalAlpha = 0.45;
      ctx.drawImage(glowCanvas, 0, 0);
      ctx.restore();

      if (breachFlash > 0) {
        breachFlash -= dt;
        ctx.fillStyle = `rgba(255,0,124,${Math.max(0, breachFlash) * 0.6})`;
        ctx.fillRect(0, 0, LOW_W, LOW_H);
      }

      // upscale with shake
      shakePower = Math.max(0, shakePower - dt * 26);
      const sx = (Math.random() - 0.5) * shakePower * 2;
      const sy = (Math.random() - 0.5) * shakePower * 2;
      out.imageSmoothingEnabled = false;
      out.fillStyle = '#07070d';
      out.fillRect(0, 0, WORLD_W, WORLD_H);
      out.drawImage(low, sx, sy, WORLD_W, WORLD_H);

      // CRT
      out.fillStyle = scanPattern;
      out.fillRect(0, 0, WORLD_W, WORLD_H);
      out.drawImage(vignette, 0, 0);

      drawHud(state, time);
      if (!state.running) drawOverlay(state);
    },
  };

  function drawTiledOn(target: CanvasRenderingContext2D, img: HTMLCanvasElement, scroll: number, y: number) {
    const w = img.width;
    const off = ((scroll % w) + w) % w;
    target.drawImage(img, -off, y);
    target.drawImage(img, w - off, y);
  }
}
