import {useEffect, useRef} from 'react';
import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {BokehPass} from 'three/examples/jsm/postprocessing/BokehPass.js';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {Reflector} from 'three/examples/jsm/objects/Reflector.js';

/**
 * Cinematic hero: a generated Shinjuku Mesa skyline at last light, rain,
 * a neon ground grid, and two low-poly outlaws slowly turning on lit
 * turntables. Everything is procedural — no model files to load.
 */

const PALETTE = {
  ink: 0x0f0f17,
  night: 0x16161e,
  raised: 0x1a1b26,
  slate: 0x292e42,
  cyan: 0x7dcfff,
  pink: 0xff007c,
  green: 0x9ece6a,
  amber: 0xe0af68,
  rust: 0xff9e64,
  paper: 0xc0caf5,
  chrome: 0xb8c4d6,
} as const;

function mat(color: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({color, roughness: 0.62, metalness: 0.18, flatShading: true, ...extra});
}

function glow(color: number, intensity = 2.4) {
  return new THREE.MeshStandardMaterial({color, emissive: color, emissiveIntensity: intensity, roughness: 0.4, metalness: 0});
}

function box(w: number, h: number, d: number, material: THREE.Material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  return mesh;
}

// ─── Holographic bounty cards ─────────────────────────────────────────────

type CardSpec = {src: string; name: string; role: string; bounty: string; accent: number; spin: number; phase: number};

const CARD_W = 1.05;
const CARD_H = 2.1;

function dossierTexture(spec: CardSpec): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  const accent = `#${spec.accent.toString(16).padStart(6, '0')}`;
  ctx.fillStyle = '#0f0f17';
  ctx.fillRect(0, 0, 512, 1024);
  ctx.strokeStyle = 'rgba(125,207,255,0.05)';
  ctx.lineWidth = 2;
  for (let y = 0; y < 1024; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); }
  for (let x = 0; x < 512; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1024); ctx.stroke(); }
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = '600 22px "IBM Plex Mono", monospace';
  ctx.fillText('SHINJUKU MESA // BOUNTY OFFICE', 256, 96);
  ctx.fillStyle = '#c0caf5';
  ctx.font = 'italic 900 150px "Barlow Condensed", Impact, sans-serif';
  ctx.fillText('WANTED', 256, 260);
  ctx.fillStyle = accent;
  ctx.fillRect(64, 300, 384, 4);
  ctx.font = 'italic 900 88px "Barlow Condensed", Impact, sans-serif';
  ctx.fillStyle = '#c0caf5';
  spec.name.split(' ').forEach((line, i) => ctx.fillText(line, 256, 420 + i * 90));
  ctx.font = '500 24px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#8b93b8';
  ctx.fillText(spec.role, 256, 620);
  ctx.fillStyle = accent;
  ctx.font = '600 26px "IBM Plex Mono", monospace';
  ctx.fillText('REWARD', 256, 700);
  ctx.fillStyle = '#e0af68';
  ctx.font = 'italic 900 92px "Barlow Condensed", Impact, sans-serif';
  ctx.fillText(spec.bounty, 256, 790);
  let x = 72;
  let seed = spec.name.length * 977;
  while (x < 440) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const w = 5 + (seed % 9);
    ctx.fillStyle = seed % 3 === 0 ? accent : '#c0caf5';
    ctx.fillRect(x, 860, w, 90);
    x += w + 5 + (seed % 6);
  }
  ctx.fillStyle = '#565f89';
  ctx.font = '500 18px "IBM Plex Mono", monospace';
  ctx.fillText('DEAD OR ALIVE  ·  LAST CALL GAMES  ·  2086', 256, 990);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 8;
  return texture;
}

function buildHoloCard(front: THREE.Texture, spec: CardSpec): {group: THREE.Group; material: THREE.ShaderMaterial} {
  const group = new THREE.Group();
  group.userData.holoCard = true;
  const back = dossierTexture(spec);
  // One shader, two single-sided meshes (front + back-flipped) so faces never overlap in the same
  // pixel and fight for draw order. Shared uniforms via a common object.
  const shared = {
    uTime: {value: 0},
    uFlicker: {value: 0},
    uAccent: {value: new THREE.Color(spec.accent)},
  };
  const makeMaterial = (map: THREE.Texture, isFront: boolean) => new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
    uniforms: {uMap: {value: map}, uIsFront: {value: isFront ? 1 : 0}, ...shared},
    vertexShader: `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        vec3 p = position;
        p.z += (1.0 - pow(uv.x * 2.0 - 1.0, 2.0)) * 0.09;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      uniform sampler2D uMap; uniform float uIsFront; uniform float uTime; uniform float uFlicker; uniform vec3 uAccent;
      varying vec2 vUv;
      void main(){
        vec2 uv = vUv;
        float ca = (0.0012 + 0.003 * uFlicker) * uIsFront;
        vec3 col;
        col.r = texture2D(uMap, uv + vec2(ca, 0.0)).r;
        col.g = texture2D(uMap, uv).g;
        col.b = texture2D(uMap, uv - vec2(ca, 0.0)).b;
        col *= 1.0 + 0.08 * uIsFront;
        float scan = 0.94 + 0.06 * sin(uv.y * 90.0 - uTime * 2.5);
        float roll = fract(uv.y * 0.6 - uTime * 0.09);
        float band = 1.0 + 0.12 * (1.0 - smoothstep(0.0, 0.08, abs(roll - 0.5)));
        col *= scan * band;
        col = mix(col, col * (0.7 + 0.5 * uAccent), 0.18);
        float edge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
        float frame = 1.0 - smoothstep(0.0, 0.014, edge);
        float inner = smoothstep(0.014, 0.024, edge) * (1.0 - smoothstep(0.024, 0.036, edge));
        col = mix(col, uAccent * 1.9, frame);
        col += uAccent * inner * 0.7;
        float alpha = (0.94 - 0.18 * uFlicker) * smoothstep(0.0, 0.05, uv.y);
        gl_FragColor = vec4(col, alpha);
      }`,
  });
  const geometry = new THREE.PlaneGeometry(CARD_W, CARD_H, 24, 2);
  const frontMesh = new THREE.Mesh(geometry, makeMaterial(front, true));
  frontMesh.position.y = 0.55 + CARD_H / 2;
  frontMesh.renderOrder = 10;
  group.add(frontMesh);
  const backMesh = new THREE.Mesh(geometry, makeMaterial(back, false));
  backMesh.position.y = 0.55 + CARD_H / 2;
  backMesh.rotation.y = Math.PI; // faces the other way; its own front side is the card's back
  backMesh.renderOrder = 10;
  group.add(backMesh);
  const material = frontMesh.material as THREE.ShaderMaterial; // uniforms are shared objects
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(CARD_W * 0.42, 0.72, 0.56, 24, 1, true),
    new THREE.MeshBasicMaterial({color: spec.accent, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending}),
  );
  beam.position.y = 0.3;
  group.add(beam);
  const beamCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.14, 0.56, 12, 1, true),
    new THREE.MeshBasicMaterial({color: spec.accent, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending}),
  );
  beamCore.position.y = 0.3;
  group.add(beamCore);
  const light = new THREE.PointLight(spec.accent, 4, 3.5, 1.8);
  light.position.set(0, 1.4, 0.4);
  group.add(light);
  return {group, material};
}

const CARDS: CardSpec[] = [
  {src: '/art/sable-reyes.jpg', name: 'SABLE REYES', role: 'RAIL MARSHAL // EX-CORP', bounty: '¢1,200,000', accent: PALETTE.cyan, spin: 0.26, phase: 0.4},
  {src: '/art/koyote.jpg', name: 'K-0Y0TE', role: 'SYNTHETIC DRIFTER', bounty: '¢850,000', accent: PALETTE.pink, spin: -0.21, phase: 2.3},
];

function buildTurntable(color: number): THREE.Group {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.06, 32), mat(0x0b0b12, {metalness: 0.5, roughness: 0.3}));
  g.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.02, 8, 48), glow(color, 2.2));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.035;
  g.add(ring);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.012, 8, 48), glow(color, 1.2));
  inner.rotation.x = Math.PI / 2;
  inner.position.y = 0.035;
  g.add(inner);
  const light = new THREE.PointLight(color, 6, 4, 1.6);
  light.position.set(0, 0.3, 0);
  g.add(light);
  return g;
}

function buildCactusSign(): THREE.Group {
  const g = new THREE.Group();
  const glass = new THREE.MeshStandardMaterial({color: 0x2a5a1e, emissive: 0x4fa832, emissiveIntensity: 0.28, roughness: 0.3, transparent: true, opacity: 0.85});
  const core = new THREE.MeshBasicMaterial({color: 0xdcffb0, toneMapped: false});
  const tube = (r: number, h: number, x: number, y: number, rz = 0) => {
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 10), glass);
    outer.position.set(x, y, 0);
    outer.rotation.z = rz;
    g.add(outer);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.3, r * 0.3, h * 0.98, 6), core);
    inner.position.set(x, y, 0);
    inner.rotation.z = rz;
    inner.userData.neonCore = true;
    g.add(inner);
  };
  tube(0.09, 2.4, 0, 1.2);
  for (const [side, y] of [[-1, 1.1], [1, 1.5]] as const) {
    tube(0.06, 0.5, side * 0.3, y, Math.PI / 2);
    tube(0.06, 0.55, side * 0.52, y + 0.28);
  }
  const light = new THREE.PointLight(PALETTE.green, 3.2, 7, 1.6);
  light.position.set(0, 1.6, 0.4);
  light.userData.neonLight = true;
  g.add(light);
  return g;
}

function windowTexture(seed: number, cols: number, rows: number, tint: string, lit = 0.62): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = cols * 8;
  canvas.height = rows * 8;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#05060a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  let r = seed;
  const rand = () => ((r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  // floor bands (dark mullions between window rows) read as real facades
  ctx.fillStyle = '#0a0b12';
  for (let y = 0; y < rows; y++) ctx.fillRect(0, y * 8 + 7, canvas.width, 1);
  for (let y = 0; y < rows; y++) {
    // whole floors go dark or lit together — offices, not random noise
    const floorLit = rand() < lit;
    const floorWarm = rand() > 0.5;
    for (let x = 0; x < cols; x++) {
      const v = rand();
      if (floorLit && v > 0.25) {
        const w = v > 0.96 ? tint : floorWarm ? '#d9b27a' : '#8fa4c9';
        // recessed pane: dim outer ring, bright inner, top edge darker (overhang)
        ctx.fillStyle = w;
        ctx.globalAlpha = (0.35 + rand() * 0.6) * 0.45;
        ctx.fillRect(x * 8 + 1, y * 8 + 1, 6, 6);
        ctx.globalAlpha = 0.35 + rand() * 0.6;
        ctx.fillRect(x * 8 + 2, y * 8 + 3, 4, 4);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x * 8 + 1, y * 8 + 1, 6, 1);
        // slight interior detail
        if (rand() > 0.7) {
          ctx.fillStyle = '#05060a';
          ctx.globalAlpha = 0.5;
          ctx.fillRect(x * 8 + 1 + Math.floor(rand() * 4), y * 8 + 1, 2, 5);
        }
      }
    }
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function billboardTexture(seed: number, text: string, fg: string, bg: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${text.length > 6 ? 96 : 140}px "Barlow Condensed", Impact, sans-serif`;
  ctx.fillText(text, 256, 128);
  // scan bars so it reads as an LED wall not a flat quad
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  for (let y = 0; y < 256; y += 4) ctx.fillRect(0, y, 512, 1);
  let r = seed;
  const rand = () => ((r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 6; i++) ctx.fillRect(rand() * 512, 0, 2 + rand() * 20, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const BILLBOARDS: Array<[string, string, string]> = [
  ['ラストコール', '#ff5aa7', '#3a0a22'],
  ['MESA', '#7dcfff', '#062a3a'],
  ['DRINK', '#e0af68', '#3a2408'],
  ['電気', '#9ece6a', '#0d2a12'],
  ['BOUNTY', '#ff9e64', '#3a1a08'],
  ['夜', '#bb9af7', '#1e0d3a'],
];

function tower(seed: number, x: number, z: number, w: number, d: number, h: number, tint: string, lit: number): THREE.Group {
  const g = new THREE.Group();
  let r = seed;
  const rand = () => ((r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const facade = new THREE.MeshStandardMaterial({color: 0x0a0b12, roughness: 0.55, metalness: 0.35});
  const addBlock = (bx: number, by: number, bz: number, bw: number, bh: number, bd: number) => {
    const tex = windowTexture(seed + Math.round(by * 13), Math.max(4, Math.round(bw * 5)), Math.max(4, Math.round(bh * 3.2)), tint, lit);
    const mats = [
      new THREE.MeshStandardMaterial({map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 1.35, color: 0x0a0b12, roughness: 0.5, metalness: 0.3}),
      new THREE.MeshStandardMaterial({map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 1.35, color: 0x0a0b12, roughness: 0.5, metalness: 0.3}),
      facade, facade,
      new THREE.MeshStandardMaterial({map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 1.35, color: 0x0a0b12, roughness: 0.5, metalness: 0.3}),
      new THREE.MeshStandardMaterial({map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 1.35, color: 0x0a0b12, roughness: 0.5, metalness: 0.3}),
    ];
    const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mats);
    m.position.set(bx, by + bh / 2, bz);
    g.add(m);
    return m;
  };
  // main shaft, then setbacks stepping in as it rises
  addBlock(0, 0, 0, w, h, d);
  let cw = w, cd = d, cy = h;
  const setbacks = rand() > 0.35 ? 1 + Math.floor(rand() * 2) : 0;
  for (let i = 0; i < setbacks; i++) {
    cw *= 0.62 + rand() * 0.2;
    cd *= 0.62 + rand() * 0.2;
    const sh = h * (0.18 + rand() * 0.22);
    addBlock((rand() - 0.5) * (w - cw) * 0.6, cy, (rand() - 0.5) * (d - cd) * 0.6, cw, sh, cd);
    cy += sh;
  }
  // roof: mechanical box + spire + red aviation light
  const roofMat = new THREE.MeshStandardMaterial({color: 0x07080d, roughness: 0.9});
  const roofBox = new THREE.Mesh(new THREE.BoxGeometry(cw * 0.35, 0.6, cd * 0.35), roofMat);
  roofBox.position.set(cw * 0.2, cy + 0.3, 0);
  g.add(roofBox);
  if (rand() > 0.4) {
    const spireH = 1.5 + rand() * 4;
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.08, spireH, 6), roofMat);
    spire.position.set(0, cy + spireH / 2, 0);
    g.add(spire);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), glow(0xff2a3a, 3));
    beacon.position.set(0, cy + spireH, 0);
    beacon.userData.beacon = true;
    g.add(beacon);
  }
  // rooftop edge strip
  if (rand() > 0.5) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(cw + 0.05, 0.06, 0.06), glow(rand() > 0.5 ? PALETTE.pink : PALETTE.cyan, 2.5));
    strip.position.set(0, cy + 0.03, cd / 2 + 0.03);
    g.add(strip);
  }
  // giant LED billboard on the street face of bigger towers
  if (w > 2.4 && rand() > 0.45) {
    const [text, fg, bg] = BILLBOARDS[Math.floor(rand() * BILLBOARDS.length)];
    const bw = w * 0.8;
    const bh = bw * 0.5;
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(bw, bh),
      new THREE.MeshBasicMaterial({map: billboardTexture(seed, text, fg, bg), toneMapped: false}),
    );
    board.position.set(0, h * (0.3 + rand() * 0.4), d / 2 + 0.03);
    board.userData.billboard = true;
    g.add(board);
    // frame + light spill
    const frame = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.12, bh + 0.12, 0.05), roofMat);
    frame.position.copy(board.position);
    frame.position.z -= 0.02;
    g.add(frame);
    const spill = new THREE.PointLight(new THREE.Color(fg), 3, w * 3, 1.5);
    spill.position.set(0, board.position.y, d / 2 + 1.2);
    g.add(spill);
  }
  // vertical neon sign strips down the corner
  if (rand() > 0.5) {
    const color = rand() > 0.5 ? PALETTE.pink : PALETTE.cyan;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.09, h * (0.3 + rand() * 0.4), 0.09), glow(color, 3.2));
    strip.position.set(w / 2 + 0.06, h * 0.45, d / 2 + 0.06);
    g.add(strip);
  }
  g.position.set(x, 0, z);
  return g;
}

function buildCity(): THREE.Group {
  const g = new THREE.Group();
  let seed = 7;
  const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  // Row A: near-mid towers (z -14..-22), taller, with billboards
  for (let i = 0; i < 16; i++) {
    const w = 1.8 + rand() * 2.6;
    const h = 4 + rand() * 7;
    const d = 1.8 + rand() * 2.2;
    const x = -26 + i * 3.6 + rand() * 1.4;
    const z = -22 - rand() * 8;
    g.add(tower(i * 31 + 3, x, z, w, d, h, i % 3 === 0 ? '#ff5aa7' : '#7dcfff', 0.45 + rand() * 0.2));
  }
  // Row B: far towers (z -28..-40), taller still, dimmer
  for (let i = 0; i < 22; i++) {
    const w = 1.6 + rand() * 2.2;
    const h = 9 + rand() * 18;
    const d = 1.6 + rand() * 2;
    const x = -32 + i * 3.0 + rand() * 1.2;
    const z = -36 - rand() * 12;
    g.add(tower(i * 17 + 101, x, z, w, d, h, i % 4 === 0 ? '#ff5aa7' : '#7dcfff', 0.35 + rand() * 0.25));
  }
  // Row C: distant megastructures (z -50..-60) — silhouettes with sparse lights
  for (let i = 0; i < 9; i++) {
    const w = 4 + rand() * 6;
    const h = 18 + rand() * 22;
    const x = -40 + i * 10 + rand() * 4;
    const z = -60 - rand() * 12;
    g.add(tower(i * 53 + 400, x, z, w, w * 0.8, h, '#7dcfff', 0.2 + rand() * 0.2));
  }
  // Mesas on the horizon flanks
  const mesaMat = mat(0x0a0a12, {roughness: 1});
  for (const [x, w, h] of [[-38, 16, 6], [-20, 9, 3.6], [26, 11, 4.4], [40, 18, 7]] as const) {
    const mesa = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.6, w, h, 7), mesaMat);
    mesa.position.set(x, h / 2 - 0.2, -56);
    g.add(mesa);
  }
  // Ground-level light pollution: warm haze planes hugging the skyline base
  for (let i = 0; i < 3; i++) {
    const haze = new THREE.Mesh(
      new THREE.PlaneGeometry(90, 6 + i * 3),
      new THREE.MeshBasicMaterial({
        color: i === 1 ? 0x3a1233 : 0x1e1a33,
        transparent: true,
        opacity: 0.32 - i * 0.08,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    haze.position.set(0, 3 + i * 2.5, -30 - i * 10);
    g.add(haze);
  }
  return g;
}

function buildWetStreet(width: number, height: number): Reflector {
  const reflector = new Reflector(new THREE.PlaneGeometry(120, 120), {
    clipBias: 0.003,
    textureWidth: Math.max(512, Math.round(width * 0.5)),
    textureHeight: Math.max(256, Math.round(height * 0.5)),
    color: 0x9aa0c0,
  });
  reflector.rotation.x = -Math.PI / 2;
  reflector.position.y = -0.035;
  reflector.renderOrder = -1;
  // Hide hologram cards from the mirror pass: they are double-sided transparent quads that shimmer badly
  // when reflected, and a hologram has no physical surface to reflect anyway.
  const originalOnBeforeRender = reflector.onBeforeRender.bind(reflector);
  reflector.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
    const hidden: THREE.Object3D[] = [];
    scene.traverse(o => { if (o.userData.holoCard && o.visible) { o.visible = false; hidden.push(o); } });
    originalOnBeforeRender(renderer, scene, camera, geometry, material, group);
    hidden.forEach(o => { o.visible = true; });
  };
  const material = reflector.material as THREE.ShaderMaterial;
  material.uniforms.uTime = {value: 0};
  material.transparent = true;
  material.fragmentShader = `
    uniform vec3 color; uniform sampler2D tDiffuse; uniform float uTime;
    varying vec4 vUv; varying vec3 vWorld;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
      return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
    void main() {
      vec4 uv = vUv;
      // ripples + rain-drop rings distort the reflection
      float r1 = noise(vWorld.xz * 2.2 + vec2(uTime * 0.18, -uTime * 0.1));
      float r2 = noise(vWorld.xz * 6.0 - vec2(uTime * 0.3, uTime * 0.2));
      uv.xy += (vec2(r1, r2) - 0.5) * 0.022 * uv.w;
      vec4 base = texture2DProj(tDiffuse, uv);
      // wetness mask: puddles are mirror-like, asphalt between is dull. Big soft blobs + fine grit.
      float puddle = smoothstep(0.42, 0.62, noise(vWorld.xz * 0.28 + 3.7));
      float grit = noise(vWorld.xz * 14.0);
      float wet = mix(0.35, 0.95, puddle) * (0.85 + 0.15 * grit);
      // fresnel: reflections stronger at grazing angles (far)
      float dist = length(vWorld.xz);
      float grazing = smoothstep(2.0, 24.0, dist);
      wet *= 0.7 + 0.3 * grazing;
      vec3 asphalt = vec3(0.030, 0.031, 0.048);
      vec3 col = mix(asphalt, base.rgb * color, wet);
      // distance fade into fog
      float fade = smoothstep(58.0, 12.0, dist);
      gl_FragColor = vec4(col, fade);
    }`;
  material.vertexShader = material.vertexShader.replace('varying vec4 vUv;', 'varying vec4 vUv; varying vec3 vWorld;')
    .replace('vUv = textureMatrix * vec4( position, 1.0 );', 'vUv = textureMatrix * vec4( position, 1.0 ); vWorld = (modelMatrix * vec4(position, 1.0)).xyz;');
  return reflector;
}

function buildGround(): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(120, 120, 1, 1);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: {value: 0},
      uCyan: {value: new THREE.Color(PALETTE.cyan)},
      uPink: {value: new THREE.Color(PALETTE.pink)},
    },
    vertexShader: `
      varying vec2 vUv; varying vec3 vPos;
      void main(){ vUv = uv; vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
    `,
    fragmentShader: `
      uniform float uTime; uniform vec3 uCyan; uniform vec3 uPink; varying vec3 vPos;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        vec2 p = vPos.xy;
        // fine grid, fading with distance
        float gx = abs(fract(p.x * 0.5) - 0.5) / fwidth(p.x * 0.5);
        float gy = abs(fract(p.y * 0.5 + uTime * 0.06) - 0.5) / fwidth(p.y * 0.5);
        float line = 1.0 - min(min(gx, gy), 1.0);
        float dist = length(p) / 60.0;
        float fade = smoothstep(1.0, 0.12, dist);
        // wet asphalt: dark base with vertical streak reflections of the skyline
        vec3 base = vec3(0.0);
        float streakNoise = hash(vec2(floor(p.x * 1.7), 0.0));
        float streak = smoothstep(0.55, 1.0, streakNoise) * smoothstep(-5.0, -30.0, p.y) * (0.6 + 0.4 * sin(uTime * 0.7 + p.x));
        vec3 reflectCol = mix(uPink, uCyan, hash(vec2(floor(p.x * 1.7), 1.0))) * streak * 0.55;
        // ripple shimmer
        float ripple = 0.5 + 0.5 * sin(p.y * 6.0 + uTime * 2.2 + hash(floor(p.xy)) * 6.28);
        reflectCol *= 0.75 + 0.25 * ripple;
        vec3 gridCol = mix(uCyan, uPink, smoothstep(-20.0, 20.0, p.x)) * line * 0.22;
        vec3 col = base + reflectCol + gridCol;
        gl_FragColor = vec4(col, (0.08 + line * 0.5) * fade);
      }
    `,
  });
  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  return ground;
}

function lightCone(color: number, radiusTop: number, radiusBottom: number, height: number, opacity: number): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 32, 1, true);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {uColor: {value: new THREE.Color(color)}, uOpacity: {value: opacity}, uTime: {value: 0}},
    vertexShader: `
      varying vec2 vUv; varying vec3 vNormalW; varying vec3 vViewDir;
      void main(){ vUv = uv; vec4 wp = modelMatrix * vec4(position,1.0);
        vNormalW = normalize(mat3(modelMatrix) * normal); vViewDir = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uOpacity; uniform float uTime;
      varying vec2 vUv; varying vec3 vNormalW; varying vec3 vViewDir;
      void main(){
        float rim = pow(1.0 - abs(dot(vNormalW, vViewDir)), 1.6);
        float vert = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y));
        float dust = 0.85 + 0.15 * sin(vUv.y * 40.0 - uTime * 1.5 + vUv.x * 12.0);
        gl_FragColor = vec4(uColor, rim * vert * dust * uOpacity);
      }`,
  });
  return new THREE.Mesh(geometry, material);
}

function buildRain(count: number): THREE.LineSegments {
  const positions = new Float32Array(count * 6);
  const velocities = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 40;
    const y = Math.random() * 18;
    const z = -6 + (Math.random() - 0.5) * 30;
    positions.set([x, y, z, x + 0.08, y - 0.55, z], i * 6);
    velocities[i] = 6 + Math.random() * 6;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({color: 0x9fc6e8, transparent: true, opacity: 0.22});
  const rain = new THREE.LineSegments(geometry, material);
  rain.userData.velocities = velocities;
  return rain;
}

function buildDust(count: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions.set([(Math.random() - 0.5) * 16, Math.random() * 4, (Math.random() - 0.5) * 10], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({color: PALETTE.amber, size: 0.07, transparent: true, opacity: 0.45, sizeAttenuation: true, depthWrite: false});
  return new THREE.Points(geometry, material);
}

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export default function HeroScene({onReady}: {onReady?: () => void}) {
  const hostRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = hostRef.current;
    if (!canvas || !supportsWebGL()) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const renderer = new THREE.WebGLRenderer({canvas, antialias: true, powerPreference: 'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(PALETTE.ink);
    scene.fog = new THREE.FogExp2(0x120c1a, 0.022);

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);

    // Sky gradient backdrop
    const sky = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 60),
      new THREE.ShaderMaterial({
        depthWrite: false,
        uniforms: {uTop: {value: new THREE.Color(0x07070e)}, uMid: {value: new THREE.Color(0x161728)}, uHaze: {value: new THREE.Color(0x4a1a3c)}},
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHaze; varying vec2 vUv;
          void main(){
            float t = vUv.y;
            vec3 c = mix(uHaze, uMid, smoothstep(0.0, 0.34, t));
            c = mix(c, uTop, smoothstep(0.34, 1.0, t));
            // low cloud deck catching the city light
            float cloud = smoothstep(0.16, 0.24, t) * (1.0 - smoothstep(0.24, 0.40, t));
            c += vec3(0.20, 0.06, 0.14) * cloud * 0.55;
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    );
    sky.position.set(0, 18, -58);
    scene.add(sky);

    const city = buildCity();
    scene.add(city);
    const wet = buildWetStreet(canvas.clientWidth || 1440, canvas.clientHeight || 900);
    scene.add(wet);
    const ground = buildGround();
    scene.add(ground);
    // volumetric cones: cactus sign + a couple of billboard spills
    const cones: THREE.Mesh[] = [];
    const signCone = lightCone(PALETTE.green, 0.25, 2.2, 3.6, 0.07);
    signCone.position.set(0, 2.2, -1.6);
    cones.push(signCone);
    city.traverse(obj => {
      if ((obj as THREE.Mesh).userData.billboard && cones.length < 5) {
        const m = obj as THREE.Mesh;
        const wp = new THREE.Vector3();
        m.getWorldPosition(wp);
        const color = ((m.material as THREE.MeshBasicMaterial).map as THREE.CanvasTexture | null) ? 0xff5aa7 : PALETTE.cyan;
        const cone = lightCone(color, 0.6, 6, wp.y * 1.4, 0.025);
        cone.position.set(wp.x, wp.y * 0.55, wp.z + 3);
        cone.rotation.x = 0.35;
        cones.push(cone);
      }
    });
    const rain = buildRain(reduceMotion ? 0 : 2600);
    scene.add(rain);
    const dust = buildDust(reduceMotion ? 0 : 220);
    scene.add(dust);

    // Lighting: pink key from the saloon side, cyan rim, dim ambient
    scene.add(new THREE.AmbientLight(0x3b4261, 0.9));
    const key = new THREE.DirectionalLight(PALETTE.pink, 1.3);
    key.position.set(-6, 6, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(PALETTE.cyan, 1.6);
    rim.position.set(6, 4, -3);
    scene.add(rim);
    const top = new THREE.DirectionalLight(0xaab4d8, 1.2);
    top.position.set(2, 8, 2);
    scene.add(top);
    const fill = new THREE.DirectionalLight(PALETTE.amber, 0.45);
    fill.position.set(0, 3, 6);
    scene.add(fill);

    // Stage: cactus sign centered, outlaws on turntables either side
    const stage = new THREE.Group();
    const cactus = buildCactusSign();
    cactus.position.set(0, 0, -1.6);
    stage.add(cactus);
    stage.add(signCone);
    cones.slice(1).forEach(c => scene.add(c));

    const sableTable = buildTurntable(PALETTE.cyan);
    sableTable.position.set(-1.2, 0, 0.1);
    stage.add(sableTable);
    const koyoteTable = buildTurntable(PALETTE.pink);
    koyoteTable.position.set(1.25, 0, 0.25);
    stage.add(koyoteTable);
    const tables = [sableTable, koyoteTable];
    const cards: {group: THREE.Group; material: THREE.ShaderMaterial; spec: CardSpec}[] = [];
    let disposed = false;
    const loader = new THREE.TextureLoader();
    Promise.all(CARDS.map(spec => loader.loadAsync(spec.src).catch(() => null))).then(textures => {
      if (disposed) return;
      textures.forEach((texture, i) => {
        if (!texture) return;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        const card = buildHoloCard(texture, CARDS[i]);
        card.group.rotation.y = CARDS[i].phase;
        tables[i].add(card.group);
        cards.push({...card, spec: CARDS[i]});
      });
    });
    scene.add(stage);

    const highTier = !reduceMotion && Math.min(window.devicePixelRatio, 2) * (canvas.clientWidth || 1440) >= 1200;
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.8, 0.62, 0.7);
    composer.addPass(bloom);
    let bokeh: BokehPass | null = null;
    if (highTier) {
      bokeh = new BokehPass(scene, camera, {focus: 7.6, aperture: 0.00012, maxblur: 0.006});
      composer.addPass(bokeh);
    }
    // film finish: grain + chromatic aberration + vignette in one cheap pass
    const finish = new ShaderPass({
      uniforms: {tDiffuse: {value: null}, uTime: {value: 0}, uGrain: {value: highTier ? 0.035 : 0.02}},
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform sampler2D tDiffuse; uniform float uTime; uniform float uGrain; varying vec2 vUv;
        float hash(vec2 p){ float t = floor(uTime * 12.0) / 12.0; return fract(sin(dot(p + t, vec2(12.9898, 78.233))) * 43758.5453); }
        void main(){
          vec2 d = vUv - 0.5;
          float r2 = dot(d, d);
          vec2 ca = d * r2 * 0.018;
          vec3 col;
          col.r = texture2D(tDiffuse, vUv + ca).r;
          col.g = texture2D(tDiffuse, vUv).g;
          col.b = texture2D(tDiffuse, vUv - ca).b;
          float g = (hash(floor(vUv * vec2(960.0, 540.0))) - 0.5) * uGrain;
          col += g * (0.6 + 0.4 * (1.0 - col));
          float vig = 1.0 - smoothstep(0.35, 0.95, sqrt(r2) * 1.25);
          col *= 0.82 + 0.18 * vig;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    composer.addPass(finish);

    const resize = () => {
      const {clientWidth: w, clientHeight: h} = canvas.parentElement ?? canvas;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      bokeh?.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const wide = camera.aspect > 1.15;
      if (wide) {
        stage.position.set(3.9, 0, 0);
        stage.scale.setScalar(0.92);
        sableTable.position.set(-1.1, 0, 0.5);
        koyoteTable.position.set(1.15, 0, -0.3);
        camera.position.set(0.9, 1.9, 7.6);
        camera.lookAt(2.7, 1.9, -4);
      } else {
        stage.position.set(0, 0, -4);
        stage.scale.setScalar(0.56);
        sableTable.position.set(-0.95, 0, 0.2);
        koyoteTable.position.set(0.95, 0, -0.1);
        camera.position.set(0, 2.0, 4.4);
        camera.lookAt(0, 0.05, -4);
      }
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement ?? canvas);

    let visible = true;
    const io = new IntersectionObserver(entries => {
      visible = entries.some(e => e.isIntersecting);
    }, {threshold: 0.05});
    io.observe(canvas);

    const clock = new THREE.Clock();
    let frame = 0;
    let readyFired = false;
    let billboardGlitch = 0;
    let billboardWasGlitching = false;
    let neonDrop = 0;
    const rainPositions = rain.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    const rainVelocities = rain.userData.velocities as Float32Array;

    const tick = () => {
      frame = requestAnimationFrame(tick);
      if (!visible && readyFired) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      if (!reduceMotion) {
        for (const card of cards) {
          card.group.rotation.y += dt * card.spec.spin;
          card.group.position.y = Math.sin(t * 1.1 + card.spec.phase) * 0.03;
          card.material.uniforms.uTime.value = t;
          const f = card.material.uniforms.uFlicker;
          f.value = Math.max(0, f.value - dt * 2.5);
          if (f.value === 0 && Math.random() < dt * 0.12) f.value = 0.5 + Math.random() * 0.3;
        }
        (ground.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
        (wet.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
        for (const c of cones) (c.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
        // Beacons: smooth pulse (no per-frame branch)
        if (Math.floor(t * 20) !== Math.floor((t - dt) * 20)) {
          city.traverse(obj => {
            const m = obj as THREE.Mesh;
            if (m.userData.beacon) ((m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.2 + 3.8 * Math.max(0, Math.sin(t * 2.4 + m.position.x)) ** 6);
          });
        }
        // Billboard glitch: rare, then fades back over ~150ms instead of popping for one frame
        billboardGlitch = Math.max(0, billboardGlitch - dt * 6);
        if (billboardGlitch === 0 && Math.random() < dt * 0.25) billboardGlitch = 1;
        if (billboardGlitch > 0 || billboardWasGlitching) {
          city.traverse(obj => {
            const m = obj as THREE.Mesh;
            if (m.userData.billboard) {
              const mat = m.material as THREE.MeshBasicMaterial;
              mat.transparent = true;
              mat.opacity = 1 - 0.6 * billboardGlitch;
            }
          });
          billboardWasGlitching = billboardGlitch > 0;
        }
        // Neon sign: dt-based dropout that decays over ~250ms, plus gentle 60Hz-ish hum
        neonDrop = Math.max(0, neonDrop - dt * 4);
        if (neonDrop === 0 && Math.random() < dt * 0.4) neonDrop = 1;
        const hum = 0.9 + Math.sin(t * 11) * 0.06;
        cactus.children.forEach((c, i) => {
          const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined;
          if ((c as THREE.Mesh).userData.neonCore && m) { m.transparent = true; m.opacity = hum * (1 - 0.6 * neonDrop) + Math.sin(t * 11 + i) * 0.02; }
          if (c.userData.neonLight) (c as THREE.PointLight).intensity = (3.2 + Math.sin(t * 11) * 0.15) * (1 - 0.6 * neonDrop);
        });
        if (rainPositions) {
          const arr = rainPositions.array as Float32Array;
          for (let i = 0; i < rainVelocities.length; i++) {
            const o = i * 6;
            const fall = rainVelocities[i] * dt;
            arr[o + 1] -= fall;
            arr[o + 4] -= fall;
            arr[o] += dt * 0.9;
            arr[o + 3] += dt * 0.9;
            if (arr[o + 4] < -0.2) {
              const x = (Math.random() - 0.5) * 40;
              const z = -6 + (Math.random() - 0.5) * 30;
              arr[o] = x; arr[o + 1] = 16 + Math.random() * 3; arr[o + 2] = z;
              arr[o + 3] = x + 0.08; arr[o + 4] = arr[o + 1] - 0.55; arr[o + 5] = z;
            }
          }
          rainPositions.needsUpdate = true;
        }
        dust.rotation.y = t * 0.02;
        dust.position.y = Math.sin(t * 0.3) * 0.15;
        camera.position.x += (Math.sin(t * 0.18) * 0.12 - (camera.position.x - (camera.aspect > 1.15 ? 0.8 : 0))) * 0.02;
      }

      (finish.uniforms.uTime as {value: number}).value = t % 100;
      composer.render();
      if (!readyFired) {
        readyFired = true;
        onReady?.();
        if (reduceMotion) cancelAnimationFrame(frame);
      }
    };
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      io.disconnect();
      composer.dispose();
      renderer.dispose();
      scene.traverse(obj => {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach(m => m.dispose());
        else material?.dispose?.();
      });
    };
  }, [onReady]);

  return <canvas ref={hostRef} className="hero-scene" aria-hidden="true" />;
}
