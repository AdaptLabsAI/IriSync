import { NextRequest, NextResponse } from 'next/server';
import { DropboxAdapter } from '../../../../../lib/integrations/DropboxAdapter';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await DropboxAdapter.handleOAuthCallback(body.code);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to authenticate with Dropbox' }, { status: 500 });
  }
} 