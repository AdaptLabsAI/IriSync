import { NextRequest, NextResponse } from 'next/server';
import { AdobeExpressAdapter } from '../../../../../lib/integrations/AdobeExpressAdapter';
import { handleApiError, handleValidationError } from '../../../../../lib/api/errorHandler';

const ENDPOINT = 'POST /api/integration/design/adobe-express-auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    if (!body.code) {
      return handleValidationError('Authorization code is required', ENDPOINT);
    }
    
    const result = await AdobeExpressAdapter.handleOAuthCallback(body.code);
    return NextResponse.json(result);
  } catch (e: any) {
    return handleApiError(e, ENDPOINT, 'Failed to authenticate with Adobe Express');
  }
} 