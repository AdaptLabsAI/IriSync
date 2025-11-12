import { NextRequest, NextResponse } from 'next/server';
import { GoogleDriveAdapter } from '../../../../../lib/integrations/GoogleDriveAdapter';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const file = await GoogleDriveAdapter.downloadFile(body.tokens, body.fileId);
    return NextResponse.json(file);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to download Google Drive file' }, { status: 500 });
  }
} 