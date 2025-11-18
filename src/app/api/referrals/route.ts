/**
 * Referrals API Redirect
 *
 * This endpoint exists for backward compatibility.
 * Redirects to /api/marketing/referrals (the new RESTful location).
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Build the new URL with query parameters preserved
  const searchParams = request.nextUrl.searchParams;
  const newUrl = `/api/marketing/referrals${searchParams.toString() ? '?' + searchParams.toString() : ''}`;

  return NextResponse.redirect(new URL(newUrl, request.url), 308); // 308 = Permanent Redirect
}

export async function POST(request: NextRequest) {
  const newUrl = `/api/marketing/referrals`;
  return NextResponse.redirect(new URL(newUrl, request.url), 308);
}

export async function PUT(request: NextRequest) {
  const newUrl = `/api/marketing/referrals`;
  return NextResponse.redirect(new URL(newUrl, request.url), 308);
}

export async function DELETE(request: NextRequest) {
  const newUrl = `/api/marketing/referrals`;
  return NextResponse.redirect(new URL(newUrl, request.url), 308);
}
