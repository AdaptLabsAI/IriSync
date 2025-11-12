import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UnsplashAdapter } from '@/lib/integrations/UnsplashAdapter';
import { logger } from '@/lib/logging/logger';
import { getFirestore } from '@/lib/firebase/admin';

const firestore = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state') || `${session.user.id}-${Date.now()}`;

    // For Unsplash, we can use API key access for basic functionality
    // OAuth is optional for user-specific features
    const authUrl = UnsplashAdapter.getAuthUrl(state);

    logger.info('Generated Unsplash auth URL', {
      userId: session.user.id,
      state
    });

    return NextResponse.json({ 
      url: authUrl,
      requiresAuth: false, // API key access is sufficient for basic features
      message: 'Unsplash integration uses API key access. OAuth is optional for user-specific features.'
    });

  } catch (error) {
    logger.error('Error generating Unsplash auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code, state } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Authorization code required' }, { status: 400 });
    }

    // Exchange code for token
    const tokens = await UnsplashAdapter.exchangeCodeForToken(code);

    // Store tokens in Firestore
    const userDoc = firestore.collection('users').doc(session.user.id);
    await userDoc.set({
      integrations: {
        unsplash: {
          accessToken: tokens.access_token,
          tokenType: tokens.token_type,
          scope: tokens.scope,
          createdAt: tokens.created_at,
          connectedAt: new Date().toISOString(),
          isActive: true
        }
      }
    }, { merge: true });

    logger.info('Unsplash OAuth completed successfully', {
      userId: session.user.id,
      scope: tokens.scope
    });

    return NextResponse.json({ 
      tokens,
      message: 'Unsplash integration connected successfully'
    });

  } catch (error) {
    logger.error('Error completing Unsplash OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to complete authentication' },
      { status: 500 }
    );
  }
} 