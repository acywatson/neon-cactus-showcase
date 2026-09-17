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

type OutlawSpec = {
  coat: number;
  accent: number;
  eye: number;
  hat: 'wide' | 'hood';
  scarf: number;
  height: number;
};

const SABLE: OutlawSpec = {
  coat: 0x1c1e2e,
  accent: PALETTE.cyan,
  eye: PALETTE.cyan,
  hat: 'wide',
  scarf: PALETTE.rust,
  height: 1,
};

const KOYOTE: OutlawSpec = {
  coat: 0x5a3a2a,
  accent: PALETTE.pink,
  eye: PALETTE.pink,
  hat: 'hood',
  scarf: PALETTE.amber,
  height: 0.94,
};

function mat(color: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({color, roughness: 0.62, metalness: 0.18, flatShading: true, ...extra});
}

function glow(color: number, intensity = 2.4) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.4,
    metalness: 0,
  });
}

function box(w: number, h: number, d: number, material: THREE.Material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function buildOutlaw(spec: OutlawSpec): THREE.Group {
  const g = new THREE.Group();
  const coat = mat(spec.coat, {roughness: 0.82});
  const skin = mat(0xa08872, {roughness: 0.7});
  const chrome = mat(PALETTE.chrome, {metalness: 0.95, roughness: 0.22});
  const accent = glow(spec.accent, 1.6);
  const eye = glow(spec.eye, 4);
  const s = spec.height;

  // Legs + boots
  for (const side of [-1, 1]) {
    g.add(box(0.16, 0.5, 0.18, mat(0x141520), side * 0.12, 0.25 * s, 0));
    g.add(box(0.18, 0.12, 0.26, mat(0x0c0c12), side * 0.12, 0.06, 0.03));
    // spur glint
    g.add(box(0.04, 0.04, 0.04, accent, side * 0.12, 0.12, -0.14));
  }

  // Torso + duster: tapered chest, then two split coat tails
  g.add(box(0.44, 0.46, 0.26, coat, 0, 0.8 * s, 0));
  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.3, 6), coat);
  chest.position.y = 0.6 * s;
  g.add(chest);
  for (const side of [-1, 1]) {
    const tail = box(0.2, 0.5, 0.2, coat, side * 0.13, 0.32 * s, -0.04);
    tail.rotation.z = side * -0.08;
    tail.rotation.x = 0.12;
    g.add(tail);
  }
  g.add(box(0.03, 0.44, 0.03, accent, 0, 0.34 * s, 0.13));
  // neck
  g.add(box(0.12, 0.08, 0.12, skin, 0, 1.08 * s, 0));
  // belt + buckle
  g.add(box(0.48, 0.06, 0.3, mat(0x2a1d16), 0, 0.53 * s, 0));
  g.add(box(0.08, 0.06, 0.04, accent, 0, 0.53 * s, 0.16));
  // shoulder plate (tech)
  g.add(box(0.16, 0.08, 0.3, chrome, -0.3, 1.02 * s, 0));
  g.add(box(0.14, 0.02, 0.2, accent, -0.3, 1.07 * s, 0));

  // Arms: one flesh, one chrome
  g.add(box(0.12, 0.48, 0.14, coat, 0.32, 0.76 * s, 0));
  g.add(box(0.1, 0.12, 0.12, skin, 0.32, 0.48 * s, 0));
  const chromeArm = box(0.12, 0.48, 0.14, chrome, -0.32, 0.76 * s, 0);
  g.add(chromeArm);
  g.add(box(0.13, 0.03, 0.15, accent, -0.32, 0.7 * s, 0));
  g.add(box(0.1, 0.12, 0.12, chrome, -0.32, 0.48 * s, 0));

  // Rifle slung on back
  const rifle = box(0.06, 1.0, 0.06, mat(0x0d0d14, {metalness: 0.6, roughness: 0.4}), 0.1, 0.9 * s, -0.2);
  rifle.rotation.z = -0.35;
  g.add(rifle);
  g.add(box(0.03, 0.12, 0.03, accent, 0.05, 1.28 * s, -0.2));

  // Scarf
  g.add(box(0.42, 0.11, 0.36, mat(spec.scarf, {roughness: 0.9}), 0, 1.13 * s, 0.02));

  // Head
  g.add(box(0.25, 0.28, 0.25, skin, 0, 1.28 * s, 0));
  // eyes: one glowing implant, one dim
  g.add(box(0.07, 0.05, 0.02, eye, 0.07, 1.31 * s, 0.15));
  g.add(box(0.06, 0.04, 0.02, mat(0x1a1a24), -0.07, 1.31 * s, 0.15));
  // jaw implant line
  g.add(box(0.2, 0.015, 0.02, accent, 0, 1.19 * s, 0.15));

  if (spec.hat === 'wide') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.44, 0.025, 16), mat(0x08080c, {roughness: 0.9}));
    brim.position.y = 1.44 * s;
    g.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.21, 0.26, 10), mat(0x08080c, {roughness: 0.9}));
    crown.position.y = 1.56 * s;
    g.add(crown);
    g.add(box(0.3, 0.018, 0.3, accent, 0, 1.455 * s, 0));
  } else {
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.34, 6), mat(spec.coat, {roughness: 0.95}));
    hood.position.y = 1.5 * s;
    g.add(hood);
    // synthetic coyote snout
    g.add(box(0.14, 0.1, 0.16, chrome, 0, 1.23 * s, 0.18));
    g.add(box(0.1, 0.02, 0.04, eye, 0, 1.2 * s, 0.27));
    // tapered antenna ears
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.28, 4), chrome);
      ear.position.set(side * 0.15, 1.7 * s, 0);
      ear.rotation.z = side * -0.25;
      g.add(ear);
      g.add(box(0.05, 0.03, 0.05, eye, side * 0.17, 1.82 * s, 0));
    }
    // poncho
    const poncho = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.46, 6, 1, true), mat(spec.coat, {roughness: 0.95}));
    poncho.position.y = 0.88 * s;
    g.add(poncho);
    g.add(box(0.64, 0.02, 0.02, accent, 0, 0.66 * s, 0.4));
  }

  return g;
}

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
    const sable = buildOutlaw(SABLE);
    sable.position.y = 0.03;
    sableTable.add(sable);
    stage.add(sableTable);

    const koyoteTable = buildTurntable(PALETTE.pink);
    koyoteTable.position.set(1.25, 0, 0.25);
    const koyote = buildOutlaw(KOYOTE);
    koyote.position.y = 0.03;
    koyote.rotation.y = Math.PI * 0.6;
    koyoteTable.add(koyote);
    stage.add(koyoteTable);
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
        // Copy owns the left ~55%; the pair sits on a diagonal to the right.
        stage.position.set(4.6, 0, 0);
        stage.scale.setScalar(1);
        sableTable.position.set(-1.05, 0, 0.55);
        koyoteTable.position.set(1.15, 0, -0.25);
        camera.position.set(0.8, 1.6, 6.6);
        camera.lookAt(3.0, 1.05, 0);
      } else {
        // Narrow: compact pair framed in the band above the copy.
        stage.position.set(0, 0, -4);
        stage.scale.setScalar(0.7);
        sableTable.position.set(-0.85, 0, 0.2);
        koyoteTable.position.set(0.85, 0, -0.1);
        camera.position.set(0, 1.6, 4.5);
        camera.lookAt(0, 0.15, -4);
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
        sable.rotation.y += dt * 0.28;
        koyote.rotation.y -= dt * 0.22;
        sable.position.y = 0.03 + Math.sin(t * 1.4) * 0.012;
        koyote.position.y = 0.03 + Math.sin(t * 1.4 + 1.7) * 0.012;
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
