export type AnthropicMessageRole = 'user' | 'assistant';
export type AnthropicTextContent = { type: 'text'; text: string };
export type AnthropicImageContent = {
  type: 'image';
  source: {
    type: 'base64';
    media_type: string;
    data: string;
  };
};

export type AnthropicMessageContent = AnthropicTextContent | AnthropicImageContent;

export interface AnthropicMessage {
  role: AnthropicMessageRole;
  content: string | AnthropicMessageContent[];
}

export interface AnthropicMessageRequest {
  model: string;
  messages: AnthropicMessage[];
  max_tokens: number;
  temperature?: number;
  top_p?: number;
  stop_sequences?: string[];
  stream?: boolean;
}

export interface AnthropicMessageResponse {
  id: string;
  model: string;
  content: AnthropicTextContent[];
  stop_reason?: string | null;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicClientOptions {
  apiKey?: string;
  baseURL?: string;
  version?: string;
}

class Anthropic {
  private apiKey: string;
  private baseURL: string;
  private version: string;

  constructor(options: AnthropicClientOptions = {}) {
    const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Anthropic API key is required');
    }

    this.apiKey = apiKey;
    this.baseURL = options.baseURL?.replace(/\/$/, '') || 'https://api.anthropic.com/v1';
    this.version = options.version || '2023-06-01';
  }

  public messages = {
    create: async (params: AnthropicMessageRequest): Promise<AnthropicMessageResponse> => {
      const response = await fetch(`${this.baseURL}/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': this.version,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Anthropic request failed: ${response.status} ${errorText}`);
      }

      const data = (await response.json()) as AnthropicMessageResponse;
      if (!Array.isArray(data.content)) {
        throw new Error('Unexpected response from Anthropic API');
      }

      return data;
    },
  };
}

export { Anthropic };
export default Anthropic;
