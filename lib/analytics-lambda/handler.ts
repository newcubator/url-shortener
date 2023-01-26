import { S3CreateEvent } from "aws-lambda";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";
import { randomUUID } from "node:crypto";
import fetch from "node-fetch";

// TODO add you tracking endpoint
const TRACKING_ENDPOINT = "https://analytics.test.com";

const CLOUD_FRONT_LOG_REGEX = new RegExp(
  "^[^#\n](?<date>(?:(?!\t).)*)\t(?<time>(?:(?!\t).)*)\t(?<edge_location>(?:(?!\t).)*)\t(?<sc_bytes>(?:(?!\t).)*)\t(?<c_ip>(?:(?!\t).)*)\t(?<cs_method>(?:(?!\t).)*)\t(?<cs_host>(?:(?!\t).)*)\t(?<cs_uri_stem>(?:(?!\t).)*)\t(?<sc_status>(?:(?!\t).)*)\t(?<referer>(?:(?!\t).)*)\t(?<user_agent>(?:(?!\t).)*)\t(?<uri_query>(?:(?!\t).)*)\t(?<cookie>(?:(?!\t).)*)\t(?<edge_result_type>(?:(?!\t).)*)\t(?<edge_request_id>(?:(?!\t).)*)\t(?<host_header>(?:(?!\t).)*)\t(?<protocol>(?:(?!\t).)*)\t(?<bytes>(?:(?!\t).)*)\t(?<time_taken>(?:(?!\t).)*)\t(?<forwarded_for>(?:(?!\t).)*)\t(?<ssl_protocol>(?:(?!\t).)*)\t(?<ssl_cipher>(?:(?!\t).)*)\t(?<edge_response_result_type>(?:(?!\t).)*)\t(?<protocol_version>(?:(?!\t).)*)\t(?<fle_status>(?:(?!\t).)*)\t(?<fle_encrypted_fields>(?:(?!\t).)*).*"
);

const client = new S3Client({});

export const handler = async (event: S3CreateEvent) => {
  console.log(`Processing ${event.Records.length} log files`);

  for (const record of event.Records) {
    await processLogFile(record.s3.bucket.name, record.s3.object.key);
  }
};

async function processLogFile(bucket: string, key: string) {
  let response;
  try {
    response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
  } catch (error) {
    console.error(`Error while loading log file '${bucket}' '${key}' from s3`);
    console.error(error);
    throw error;
  }

  const lineReader = createInterface({
    input: (response.Body as any).pipe(createGunzip()),
    crlfDelay: Infinity,
  });

  for await (const line of lineReader) {
    await processLogLine(line);
  }
}

async function processLogLine(line: string) {
  const found = line.match(CLOUD_FRONT_LOG_REGEX);

  if (found && found.groups) {
    console.info(`Tracking ${found.groups.cs_uri_stem}`);
    const url = buildTrackingUrl(found.groups);

    try {
      await fetch(url);
    } catch (error) {
      console.error(`Error while calling analytics tool api with '${url}'`);
      console.error(error);
      throw error;
    }
  }
}

/**
 * TODO Build the tracking URL fro your tracking tool. This is an example for matomo.
 *
 * Build a matomo tracking api url.
 *
 * @See https://developer.matomo.org/api-reference/tracking-api
 *
 * For google analytics
 *
 * @See https://developers.google.com/analytics/devguides/collection/protocol/v1
 */
function buildTrackingUrl(log: any) {
  const url = new URL(TRACKING_ENDPOINT);
  const qp = url.searchParams;

  qp.append("idsite", "1");
  qp.append("rec", "1");

  const calledUrl = `${log.protocol}://${log.host_header}${log.cs_uri_stem}`;
  qp.append("url", calledUrl);
  qp.append("rand", randomUUID());
  qp.append("apiv", "1");

  if (log.referer != "-") qp.append("urlref", log.referer);
  const time = log.time.split(":");
  qp.append("h", time[0]);
  qp.append("m", time[1]);
  qp.append("s", time[2]);
  qp.append("ua", log.user_agent);
  qp.append("gt_ms", log.time_taken);

  return url.toString();
}
