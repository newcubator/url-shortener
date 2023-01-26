import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { nanoid } from "nanoid";
import { SlackUsecase } from "./slack-usecase";
import { UseCaseInterface } from "./useCaseInterface";

const s3Client = new S3Client({});

// TODO change with your api implementation
const useCase: UseCaseInterface = new SlackUsecase();
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  if (!event.body) {
    console.error("Command payload missing");
    return {
      statusCode: 400,
    };
  }

  let { url, slug, response_url } = useCase.decodeRequest(event.body);

  if (!url) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        text: "Unfortunately, your command was missing the URL. Please try again with a target URL.",
      }),
    };
  }

  if (!slug) {
    slug = nanoid(6);
  }

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: slug,
        Body: undefined,
        WebsiteRedirectLocation: url,
      })
    );

    const link = `https://${process.env.BUCKET_NAME}/${slug}`;

    return {
      statusCode: 200,
      body: JSON.stringify({
        text: `Here is your link ${link}`,
      }),
    };
  } catch (error) {
    console.error(error);
    await useCase.handleError(response_url, error);
    throw error;
  }
};
