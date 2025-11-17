import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, company, phone, employees, message } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !company || !employees || !message) {
      return NextResponse.json(
        { success: false, message: 'All required fields must be filled' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // TODO: In production, you would:
    // 1. Save to database (Firestore)
    // 2. Send email notification to sales team
    // 3. Add to CRM (e.g., Salesforce, HubSpot)
    // 4. Send confirmation email to the customer

    // For now, just log the submission
    console.log('Sales contact form submission:', {
      firstName,
      lastName,
      email,
      company,
      phone,
      employees,
      message,
      timestamp: new Date().toISOString()
    });

    // Simulate email sending (replace with actual email service in production)
    // Example: SendGrid, AWS SES, etc.

    return NextResponse.json(
      {
        success: true,
        message: 'Thank you for contacting us! Our sales team will be in touch within 24 hours.'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing sales contact form:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred processing your request. Please try again.' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
