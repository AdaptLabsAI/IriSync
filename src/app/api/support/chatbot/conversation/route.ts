import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { AIProvider } from '@/lib/features/ai/providers';
import { ChatbotService, UserTier } from '@/lib/features/support/chatbot-service';
import { TokenService } from '@/lib/features/tokens/token-service';
import { firestore } from '@/lib/core/firebase/admin';
import { logger } from '@/lib/core/logging/logger';
import { config } from '@/lib/config';
import { isMemberOfOrganization } from '@/lib/features/team/users/organization';
import { getUserSubscriptionTier } from '@/lib/features/subscription';

interface SessionUser {
  id?: string;
  email?: string;
}

/**
 * Create a new conversation with the chatbot
 */
export async function POST(request: NextRequest) {
  try {
    // Initialize services
    const aiProvider = new AIProvider();
    const tokenService = new TokenService();
    const chatbotService = new ChatbotService(aiProvider, tokenService);
    
    // Get user from session if authenticated
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    
    // Parse request body
    const { message, metadata } = await request.json();
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }
    
    // Determine user tier - either from subscription or anonymous
    let userTier = UserTier.ANONYMOUS;
    let organizationId: string | undefined;
    
    if (user?.id) {
      // Get user's subscription tier
      try {
        const subscriptionData = await getUserSubscriptionTier(user.id);
        userTier = subscriptionData.tier as UserTier;
        organizationId = subscriptionData.organizationId;
      } catch (error) {
        logger.warn('Error getting user subscription tier, defaulting to anonymous', {
          userId: user.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    // Create a new conversation
    const conversation = await chatbotService.createConversation({
      userId: user?.id,
      organizationId,
      userTier,
      initialMessage: message,
      metadata: {
        source: 'web',
        userEmail: user?.email,
        ...metadata
      }
    });
    
    // Note: Token charging is handled inside the chatbotService.createConversation method
    // which uses exactly 1 token per conversation message
    
    // Return the new conversation
    return NextResponse.json({
      id: conversation.id,
      messages: conversation.messages,
      title: conversation.title
    });
  } catch (error) {
    logger.error('Error creating conversation:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create conversation',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 