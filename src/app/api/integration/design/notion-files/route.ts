import { NextRequest, NextResponse } from 'next/server';
import { NotionAdapter } from '../../../../../lib/integrations/NotionAdapter';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate required parameters
    if (!body.tokens?.access_token) {
      return NextResponse.json(
        { 
          error: 'Valid access token is required',
          apiEndpoint: 'POST /api/integration/design/notion-files' 
        }, 
        { status: 400 }
      );
    }
    
    const files = await NotionAdapter.listFiles(body.tokens, body.limit || 100);
    return NextResponse.json(files);
  } catch (e: any) {
    console.error('Notion files error:', e);
    
    return NextResponse.json(
      { 
        error: 'Error loading data: ' + (e.message || 'Failed to fetch Notion files'),
        apiEndpoint: 'POST /api/integration/design/notion-files' 
      }, 
      { status: 500 }
    );
  }
} 