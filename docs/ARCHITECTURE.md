# Architecture

## Runtime

```text
Browser
  ├─ HTTPS → CloudFront → private S3 bucket
  └─ WSS /socket → CloudFront → public ALB → ECS Fargate room server
```

CloudFront gives the site and WebSocket service one TLS origin. This prevents mixed-content failures and lets the browser derive the multiplayer URL from `window.location`.

## Frontend seams

- **Content:** `src/content/game.ts`
- **Visual identity:** `src/theme.ts` and `src/theme.css`
- **Playable game:** `src/demo/types.ts` and `DemoStage`
- **Rooms:** `src/multiplayer/client.ts`

Astryx owns accessible controls, dialogs, text fields, typography, and layout primitives. Custom CSS is reserved for game-specific atmosphere and consumes theme tokens.

## Room server

The Node.js WebSocket process stores active rooms in memory. Each room has a four-player ceiling. Disconnecting removes membership and empty rooms are deleted.

The first service is deliberately stateless beyond one task. Before scaling above one Fargate task, add a shared room directory and pub/sub transport—DynamoDB plus ElastiCache, or a purpose-built session service. Do not increase `desiredCount` until messages can route to the task that owns a room.

## Gameplay authority roadmap

The shipped service handles room membership and input relay. The production game should add:

1. fixed-timestep server simulation;
2. client input sequence acknowledgements;
3. local prediction and reconciliation;
4. interpolated remote snapshots;
5. reconnect grace periods;
6. rate limits and payload validation;
7. regional placement and latency telemetry.

Build and tune this for two players first. Keep four protocol slots enabled, then turn on four-player gameplay after camera, enemy density, and bandwidth tests pass.

## AWS cost posture

The static site is inexpensive. Fargate and the ALB are the baseline recurring cost even when idle. For an occasional workshop demo, destroy the stack after use or set the service to zero outside demo windows. A serverless WebSocket design can reduce idle cost but is a worse fit for an authoritative action-game loop.

## Security

- S3 blocks all public access; CloudFront uses origin access control.
- The service container runs as an unprivileged user.
- GitHub deploys with OIDC rather than stored AWS access keys.
- The room protocol accepts no identity claims and stores no personal data.
- Add WAF, rate limits, origin restrictions, and abuse monitoring before a public campaign.
