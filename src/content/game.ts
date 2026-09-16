import type {GameSiteContent} from './types';

export const gameContent: GameSiteContent = {
  studio: 'LAST CALL GAMES',
  title: 'NEON CACTUS',
  kicker: 'A CYBER-WESTERN CO-OP RUN & GUN',
  tagline: 'Ride into the electric frontier.',
  synopsis:
    'The sun never rises over Shinjuku Mesa. Saddle up with a crew of chrome-plated outlaws, collect impossible bounties, and shoot your way through the syndicate that owns the night.',
  releaseLabel: 'WANTED: PLAYTESTERS',
  platforms: ['Browser demo', 'Keyboard', 'Gamepad', '2–4 player co-op'],
  features: [
    {
      eyebrow: '01 / QUICKDRAW',
      title: 'Classic run-and-gun, tuned for co-op',
      description:
        'Sprint, slide, climb, and unload together through hand-built stages inspired by arcade side-scrollers.',
    },
    {
      eyebrow: '02 / POSSE UP',
      title: 'Share one code. Raise some hell.',
      description:
        'Open a private saloon, send the room code, and drop up to four bounty hunters into the same run.',
    },
    {
      eyebrow: '03 / BOUNTY TECH',
      title: 'Steal weapons from tomorrow',
      description:
        'Lasso shield drones, fan plasma revolvers, and overcharge contraband implants before they burn out.',
    },
  ],
  characters: [
    {
      name: 'SABLE REYES',
      role: 'Gunslinger / Crowd control',
      description:
        'A former rail marshal with a six-shot railcaster and one last debt to collect from the Helix Combine.',
      accent: 'cyan',
    },
    {
      name: 'K-0Y0TE',
      role: 'Drifter / Precision',
      description:
        'An outlaw synthetic who can ricochet smart rounds around cover and revive partners from across the screen.',
      accent: 'pink',
    },
  ],
  demo: {
    title: 'Last Call at Shinjuku Mesa',
    description:
      'A first browser-playable combat room from Neon Cactus. The full showcase will replace this lightweight prototype with the production Phaser build while preserving the same shell.',
    objective: 'Defend the Last Call Saloon from Helix drones. Three breaches and the bounty is lost.',
  },
  social: {},
};
