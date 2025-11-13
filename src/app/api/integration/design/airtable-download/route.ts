import { NextRequest, NextResponse } from 'next/server';
import { AirtableAdapter } from '../../../../../lib/integrations/AirtableAdapter';
import { handleApiError, handleValidationError } from '../../../../../lib/core/api/errorHandler';

const ENDPOINT = 'POST /api/integration/design/airtable-download';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate required parameters
    if (!body.tokens?.access_token) {
      return handleValidationError('Valid access token is required', ENDPOINT);
    }
    
    if (!body.attachmentUrl) {
      return handleValidationError('Attachment URL is required', ENDPOINT);
    }
    
    const file = await AirtableAdapter.downloadFile(body.tokens, body.attachmentUrl);
    return NextResponse.json(file);
  } catch (e: any) {
    return handleApiError(e, ENDPOINT, 'Failed to download Airtable file');
  }
} 