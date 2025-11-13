import { NextRequest, NextResponse } from 'next/server';
import { GoogleDriveAdapter } from '../../../../../lib/integrations/GoogleDriveAdapter';
import { handleApiError, handleValidationError } from '../../../../../lib/core/api/errorHandler';

const ENDPOINT = 'POST /api/integration/design/google-drive-files';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate required parameters
    if (!body.tokens?.access_token) {
      return handleValidationError('Valid access token is required', ENDPOINT);
    }
    
    const files = await GoogleDriveAdapter.listFiles(body.tokens.access_token, body.folderId || null);
    return NextResponse.json(files);
  } catch (e: any) {
    return handleApiError(e, ENDPOINT, 'Failed to fetch Google Drive files');
  }
} 