import { NextRequest, NextResponse } from 'next/server';
import { CanvaAdapter } from '../../../../../lib/integrations/CanvaAdapter';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const file = await CanvaAdapter.downloadFile(body.tokens, body.designId);
    return NextResponse.json(file);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to download Canva file' }, { status: 500 });
  }
} 