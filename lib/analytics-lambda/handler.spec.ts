import { handler } from "./handler";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createReadStream } from "node:fs";
import { mockClient } from "aws-sdk-client-mock";
import fetch from "node-fetch";
import { randomUUID } from "node:crypto";

jest.mock("node:crypto");
jest.mock("node-fetch");

const s3ClientMock = mockClient(S3Client);
const fetchMock = fetch as any as jest.Mock;
const randomUUIDMock = randomUUID as any as jest.Mock;

randomUUIDMock.mockReturnValue("00000000-0000-0000-0000-000000000000");

it("handles event", async () => {
  s3ClientMock.on(GetObjectCommand).resolves({
    Body: createReadStream("./something.2022-11-16-09.0b3e9009.gz"),
  } as any);

  await handler(SAMPLE_EVENT);

  expect(fetchMock.mock.calls).toMatchSnapshot();
});

it("throws when loading the s3 file fails", async () => {
  s3ClientMock.on(GetObjectCommand).rejects(new Error("some s3 error"));

  await expect(handler(SAMPLE_EVENT)).rejects.toThrowError("some s3 error");
});

it("throws when calling matomo api call fails", async () => {
  s3ClientMock.on(GetObjectCommand).resolves({
    Body: createReadStream("./something.2022-11-16-09.0b3e9009.gz"),
  } as any);
  fetchMock.mockRejectedValueOnce(new Error("some matomo api error"));

  await expect(handler(SAMPLE_EVENT)).rejects.toThrowError("some matomo api error");
});

const SAMPLE_EVENT = {
  Records: [
    {
      eventSource: "aws:s3",
      eventName: "ObjectCreated:Put",
      s3: {
        bucket: {
          name: "test.com-logs",
        },
        object: {
          key: "something.2022-11-16-09.0b3e9009.gz",
        },
      },
    },
  ],
} as any;
