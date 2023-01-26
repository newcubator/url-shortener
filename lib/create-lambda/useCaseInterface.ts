export interface UseCaseInterface {
  decodeRequest(body: string): { url: string; slug: string | undefined; response_url: string };

  handleError(response_url: string, error?: any): Promise<any>;
}
