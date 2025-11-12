import { NextRequest, NextResponse } from 'next/server';
import { GoogleDriveAdapter } from '../../../../../lib/integrations/GoogleDriveAdapter';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await GoogleDriveAdapter.handleOAuthCallback(body.code);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to authenticate with Google Drive' }, { status: 500 });
  }
} 