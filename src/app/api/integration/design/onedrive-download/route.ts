import { NextRequest, NextResponse } from 'next/server';
import { OneDriveAdapter } from '../../../../../lib/integrations/OneDriveAdapter';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const file = await OneDriveAdapter.downloadFile(body.tokens, body.itemId);
    return NextResponse.json(file);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to download OneDrive file' }, { status: 500 });
  }
} 