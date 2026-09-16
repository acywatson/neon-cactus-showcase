import type {ComponentType} from 'react';

export type DemoProps = {
  onExit?: () => void;
};

export type DemoAdapter = {
  id: string;
  title: string;
  Component: ComponentType<DemoProps>;
};
