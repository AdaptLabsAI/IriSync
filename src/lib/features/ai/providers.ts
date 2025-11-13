import { config } from '../../config';

/**
 * AI models available for text generation
 */
export enum AIModel {
  GPT_35_TURBO = 'gpt-3.5-turbo',
  GPT_4 = 'gpt-4',
  CLAUDE_INSTANT = 'claude-instant-1',
  CLAUDE_2 = 'claude-2',
  CLAUDE_35_SONNET = 'claude-3.5-sonnet',
  CLAUDE_37_SONNET = 'claude-3.7-sonnet',
  GEMINI_PRO = 'gemini-pro',
  GEMINI_FLASH = 'gemini-flash'
}

/**
 * Message format for chat completion
 */
export interface Message {
  role: string;
  content: string;
  name?: string;
}

/**
 * Options for text generation
 */
export interface TextGenerationOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
}

/**
 * Options for chat completion
 */
export interface ChatCompletionOptions extends TextGenerationOptions {
  model?: string;
}

/**
 * AI provider service for text generation and chat completion
 */
export class AIProvider {
  /**
   * Generate text using the specified model
   * @param prompt Text prompt
   * @param options Generation options
   * @returns Generated text
   */
  async generateText(
    prompt: string,
    options: TextGenerationOptions = {}
  ): Promise<string> {
    const model = options.model || config.ai.defaultModels.creator;
    
    if (model.startsWith('gpt')) {
      return this.generateWithOpenAI(prompt, options);
    } else if (model.startsWith('claude')) {
      return this.generateWithClaude(prompt, options);
    } else if (model.startsWith('gemini')) {
      return this.generateWithGemini(prompt, options);
    } else {
      throw new Error(`Unsupported model: ${model}`);
    }
  }

  /**
   * Generate chat completion using the specified model
   * @param messages Chat messages
   * @param options Generation options
   * @returns Generated response
   */
  async generateChat(
    messages: Message[] | { role: string; content: string }[],
    options: ChatCompletionOptions = {}
  ): Promise<string> {
    const model = options.model || config.ai.defaultModels.creator;
    
    if (model.startsWith('gpt')) {
      return this.generateChatWithOpenAI(messages, options);
    } else if (model.startsWith('claude')) {
      return this.generateChatWithClaude(messages, options);
    } else if (model.startsWith('gemini')) {
      return this.generateChatWithGemini(messages, options);
    } else {
      throw new Error(`Unsupported model: ${model}`);
    }
  }

  /**
   * Generate text with OpenAI API
   * @param prompt Text prompt
   * @param options Generation options
   * @returns Generated text
   */
  private async generateWithOpenAI(
    prompt: string,
    options: TextGenerationOptions
  ): Promise<string> {
    try {
      const { maxTokens, temperature, topP, frequencyPenalty, presencePenalty, stop, model } = options;
      
      const response = await fetch('https://api.openai.com/v1/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.ai.providers.openai.apiKey}`
        },
        body: JSON.stringify({
          model: model || 'text-davinci-003',
          prompt,
          max_tokens: maxTokens || 500,
          temperature: temperature ?? 0.7,
          top_p: topP ?? 1,
          frequency_penalty: frequencyPenalty ?? 0,
          presence_penalty: presencePenalty ?? 0,
          stop
        })
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.choices[0].text.trim();
    } catch (error) {
      console.error('Error generating text with OpenAI:', error);
      throw error;
    }
  }

  /**
   * Generate chat completion with OpenAI API
   * @param messages Chat messages
   * @param options Generation options
   * @returns Generated response
   */
  private async generateChatWithOpenAI(
    messages: Message[] | { role: string; content: string }[],
    options: ChatCompletionOptions
  ): Promise<string> {
    try {
      const { maxTokens, temperature, topP, frequencyPenalty, presencePenalty, stop, model } = options;
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.ai.providers.openai.apiKey}`
        },
        body: JSON.stringify({
          model: model || 'gpt-3.5-turbo',
          messages,
          max_tokens: maxTokens || 500,
          temperature: temperature ?? 0.7,
          top_p: topP ?? 1,
          frequency_penalty: frequencyPenalty ?? 0,
          presence_penalty: presencePenalty ?? 0,
          stop
        })
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating chat with OpenAI:', error);
      throw error;
    }
  }

  /**
   * Generate text with Claude API
   * @param prompt Text prompt
   * @param options Generation options
   * @returns Generated text
   */
  private async generateWithClaude(
    prompt: string,
    options: TextGenerationOptions
  ): Promise<string> {
    try {
      const { maxTokens, temperature, topP, model } = options;
      
      const response = await fetch('https://api.anthropic.com/v1/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.ai.providers.claude.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model || 'claude-instant-1',
          prompt: `Human: ${prompt}\n\nAssistant:`,
          max_tokens_to_sample: maxTokens || 500,
          temperature: temperature ?? 0.7,
          top_p: topP ?? 1
        })
      });
      
      if (!response.ok) {
        throw new Error(`Claude API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.completion.trim();
    } catch (error) {
      console.error('Error generating text with Claude:', error);
      throw error;
    }
  }

  /**
   * Generate chat completion with Claude API
   * @param messages Chat messages
   * @param options Generation options
   * @returns Generated response
   */
  private async generateChatWithClaude(
    messages: Message[] | { role: string; content: string }[],
    options: ChatCompletionOptions
  ): Promise<string> {
    try {
      const { maxTokens, temperature, topP, model } = options;
      
      // Format messages for Claude API
      let formattedMessages = '';
      for (const message of messages) {
        if (message.role === 'system') {
          formattedMessages += `Human: ${message.content}\n\n`;
        } else if (message.role === 'user') {
          formattedMessages += `Human: ${message.content}\n\n`;
        } else if (message.role === 'assistant') {
          formattedMessages += `Assistant: ${message.content}\n\n`;
        }
      }
      
      formattedMessages += 'Assistant:';
      
      const response = await fetch('https://api.anthropic.com/v1/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.ai.providers.claude.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model || 'claude-instant-1',
          prompt: formattedMessages,
          max_tokens_to_sample: maxTokens || 500,
          temperature: temperature ?? 0.7,
          top_p: topP ?? 1
        })
      });
      
      if (!response.ok) {
        throw new Error(`Claude API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.completion.trim();
    } catch (error) {
      console.error('Error generating chat with Claude:', error);
      throw error;
    }
  }

  /**
   * Generate text with Gemini API
   * @param prompt Text prompt
   * @param options Generation options
   * @returns Generated text
   */
  private async generateWithGemini(
    prompt: string,
    options: TextGenerationOptions
  ): Promise<string> {
    try {
      const { maxTokens, temperature, topP, model } = options;
      const apiKey = config.ai.providers.gemini.apiKey;
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-pro'}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            maxOutputTokens: maxTokens || 500,
            temperature: temperature ?? 0.7,
            topP: topP ?? 1
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.candidates[0].content.parts[0].text.trim();
    } catch (error) {
      console.error('Error generating text with Gemini:', error);
      throw error;
    }
  }

  /**
   * Generate chat completion with Gemini API
   * @param messages Chat messages
   * @param options Generation options
   * @returns Generated response
   */
  private async generateChatWithGemini(
    messages: Message[] | { role: string; content: string }[],
    options: ChatCompletionOptions
  ): Promise<string> {
    try {
      const { maxTokens, temperature, topP, model } = options;
      const apiKey = config.ai.providers.gemini.apiKey;
      
      // Format messages for Gemini API
      const formattedMessages = messages.map(msg => {
        const role = msg.role === 'user' ? 'user' : 'model';
        return {
          role,
          parts: [{ text: msg.content }]
        };
      });
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-pro'}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: formattedMessages,
          generationConfig: {
            maxOutputTokens: maxTokens || 500,
            temperature: temperature ?? 0.7,
            topP: topP ?? 1
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.candidates[0].content.parts[0].text.trim();
    } catch (error) {
      console.error('Error generating chat with Gemini:', error);
      throw error;
    }
  }
}

export default AIProvider; 