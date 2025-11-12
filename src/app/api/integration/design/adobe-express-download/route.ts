import { NextRequest, NextResponse } from 'next/server';
import { AdobeExpressAdapter } from '../../../../../lib/integrations/AdobeExpressAdapter';
import { handleApiError, handleValidationError, handleNotFoundError } from '../../../../../lib/api/errorHandler';

const ENDPOINT = 'POST /api/integration/design/adobe-express-download';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate required parameters
    if (!body.tokens?.access_token) {
      return handleValidationError('Valid access token is required', ENDPOINT);
    }
    
    if (!body.fileId) {
      return handleValidationError('File ID is required', ENDPOINT);
    }
    
    try {
      const file = await AdobeExpressAdapter.downloadFile(body.tokens, body.fileId);
      return NextResponse.json(file);
    } catch (e: any) {
      // Handle specific errors from the adapter
      if (e.message?.includes('Project not found')) {
        return handleNotFoundError(body.fileId, ENDPOINT);
      }
      throw e; // Re-throw to be caught by the outer catch block
    }
  } catch (e: any) {
    return handleApiError(e, ENDPOINT, 'Failed to download Adobe Express file');
  }
} 