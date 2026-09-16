# Neon Cactus

A cyberpunk-western cooperative side-scrolling shooter showcase built from the separate **Astryx Game Marketing Website Template**.

> This repository contains the game-specific identity and serves as the template’s reference implementation. The reusable workshop submission remains a separate repository and does not depend on Neon Cactus assets.

## Pitch

The sun never rises over Shinjuku Mesa. Ride into a neon frontier with up to four chrome-plated outlaws, collect impossible bounties, and shoot through the syndicate that owns the night.

## Run locally

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

The site includes a small playable Canvas prototype and a local lobby fallback. To use the real WebSocket room service:

```bash
cd services/session-server
npm install
npm run dev

# another terminal, from the repository root
VITE_GAME_SERVER_URL=ws://localhost:8080/socket npm run dev
```

## Current vertical slice

- Tokyo-night-meets-neon-desert marketing identity
- Responsive Astryx launch page
- Replaceable key art and playable demo shell
- Keyboard and visible touch controls
- Host/join room flow
- Four-slot multiplayer protocol, with two-player gameplay as the first milestone
- AWS CDK and GitHub deployment path inherited from the template

## Next gameplay milestones

1. Replace the Canvas prototype with the Phaser side-scroller.
2. Add Sable and K-0yote movement, aiming, shooting, and revive mechanics.
3. Build the Last Call Saloon combat room with two enemy types and one miniboss.
4. Connect inputs to an authoritative fixed-timestep server.
5. Polish two-player co-op, then validate four-player camera and bandwidth behavior.

## Deploy

Build the site and use the CDK application under `infra/`. By default the stack publishes the static bundle through CloudFront with no always-on compute. The Fargate WebSocket room service remains available later through `npm run deploy:multiplayer`.

```bash
npm ci
npm run build
cd infra
npm ci
npm run deploy
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for production caveats and scaling steps.
