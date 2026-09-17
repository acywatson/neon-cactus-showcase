import {lazy, Suspense, useCallback, useState} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {Heading} from '@astryxdesign/core/Heading';
import {Link} from '@astryxdesign/core/Link';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {
  ArrowDown,
  Crosshair,
  Github,
  Play,
  Radio,
  Skull,
  Sparkles,
  Users,
  Volume2,
  Zap,
} from 'lucide-react';
import {DemoStage} from './components/DemoStage';
import {LobbyDialog} from './components/LobbyDialog';

const HeroScene = lazy(() => import('./components/HeroScene'));

const bounties = [
  {
    number: '01',
    icon: <Crosshair aria-hidden="true" />,
    eyebrow: 'QUICKDRAW SYSTEM',
    title: 'Run loud. Shoot first.',
    description:
      'Arcade-tight movement, instant reloads, and weapons built to turn every screen into a moving target gallery.',
  },
  {
    number: '02',
    icon: <Users aria-hidden="true" />,
    eyebrow: 'POSSE PROTOCOL',
    title: 'Nobody rides alone.',
    description:
      'Drop in with a room code, pull partners back from the brink, and combine outlaw tech for impossible saves.',
  },
  {
    number: '03',
    icon: <Zap aria-hidden="true" />,
    eyebrow: 'CONTRABAND ARSENAL',
    title: 'Steal tomorrow’s weapons.',
    description:
      'Lasso shield drones, fan plasma revolvers, and burn out black-market implants before they burn you.',
  },
];

const worldFacts = [
  ['01', 'One endless midnight'],
  ['02', 'Four wanted outlaws'],
  ['03', 'Zero clean getaways'],
];

export function App() {
  const [isLobbyOpen, setIsLobbyOpen] = useState(false);
  const [isSceneLive, setIsSceneLive] = useState(false);
  const handleSceneReady = useCallback(() => setIsSceneLive(true), []);

  const scrollToDemo = () => {
    document.getElementById('demo')?.scrollIntoView({behavior: 'smooth'});
  };

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>

      <header className="site-header">
        <HStack className="nav-shell" width="100%" hAlign="between" vAlign="center">
          <a className="wordmark" href="#top" aria-label="Neon Cactus home">
            <strong>NEON CACTUS</strong>
            <small>LAST CALL GAMES // 2086</small>
          </a>
          <nav aria-label="Primary navigation">
            <HStack gap={4} vAlign="center">
              <Link href="#bounties" color="inherit" weight="semibold">Bounties</Link>
              <Link href="#outlaws" color="inherit" weight="semibold">Outlaws</Link>
              <Link href="#demo" color="inherit" weight="semibold">Demo</Link>
              <Button
                label="Form a posse"
                variant="primary"
                size="sm"
                icon={<Users size={16} />}
                onClick={() => setIsLobbyOpen(true)}
              />
            </HStack>
          </nav>
        </HStack>
      </header>

      <main id="main-content">
        <section id="top" className="hero-section" aria-labelledby="hero-title">
          <figure className={isSceneLive ? 'hero-backdrop is-live' : 'hero-backdrop'}>
            <img
              src="/art/neon-cactus-key-art.jpg"
              alt="Two cybernetic outlaws approach the glowing Neon Cactus saloon in a rain-soaked desert town."
            />
            <Suspense fallback={null}>
              <HeroScene onReady={handleSceneReady} />
            </Suspense>
            <figcaption className="visually-hidden">
              Welcome to Shinjuku Mesa, where the sun never rises and every outlaw carries a bounty. Sable Reyes and K-0Y0TE stand beneath the Neon Cactus sign as rain falls over the skyline.
            </figcaption>
          </figure>

          <VStack className="hero-copy" gap={5}>
            <HStack className="hero-status" gap={2} vAlign="center">
              <Radio size={15} aria-hidden="true" />
              <Text type="code">TRANSMISSION // SHINJUKU MESA</Text>
            </HStack>
            <VStack gap={1}>
              <Text className="hero-japanese" aria-hidden="true">電気の荒野</Text>
              <Heading id="hero-title" level={1} className="hero-title">
                NEON<br />CACTUS
              </Heading>
            </VStack>
            <Heading level={2} className="hero-tagline" textWrap="balance">
              Ride into the electric frontier.
            </Heading>
            <Text className="hero-synopsis">
              Four chrome-plated outlaws. One city that owns the night. A co-op run-and-gun fever dream from the wrong side of tomorrow.
            </Text>
            <HStack gap={3} wrap="wrap">
              <Button
                label="Play the bounty"
                variant="primary"
                size="lg"
                icon={<Play size={18} />}
                onClick={scrollToDemo}
              />
              <Button
                label="Form a posse"
                variant="secondary"
                size="lg"
                icon={<Users size={18} />}
                onClick={() => setIsLobbyOpen(true)}
              />
            </HStack>
          </VStack>

          <aside className="hero-stamp" aria-label="Playable prototype status">
            <Text type="code">PLAYTEST BUILD</Text>
            <strong>0.1</strong>
            <Text type="supporting">BROWSER // NO DOWNLOAD</Text>
          </aside>

          <a className="scroll-cue" href="#transmission">
            <ArrowDown size={18} aria-hidden="true" />
            <Text type="code">DESCEND</Text>
          </a>
        </section>

        <section className="signal-strip" aria-label="Game highlights">
          <Text type="code">2–4 PLAYER CO-OP</Text>
          <Sparkles size={16} aria-hidden="true" />
          <Text type="code">HANDCRAFTED MAYHEM</Text>
          <Sparkles size={16} aria-hidden="true" />
          <Text type="code">PLAY IN BROWSER</Text>
          <Sparkles size={16} aria-hidden="true" />
          <Text type="code">NO CLEAN GETAWAYS</Text>
        </section>

        <section id="transmission" className="story-section" aria-labelledby="story-title">
          <VStack className="story-heading" gap={4}>
            <Text type="code" className="section-kicker">01 // THE FRONTIER</Text>
            <Heading id="story-title" level={2} className="section-title" textWrap="balance">
              The sun never rises over Shinjuku Mesa.
            </Heading>
          </VStack>
          <VStack className="story-body" gap={5}>
            <Text className="lead-copy">
              The Helix Combine bought the sky, the rails, and every badge worth wearing. Now it wants the Last Call—the only bar still pouring drinks outside corporate law.
            </Text>
            <Text color="secondary">
              Saddle up through rain-black alleys and neon badlands. Collect impossible bounties. Hijack outlaw tech. Keep moving until the city runs out of things to send after you.
            </Text>
            <dl className="world-facts">
              {worldFacts.map(([number, label]) => (
                <figure key={number} className="world-fact">
                  <dt>{number}</dt>
                  <dd>{label}</dd>
                </figure>
              ))}
            </dl>
          </VStack>
          <aside className="wanted-mark" aria-hidden="true">
            <Skull />
            <strong>WANTED</strong>
            <small>DEAD // REBOOTED</small>
          </aside>
        </section>

        <section id="bounties" className="bounty-section" aria-labelledby="bounty-title">
          <header className="section-header">
            <VStack gap={2}>
              <Text type="code" className="section-kicker">02 // BUILT FOR THE GETAWAY</Text>
              <Heading id="bounty-title" level={2} className="section-title">Take the job.<br />Break the rules.</Heading>
            </VStack>
            <Text className="section-deck" color="secondary">
              Contra-speed gunplay meets cooperative outlaw chaos. Every system is built for the moment the plan goes bad.
            </Text>
          </header>

          <ol className="bounty-list">
            {bounties.map(bounty => (
              <li key={bounty.number} className="bounty-item">
                <Text type="code" className="bounty-number">{bounty.number}</Text>
                <i className="bounty-icon">{bounty.icon}</i>
                <VStack gap={1} className="bounty-copy">
                  <Text type="code" className="bounty-eyebrow">{bounty.eyebrow}</Text>
                  <Heading level={3} className="bounty-name">{bounty.title}</Heading>
                  <Text color="secondary">{bounty.description}</Text>
                </VStack>
              </li>
            ))}
          </ol>
        </section>

        <section id="outlaws" className="outlaw-section" aria-labelledby="outlaw-title">
          <header className="outlaw-header">
            <Text type="code" className="section-kicker">03 // CHOOSE YOUR OUTLAW</Text>
            <Heading id="outlaw-title" level={2} className="section-title">Every legend needs<br />an accomplice.</Heading>
          </header>

          <article className="outlaw-card outlaw-sable">
            <figure className="outlaw-art">
              <img src="/art/sable-reyes.jpg" alt="Sable Reyes, a cybernetic rail marshal in a black hat and duster." />
            </figure>
            <VStack className="outlaw-dossier" gap={4}>
              <Text type="code">OUTLAW // 01</Text>
              <Heading level={3} className="outlaw-name">SABLE<br />REYES</Heading>
              <Text className="outlaw-role">GUNSLINGER // CROWD CONTROL</Text>
              <Text>
                A former rail marshal with a six-shot railcaster and one last debt to collect from the Helix Combine.
              </Text>
              <dl className="outlaw-stats">
                <figure><dt>GRIT</dt><dd>█████</dd></figure>
                <figure><dt>SPEED</dt><dd>███░░</dd></figure>
                <figure><dt>CHAOS</dt><dd>████░</dd></figure>
              </dl>
            </VStack>
          </article>

          <article className="outlaw-card outlaw-koyote">
            <figure className="outlaw-art">
              <img src="/art/koyote.jpg" alt="K-0Y0TE, a synthetic drifter with glowing magenta eyes and a patched poncho." />
            </figure>
            <VStack className="outlaw-dossier" gap={4}>
              <Text type="code">OUTLAW // 02</Text>
              <Heading level={3} className="outlaw-name">K-0<br />Y0TE</Heading>
              <Text className="outlaw-role">DRIFTER // PRECISION</Text>
              <Text>
                An outlaw synthetic who ricochets smart rounds around cover and revives partners from across the screen.
              </Text>
              <dl className="outlaw-stats">
                <figure><dt>GRIT</dt><dd>███░░</dd></figure>
                <figure><dt>SPEED</dt><dd>█████</dd></figure>
                <figure><dt>CHAOS</dt><dd>████░</dd></figure>
              </dl>
            </VStack>
          </article>
        </section>

        <section id="demo" className="demo-section" aria-labelledby="demo-title">
          <header className="demo-heading">
            <VStack gap={2}>
              <Text type="code" className="section-kicker">04 // PLAYABLE BOUNTY</Text>
              <Heading id="demo-title" level={2} className="section-title">Last Call at<br />Shinjuku Mesa</Heading>
            </VStack>
            <VStack gap={3} className="demo-brief">
              <HStack gap={2} vAlign="center">
                <Volume2 size={18} aria-hidden="true" />
                <Text type="code">OBJECTIVE // HOLD THE LINE</Text>
              </HStack>
              <Text color="secondary">
                Defend the saloon from Helix skull-drones. Move with A/D, jump with W, and fire with Space. Three breaches and the bounty is lost.
              </Text>
            </VStack>
          </header>
          <DemoStage />
        </section>

        <section className="final-cta" aria-labelledby="final-title">
          <figure className="final-art" aria-hidden="true">
            <img src="/art/neon-cactus-key-art.jpg" alt="" />
          </figure>
          <VStack className="final-copy" gap={5} align="center">
            <Text type="code" className="section-kicker">THE LAST CALL IS OPEN</Text>
            <Heading id="final-title" level={2} className="final-title" justify="center" textWrap="balance">
              Bring a friend.<br />Bring a bigger gun.
            </Heading>
            <HStack gap={3} wrap="wrap" hAlign="center">
              <Button
                label="Play the bounty"
                variant="primary"
                size="lg"
                icon={<Play size={18} />}
                onClick={scrollToDemo}
              />
              <Button
                label="Form a posse"
                variant="secondary"
                size="lg"
                icon={<Users size={18} />}
                onClick={() => setIsLobbyOpen(true)}
              />
            </HStack>
          </VStack>
        </section>
      </main>

      <footer className="site-footer">
        <HStack gap={4} hAlign="between" vAlign="center" wrap="wrap" width="100%">
          <VStack gap={1}>
            <strong>NEON CACTUS</strong>
            <Text type="supporting">© 2086 Last Call Games. No clean getaways.</Text>
          </VStack>
          <HStack gap={5} vAlign="center" className="footer-links">
            <Link href="#top" color="inherit">Back to top</Link>
            <Link href="https://github.com/acywatson/neon-cactus-showcase" isExternalLink color="inherit">
              <HStack gap={1.5} vAlign="center">
                <Github size={16} aria-hidden="true" />
                <Text>Source</Text>
              </HStack>
            </Link>
          </HStack>
        </HStack>
      </footer>

      <LobbyDialog isOpen={isLobbyOpen} onOpenChange={setIsLobbyOpen} onPlaySolo={scrollToDemo} />
    </>
  );
}
