import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { AIProvider } from '@/lib/features/ai/providers';
import { ChatbotService } from '@/lib/features/support/chatbot-service';
import { TokenService } from '@/lib/features/tokens/token-service';
import { logger } from '@/lib/core/logging/logger';
import { config } from '@/lib/config';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


interface SessionUser {
  id?: string;
  email?: string;
}

/**
 * Send a message to an existing conversation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Initialize services
    const aiProvider = new AIProvider();
    const tokenService = new TokenService();
    const chatbotService = new ChatbotService(aiProvider, tokenService);
    
    // Get user from session if authenticated
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    
    // Get conversation ID from route params
    const conversationId = params.id;
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Missing conversation ID' },
        { status: 400 }
      );
    }
    
    // Parse request body
    const { message } = await request.json();
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }
    
    // Get the existing conversation
    const conversation = await chatbotService.getConversation(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }
    
    // Verify user has access to this conversation
    if (conversation.userId && user?.id !== conversation.userId) {
      logger.warn('User attempted to access another user\'s conversation', {
        userId: user?.id,
        conversationUserId: conversation.userId,
        conversationId
      });
      
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Send the message
    const updatedConversation = await chatbotService.sendMessage({
      conversationId,
      message,
      metadata: {
        source: 'web',
        userEmail: user?.email
      }
    });
    
    // Return the updated conversation
    return NextResponse.json({
      messages: updatedConversation.messages
    });
  } catch (error) {
    logger.error('Error sending message:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send message',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 