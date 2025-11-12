import { NextRequest, NextResponse } from 'next/server';
import { CanvaAdapter } from '../../../../../lib/integrations/CanvaAdapter';
import { handleApiError, handleValidationError } from '../../../../../lib/api/errorHandler';

const ENDPOINT = 'POST /api/integration/design/canva-auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    if (!body.code) {
      return handleValidationError('Authorization code is required', ENDPOINT);
    }
    
    const result = await CanvaAdapter.handleOAuthCallback(body.code);
    return NextResponse.json(result);
  } catch (e: any) {
    return handleApiError(e, ENDPOINT, 'Failed to authenticate with Canva');
  }
} 