import { NextRequest, NextResponse } from 'next/server';
import { AdobeExpressAdapter } from '../../../../../lib/integrations/AdobeExpressAdapter';
import { handleApiError, handleValidationError } from '../../../../../lib/api/errorHandler';

const ENDPOINT = 'POST /api/integration/design/adobe-express-files';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate required parameters
    if (!body.tokens?.access_token) {
      return handleValidationError('Valid access token is required', ENDPOINT);
    }
    
    const files = await AdobeExpressAdapter.listFiles(
      body.tokens, 
      body.folderId || null, 
      body.limit || 100
    );
    
    return NextResponse.json(files);
  } catch (e: any) {
    return handleApiError(e, ENDPOINT, 'Failed to fetch Adobe Express files');
  }
} 