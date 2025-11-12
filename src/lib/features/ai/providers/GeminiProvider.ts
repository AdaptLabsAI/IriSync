import { AIProvider, AIProviderConfig, AIRequestOptions } from './AIProvider';
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';

interface GeminiMessage {
  role: string;
  content: string;
}

export class GeminiProvider implements AIProvider {
  private client: GoogleGenerativeAI;
  private config: AIProviderConfig;
  
  constructor(config: AIProviderConfig) {
    this.config = config;
    this.client = new GoogleGenerativeAI(
      config.apiKey || process.env.GOOGLE_API_KEY || ''
    );
  }
  
  getModelId(): string {
    return this.config.modelId;
  }
  
  async generateText(prompt: string, options?: AIRequestOptions): Promise<string> {
    try {
      const model = this.client.getGenerativeModel({ model: this.config.modelId });
      
      const generationConfig = {
        temperature: options?.temperature || 0.7,
        maxOutputTokens: options?.maxTokens || 500,
        stopSequences: options?.stopSequences,
      };
      
      const safetySettings = [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ];
      
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
        safetySettings,
      });
      
      const response = result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini text generation error:', error);
      throw new Error(`Gemini generation failed: ${(error as Error).message}`);
    }
  }
  
  async generateChat(messages: GeminiMessage[], options?: AIRequestOptions): Promise<string> {
    try {
      const model = this.client.getGenerativeModel({ model: this.config.modelId });
      const chat = model.startChat({
        generationConfig: {
          temperature: options?.temperature || 0.7,
          maxOutputTokens: options?.maxTokens || 500,
          stopSequences: options?.stopSequences,
        },
      });
      
      // Map messages to Gemini format
      const formattedMessages = messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content as string }]
      }));
      
      // Send all messages and get the final response
      const result = await model.generateContent({
        contents: formattedMessages,
        generationConfig: {
          temperature: options?.temperature || 0.7,
          maxOutputTokens: options?.maxTokens || 500,
          stopSequences: options?.stopSequences,
        },
      });
      
      const response = result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini chat generation error:', error);
      throw new Error(`Gemini chat generation failed: ${(error as Error).message}`);
    }
  }
  
  async embedText(text: string): Promise<number[]> {
    try {
      const model = this.client.getGenerativeModel({ model: 'embedding-001' });
      const result = await model.embedContent({
        content: { role: 'user', parts: [{ text }] },
      });
      
      const embedding = result.embedding;
      return embedding.values;
    } catch (error) {
      console.error('Gemini embedding error:', error);
      throw new Error(`Gemini embedding failed: ${(error as Error).message}`);
    }
  }
  
  async analyzeImage(imageUrl: string, prompt: string): Promise<string> {
    try {
      // Use Gemini's multimodal capabilities
      const model = this.client.getGenerativeModel({ model: this.config.modelId });
      
      // For image URLs, we need to fetch the image first
      let imageData;
      if (imageUrl.startsWith('data:')) {
        // Base64 data URL
        imageData = imageUrl;
      } else {
        // Fetch from URL
        const response = await fetch(imageUrl);
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const mimeType = response.headers.get('content-type') || 'image/jpeg';
        imageData = `data:${mimeType};base64,${base64}`;
      }
      
      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { mimeType: 'image/jpeg', data: imageData } }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: 500,
        },
      });
      
      const response = result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini image analysis error:', error);
      throw new Error(`Gemini image analysis failed: ${(error as Error).message}`);
    }
  }
}
