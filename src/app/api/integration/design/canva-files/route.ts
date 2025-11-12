import { NextRequest, NextResponse } from 'next/server';
import { CanvaAdapter } from '../../../../../lib/integrations/CanvaAdapter';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const files = await CanvaAdapter.listFiles(body.tokens, body.limit);
    return NextResponse.json(files);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch Canva files' }, { status: 500 });
  }
} 