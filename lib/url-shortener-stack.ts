import * as cdk from "aws-cdk-lib";
import {
  aws_certificatemanager as certificateManager,
  aws_cloudfront as cloudFront,
  aws_cloudfront_origins as cloudFrontOrigins,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_lambda_nodejs as lambdaNodejs,
  aws_route53 as route53,
  aws_route53_targets as route53Targets,
  aws_s3 as s3,
  aws_s3_notifications as s3Notifications,
  CfnOutput,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { HttpVersion, OriginProtocolPolicy, PriceClass } from "aws-cdk-lib/aws-cloudfront";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { join } from "path";

const DOMAIN = process.env.DOMAIN ?? "";
const SLACK_CREATE_TOKEN = "nKVmtRFJ2MpfwUU1LZdeQinQ";
const SLACK_UPDATE_TOKEN = "QIQd60UwTUuXjEBrwza6h3jP";

export class UrlShortenerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, `Bucket`, {
      bucketName: DOMAIN,
      publicReadAccess: true,
      websiteIndexDocument: "index",
      websiteErrorDocument: "404.html",
    });

    const logsBucket = new s3.Bucket(this, `Logs`, {
      bucketName: `${DOMAIN}-logs`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const hostedZone = new route53.HostedZone(this, "HostedZone", {
      zoneName: DOMAIN,
    });

    const certificate = new certificateManager.DnsValidatedCertificate(this, `Certificate`, {
      domainName: DOMAIN,
      region: "us-east-1",
      hostedZone,
    });

    const distribution = new cloudFront.Distribution(this, `Distribution`, {
      comment: `${DOMAIN} URL-Shortener`,
      domainNames: [DOMAIN],
      certificate: certificate,
      priceClass: PriceClass.PRICE_CLASS_100,
      httpVersion: HttpVersion.HTTP2_AND_3,
      defaultRootObject: "index",
      defaultBehavior: {
        origin: new cloudFrontOrigins.HttpOrigin(bucket.bucketWebsiteDomainName, {
          protocolPolicy: OriginProtocolPolicy.HTTP_ONLY,
        }),
        viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      errorResponses: [
        {
          httpStatus: 404,
          responsePagePath: "/404.html",
        },
      ],
      logBucket: logsBucket,
    });

    const target = new route53Targets.CloudFrontTarget(distribution);

    new route53.ARecord(this, "A", {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(target),
    });

    new route53.AaaaRecord(this, "AAAA", {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(target),
    });

    /**
     ** Track Analytics
     **/

    const analyticsFunction = new lambdaNodejs.NodejsFunction(this, "AnalyticsHandler", {
      entry: join(__dirname, "./analytics-lambda/handler.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_18_X,
      bundling: {
        minify: true,
        sourcesContent: false,
        sourceMap: true,
        target: "es2020",
      },
    });

    logsBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3Notifications.LambdaDestination(analyticsFunction)
    );

    /**
     ** Create Handler
     **/

    const apiRole = new iam.Role(this, "ApiRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });

    apiRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
        resources: ["*"],
      })
    );

    bucket.grantReadWrite(apiRole);

    const createFunction = new lambdaNodejs.NodejsFunction(this, "CreateHandler", {
      entry: join(__dirname, "./create-lambda/handler.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_18_X,
      role: apiRole,
      environment: {
        BUCKET_NAME: bucket.bucketName,
        DOMAIN,
      },
      bundling: {
        minify: true,
        sourcesContent: false,
        sourceMap: true,
        target: "es2020",
      },
    });

    new CfnOutput(this, "CreateHandlerFunctionUrl", {
      value: createFunction.addFunctionUrl({
        authType: lambda.FunctionUrlAuthType.NONE,
      }).url,
    });
  }
}
