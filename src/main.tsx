import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {Theme} from '@astryxdesign/core/theme';
import {gameTheme} from './theme';
import {App} from './App';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import './theme.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Theme theme={gameTheme} mode="dark">
      <App />
    </Theme>
  </StrictMode>,
);
