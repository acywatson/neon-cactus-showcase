import {useCallback, useEffect, useRef, useState} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {Heading} from '@astryxdesign/core/Heading';
import {Kbd} from '@astryxdesign/core/Kbd';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {ArrowDown, ArrowLeft, ArrowRight, Crosshair, Play, RotateCcw} from 'lucide-react';
import type {DemoProps} from '../demo/types';
import {
  createRenderer,
  FLOOR,
  WORLD_H,
  WORLD_W,
  type BulletState,
  type DroneState,
  type EnemyKind,
  type Palette,
  type PlayerState,
  type Renderer,
} from '../demo/renderer';

const MOVE_SPEED = 290; // world px / s
const JUMP_VELOCITY = -720;
const GRAVITY = 2200;
const BULLET_SPEED = 780;
const MAX_BREACHES = 3;

function token(canvas: HTMLCanvasElement, name: string, fallback: string): string {
  return getComputedStyle(canvas).getPropertyValue(name).trim() || fallback;
}

function freshPlayer(): PlayerState {
  return {x: 300, y: FLOOR, velocityY: 0, runPhase: 0, moving: false, flash: 0, recoil: 0, crouching: false};
}

export function DemoStage(_: DemoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const frameRef = useRef<number | null>(null);
  const keysRef = useRef(new Set<string>());
  const bulletsRef = useRef<BulletState[]>([]);
  const dronesRef = useRef<DroneState[]>([]);
  const playerRef = useRef<PlayerState>(freshPlayer());
  const runningRef = useRef(false);
  const crouchRef = useRef(false);
  const scoreRef = useRef(0);
  const breachesRef = useRef(0);
  const [isRunning, setIsRunning] = useState(false);
  const [hasLost, setHasLost] = useState(false);
  const [isCrouchToggled, setIsCrouchToggled] = useState(false);

  const spawnWave = useCallback(() => {
    const kinds: EnemyKind[] = ['skull', 'skull', 'hound', 'skull', 'crawler', 'skull', 'hound', 'skull'];
    dronesRef.current = kinds.map((kind, index) => ({
      x: WORLD_W + 120 + index * 170,
      y: kind === 'skull' ? FLOOR - 80 - (index % 3) * 44 : FLOOR,
      speed: kind === 'hound' ? 150 : kind === 'crawler' ? 42 : 78 + (index % 4) * 18,
      alive: true,
      phase: index * 0.8,
      kind,
      hp: kind === 'crawler' ? 2 : 1,
      hit: 0,
    }));
  }, []);

  const fire = useCallback(() => {
    if (!runningRef.current || bulletsRef.current.length > 6) return;
    const player = playerRef.current;
    const x = player.x + 52;
    const y = player.y - (player.crouching && player.y >= FLOOR ? 30 : 76);
    bulletsRef.current.push({x, y, px: x});
    player.flash = 4;
    player.recoil = 2;
    rendererRef.current?.shake(1.2);
  }, []);

  const move = useCallback((amount: number) => {
    playerRef.current.x = Math.max(250, Math.min(WORLD_W - 60, playerRef.current.x + amount));
  }, []);

  const jump = useCallback(() => {
    const player = playerRef.current;
    if (player.y >= FLOOR) {
      crouchRef.current = false;
      player.velocityY = JUMP_VELOCITY;
      rendererRef.current?.emitDust(player.x, FLOOR, 1);
    }
  }, []);

  const start = useCallback(() => {
    playerRef.current = freshPlayer();
    bulletsRef.current = [];
    scoreRef.current = 0;
    breachesRef.current = 0;
    spawnWave();
    crouchRef.current = false;
    setIsCrouchToggled(false);
    runningRef.current = true;
    setIsRunning(true);
    setHasLost(false);
    canvasRef.current?.focus();
  }, [spawnWave]);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (!runningRef.current) return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
      if (event.repeat) return;
      keysRef.current.add(event.code);
      if (event.code === 'Space') fire();
      if (event.code === 'KeyW' || event.code === 'ArrowUp') jump();
    };
    const keyUp = (event: KeyboardEvent) => keysRef.current.delete(event.code);
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
    };
  }, [fire, jump]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const palette: Palette = {
      night: token(canvas, '--game-night', '#16161E'),
      raised: token(canvas, '--game-night-raised', '#1A1B26'),
      cyan: token(canvas, '--game-cyan', '#7DCFFF'),
      pink: token(canvas, '--game-pink', '#FF007C'),
      green: token(canvas, '--game-green', '#9ECE6A'),
      amber: token(canvas, '--game-amber', '#E0AF68'),
      rust: token(canvas, '--game-rust', '#FF9E64'),
      ink: token(canvas, '--game-ink', '#0F0F17'),
      paper: token(canvas, '--game-paper', '#C0CAF5'),
    };
    const renderer = createRenderer(canvas, palette);
    rendererRef.current = renderer;

    let last = performance.now();
    let dustTimer = 0;

    const step = (time: number) => {
      const dt = Math.min(0.05, (time - last) / 1000);
      last = time;
      const player = playerRef.current;

      if (runningRef.current) {
        const left = keysRef.current.has('KeyA') || keysRef.current.has('ArrowLeft');
        const right = keysRef.current.has('KeyD') || keysRef.current.has('ArrowRight');
        player.crouching = crouchRef.current || keysRef.current.has('KeyS') || keysRef.current.has('ArrowDown');
        const speed = player.crouching ? MOVE_SPEED * 0.45 : MOVE_SPEED;
        player.moving = left !== right;
        if (left) move(-speed * dt);
        if (right) move(speed * dt);
        if (player.moving && player.y >= FLOOR) {
          player.runPhase += dt * 16;
          dustTimer -= dt;
          if (dustTimer <= 0) {
            renderer.emitDust(player.x - 10, FLOOR, 0.6);
            dustTimer = 0.16;
          }
        }
        const wasAirborne = player.y < FLOOR;
        player.velocityY += GRAVITY * dt;
        player.y = Math.min(FLOOR, player.y + player.velocityY * dt);
        if (player.y >= FLOOR) {
          if (wasAirborne) renderer.emitDust(player.x, FLOOR, 1.4);
          player.velocityY = 0;
        }
        if (player.flash > 0) player.flash -= 1;
        player.recoil = Math.max(0, player.recoil - dt * 18);

        for (const bullet of bulletsRef.current) {
          bullet.px = bullet.x;
          bullet.x += BULLET_SPEED * dt;
        }
        bulletsRef.current = bulletsRef.current.filter(bullet => bullet.x < WORLD_W + 40);

        let breachDelta = 0;
        for (const drone of dronesRef.current) {
          if (!drone.alive) continue;
          drone.x -= drone.speed * dt;
          if (drone.x < 200) {
            drone.x = WORLD_W + 160 + Math.random() * 300;
            breachDelta += 1;
            renderer.emitBreach();
          }
          if (drone.hit > 0) drone.hit -= 1;
          const hitH = drone.kind === 'skull' ? 38 : drone.kind === 'crawler' ? 34 : 28;
          const cy = drone.kind === 'skull' ? drone.y : drone.y - hitH / 2;
          for (const bullet of bulletsRef.current) {
            if (Math.abs(bullet.x - drone.x) < 42 && Math.abs(bullet.y - cy) < hitH) {
              bullet.x = WORLD_W + 100;
              drone.hp -= 1;
              renderer.emitHit(bullet.x - 30, bullet.y);
              if (drone.hp > 0) {
                drone.hit = 6;
                drone.x += 14; // knockback
                renderer.shake(2);
                continue;
              }
              drone.alive = false;
              scoreRef.current += drone.kind === 'crawler' ? 300 : drone.kind === 'hound' ? 150 : 100;
              renderer.emitExplosion(drone.x, cy);
              window.setTimeout(() => {
                drone.x = WORLD_W + 120 + Math.random() * 420;
                drone.hp = drone.kind === 'crawler' ? 2 : 1;
                drone.alive = true;
              }, 700);
            }
          }
        }
        if (breachDelta > 0) {
          breachesRef.current += breachDelta;
          if (breachesRef.current >= MAX_BREACHES) {
            runningRef.current = false;
            setIsRunning(false);
            setHasLost(true);
          }
        }
      }

      renderer.render(
        {
          player,
          drones: dronesRef.current,
          bullets: bulletsRef.current,
          score: scoreRef.current,
          breaches: Math.min(MAX_BREACHES, breachesRef.current),
          running: runningRef.current,
          lost: breachesRef.current >= MAX_BREACHES,
        },
        time,
        dt,
      );
      frameRef.current = requestAnimationFrame(step);
    };

    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      rendererRef.current = null;
    };
  }, [move]);

  return (
    <section className="arcade-cabinet" aria-label="Playable Neon Cactus demo">
      <VStack gap={0}>
        <HStack className="cabinet-marquee" gap={3} hAlign="between" vAlign="center" wrap="wrap">
          <VStack gap={0.5}>
            <Text type="code" color="accent">LIVE TRANSMISSION // LAST CALL SALOON</Text>
            <Heading level={3}>BOUNTY 001: HOLD THE LINE</Heading>
          </VStack>
          <HStack gap={2} wrap="wrap">
            <Text type="supporting">Move</Text><Kbd keys="a+d" />
            <Text type="supporting">Jump</Text><Kbd keys="w" />
            <Text type="supporting">Crouch</Text><Kbd keys="s" />
            <Text type="supporting">Fire</Text><Kbd keys="space" />
          </HStack>
        </HStack>
        <canvas
          ref={canvasRef}
          className="game-canvas"
          width={WORLD_W}
          height={WORLD_H}
          tabIndex={0}
          aria-label="Playable side-scrolling shooter demo: defend the Last Call saloon from incoming skull drones"
        />
        <HStack className="cabinet-controls" gap={2} hAlign="between" vAlign="center" wrap="wrap">
          <HStack gap={2}>
            <Button label="Move left" variant="secondary" isIconOnly icon={<ArrowLeft size={18} />} onClick={() => move(-42)} />
            <Button label="Move right" variant="secondary" isIconOnly icon={<ArrowRight size={18} />} onClick={() => move(42)} />
            <Button label="Jump" variant="secondary" isIconOnly icon={<Play className="jump-icon" size={18} />} onClick={jump} />
            <Button
              label={isCrouchToggled ? 'Stand up' : 'Crouch'}
              variant={isCrouchToggled ? 'primary' : 'secondary'}
              isIconOnly
              icon={<ArrowDown size={18} />}
              onClick={() => {
                crouchRef.current = !crouchRef.current;
                setIsCrouchToggled(crouchRef.current);
              }}
            />
            <Button label="Fire" variant="secondary" isIconOnly icon={<Crosshair size={18} />} onClick={fire} />
          </HStack>
          <Button
            label={isRunning ? 'Restart bounty' : hasLost ? 'Ride again' : 'Accept bounty'}
            variant="primary"
            size="lg"
            icon={isRunning ? <RotateCcw size={18} /> : <Play size={18} />}
            onClick={start}
          />
        </HStack>
      </VStack>
    </section>
  );
}
