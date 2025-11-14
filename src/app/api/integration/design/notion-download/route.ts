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
          apiEndpoint: 'POST /api/integration/design/notion-download' 
        }, 
        { status: 400 }
      );
    }
    
    if (!body.pageId) {
      return NextResponse.json(
        { 
          error: 'Page ID is required',
          apiEndpoint: 'POST /api/integration/design/notion-download' 
        }, 
        { status: 400 }
      );
    }
    
    const file = await NotionAdapter.downloadFile(body.tokens, body.pageId);
    return NextResponse.json(file);
  } catch (e: any) {
    console.error('Notion download error:', e);
    
    return NextResponse.json(
      { 
        error: 'Error loading data: ' + (e.message || 'Failed to download Notion file'),
        apiEndpoint: 'POST /api/integration/design/notion-download' 
      }, 
      { status: 500 }
    );
  }
} 