import { NextRequest, NextResponse } from 'next/server';
import { DropboxAdapter } from '../../../../../lib/integrations/DropboxAdapter';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const file = await DropboxAdapter.downloadFile(body.accessToken, body.path);
    return NextResponse.json(file);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to download Dropbox file' }, { status: 500 });
  }
} 