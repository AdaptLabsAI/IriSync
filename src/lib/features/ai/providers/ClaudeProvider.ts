import { AIProvider, AIProviderConfig, AIRequestOptions } from './AIProvider';
import Anthropic from '@/lib/integrations/anthropic/client';

export class ClaudeProvider implements AIProvider {
  private client: Anthropic;
  private config: AIProviderConfig;
  
  constructor(config: AIProviderConfig) {
    this.config = config;
    
    if (!config.apiKey && !process.env.ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API key is required');
    }
    
    this.client = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
      baseURL: config.endpoint,
    });
  }
  
  async generateText(prompt: string, options?: AIRequestOptions): Promise<string> {
    try {
      // Use model from options or fall back to config
      const model = options?.model || this.config.modelId || 'claude-3-5-haiku-20241022';
      
      console.log(`[Claude] Generating text with model ${model}`);
      
      const response = await this.client.messages.create({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options?.maxTokens || 500,
        temperature: options?.temperature || 0.7,
        top_p: options?.topP || 1,
        stop_sequences: options?.stopSequences,
        stream: false
      });
      
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }
      
      return content.text;
    } catch (error) {
      console.error('Claude text generation error:', error);
      throw new Error(`Claude generation failed: ${(error as Error).message}`);
    }
  }
  
  async generateChat(messages: Array<{role: string, content: string}>, options?: AIRequestOptions): Promise<string> {
    try {
      // Use model from options or fall back to config
      const model = options?.model || this.config.modelId || 'claude-3-5-haiku-20241022';
      
      console.log(`[Claude] Generating chat with model ${model}`);
      
      // Convert messages to format expected by Anthropic API
      const formattedMessages = messages.map(msg => {
        // Handle system messages by converting to user with special format
        if (msg.role === 'system') {
          return { role: 'user', content: `<system>${msg.content}</system>` };
        }
        return { 
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        };
      }) as any[];
      
      const response = await this.client.messages.create({
        model: model,
        messages: formattedMessages,
        max_tokens: options?.maxTokens || 500,
        temperature: options?.temperature || 0.7,
        top_p: options?.topP || 1,
        stop_sequences: options?.stopSequences,
        stream: false
      });
      
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }
      
      return content.text;
    } catch (error) {
      console.error('Claude chat generation error:', error);
      throw new Error(`Claude chat generation failed: ${(error as Error).message}`);
    }
  }
  
  async embedText(text: string): Promise<number[]> {
    // As of implementation, Claude doesn't have a native embedding API
    throw new Error('Claude embeddings are not currently supported. Use OpenAI or Google AI for embeddings.');
  }
  
  async analyzeImage(imageUrl: string, prompt: string): Promise<string> {
    try {
      // Use model from config, defaulting to Claude 3.5 Sonnet for vision
      const model = this.config.modelId || 'claude-3-5-sonnet-20241022';
      
      console.log(`[Claude] Analyzing image with model ${model}`);
      
      // Fetch image data
      const response = await fetch(imageUrl);
      const imageBuffer = await response.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');
      const mimeType = response.headers.get('content-type') || 'image/jpeg';
      
      const anthropicResponse = await this.client.messages.create({
        model: model,
        max_tokens: 500,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType as any,
                  data: base64Image
                }
              }
            ]
          }
        ]
      });
      
      const content = anthropicResponse.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude vision analysis');
      }
      
      return content.text;
    } catch (error) {
      console.error('Claude image analysis error:', error);
      throw new Error(`Claude image analysis failed: ${(error as Error).message}`);
    }
  }
  
  getModelId(): string {
    return this.config.modelId || 'claude-3-5-haiku-20241022';
  }
}
