import {useCallback, useEffect, useRef, useState} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Heading} from '@astryxdesign/core/Heading';
import {Kbd} from '@astryxdesign/core/Kbd';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {ArrowLeft, ArrowRight, Crosshair, Play, RotateCcw} from 'lucide-react';
import type {DemoProps} from '../demo/types';

const WIDTH = 960;
const HEIGHT = 540;
const FLOOR = 440;

type Bullet = {x: number; y: number};
type Drone = {x: number; y: number; speed: number; alive: boolean};
type Player = {x: number; y: number; velocityY: number};

function color(canvas: HTMLCanvasElement, token: string, fallback: string): string {
  return getComputedStyle(canvas).getPropertyValue(token).trim() || fallback;
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
      y: FLOOR - 34 - (index % 3) * 38,
      speed: 1.2 + (index % 4) * 0.28,
      alive: true,
    }));
  }, []);

  const fire = useCallback(() => {
    if (!isRunning || bulletsRef.current.length > 7) {
      return;
    }
    const player = playerRef.current;
    bulletsRef.current.push({x: player.x + 34, y: player.y - 46});
  }, [isRunning]);

  const move = useCallback((amount: number) => {
    playerRef.current.x = Math.max(40, Math.min(WIDTH - 80, playerRef.current.x + amount));
  }, []);

  const jump = useCallback(() => {
    if (playerRef.current.y >= FLOOR) {
      playerRef.current.velocityY = -12;
    }
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
      if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'KeyW', 'Space'].includes(event.code)) {
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

    const night = color(canvas, '--game-night', '#090B19');
    const raised = color(canvas, '--game-night-raised', '#101429');
    const cyan = color(canvas, '--game-cyan', '#00D9FF');
    const pink = color(canvas, '--game-pink', '#FF3DAF');
    const green = color(canvas, '--game-green', '#88F25B');
    const amber = color(canvas, '--game-amber', '#FFB454');
    const ink = color(canvas, '--game-ink', '#050610');
    const text = color(canvas, '--color-text-primary', '#F2F5FF');

    const render = () => {
      context.fillStyle = night;
      context.fillRect(0, 0, WIDTH, HEIGHT);

      context.fillStyle = raised;
      for (let index = 0; index < 13; index += 1) {
        const buildingWidth = 54 + (index % 4) * 18;
        const buildingHeight = 90 + (index % 5) * 34;
        context.fillRect(index * 82, FLOOR - buildingHeight, buildingWidth, buildingHeight);
      }

      context.strokeStyle = cyan;
      context.globalAlpha = 0.18;
      for (let y = FLOOR; y < HEIGHT; y += 24) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(WIDTH, y);
        context.stroke();
      }
      context.globalAlpha = 1;
      context.fillStyle = ink;
      context.fillRect(0, FLOOR, WIDTH, HEIGHT - FLOOR);
      context.fillStyle = pink;
      context.fillRect(0, FLOOR, WIDTH, 4);

      if (isRunning) {
        const player = playerRef.current;
        if (keysRef.current.has('KeyA') || keysRef.current.has('ArrowLeft')) move(-4.6);
        if (keysRef.current.has('KeyD') || keysRef.current.has('ArrowRight')) move(4.6);
        player.velocityY += 0.62;
        player.y = Math.min(FLOOR, player.y + player.velocityY);
        if (player.y >= FLOOR) player.velocityY = 0;

        bulletsRef.current.forEach(bullet => {
          bullet.x += 11;
        });
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
            if (Math.abs(bullet.x - drone.x) < 34 && Math.abs(bullet.y - drone.y) < 30) {
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

      const player = playerRef.current;
      context.fillStyle = cyan;
      context.fillRect(player.x, player.y - 68, 30, 68);
      context.fillStyle = ink;
      context.fillRect(player.x + 7, player.y - 54, 16, 28);
      context.fillStyle = amber;
      context.fillRect(player.x + 24, player.y - 48, 30, 8);

      dronesRef.current.forEach(drone => {
        if (!drone.alive) return;
        context.fillStyle = pink;
        context.fillRect(drone.x - 22, drone.y - 20, 44, 28);
        context.fillStyle = green;
        context.fillRect(drone.x - 7, drone.y - 12, 14, 8);
      });

      context.fillStyle = amber;
      bulletsRef.current.forEach(bullet => context.fillRect(bullet.x, bullet.y, 18, 4));

      context.fillStyle = text;
      context.font = '700 18px monospace';
      context.fillText(`SCORE ${String(score).padStart(5, '0')}`, 28, 36);
      context.fillText(`BREACHES ${breaches}/3`, WIDTH - 190, 36);

      if (!isRunning) {
        context.fillStyle = text;
        context.font = '700 28px sans-serif';
        context.textAlign = 'center';
        context.fillText('DRAW FAST. THE HELIX POSSE IS COMING.', WIDTH / 2, HEIGHT / 2);
        context.textAlign = 'start';
      }

      if (breaches >= 3) {
        setIsRunning(false);
      }

      frameRef.current = requestAnimationFrame(render);
    };

    frameRef.current = requestAnimationFrame(render);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [breaches, isRunning, move, score]);

  return (
    <Card padding={0} elevation="high">
      <VStack gap={0}>
        <HStack padding={3} gap={3} hAlign="between" vAlign="center" wrap="wrap">
          <VStack gap={0.5}>
            <Heading level={3}>Playable bounty: Canvas</Heading>
            <Text type="supporting" color="secondary">
              Swap this component for your production game build.
            </Text>
          </VStack>
          <HStack gap={2} wrap="wrap">
            <Text type="supporting">Move</Text>
            <Kbd keys="a+d" />
            <Text type="supporting">Jump</Text>
            <Kbd keys="w" />
            <Text type="supporting">Fire</Text>
            <Kbd keys="space" />
          </HStack>
        </HStack>
        <canvas
          ref={canvasRef}
          className="game-canvas"
          width={WIDTH}
          height={HEIGHT}
          tabIndex={0}
          aria-label="Playable side-scrolling shooter demo"
        />
        <HStack padding={3} gap={2} hAlign="between" vAlign="center" wrap="wrap">
          <HStack gap={2}>
            <Button
              label="Move left"
              variant="secondary"
              isIconOnly
              icon={<ArrowLeft size={18} />}
              onClick={() => move(-42)}
            />
            <Button
              label="Move right"
              variant="secondary"
              isIconOnly
              icon={<ArrowRight size={18} />}
              onClick={() => move(42)}
            />
            <Button
              label="Jump"
              variant="secondary"
              isIconOnly
              icon={<Play className="jump-icon" size={18} />}
              onClick={jump}
            />
            <Button
              label="Fire"
              variant="secondary"
              isIconOnly
              icon={<Crosshair size={18} />}
              onClick={fire}
            />
          </HStack>
          <Button
            label={isRunning ? 'Restart run' : 'Start run'}
            variant="primary"
            icon={isRunning ? <RotateCcw size={18} /> : <Play size={18} />}
            onClick={start}
          />
        </HStack>
      </VStack>
    </Card>
  );
}
