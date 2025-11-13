import { AIProvider } from '../features/ai/providers/AIProvider';
import { TokenService } from '../tokens/token-service';
import knowledgeBaseService, { AccessLevel, DocumentType } from '../rag/knowledge-base';
import vectorDatabase, { EmbeddingModelType } from '../rag/vector-database';
import config from '../config';
import { v4 as uuidv4 } from 'uuid';
import { firestore } from '../core/firebase/admin';
import { logger } from '../core/logging/logger';

/**
 * User tier types
 */
export enum UserTier {
  ANONYMOUS = 'anonymous',
  CREATOR = 'creator',
  INFLUENCER = 'influencer',
  ENTERPRISE = 'enterprise'
}

/**
 * Chatbot model types
 */
export enum ModelType {
  GEMINI_20_FLASH = 'gemini-2.0-flash',
  GPT_35_TURBO = 'gpt-3.5-turbo',
  CLAUDE_35_SONNET = 'claude-3.5-sonnet',
  CLAUDE_37_SONNET = 'claude-3.7-sonnet'
}

/**
 * Conversation message
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Conversation data
 */
export interface Conversation {
  id: string;
  userId?: string;
  organizationId?: string;
  userTier: UserTier;
  title?: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  metadata?: Record<string, any>;
}

/**
 * Create conversation parameters
 */
export interface CreateConversationParams {
  userId?: string;
  organizationId?: string;
  userTier: UserTier;
  initialMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Message parameters
 */
export interface SendMessageParams {
  conversationId: string;
  message: string;
  metadata?: Record<string, any>;
}

/**
 * Response with context
 */
export interface ContextualResponse {
  response: string;
  relevantDocuments: Array<{
    title: string;
    content: string;
    url?: string;
    score: number;
  }>;
  tokensUsed: number;
}

/**
 * FAQ entry
 */
export interface FAQEntry {
  id: string;
  question: string;
  answer: string;
  category?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Chatbot service
 * Provides tier-based support chatbot functionality
 */
export class ChatbotService {
  private aiProvider: AIProvider;
  private tokenService: TokenService;
  private conversationsCollection = firestore.collection('conversations');
  private faqsCollection = firestore.collection('faqs');
  
  constructor(aiProvider: AIProvider, tokenService: TokenService) {
    this.aiProvider = aiProvider;
    this.tokenService = tokenService;
    logger.info('ChatbotService initialized');
  }

  /**
   * Create a new conversation
   * @param params Conversation parameters
   * @returns Created conversation
   */
  async createConversation(params: CreateConversationParams): Promise<Conversation> {
    const now = new Date();
    const conversationId = uuidv4();
    
    const conversation: Conversation = {
      id: conversationId,
      userId: params.userId,
      organizationId: params.organizationId,
      userTier: params.userTier,
      messages: [],
      createdAt: now,
      updatedAt: now,
      isActive: true,
      metadata: params.metadata || {}
    };
    
    // If initial message provided, add it
    if (params.initialMessage) {
      const messageId = uuidv4();
      
      const userMessage: ChatMessage = {
        id: messageId,
        role: 'user',
        content: params.initialMessage,
        createdAt: now
      };
      
      conversation.messages.push(userMessage);
      
      // Generate response to initial message
      const response = await this.generateResponse(
        params.initialMessage, 
        params.userTier, 
        params.userId,
        params.organizationId,
        []
      );
      
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: response.response,
        createdAt: new Date(),
        metadata: {
          relevantDocuments: response.relevantDocuments,
          tokensUsed: response.tokensUsed
        }
      };
      
      conversation.messages.push(assistantMessage);
      
      // Generate title from the conversation
      conversation.title = await this.generateConversationTitle(
        params.initialMessage,
        response.response
      );
    }
    
    // Save conversation to Firestore
    await this.conversationsCollection.doc(conversationId).set(conversation);
    
    // Track token usage if this is a regular chatbot conversation (not a support ticket)
    // And only if the user is authenticated
    if (params.userId && !params.metadata?.isSupport) {
      try {
        await this.tokenService.useTokens(
          params.userId,
          'chatbot', // Task type
          1, // Standard 1 token charge per AI operation
          params.metadata // Pass metadata if available
        );
      } catch (error) {
        logger.error('Error tracking chatbot token usage:', {
          error: error instanceof Error ? error.message : String(error),
          userId: params.userId
        });
        // Continue even if token tracking fails to avoid disrupting the user experience
      }
    }
    
    return conversation;
  }

  /**
   * Send a message in an existing conversation
   * @param params Message parameters
   * @returns Updated conversation with response
   */
  async sendMessage(params: SendMessageParams): Promise<Conversation> {
    // Get the conversation
    const conversationDoc = await this.conversationsCollection.doc(params.conversationId).get();
    
    if (!conversationDoc.exists) {
      throw new Error(`Conversation with ID ${params.conversationId} not found`);
    }
    
    const conversation = conversationDoc.data() as Conversation;
    
    if (!conversation.isActive) {
      throw new Error('This conversation has been closed');
    }
    
    // Add user message
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: params.message,
      createdAt: new Date(),
      metadata: params.metadata
    };
    
    conversation.messages.push(userMessage);
    
    // Generate assistant response
    const contextMessages = conversation.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    const response = await this.generateResponse(
      params.message,
      conversation.userTier,
      conversation.userId,
      conversation.organizationId,
      contextMessages
    );
    
    // Add assistant message
    const assistantMessage: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: response.response,
      createdAt: new Date(),
      metadata: {
        relevantDocuments: response.relevantDocuments,
        tokensUsed: response.tokensUsed
      }
    };
    
    conversation.messages.push(assistantMessage);
    conversation.updatedAt = new Date();
    
    // Update conversation title if it doesn't exist yet
    if (!conversation.title && conversation.messages.length <= 3) {
      conversation.title = await this.generateConversationTitle(
        conversation.messages[0].content,
        response.response
      );
    }
    
    // Save updated conversation
    await this.conversationsCollection.doc(params.conversationId).set(conversation);
    
    // Track token usage for the user if authenticated and not a support ticket conversation
    if (conversation.userId && !conversation.metadata?.isSupport) {
      try {
        await this.tokenService.useTokens(
          conversation.userId,
          'chatbot', // Task type
          1, // Standard 1 token charge per AI operation
          conversation.metadata // Pass metadata if available
        );
      } catch (error) {
        console.error('Error tracking chatbot token usage:', error);
        // Continue even if token tracking fails to avoid disrupting the user experience
      }
    }
    
    return conversation;
  }

  /**
   * Get conversation by ID
   * @param conversationId Conversation ID
   * @returns Conversation or null if not found
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    const conversationDoc = await this.conversationsCollection.doc(conversationId).get();
    
    if (!conversationDoc.exists) {
      return null;
    }
    
    return conversationDoc.data() as Conversation;
  }

  /**
   * Get user conversations
   * @param userId User ID
   * @param limit Result limit
   * @param offset Pagination offset
   * @returns List of conversations
   */
  async getUserConversations(
    userId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<{ conversations: Conversation[]; total: number }> {
    // Get count first
    const countQuery = await this.conversationsCollection
      .where('userId', '==', userId)
      .count()
      .get();
    
    const total = countQuery.data().count;
    
    // Then get the actual results
    const querySnapshot = await this.conversationsCollection
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .limit(limit)
      .offset(offset)
      .get();
    
    const conversations: Conversation[] = [];
    querySnapshot.forEach(doc => {
      conversations.push(doc.data() as Conversation);
    });
    
    return { conversations, total };
  }

  /**
   * Close a conversation
   * @param conversationId Conversation ID
   * @returns Success indicator
   */
  async closeConversation(conversationId: string): Promise<boolean> {
    try {
      await this.conversationsCollection.doc(conversationId).update({
        isActive: false,
        updatedAt: new Date()
      });
      
      return true;
    } catch (error) {
      console.error('Error closing conversation:', error);
      return false;
    }
  }

  /**
   * Get model type based on user tier
   * @param userTier User's subscription tier
   * @returns Appropriate model for the tier
   */
  private getModelForTier(userTier: UserTier): ModelType {
    switch (userTier) {
      case UserTier.ENTERPRISE:
        return ModelType.CLAUDE_37_SONNET;
      case UserTier.INFLUENCER:
        return ModelType.CLAUDE_35_SONNET;
      case UserTier.CREATOR:
        return ModelType.GPT_35_TURBO;
      case UserTier.ANONYMOUS:
      default:
        return ModelType.GEMINI_20_FLASH;
    }
  }

  /**
   * Get embedding model based on user tier
   * @param userTier User tier
   * @returns Appropriate embedding model
   */
  private getEmbeddingModelForTier(userTier: UserTier): EmbeddingModelType {
    switch (userTier) {
      case UserTier.ENTERPRISE:
        return EmbeddingModelType.OPENAI_TEXT_EMBEDDING_3_LARGE;
      case UserTier.INFLUENCER:
        return EmbeddingModelType.OPENAI_TEXT_EMBEDDING_3_SMALL;
      case UserTier.CREATOR:
        return EmbeddingModelType.GOOGLE_TEXT_EMBEDDING_GECKO;
      case UserTier.ANONYMOUS:
      default:
        return EmbeddingModelType.GOOGLE_TEXT_EMBEDDING_GECKO;
    }
  }

  /**
   * Get static FAQ answer if available
   * @param query User query
   * @returns FAQ answer or null if no match
   */
  private async checkStaticFAQs(query: string): Promise<FAQEntry | null> {
    try {
      // Get all FAQs (this should be optimized in production with embeddings)
      const faqSnapshot = await this.faqsCollection.limit(20).get();
      
      const faqs: FAQEntry[] = [];
      faqSnapshot.forEach(doc => {
        faqs.push(doc.data() as FAQEntry);
      });
      
      if (faqs.length === 0) {
        return null;
      }
      
      // Very basic similarity check - in production use embeddings
      const simplifiedQuery = query.toLowerCase().trim();
      let bestMatch: FAQEntry | null = null;
      let highestScore = 0.5; // Threshold for matching
      
      for (const faq of faqs) {
        const questionWords = new Set(faq.question.toLowerCase().split(/\s+/));
        const queryWords = simplifiedQuery.split(/\s+/);
        
        // Count matching words
        let matchCount = 0;
        for (const word of queryWords) {
          if (questionWords.has(word)) {
            matchCount++;
          }
        }
        
        // Calculate similarity score
        const score = matchCount / Math.max(queryWords.length, questionWords.size);
        
        if (score > highestScore) {
          highestScore = score;
          bestMatch = faq;
        }
      }
      
      return bestMatch;
    } catch (error) {
      console.error('Error checking static FAQs:', error);
      return null;
    }
  }

  /**
   * Generate a response based on user query and tier
   * @param query User query
   * @param userTier User tier
   * @param userId Optional user ID
   * @param orgId Optional organization ID
   * @param contextMessages Previous conversation context
   * @returns Contextual response
   */
  private async generateResponse(
    query: string,
    userTier: UserTier,
    userId?: string,
    orgId?: string,
    contextMessages: Array<{ role: string; content: string }> = []
  ): Promise<ContextualResponse> {
    // First check for exact FAQ match for faster response
    const faqMatch = await this.checkStaticFAQs(query);
    
    if (faqMatch) {
      logger.info('Found static FAQ match for query', {
        query: query.substring(0, 50),
        faqId: faqMatch.id
      });
      
      return {
        response: faqMatch.answer,
        relevantDocuments: [{
          title: faqMatch.question,
          content: faqMatch.answer,
          score: 1.0
        }],
        tokensUsed: 0 // Static FAQs don't use tokens
      };
    }
    
    try {
      // Select embedding model based on user tier
      const embeddingModel = this.getEmbeddingModelForTier(userTier);
      
      logger.debug('Using embedding model for query', {
        model: embeddingModel,
        userTier,
        queryLength: query.length
      });
      
      // Get relevant documents from vector database using tier-specific embedding model
      const searchResults = await vectorDatabase.search({
        query,
        collections: ['knowledge_base', 'faq'],
        limit: userTier === UserTier.ENTERPRISE ? 8 : userTier === UserTier.INFLUENCER ? 5 : 3,
        minRelevanceScore: userTier === UserTier.ENTERPRISE ? 0.65 : userTier === UserTier.INFLUENCER ? 0.75 : 0.8,
        embeddingModel
      });
      
      // Remove duplicates (might happen if semantically similar documents are found)
      const relevantDocuments = this.deduplicateResults(
        searchResults.map(doc => ({
          ...doc,
          title: doc.title ?? '', // Ensure title is always a string
        }))
      );
      
      // If no relevant documents found, provide a generic response
      if (relevantDocuments.length === 0) {
        const defaultResponse = "I'm sorry, I don't have specific information about that. Could you ask something else about our platform or services?";
        
        return {
          response: defaultResponse,
          relevantDocuments: [],
          tokensUsed: 0
        };
      }
      
      // Prepare context from documents
      const documentContext = this.prepareContextFromDocuments(relevantDocuments);
      
      // Add user context if available (for personalized responses)
      let userContext = '';
      if (userId) {
        userContext = await this.getUserContext(userId);
      }
      
      // Add organization context for enterprise tier
      let orgContext = '';
      if (orgId && userTier === UserTier.ENTERPRISE) {
        orgContext = await this.getOrganizationContext(orgId);
      }
      
      // Get appropriate LLM for the user tier
      const model = this.getModelForTier(userTier);
      
      // Get system prompt for the tier
      const systemPrompt = this.getSystemPrompt(userTier);
      
      // Combine all context
      const fullPrompt = `${systemPrompt}
      
${userContext ? `USER CONTEXT:\n${userContext}\n\n` : ''}
${orgContext ? `ORGANIZATION CONTEXT:\n${orgContext}\n\n` : ''}
${documentContext ? `KNOWLEDGE BASE:\n${documentContext}\n\n` : ''}

${contextMessages.length > 0 ? `CONVERSATION HISTORY:\n${contextMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}\n\n` : ''}

USER QUERY: ${query}

Please provide a helpful and accurate response based on the information provided. If you don't know the answer, acknowledge that and suggest alternatives.`;
      
      // Estimate token usage
      const estimatedTokens = this.estimateTokenUsage(fullPrompt);
      const maxTokens = this.getMaxTokensForTier(userTier);
      
      // Generate response from AI provider
      const response = await this.aiProvider.generateText(fullPrompt, {
        maxTokens,
        temperature: 0.3,
        model: model
      });
      
      // Track token usage if this is for a paying user
      if (userId && userTier !== UserTier.ANONYMOUS) {
        try {
          const tokensUsed = 1; // Fixed token usage (1 token per conversation)
          
          await this.tokenService.useTokens(
            userId,
            'chatbot',
            tokensUsed,
            {
              model,
              tokensUsed: estimatedTokens,
              organizationId: orgId
            }
          );
        } catch (error) {
          logger.warn('Failed to track token usage for chatbot', {
            error: error instanceof Error ? error.message : String(error),
            userId
          });
          // Continue execution despite token tracking failure
        }
      }
      
      // Return response with context
      return {
        response,
        relevantDocuments,
        tokensUsed: estimatedTokens
      };
      
    } catch (error) {
      logger.error('Error generating chatbot response', {
        error: error instanceof Error ? error.message : String(error),
        userTier,
        userId
      });
      
      // Fallback response
      return {
        response: "I'm sorry, I encountered an issue while processing your request. Please try again or contact support if the problem persists.",
        relevantDocuments: [],
        tokensUsed: 0
      };
    }
  }

  /**
   * Get system prompt based on user tier
   * @param userTier User tier
   * @returns Appropriate system prompt
   */
  private getSystemPrompt(userTier: UserTier): string {
    switch (userTier) {
      case UserTier.ENTERPRISE:
        return `You are Iris, the premium support assistant for IriSync's Enterprise clients.
Your goal is to provide detailed, personalized help with all aspects of the IriSync platform.
Use the provided organization context and knowledge base to give specific, actionable advice.
You can help with technical issues, strategic questions, best practices, and advanced features.
Your responses should be comprehensive, addressing both the specific question and related considerations.`;

      case UserTier.INFLUENCER:
        return `You are Iris, the support assistant for IriSync's Influencer tier users.
Your goal is to help users get the most out of their Influencer plan features.
Provide clear explanations and solutions based on the knowledge base and user context.
You can assist with technical issues, content strategy, and platform-specific questions.
Your responses should be thorough while staying focused on the user's specific needs.`;

      case UserTier.CREATOR:
        return `You are Iris, the support assistant for IriSync.
Your goal is to help Creator tier users with basic platform features and technical issues.
Provide concise, helpful responses based on the knowledge base.
For complex issues beyond simple troubleshooting, suggest creating a support ticket.
Keep responses under 150 words when possible.`;

      case UserTier.ANONYMOUS:
      default:
        return `You are Iris, the support assistant for IriSync.
Your goal is to provide brief, helpful responses to basic questions about the platform.
Focus on directing users to sign up for an account to access more features.
Keep responses very short - under 100 words.
For detailed questions, suggest checking our knowledge base and forums, reaching out to our sales team at sales@sybertnetics.com or creating an account.`;
    }
  }

  /**
   * Get maximum tokens for response based on user tier
   * @param userTier User tier
   * @returns Maximum tokens
   */
  private getMaxTokensForTier(userTier: UserTier): number {
    switch (userTier) {
      case UserTier.ENTERPRISE:
        return 1000;
      case UserTier.INFLUENCER:
        return 600;
      case UserTier.CREATOR:
        return 300;
      case UserTier.ANONYMOUS:
      default:
        return 150;
    }
  }

  /**
   * Get user context for enhanced support
   * @param userId User ID
   * @returns Formatted user context string
   */
  private async getUserContext(userId: string): Promise<string> {
    try {
      // Fetch user data from Firestore
      const userDoc = await firestore.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        return '';
      }
      
      const userData = userDoc.data();
      
      if (!userData) {
        return '';
      }
      
      // Get connected platforms
      const platformsSnapshot = await firestore
        .collection('socialAccounts')
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .get();
      
      const connectedPlatforms = platformsSnapshot.docs.map(doc => doc.data().platformType);
      
      // Get subscription information
      const subscriptionSnapshot = await firestore
        .collection('subscriptions')
        .where('userId', '==', userId)
        .where('status', '==', 'active')
        .limit(1)
        .get();
      
      let subscriptionData = '';
      if (!subscriptionSnapshot.empty) {
        const subscription = subscriptionSnapshot.docs[0].data();
        subscriptionData = `
- Subscription Plan: ${subscription.planName}
- Subscription Status: ${subscription.status}
- Renewal Date: ${subscription.currentPeriodEnd?.toDate().toLocaleDateString()}`;
      }
      
      // Format login date
      const lastLoginDate = userData.lastLogin?.toDate();
      const lastLoginStr = lastLoginDate 
        ? lastLoginDate.toLocaleDateString() 
        : 'Unknown';
      
      // Get usage metrics if available
      const usageSnapshot = await firestore
        .collection('usage')
        .doc(userId)
        .collection('monthly')
        .orderBy('date', 'desc')
        .limit(1)
        .get();
      
      let usageData = '';
      if (!usageSnapshot.empty) {
        const usage = usageSnapshot.docs[0].data();
        usageData = `
- Token Usage: ${usage.tokens || 0} tokens this month
- Content Created: ${usage.content?.created || 0} items`;
      }
      
      // Construct the user context string
      return `- Email: ${userData.email}
- Name: ${userData.firstName} ${userData.lastName}
- Account Created: ${userData.createdAt?.toDate().toLocaleDateString()}
- Last Login: ${lastLoginStr}
- Connected Platforms: ${connectedPlatforms.join(', ') || 'None'}${subscriptionData}${usageData}`;
    } catch (error) {
      console.error('Error retrieving user context:', error);
      return ''; // Return empty context if there's an error
    }
  }

  /**
   * Get organization context for enterprise support
   * @param orgId Organization ID
   * @returns Formatted organization context string
   */
  private async getOrganizationContext(orgId: string): Promise<string> {
    try {
      // Fetch organization data from Firestore
      const orgDoc = await firestore.collection('organizations').doc(orgId).get();
      
      if (!orgDoc.exists) {
        return '';
      }
      
      const orgData = orgDoc.data();
      
      if (!orgData) {
        return '';
      }
      
      // Get team members count
      const teamSnapshot = await firestore
        .collection('users')
        .where('organizationId', '==', orgId)
        .where('status', '==', 'active')
        .get();
      
      const teamSize = teamSnapshot.size;
      
      // Get connected platforms
      const platformsSnapshot = await firestore
        .collection('socialAccounts')
        .where('organizationId', '==', orgId)
        .where('isActive', '==', true)
        .get();
      
      const connectedPlatforms = Array.from(
        new Set(platformsSnapshot.docs.map(doc => doc.data().platformType))
      );
      
      // Get subscription information
      const subscriptionSnapshot = await firestore
        .collection('organizationSubscriptions')
        .where('organizationId', '==', orgId)
        .where('status', '==', 'active')
        .limit(1)
        .get();
      
      let subscriptionData = '';
      if (!subscriptionSnapshot.empty) {
        const subscription = subscriptionSnapshot.docs[0].data();
        subscriptionData = `- Current Plan: ${subscription.planName} (${subscription.seatCount} seats)
- Renewal Date: ${subscription.currentPeriodEnd?.toDate().toLocaleDateString()}`;
      }
      
      // Get enabled features
      const featuresSnapshot = await firestore
        .collection('organizationFeatures')
        .where('organizationId', '==', orgId)
        .where('isEnabled', '==', true)
        .get();
      
      const enabledFeatures = featuresSnapshot.docs.map(doc => doc.data().featureName);
      
      // Get usage statistics
      const usageSnapshot = await firestore
        .collection('organizationUsage')
        .doc(orgId)
        .collection('monthly')
        .orderBy('date', 'desc')
        .limit(1)
        .get();
      
      let usageData = '';
      if (!usageSnapshot.empty) {
        const usage = usageSnapshot.docs[0].data();
        usageData = `- Monthly Content Created: ${usage.content?.created || 0}
- Monthly Posts Published: ${usage.content?.published || 0}
- Monthly Token Usage: ${usage.tokens || 0}`;
      }
      
      // Construct the organization context string
      return `- Organization: ${orgData.name}
- Team Size: ${teamSize} users
- Connected Platforms: ${connectedPlatforms.join(', ') || 'None'}
${subscriptionData}
- Enabled Features: ${enabledFeatures.length > 0 ? enabledFeatures.join(', ') : 'Basic features'}
${usageData}`;
    } catch (error) {
      console.error('Error retrieving organization context:', error);
      return ''; // Return empty context if there's an error
    }
  }

  /**
   * Generate a title for the conversation
   * @param userMessage First user message
   * @param assistantResponse First assistant response
   * @returns Generated title
   */
  private async generateConversationTitle(
    userMessage: string,
    assistantResponse: string
  ): Promise<string> {
    try {
      const prompt = `Summarize this conversation into a very short title (5 words or less):
User: ${userMessage.slice(0, 100)}
Assistant: ${assistantResponse.slice(0, 100)}`;
      
      const title = await this.aiProvider.generateText(prompt, {
        maxTokens: 20,
        temperature: 0.3
      });
      
      // Clean and limit the title
      return title.replace(/["]/g, '').trim().slice(0, 50) || 'New Conversation';
    } catch (error) {
      console.error('Error generating title:', error);
      return 'New Conversation';
    }
  }

  /**
   * Estimate token usage (simple approximation)
   * @param text Text to estimate tokens for
   * @returns Estimated token count
   */
  private estimateTokenUsage(text: string): number {
    // Very rough approximation - in production, use tokenizer
    return Math.ceil(text.length / 4);
  }

  private deduplicateResults(results: Array<{
    title: string;
    content: string;
    url?: string;
    score: number;
  }>): Array<{
    title: string;
    content: string;
    url?: string;
    score: number;
  }> {
    const uniqueResults = new Map<string, {
      title: string;
      content: string;
      url?: string;
      score: number;
    }>();

    for (const result of results) {
      const key = result.title + result.content.substring(0, 100);
      if (!uniqueResults.has(key) || uniqueResults.get(key)!.score < result.score) {
        uniqueResults.set(key, result);
      }
    }

    return Array.from(uniqueResults.values());
  }

  private prepareContextFromDocuments(documents: Array<{
    title: string;
    content: string;
    url?: string;
    score: number;
  }>): string {
    return documents.length > 0
      ? `RELEVANT INFORMATION:\n${documents
          .map(doc => `[${doc.title}]\n${doc.content}`)
          .join('\n\n')}`
      : '';
  }
}

export default ChatbotService; 