import { NextRequest, NextResponse } from 'next/server';
import { OneDriveAdapter } from '../../../../../lib/integrations/OneDriveAdapter';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await OneDriveAdapter.handleOAuthCallback(body.code);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to authenticate with OneDrive' }, { status: 500 });
  }
} 