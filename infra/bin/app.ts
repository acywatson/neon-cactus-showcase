#!/usr/bin/env node
import {App} from 'aws-cdk-lib';
import {GameSiteStack} from '../lib/game-site-stack';

const app = new App();

const stackName = process.env.CDK_STACK_NAME ?? 'NeonCactusShowcase';

new GameSiteStack(app, stackName, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-west-2',
  },
  description: 'Astryx game marketing site, CloudFront delivery, and cooperative WebSocket room service',
});
