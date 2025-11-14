import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


export async function POST(req: NextRequest) {
  // All enterprise registrations should go through the quote form
  return NextResponse.json({
    redirect: true,
    redirectTo: '/enterprise/quote',
    message: 'Enterprise customers must use our custom quote process for tailored pricing and features'
  }, { status: 302 });
}

export async function GET(req: NextRequest) {
  // Also handle GET requests (in case someone navigates directly)
  const url = new URL('/enterprise/quote', req.url);
  return NextResponse.redirect(url, 302);
}

// Implement OPTIONS for CORS support
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
} 