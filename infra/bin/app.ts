#!/usr/bin/env node
import {App} from 'aws-cdk-lib';
import {GameSiteStack} from '../lib/game-site-stack';

const app = new App();

new GameSiteStack(app, 'AstryxGameSite', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-west-2',
  },
  description: 'Astryx game marketing site, CloudFront delivery, and cooperative WebSocket room service',
});
