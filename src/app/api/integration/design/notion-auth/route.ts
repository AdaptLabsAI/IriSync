import { NextRequest, NextResponse } from 'next/server';
import { NotionAdapter } from '../../../../../lib/integrations/NotionAdapter';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    if (!body.code) {
      return NextResponse.json(
        { 
          error: 'Authorization code is required',
          apiEndpoint: 'POST /api/integration/design/notion-auth' 
        }, 
        { status: 400 }
      );
    }
    
    const result = await NotionAdapter.handleOAuthCallback(body.code);
    return NextResponse.json(result);
  } catch (e: any) {
    console.error('Notion auth error:', e);
    
    return NextResponse.json(
      { 
        error: 'Error loading data: ' + (e.message || 'Failed to authenticate with Notion'),
        apiEndpoint: 'POST /api/integration/design/notion-auth' 
      }, 
      { status: 500 }
    );
  }
} 