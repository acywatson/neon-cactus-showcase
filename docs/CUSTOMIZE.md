# Customization guide

## Content

Edit `src/content/game.ts`. The `GameSiteContent` type keeps marketing copy separate from layout and covers:

- studio, title, kicker, tagline, and synopsis;
- release label and platform categories;
- three core feature stories;
- playable character cards;
- demo copy and objective;
- optional source and community links.

Keep the object serializable so a future CMS or JSON import can replace it without changing components.

## Theme

Edit `src/theme.ts` for brand decisions. It extends Astryx Neutral and owns all color, type, radius, motion, and component overrides. Brand-only values live under `localTokens`; `theme.css` consumes those variables rather than hard-coded colors.

After changing Astryx versions, run:

```bash
npm run astryx -- upgrade --apply
npm run astryx -- doctor
```

## Key art

`src/components/HeroArt.tsx` is a zero-asset SVG placeholder. Replace the component with licensed key art, a video loop, or your own SVG while retaining:

- a meaningful accessible label or decorative treatment;
- responsive sizing;
- an optimized fallback image for video;
- reduced-motion handling for animated media.

## Playable demo

`src/demo/types.ts` defines the adapter boundary. `DemoStage` is intentionally small and dependency-free. A production integration can mount:

- Phaser in a React effect;
- Unity or Godot WebGL output;
- an iframe hosted on a separate origin;
- a streamed or remote-play experience.

Keep visible loading, failure, mute, fullscreen, and exit states around the game surface.

## Multiplayer

`src/multiplayer/client.ts` discovers a same-origin `/socket` endpoint in production and uses an in-browser fallback on localhost. Set `VITE_GAME_SERVER_URL` to override it.

The included protocol supports:

- `create_room`
- `join_room`
- `room_joined`
- `room_state`
- sequenced `input` / `player_input`
- `ping` / `pong`

Add versioning before changing wire shapes after launch.

## Submission-safe separation

Do not add proprietary game art, licensed fonts, unreleased music, or game-specific lore to the template repository. Put those in the showcase repository. Improvements to accessibility, responsive layout, adapters, infrastructure, and docs can flow back into the template.
