# URL Shortener

The URL Shortener is a custom solution for creating short, sharable URLs that can be used for QR codes on business
cards, utilizing an AWS S3 feature with a Cloudfront for caching and tracking of requests while maintaining data privacy
and allowing for analysis.

## Motivation

The main motivation behind the URL shortener was to create short URLs that could be used for QR codes on business cards.
In searching for a suitable tool, it was discovered that established solutions would involve sharing requests with
unknown parties and ultimately having no control over data privacy.

The goal was to create a fast, cost-effective, and
anonymous solution that did not rely on active user tracking, while still allowing the marketing team to conduct
analysis.

## Solution

To achieve these goals, an AWS S3 feature is utilized. When an S3 bucket is configured for static hosting, each object
is a part of the URL path. These objects have the ability to contain meta tags, such as the
x-amz-website-redirect-location. Requests to objects with this tag are interpreted as 301 redirects.

A Cloudfront is placed in front of the S3 bucket, which has caching enabled. To track the number of requests, all
requests are logged in Cloudwatch and saved as files in a separate S3 bucket.

When the files are created, a lambda is triggered to analyze the logs and send them to an analytics tool. The creation
of redirects is achieved through a request to a lambda.

## Usage

1. Build you api handler, implementing `lib/create-lambda/useCaseInterface.ts`.
2. Use this implementation in `lib/create-lambda/handler.ts:10`.
3. Implement you custom analytics url builder in `lib/analytics-lambda/handler.ts`.
4. Configure `.env`.
5. Deploy this with the aws cdk. Either directly with the cli or with a ci job.
