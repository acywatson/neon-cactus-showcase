import {defineTheme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral';

export const gameTheme = defineTheme({
  name: 'neon-cactus',
  extends: neutralTheme,
  color: {
    accent: ['#9ECE6A', '#9ECE6A'],
    neutralStyle: 'cool',
    contrast: 'high',
  },
  typography: {
    scale: {base: 16, ratio: 1.25},
    body: {
      family: 'Inter',
      fallbacks: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    heading: {
      family: '"Barlow Condensed"',
      fallbacks: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
      weight: 'bold',
    },
    code: {
      family: '"IBM Plex Mono"',
      fallbacks: '"SFMono-Regular", Consolas, monospace',
    },
  },
  radius: {base: 1, multiplier: 0.25},
  motion: {
    fast: 130,
    medium: 360,
    ratio: 0.72,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  },
  tokens: {
    '--color-background-body': ['#16161E', '#16161E'],
    '--color-background-surface': ['#1A1B26', '#1A1B26'],
    '--color-background-card': ['#1A1B26', '#1A1B26'],
    '--color-background-popover': ['#24283B', '#24283B'],
    '--color-background-muted': ['#292E42', '#292E42'],
    '--color-text-primary': ['#C0CAF5', '#C0CAF5'],
    '--color-text-secondary': ['#8B93B8', '#8B93B8'],
    '--color-border': ['#292E42', '#292E42'],
    '--color-border-emphasized': ['#3B4261', '#3B4261'],
    '--color-accent': ['#9ECE6A', '#9ECE6A'],
    '--color-on-accent': ['#16161E', '#16161E'],
  },
  localTokens: {
    '--game-night': '#16161E',
    '--game-night-raised': '#1A1B26',
    '--game-cyan': '#7DCFFF',
    '--game-cyan-soft': '#B4E1FF',
    '--game-pink': '#FF007C',
    '--game-green': '#9ECE6A',
    '--game-amber': '#E0AF68',
    '--game-rust': '#FF9E64',
    '--game-violet': '#7AA2F7',
    '--game-ink': '#0F0F17',
    '--game-paper': '#C0CAF5',
    '--game-dust': '#6E5549',
    '--game-grid': 'rgba(125, 207, 255, 0.1)',
    '--game-glow': 'rgba(125, 207, 255, 0.28)',
    '--game-green-glow': 'rgba(158, 206, 106, 0.28)',
    '--game-pink-glow': 'rgba(255, 0, 124, 0.24)',
    '--game-panel': 'rgba(22, 22, 30, 0.88)',
    '--game-panel-solid': '#16161E',
  },
  components: {
    button: {
      base: {
        borderRadius: '2px',
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      },
    },
    card: {
      base: {
        borderRadius: '2px',
      },
    },
    dialog: {
      base: {
        borderRadius: '2px',
      },
    },
  },
});
