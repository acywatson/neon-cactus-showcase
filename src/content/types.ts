export type GameCharacter = {
  name: string;
  role: string;
  description: string;
  accent: 'cyan' | 'pink' | 'green' | 'orange';
};

export type GameFeature = {
  eyebrow: string;
  title: string;
  description: string;
};

export type GameSiteContent = {
  studio: string;
  title: string;
  kicker: string;
  tagline: string;
  synopsis: string;
  releaseLabel: string;
  platforms: string[];
  features: GameFeature[];
  characters: GameCharacter[];
  demo: {
    title: string;
    description: string;
    objective: string;
  };
  social: {
    discord?: string;
    github?: string;
  };
};
