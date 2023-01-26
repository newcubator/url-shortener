#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { UrlShortenerStack } from "../lib/url-shortener-stack";

const STACK_NAME = process.env.STACK_NAME ?? "";
const AWS_REGION = process.env.AWS_REGION ?? "";

const app = new cdk.App();
new UrlShortenerStack(app, STACK_NAME, {
  env: { region: AWS_REGION },
  tags: {
    project: STACK_NAME,
  },
});
