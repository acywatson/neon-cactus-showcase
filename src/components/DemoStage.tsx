import {useCallback, useEffect, useRef, useState} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {Heading} from '@astryxdesign/core/Heading';
import {Kbd} from '@astryxdesign/core/Kbd';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {ArrowLeft, ArrowRight, Crosshair, Play, RotateCcw} from 'lucide-react';
import type {DemoProps} from '../demo/types';

const WIDTH = 960;
const HEIGHT = 540;
const FLOOR = 438;

type Bullet = {x: number; y: number};
type Drone = {x: number; y: number; speed: number; alive: boolean; phase: number};
type Player = {x: number; y: number; velocityY: number};
type Palette = {
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

function color(canvas: HTMLCanvasElement, token: string, fallback: string): string {
  return getComputedStyle(canvas).getPropertyValue(token).trim() || fallback;
}

function drawCactus(
  context: CanvasRenderingContext2D,
  x: number,
  floor: number,
  scale: number,
  palette: Palette,
): void {
  context.save();
  context.translate(x, floor);
  context.scale(scale, scale);
  context.strokeStyle = palette.green;
  context.lineWidth = 6;
  context.lineCap = 'round';
  context.shadowColor = palette.green;
  context.shadowBlur = 14;
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(0, -64);
  context.moveTo(0, -42);
  context.lineTo(-18, -42);
  context.lineTo(-18, -58);
  context.moveTo(0, -28);
  context.lineTo(20, -28);
  context.lineTo(20, -48);
  context.stroke();
  context.restore();
}

function drawSaloon(context: CanvasRenderingContext2D, palette: Palette): void {
  context.save();
  context.translate(502, 215);

  context.fillStyle = palette.ink;
  context.fillRect(0, 72, 310, 152);
  context.fillStyle = palette.rust;
  context.fillRect(14, 87, 282, 137);
  context.fillStyle = palette.ink;
  for (let x = 22; x < 292; x += 22) {
    context.fillRect(x, 87, 6, 137);
  }

  context.fillStyle = palette.raised;
  context.fillRect(-18, 58, 346, 32);
  context.fillRect(24, 16, 260, 52);
  context.strokeStyle = palette.amber;
  context.lineWidth = 3;
  context.strokeRect(24, 16, 260, 52);

  context.shadowColor = palette.pink;
  context.shadowBlur = 18;
  context.fillStyle = palette.pink;
  context.font = '900 27px "Barlow Condensed", sans-serif';
  context.textAlign = 'center';
  context.fillText('LAST CALL', 154, 50);
  context.shadowBlur = 0;

  context.fillStyle = palette.ink;
  context.fillRect(50, 118, 56, 106);
  context.fillRect(205, 118, 56, 106);
  context.fillStyle = palette.amber;
  context.fillRect(58, 128, 40, 54);
  context.fillRect(213, 128, 40, 54);
  context.fillStyle = palette.pink;
  context.fillRect(64, 136, 28, 4);
  context.fillRect(219, 136, 28, 4);
  context.fillStyle = palette.ink;
  context.fillRect(126, 108, 58, 116);
  context.strokeStyle = palette.cyan;
  context.lineWidth = 2;
  context.strokeRect(126, 108, 58, 116);

  context.fillStyle = palette.ink;
  context.fillRect(-35, 218, 380, 12);
  context.restore();
}

function drawPlayer(context: CanvasRenderingContext2D, player: Player, palette: Palette): void {
  const x = player.x;
  const y = player.y;
  context.save();
  context.translate(x, y);

  context.fillStyle = palette.ink;
  context.beginPath();
  context.moveTo(-18, -78);
  context.lineTo(24, -78);
  context.lineTo(37, -22);
  context.lineTo(10, -4);
  context.lineTo(-25, -15);
  context.closePath();
  context.fill();
  context.strokeStyle = palette.cyan;
  context.lineWidth = 3;
  context.stroke();

  context.fillStyle = palette.amber;
  context.beginPath();
  context.arc(2, -91, 13, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = palette.ink;
  context.fillRect(-29, -108, 64, 8);
  context.beginPath();
  context.moveTo(-16, -104);
  context.lineTo(-8, -126);
  context.lineTo(21, -126);
  context.lineTo(29, -104);
  context.closePath();
  context.fill();
  context.strokeStyle = palette.pink;
  context.stroke();

  context.fillStyle = palette.ink;
  context.fillRect(-17, -18, 13, 22);
  context.fillRect(14, -18, 13, 22);
  context.fillStyle = palette.cyan;
  context.fillRect(-19, -2, 17, 5);
  context.fillRect(12, -2, 17, 5);

  context.strokeStyle = palette.amber;
  context.lineWidth = 7;
  context.beginPath();
  context.moveTo(20, -67);
  context.lineTo(54, -55);
  context.stroke();
  context.fillStyle = palette.paper;
  context.fillRect(48, -61, 43, 9);
  context.fillStyle = palette.cyan;
  context.fillRect(72, -59, 18, 5);
  context.restore();
}

function drawDrone(
  context: CanvasRenderingContext2D,
  drone: Drone,
  palette: Palette,
  time: number,
): void {
  const bob = Math.sin(time * 0.004 + drone.phase) * 7;
  context.save();
  context.translate(drone.x, drone.y + bob);
  context.shadowColor = palette.pink;
  context.shadowBlur = 13;
  context.fillStyle = palette.pink;
  context.beginPath();
  context.moveTo(-28, -7);
  context.lineTo(-18, -24);
  context.lineTo(18, -24);
  context.lineTo(28, -7);
  context.lineTo(19, 18);
  context.lineTo(-19, 18);
  context.closePath();
  context.fill();
  context.shadowBlur = 0;

  context.fillStyle = palette.ink;
  context.beginPath();
  context.arc(0, -4, 17, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = palette.green;
  context.fillRect(-10, -9, 7, 6);
  context.fillRect(4, -9, 7, 6);
  context.fillStyle = palette.paper;
  context.fillRect(-4, 4, 8, 5);

  context.strokeStyle = palette.pink;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(-20, 18);
  context.lineTo(-27, 28);
  context.moveTo(20, 18);
  context.lineTo(27, 28);
  context.stroke();
  context.restore();
}

function drawScene(
  context: CanvasRenderingContext2D,
  palette: Palette,
  time: number,
): void {
  const sky = context.createLinearGradient(0, 0, 0, FLOOR);
  sky.addColorStop(0, palette.night);
  sky.addColorStop(0.58, palette.raised);
  sky.addColorStop(1, palette.rust);
  context.fillStyle = sky;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  context.globalAlpha = 0.65;
  context.fillStyle = palette.paper;
  for (let index = 0; index < 42; index += 1) {
    const x = (index * 83) % WIDTH;
    const y = 20 + ((index * 47) % 190);
    const size = index % 7 === 0 ? 2 : 1;
    context.fillRect(x, y, size, size);
  }
  context.globalAlpha = 1;

  context.save();
  context.translate(838, 92);
  context.shadowColor = palette.pink;
  context.shadowBlur = 30;
  context.fillStyle = palette.pink;
  context.beginPath();
  context.arc(0, 0, 56, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;
  context.strokeStyle = palette.night;
  context.lineWidth = 7;
  for (let y = -34; y < 42; y += 14) {
    context.beginPath();
    context.moveTo(-55, y);
    context.lineTo(55, y);
    context.stroke();
  }
  context.restore();

  context.fillStyle = palette.ink;
  context.beginPath();
  context.moveTo(0, 272);
  context.lineTo(90, 205);
  context.lineTo(178, 258);
  context.lineTo(280, 176);
  context.lineTo(356, 252);
  context.lineTo(470, 196);
  context.lineTo(550, 274);
  context.lineTo(0, 330);
  context.closePath();
  context.fill();

  context.globalAlpha = 0.4;
  context.fillStyle = palette.cyan;
  for (let x = 35; x < WIDTH; x += 126) {
    context.fillRect(x, 248 + (x % 4) * 12, 5, 115);
    context.fillRect(x - 16, 255 + (x % 4) * 12, 38, 5);
  }
  context.globalAlpha = 1;

  drawSaloon(context, palette);
  drawCactus(context, 91, FLOOR, 0.8, palette);
  drawCactus(context, 875, FLOOR, 0.65, palette);
  drawCactus(context, 438, FLOOR, 0.35, palette);

  context.fillStyle = palette.ink;
  context.fillRect(0, FLOOR, WIDTH, HEIGHT - FLOOR);
  context.strokeStyle = palette.rust;
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(0, FLOOR + 4);
  context.lineTo(WIDTH, FLOOR + 4);
  context.stroke();

  context.globalAlpha = 0.18;
  context.strokeStyle = palette.cyan;
  context.lineWidth = 1;
  for (let x = -WIDTH; x < WIDTH * 2; x += 70) {
    const offset = (time * 0.03) % 70;
    context.beginPath();
    context.moveTo(x - offset, HEIGHT);
    context.lineTo(WIDTH / 2 + (x - WIDTH / 2) * 0.18, FLOOR);
    context.stroke();
  }
  for (let y = FLOOR + 18; y < HEIGHT; y += 22) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(WIDTH, y);
    context.stroke();
  }
  context.globalAlpha = 1;

  context.globalAlpha = 0.26;
  context.strokeStyle = palette.cyan;
  context.lineWidth = 2;
  const rainOffset = (time * 0.22) % 60;
  for (let x = -40; x < WIDTH + 100; x += 57) {
    const y = (x * 3 + rainOffset * 7) % HEIGHT;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x - 14, y + 34);
    context.stroke();
  }
  context.globalAlpha = 1;
}

export function DemoStage(_: DemoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const keysRef = useRef(new Set<string>());
  const bulletsRef = useRef<Bullet[]>([]);
  const dronesRef = useRef<Drone[]>([]);
  const playerRef = useRef<Player>({x: 130, y: FLOOR, velocityY: 0});
  const [isRunning, setIsRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [breaches, setBreaches] = useState(0);

  const spawnWave = useCallback(() => {
    dronesRef.current = Array.from({length: 7}, (_, index) => ({
      x: WIDTH + index * 150,
      y: FLOOR - 76 - (index % 3) * 42,
      speed: 1.25 + (index % 4) * 0.3,
      alive: true,
      phase: index * 0.8,
    }));
  }, []);

  const fire = useCallback(() => {
    if (!isRunning || bulletsRef.current.length > 7) return;
    const player = playerRef.current;
    bulletsRef.current.push({x: player.x + 88, y: player.y - 56});
  }, [isRunning]);

  const move = useCallback((amount: number) => {
    playerRef.current.x = Math.max(46, Math.min(WIDTH - 108, playerRef.current.x + amount));
  }, []);

  const jump = useCallback(() => {
    if (playerRef.current.y >= FLOOR) playerRef.current.velocityY = -12;
  }, []);

  const start = useCallback(() => {
    playerRef.current = {x: 130, y: FLOOR, velocityY: 0};
    bulletsRef.current = [];
    setScore(0);
    setBreaches(0);
    spawnWave();
    setIsRunning(true);
    canvasRef.current?.focus();
  }, [spawnWave]);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (!isRunning) return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'KeyA', 'KeyD', 'KeyW', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
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
  }, [fire, isRunning, jump]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const palette: Palette = {
      night: color(canvas, '--game-night', '#07080F'),
      raised: color(canvas, '--game-night-raised', '#10131F'),
      cyan: color(canvas, '--game-cyan', '#25D9FF'),
      pink: color(canvas, '--game-pink', '#FF2C9C'),
      green: color(canvas, '--game-green', '#B9FF4B'),
      amber: color(canvas, '--game-amber', '#FFB34E'),
      rust: color(canvas, '--game-rust', '#C65F3A'),
      ink: color(canvas, '--game-ink', '#030409'),
      paper: color(canvas, '--game-paper', '#F4F0E6'),
    };

    const render = (time: number) => {
      drawScene(context, palette, time);

      if (isRunning) {
        const player = playerRef.current;
        if (keysRef.current.has('KeyA') || keysRef.current.has('ArrowLeft')) move(-4.8);
        if (keysRef.current.has('KeyD') || keysRef.current.has('ArrowRight')) move(4.8);
        player.velocityY += 0.62;
        player.y = Math.min(FLOOR, player.y + player.velocityY);
        if (player.y >= FLOOR) player.velocityY = 0;

        bulletsRef.current.forEach(bullet => { bullet.x += 12; });
        bulletsRef.current = bulletsRef.current.filter(bullet => bullet.x < WIDTH + 20);

        let breachDelta = 0;
        dronesRef.current.forEach(drone => {
          if (!drone.alive) return;
          drone.x -= drone.speed;
          if (drone.x < -50) {
            drone.x = WIDTH + Math.random() * 300;
            breachDelta += 1;
          }
          bulletsRef.current.forEach(bullet => {
            if (Math.abs(bullet.x - drone.x) < 36 && Math.abs(bullet.y - drone.y) < 34) {
              drone.alive = false;
              bullet.x = WIDTH + 100;
              setScore(value => value + 100);
              window.setTimeout(() => {
                drone.x = WIDTH + Math.random() * 420;
                drone.alive = true;
              }, 700);
            }
          });
        });
        if (breachDelta > 0) setBreaches(value => value + breachDelta);
      }

      drawPlayer(context, playerRef.current, palette);
      dronesRef.current.forEach(drone => {
        if (drone.alive) drawDrone(context, drone, palette, time);
      });

      context.shadowColor = palette.amber;
      context.shadowBlur = 12;
      context.fillStyle = palette.amber;
      bulletsRef.current.forEach(bullet => context.fillRect(bullet.x, bullet.y, 24, 4));
      context.shadowBlur = 0;

      context.fillStyle = palette.ink;
      context.fillRect(18, 16, 225, 34);
      context.fillRect(WIDTH - 234, 16, 216, 34);
      context.fillStyle = palette.green;
      context.font = '600 16px "IBM Plex Mono", monospace';
      context.fillText(`BOUNTY ¢${String(score).padStart(5, '0')}`, 30, 39);
      context.fillStyle = breaches > 1 ? palette.pink : palette.paper;
      context.fillText(`SALOON ${3 - breaches}/3`, WIDTH - 218, 39);

      if (!isRunning) {
        context.fillStyle = 'rgba(3, 4, 9, 0.62)';
        context.fillRect(0, 0, WIDTH, HEIGHT);
        context.fillStyle = palette.green;
        context.font = '900 58px "Barlow Condensed", sans-serif';
        context.textAlign = 'center';
        context.fillText(breaches >= 3 ? 'BOUNTY LOST' : 'DRAW FAST', WIDTH / 2, HEIGHT / 2 - 10);
        context.fillStyle = palette.paper;
        context.font = '500 16px "IBM Plex Mono", monospace';
        context.fillText(
          breaches >= 3 ? 'THE HELIX POSSE TOOK THE LAST CALL' : 'THE HELIX POSSE IS RIDING IN',
          WIDTH / 2,
          HEIGHT / 2 + 24,
        );
        context.textAlign = 'start';
      }

      if (breaches >= 3 && isRunning) setIsRunning(false);
      frameRef.current = requestAnimationFrame(render);
    };

    frameRef.current = requestAnimationFrame(render);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [breaches, isRunning, move, score]);

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
            <Text type="supporting">Fire</Text><Kbd keys="space" />
          </HStack>
        </HStack>
        <canvas
          ref={canvasRef}
          className="game-canvas"
          width={WIDTH}
          height={HEIGHT}
          tabIndex={0}
          aria-label="Playable side-scrolling shooter demo: defend the Last Call saloon from incoming skull drones"
        />
        <HStack className="cabinet-controls" gap={2} hAlign="between" vAlign="center" wrap="wrap">
          <HStack gap={2}>
            <Button label="Move left" variant="secondary" isIconOnly icon={<ArrowLeft size={18} />} onClick={() => move(-42)} />
            <Button label="Move right" variant="secondary" isIconOnly icon={<ArrowRight size={18} />} onClick={() => move(42)} />
            <Button label="Jump" variant="secondary" isIconOnly icon={<Play className="jump-icon" size={18} />} onClick={jump} />
            <Button label="Fire" variant="secondary" isIconOnly icon={<Crosshair size={18} />} onClick={fire} />
          </HStack>
          <Button
            label={isRunning ? 'Restart bounty' : 'Accept bounty'}
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
