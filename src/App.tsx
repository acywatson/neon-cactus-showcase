import {useState} from 'react';
import {Badge} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Grid} from '@astryxdesign/core/Grid';
import {Heading} from '@astryxdesign/core/Heading';
import {Link} from '@astryxdesign/core/Link';
import {Section} from '@astryxdesign/core/Section';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {ArrowDown, Github, Play, Radio, Users} from 'lucide-react';
import {DemoStage} from './components/DemoStage';
import {HeroArt} from './components/HeroArt';
import {LobbyDialog} from './components/LobbyDialog';
import {gameContent} from './content/game';

export function App() {
  const [isLobbyOpen, setIsLobbyOpen] = useState(false);

  const scrollToDemo = () => {
    document.getElementById('demo')?.scrollIntoView({behavior: 'smooth'});
  };

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="site-header">
        <HStack maxWidth={1240} width="100%" padding={4} hAlign="between" vAlign="center">
          <a className="wordmark" href="#top" aria-label={`${gameContent.title} home`}>
            <strong>{gameContent.title}</strong>
            <small>{gameContent.studio}</small>
          </a>
          <nav aria-label="Primary navigation">
            <HStack gap={4} vAlign="center">
              <Link href="#features" color="inherit" weight="semibold">Features</Link>
              <Link href="#demo" color="inherit" weight="semibold">Demo</Link>
              <Button
                label="Open co-op lobby"
                variant="secondary"
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
          <Section variant="transparent" padding={4}>
            <Grid columns={{minWidth: 320, max: 2, repeat: 'fit'}} gap={8} align="center">
              <VStack gap={6}>
                <VStack gap={2}>
                  <Text type="label" color="accent">{gameContent.kicker}</Text>
                  <Heading id="hero-title" level={1} type="display-1" weight="bold" textWrap="balance">
                    {gameContent.title}
                  </Heading>
                  <Heading level={2} type="display-3" weight="normal" color="secondary" textWrap="balance">
                    {gameContent.tagline}
                  </Heading>
                </VStack>
                <Text className="hero-synopsis">{gameContent.synopsis}</Text>
                <HStack gap={2} wrap="wrap">
                  {gameContent.platforms.map(platform => (
                    <Badge key={platform} label={platform} variant="cyan" />
                  ))}
                </HStack>
                <HStack gap={3} wrap="wrap">
                  <Button
                    label="Play the demo"
                    variant="primary"
                    size="lg"
                    icon={<Play size={18} />}
                    onClick={scrollToDemo}
                  />
                  <Button
                    label="Start co-op room"
                    variant="secondary"
                    size="lg"
                    icon={<Radio size={18} />}
                    onClick={() => setIsLobbyOpen(true)}
                  />
                </HStack>
                <HStack gap={2} vAlign="center">
                  <ArrowDown size={16} aria-hidden="true" />
                  <Text type="supporting" color="secondary">Scroll to inspect the template system</Text>
                </HStack>
              </VStack>
              <HeroArt />
            </Grid>
          </Section>
        </section>

        <section className="ticker" aria-label="Release status">
          <Text type="label">{gameContent.releaseLabel}</Text>
          <Text type="label">ASTRYX POWERED</Text>
          <Text type="label">PLAY IN BROWSER</Text>
          <Text type="label">CO-OP READY</Text>
        </section>

        <section id="features" className="content-section" aria-labelledby="features-title">
          <Section variant="transparent" padding={4}>
            <VStack gap={8} maxWidth={1200} width="100%">
              <VStack gap={2} maxWidth={680}>
                <Text type="label" color="accent">BUILT TO SHIP</Text>
                <Heading id="features-title" level={2} type="display-2">One launch system. Three critical beats.</Heading>
                <Text color="secondary">A reusable marketing structure that gets players from curiosity to a playable moment without a context switch.</Text>
              </VStack>
              <Grid columns={{minWidth: 280, max: 3, repeat: 'fit'}} gap={4}>
                {gameContent.features.map(feature => (
                  <Card key={feature.title} padding={5} elevation="low">
                    <VStack gap={4}>
                      <Text type="code" color="accent">{feature.eyebrow}</Text>
                      <Heading level={3}>{feature.title}</Heading>
                      <Text color="secondary">{feature.description}</Text>
                    </VStack>
                  </Card>
                ))}
              </Grid>
            </VStack>
          </Section>
        </section>

        <section className="content-section character-section" aria-labelledby="characters-title">
          <Section variant="muted" padding={4}>
            <VStack gap={8} maxWidth={1200} width="100%">
              <VStack gap={2} maxWidth={680}>
                <Text type="label" color="accent">SELECT YOUR LEAD</Text>
                <Heading id="characters-title" level={2} type="display-2">Cast modules built for campaign storytelling.</Heading>
              </VStack>
              <Grid columns={{minWidth: 300, max: 2, repeat: 'fit'}} gap={4}>
                {gameContent.characters.map((character, index) => (
                  <article key={character.name} className={`character-card character-${character.accent}`}>
                    <Text type="code">0{index + 1}</Text>
                    <Heading level={3} type="display-3">{character.name}</Heading>
                    <Text weight="semibold" color="accent">{character.role}</Text>
                    <Text color="secondary">{character.description}</Text>
                  </article>
                ))}
              </Grid>
            </VStack>
          </Section>
        </section>

        <section id="demo" className="content-section demo-section" aria-labelledby="demo-title">
          <Section variant="transparent" padding={4}>
            <VStack gap={6} maxWidth={1200} width="100%">
              <Grid columns={{minWidth: 280, max: 2, repeat: 'fit'}} gap={6} align="end">
                <VStack gap={2}>
                  <Text type="label" color="accent">PLAYABLE PROOF</Text>
                  <Heading id="demo-title" level={2} type="display-2">{gameContent.demo.title}</Heading>
                </VStack>
                <VStack gap={2}>
                  <Text color="secondary">{gameContent.demo.description}</Text>
                  <Text weight="semibold">Objective: {gameContent.demo.objective}</Text>
                </VStack>
              </Grid>
              <DemoStage />
            </VStack>
          </Section>
        </section>

        <section className="final-cta" aria-labelledby="final-title">
          <VStack gap={5} align="center" maxWidth={760}>
            <Text type="label" color="accent">READY PLAYER TWO</Text>
            <Heading id="final-title" level={2} type="display-1" justify="center" textWrap="balance">
              Make the first click feel like the first level.
            </Heading>
            <Text color="secondary" className="center-copy">
              Use this workshop template as the launch layer for your own game, then connect the lobby to any authoritative multiplayer service.
            </Text>
            <HStack gap={3} wrap="wrap" hAlign="center">
              <Button
                label="Open co-op lobby"
                variant="primary"
                size="lg"
                icon={<Users size={18} />}
                onClick={() => setIsLobbyOpen(true)}
              />
              {gameContent.social.github ? (
                <Button
                  label="View source"
                  href={gameContent.social.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="secondary"
                  size="lg"
                  icon={<Github size={18} />}
                />
              ) : null}
            </HStack>
          </VStack>
        </section>
      </main>

      <footer className="site-footer">
        <HStack gap={4} hAlign="between" vAlign="center" wrap="wrap" maxWidth={1200} width="100%">
          <Text type="supporting">{gameContent.title} · Astryx game marketing template</Text>
          <Text type="supporting" color="secondary">Replace the content. Keep the accessible foundation.</Text>
        </HStack>
      </footer>

      <LobbyDialog isOpen={isLobbyOpen} onOpenChange={setIsLobbyOpen} />
    </>
  );
}
