import {useEffect, useRef} from 'react';
import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

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
  ctx.strokeStyle = 'rgba(125,207,255,0.08)';
  ctx.lineWidth = 1;
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
    const w = 2 + (seed % 7);
    ctx.fillStyle = seed % 3 === 0 ? accent : '#c0caf5';
    ctx.fillRect(x, 860, w, 90);
    x += w + 3 + (seed % 5);
  }
  ctx.fillStyle = '#565f89';
  ctx.font = '500 18px "IBM Plex Mono", monospace';
  ctx.fillText('DEAD OR ALIVE  ·  LAST CALL GAMES  ·  2086', 256, 990);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildHoloCard(front: THREE.Texture, spec: CardSpec): {group: THREE.Group; material: THREE.ShaderMaterial} {
  const group = new THREE.Group();
  const material = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    uniforms: {
      uFront: {value: front},
      uBack: {value: dossierTexture(spec)},
      uTime: {value: 0},
      uFlicker: {value: 0},
      uAccent: {value: new THREE.Color(spec.accent)},
    },
    vertexShader: `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        vec3 p = position;
        p.z += (1.0 - pow(uv.x * 2.0 - 1.0, 2.0)) * 0.09;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      uniform sampler2D uFront; uniform sampler2D uBack; uniform float uTime; uniform float uFlicker; uniform vec3 uAccent;
      varying vec2 vUv;
      void main(){
        vec2 uv = vUv;
        bool front = gl_FrontFacing;
        vec2 suv = front ? uv : vec2(1.0 - uv.x, uv.y);
        float ca = 0.003 + 0.004 * uFlicker;
        vec3 col;
        if (front) {
          col.r = texture2D(uFront, suv + vec2(ca, 0.0)).r;
          col.g = texture2D(uFront, suv).g;
          col.b = texture2D(uFront, suv - vec2(ca, 0.0)).b;
          col *= 1.08;
        } else {
          col = texture2D(uBack, suv).rgb;
        }
        float scan = 0.88 + 0.12 * sin(uv.y * 260.0 - uTime * 7.0);
        float roll = fract(uv.y * 0.6 - uTime * 0.09);
        float band = 1.0 + 0.22 * (1.0 - smoothstep(0.0, 0.06, abs(roll - 0.5)));
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
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H, 24, 2), material);
  plane.position.y = 0.55 + CARD_H / 2;
  group.add(plane);
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
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.4, 10), glow(0x7fbf4a, 0.9));
  trunk.position.y = 1.2;
  g.add(trunk);
  for (const [side, y] of [[-1, 1.1], [1, 1.5]] as const) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.5, 8), glow(0x7fbf4a, 0.9));
    arm.rotation.z = Math.PI / 2;
    arm.position.set(side * 0.3, y, 0);
    g.add(arm);
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.55, 8), glow(0x7fbf4a, 0.9));
    up.position.set(side * 0.52, y + 0.28, 0);
    g.add(up);
  }
  const light = new THREE.PointLight(PALETTE.green, 5, 7, 1.5);
  light.position.set(0, 1.6, 0.4);
  g.add(light);
  return g;
}

function windowTexture(seed: number, cols: number, rows: number, tint: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = cols * 8;
  canvas.height = rows * 8;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0a0a11';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  let r = seed;
  const rand = () => ((r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const v = rand();
      if (v > 0.62) {
        ctx.fillStyle = v > 0.94 ? tint : v > 0.8 ? '#e0af68' : '#3b4261';
        ctx.globalAlpha = 0.55 + rand() * 0.45;
        ctx.fillRect(x * 8 + 2, y * 8 + 2, 4, 5);
      }
    }
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildCity(): THREE.Group {
  const g = new THREE.Group();
  let seed = 7;
  const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  // Far towers
  for (let i = 0; i < 26; i++) {
    const w = 1.2 + rand() * 2.4;
    const h = 3 + rand() * 11;
    const d = 1.2 + rand() * 2;
    const x = -26 + i * 2.1 + rand() * 1.2;
    const z = -26 - rand() * 14;
    const tex = windowTexture(i * 31 + 3, Math.round(w * 4), Math.round(h * 4), i % 3 === 0 ? '#ff007c' : '#7dcfff');
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.9, color: 0x0a0a11, roughness: 0.9}),
    );
    tower.position.set(x, h / 2, z);
    g.add(tower);
    // Neon sign strips on some towers
    if (rand() > 0.55) {
      const color = rand() > 0.5 ? PALETTE.pink : PALETTE.cyan;
      const strip = box(0.12, 1.2 + rand() * 2.5, 0.12, glow(color, 3), x + w / 2 + 0.07, h * 0.6, z + d / 2 + 0.07);
      g.add(strip);
    }
    if (rand() > 0.7) {
      const sign = box(w * 0.7, 0.35, 0.05, glow(rand() > 0.5 ? PALETTE.amber : PALETTE.green, 2.6), x, h * 0.85, z + d / 2 + 0.05);
      g.add(sign);
    }
  }
  // Mesas on the horizon flanks
  const mesaMat = mat(0x0c0c14, {roughness: 1});
  for (const [x, w, h] of [[-30, 14, 5], [-16, 8, 3.4], [22, 10, 4.2], [33, 16, 6]] as const) {
    const mesa = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.6, w, h, 7), mesaMat);
    mesa.position.set(x, h / 2 - 0.2, -34);
    g.add(mesa);
  }
  return g;
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
      void main(){
        vec2 p = vPos.xy;
        float gx = abs(fract(p.x * 0.5) - 0.5) / fwidth(p.x * 0.5);
        float gy = abs(fract(p.y * 0.5 + uTime * 0.08) - 0.5) / fwidth(p.y * 0.5);
        float line = 1.0 - min(min(gx, gy), 1.0);
        float dist = length(p) / 60.0;
        float fade = smoothstep(1.0, 0.15, dist);
        vec3 col = mix(uCyan, uPink, smoothstep(-20.0, 20.0, p.x)) * line * 0.9;
        vec3 base = vec3(0.05, 0.05, 0.08);
        float wet = 0.18 * (1.0 - dist);
        gl_FragColor = vec4(base * wet + col, (line * 0.85 + 0.35) * fade);
      }
    `,
  });
  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.03;
  return ground;
}

function buildRain(count: number): THREE.LineSegments {
  const positions = new Float32Array(count * 6);
  const velocities = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 40;
    const y = Math.random() * 18;
    const z = -6 + (Math.random() - 0.5) * 30;
    positions.set([x, y, z, x + 0.05, y - 0.35, z], i * 6);
    velocities[i] = 6 + Math.random() * 6;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({color: PALETTE.cyan, transparent: true, opacity: 0.28});
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
  const material = new THREE.PointsMaterial({color: PALETTE.amber, size: 0.045, transparent: true, opacity: 0.7, sizeAttenuation: true});
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
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(PALETTE.ink);
    scene.fog = new THREE.FogExp2(PALETTE.ink, 0.032);

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);

    // Sky gradient backdrop
    const sky = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 60),
      new THREE.ShaderMaterial({
        depthWrite: false,
        uniforms: {uTop: {value: new THREE.Color(0x0b0b14)}, uMid: {value: new THREE.Color(0x1a1b26)}, uHaze: {value: new THREE.Color(0x3a1233)}},
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHaze; varying vec2 vUv;
          void main(){
            float t = vUv.y;
            vec3 c = mix(uHaze, uMid, smoothstep(0.0, 0.28, t));
            c = mix(c, uTop, smoothstep(0.28, 1.0, t));
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    );
    sky.position.set(0, 18, -58);
    scene.add(sky);

    scene.add(buildCity());
    const ground = buildGround();
    scene.add(ground);
    const rain = buildRain(reduceMotion ? 0 : 1400);
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
        const card = buildHoloCard(texture, CARDS[i]);
        card.group.rotation.y = CARDS[i].phase;
        tables[i].add(card.group);
        cards.push({...card, spec: CARDS[i]});
      });
    });
    scene.add(stage);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.5, 0.72);
    composer.addPass(bloom);

    const resize = () => {
      const {clientWidth: w, clientHeight: h} = canvas.parentElement ?? canvas;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const wide = camera.aspect > 1.15;
      if (wide) {
        stage.position.set(4.6, 0, 0);
        stage.scale.setScalar(1);
        sableTable.position.set(-1.1, 0, 0.5);
        koyoteTable.position.set(1.2, 0, -0.3);
        camera.position.set(0.8, 1.9, 7.0);
        camera.lookAt(3.0, 1.45, 0);
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
          f.value = Math.max(0, f.value - dt * 6);
          if (Math.random() > 0.992) f.value = 0.6 + Math.random() * 0.4;
        }
        (ground.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
        cactus.children.forEach((c, i) => {
          const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
          if (m?.emissive) m.emissiveIntensity = 0.9 + Math.sin(t * 9 + i) * 0.12 + (Math.random() > 0.985 ? -0.7 : 0);
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
              arr[o + 3] = x + 0.05; arr[o + 4] = arr[o + 1] - 0.35; arr[o + 5] = z;
            }
          }
          rainPositions.needsUpdate = true;
        }
        dust.rotation.y = t * 0.02;
        dust.position.y = Math.sin(t * 0.3) * 0.15;
        camera.position.x += (Math.sin(t * 0.18) * 0.12 - (camera.position.x - (camera.aspect > 1.15 ? 0.8 : 0))) * 0.02;
      }

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
