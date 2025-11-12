import { NextRequest, NextResponse } from 'next/server';
import { AirtableAdapter } from '../../../../../lib/integrations/AirtableAdapter';
import { handleApiError, handleValidationError } from '../../../../../lib/api/errorHandler';

const ENDPOINT = 'POST /api/integration/design/airtable-auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    if (!body.code) {
      return handleValidationError('Authorization code is required', ENDPOINT);
    }
    
    const result = await AirtableAdapter.handleOAuthCallback(body.code);
    return NextResponse.json(result);
  } catch (e: any) {
    return handleApiError(e, ENDPOINT, 'Failed to authenticate with Airtable');
  }
} 