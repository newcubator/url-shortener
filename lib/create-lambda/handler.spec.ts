import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { handler } from "./handler";
import { stringify } from "node:querystring";
import { mockClient } from "aws-sdk-client-mock";

import "aws-sdk-client-mock-jest";

jest.mock("nanoid", () => {
  return { nanoid: () => "Tdiq0A" };
});

process.env.BUCKET_NAME = "TestBucket";

const s3Mock = mockClient(S3Client);

describe("slack command", () => {
  beforeEach(() => {
    s3Mock.reset();
  });

  it("handles a command invocation", async () => {
    s3Mock.on(PutObjectCommand).resolves({});

    await handler(
      {
        body: Buffer.from(
          stringify({
            text: "https://www.linkedin.com/in/jan-sauer/",
          })
        ),
      } as any,
      null as any,
      null as any
    );

    expect(s3Mock).toHaveReceivedCommandWith(PutObjectCommand, {
      Bucket: "TestBucket",
      Key: "Tdiq0A",
      Body: undefined,
      WebsiteRedirectLocation: "https://www.linkedin.com/in/jan-sauer/",
    });
  });

  it("handles a command invocation with slug", async () => {
    s3Mock.on(PutObjectCommand).resolves({});

    await handler(
      {
        body: Buffer.from(
          stringify({
            text: "https://www.linkedin.com/in/jan-sauer/ jansauer",
          })
        ),
      } as any,
      null as any,
      null as any
    );

    expect(s3Mock).toHaveReceivedCommandWith(PutObjectCommand, {
      Bucket: "TestBucket",
      Key: "jansauer",
      Body: undefined,
      WebsiteRedirectLocation: "https://www.linkedin.com/in/jan-sauer/",
    });
  });

  it("responds with instructions when the link url is missing", async () => {
    await handler(
      {
        body: Buffer.from(
          stringify({
            text: "",
          })
        ),
      } as any,
      null as any,
      null as any
    );

    expect(s3Mock).toHaveReceivedCommandTimes(PutObjectCommand, 0);
  });

  it("throw error when something fails", async () => {
    s3Mock.on(PutObjectCommand).rejects(new Error("some error"));

    await expect(
      handler(
        {
          body: Buffer.from(
            stringify({
              text: "https://www.linkedin.com/in/jan-sauer/",
              response_url:
                "https://hooks.slack.com/commands/T1G4GKUTV/4480300482839/yRJxlY0UfjSbf35DROsx89zh",
            })
          ),
        } as any,
        null as any,
        null as any
      )
    ).rejects.toThrowError(/some error/);
  });
});
