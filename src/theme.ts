import {defineTheme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral';

export const gameTheme = defineTheme({
  name: 'neon-cactus',
  extends: neutralTheme,
  color: {
    accent: ['#88F25B', '#A6FF7D'],
    neutralStyle: 'cool',
    contrast: 'high',
  },
  typography: {
    scale: {base: 15, ratio: 1.24},
    body: {
      family: 'Inter',
      fallbacks: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    heading: {
      family: 'Impact',
      fallbacks: 'Haettenschweiler, "Arial Narrow Bold", sans-serif',
      weight: 'bold',
    },
    code: {
      family: '"SFMono-Regular"',
      fallbacks: 'Consolas, "Liberation Mono", monospace',
    },
  },
  radius: {base: 2, multiplier: 0.5},
  motion: {fast: 140, medium: 340, ratio: 0.72},
  tokens: {
    '--color-background-body': ['#090B19', '#090B19'],
    '--color-background-surface': ['#101429', '#101429'],
    '--color-background-card': ['#131933', '#131933'],
    '--color-background-popover': ['#181F3D', '#181F3D'],
    '--color-background-muted': ['#18213B', '#18213B'],
    '--color-text-primary': ['#F2F5FF', '#F2F5FF'],
    '--color-text-secondary': ['#A6B0D4', '#A6B0D4'],
    '--color-border': ['#27345F', '#27345F'],
    '--color-border-emphasized': ['#526493', '#526493'],
    '--color-accent': ['#88F25B', '#A6FF7D'],
    '--color-on-accent': ['#071019', '#071019'],
  },
  localTokens: {
    '--game-night': '#090B19',
    '--game-night-raised': '#101429',
    '--game-cyan': '#00D9FF',
    '--game-cyan-soft': '#7BEAFF',
    '--game-pink': '#FF3DAF',
    '--game-green': '#88F25B',
    '--game-amber': '#FFB454',
    '--game-violet': '#7C5CFF',
    '--game-ink': '#050610',
    '--game-grid': 'rgba(0, 217, 255, 0.14)',
    '--game-glow': 'rgba(0, 217, 255, 0.36)',
    '--game-pink-glow': 'rgba(255, 61, 175, 0.3)',
    '--game-panel': 'rgba(12, 17, 38, 0.88)',
  },
  components: {
    button: {
      base: {
        borderRadius: '4px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      },
    },
    card: {
      base: {
        borderRadius: '6px',
      },
    },
    dialog: {
      base: {
        borderRadius: '8px',
      },
    },
  },
});
