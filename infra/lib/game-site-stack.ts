import * as path from 'node:path';
import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  type StackProps,
} from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import type {Construct} from 'constructs';

export class GameSiteStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const vpc = new ec2.Vpc(this, 'GameVpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    const cluster = new ecs.Cluster(this, 'SessionCluster', {vpc});
    const logGroup = new logs.LogGroup(this, 'SessionLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const sessionService = new patterns.ApplicationLoadBalancedFargateService(
      this,
      'SessionService',
      {
        cluster,
        publicLoadBalancer: true,
        assignPublicIp: true,
        desiredCount: 1,
        minHealthyPercent: 100,
        circuitBreaker: {rollback: true},
        cpu: 256,
        memoryLimitMiB: 512,
        listenerPort: 80,
        taskImageOptions: {
          image: ecs.ContainerImage.fromAsset(
            path.join(__dirname, '../../services/session-server'),
          ),
          containerPort: 8080,
          environment: {PORT: '8080'},
          logDriver: ecs.LogDrivers.awsLogs({
            streamPrefix: 'session-server',
            logGroup,
          }),
        },
      },
    );

    sessionService.targetGroup.configureHealthCheck({
      path: '/health',
      healthyHttpCodes: '200',
      interval: Duration.seconds(30),
    });

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        compress: true,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        '/socket*': {
          origin: new origins.LoadBalancerV2Origin(
            sessionService.loadBalancer,
            {protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY},
          ),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy:
            cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      },
      errorResponses: [
        {httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html'},
        {httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html'},
      ],
    });

    new s3deploy.BucketDeployment(this, 'DeploySite', {
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ['/*'],
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../dist'))],
    });

    new CfnOutput(this, 'SiteUrl', {
      value: `https://${distribution.distributionDomainName}`,
    });
    new CfnOutput(this, 'MultiplayerWebSocketUrl', {
      value: `wss://${distribution.distributionDomainName}/socket`,
      description: 'The browser client discovers this same-origin endpoint automatically.',
    });
  }
}
