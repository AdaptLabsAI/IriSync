import { NextRequest, NextResponse } from 'next/server';
import { AirtableAdapter } from '../../../../../lib/integrations/AirtableAdapter';
import { handleApiError, handleValidationError } from '../../../../../lib/api/errorHandler';

const ENDPOINT = 'POST /api/integration/design/airtable-files';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate required parameters
    if (!body.tokens?.access_token) {
      return handleValidationError('Valid access token is required', ENDPOINT);
    }
    
    if (!body.baseId) {
      return handleValidationError('Base ID is required', ENDPOINT);
    }
    
    if (!body.tableId) {
      return handleValidationError('Table ID is required', ENDPOINT);
    }
    
    const files = await AirtableAdapter.listFiles(
      body.tokens, 
      body.baseId, 
      body.tableId, 
      body.limit || 100
    );
    
    return NextResponse.json(files);
  } catch (e: any) {
    return handleApiError(e, ENDPOINT, 'Failed to fetch Airtable files');
  }
} 