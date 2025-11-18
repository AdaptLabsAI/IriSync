/**
 * Support Chatbot API - Root Endpoint
 *
 * This endpoint provides information about the chatbot API
 * and handles basic requests.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/support/chatbot
 * Get chatbot API information
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/support/chatbot',
    status: 'active',
    version: '1.0',
    description: 'IriSync Support Chatbot API',
    endpoints: {
      createConversation: {
        method: 'POST',
        path: '/api/support/chatbot/conversation',
        description: 'Create a new support conversation'
      },
      sendMessage: {
        method: 'POST',
        path: '/api/support/chatbot/conversation/:id/message',
        description: 'Send a message in an existing conversation'
      }
    },
    features: [
      'AI-powered support responses',
      'Context-aware conversations',
      'Multi-turn dialogue support'
    ]
  });
}

/**
 * POST /api/support/chatbot
 * Redirect to conversation creation endpoint
 */
export async function POST(request: NextRequest) {
  // For convenience, redirect POST requests to the conversation endpoint
  return NextResponse.redirect(
    new URL('/api/support/chatbot/conversation', request.url),
    307 // Temporary redirect, preserves method
  );
}
