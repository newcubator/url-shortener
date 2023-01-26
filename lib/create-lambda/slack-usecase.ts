import { decode, ParsedUrlQuery } from "querystring";
import { request } from "undici";
import { UseCaseInterface } from "./useCaseInterface";

/**
 * This in example implementation for the api useCase, coming from a slack Command.
 */
export class SlackUsecase implements UseCaseInterface {
  decodeRequest(body: string): { url: string; slug: string | undefined; response_url: string } {
    const command = decodeSlackCommandPayload(body);
    const [url, slug, ...rest] = command.text.split(" ");
    return { url, slug, response_url: command.response_url };
  }

  handleError(response_url: string, error?: any): Promise<any> {
    return slackRespond(
      response_url,
      `Sorry, but something went wrong while creating the link. Please inform #corporate-it so someone can check what my problem was.`
    );
  }
}

async function slackRespond(response_url: string, message: string) {
  return request(response_url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: message,
    }),
  });
}

function decodeSlackCommandPayload(payload: string): CreateHandler {
  const queryString = Buffer.from(payload, "base64").toString("utf8");
  return decode(queryString) as CreateHandler;
}

export interface CreateHandler extends ParsedUrlQuery {
  token: string;
  team_id: string;
  team_domain: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  command: string;
  text: string;
  response_url: string;
}
