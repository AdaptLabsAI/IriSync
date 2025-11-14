import { NextRequest, NextResponse } from 'next/server';
import { OneDriveAdapter } from '../../../../../lib/integrations/OneDriveAdapter';
import { handleApiError, handleValidationError } from '../../../../../lib/core/api/errorHandler';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


const ENDPOINT = 'POST /api/integration/design/onedrive-files';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate required parameters
    if (!body.tokens?.access_token) {
      return handleValidationError('Valid access token is required', ENDPOINT);
    }
    
    const files = await OneDriveAdapter.listFiles(body.tokens.access_token, body.folderId || null);
    return NextResponse.json(files);
  } catch (e: any) {
    return handleApiError(e, ENDPOINT, 'Failed to fetch OneDrive files');
  }
} 