import { NextRequest, NextResponse } from 'next/server';
import { testEmailSetup, validateSendGridKey } from '@/lib/core/notifications/test-email';

/**
 * Test endpoint for email service validation
 * GET /api/test-email?action=validate|send
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'validate';

  try {
    if (action === 'validate') {
      // Just validate the API key
      const isValid = await validateSendGridKey();
      
      return NextResponse.json({
        success: isValid,
        message: isValid ? 'SendGrid API key is valid' : 'SendGrid API key is invalid',
        timestamp: new Date().toISOString()
      });
      
    } else if (action === 'send') {
      // Run full email tests
      console.log('Starting email test suite...');
      await testEmailSetup();
      
      return NextResponse.json({
        success: true,
        message: 'Email tests completed. Check console and your inbox for results.',
        timestamp: new Date().toISOString()
      });
      
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Use ?action=validate or ?action=send'
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Email test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * POST endpoint for manual email testing with custom parameters
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, message, testType = 'simple' } = body;

    if (!to) {
      return NextResponse.json({
        success: false,
        error: 'Recipient email address is required'
      }, { status: 400 });
    }

    // Import here to avoid issues with server-side imports
    const { default: unifiedEmailService } = await import('@/lib/core/notifications/unified-email-service');
    
    let result;
    
    switch (testType) {
      case 'simple':
        result = await unifiedEmailService.sendEmail({
          to,
          subject: subject || 'IriSync Test Email',
          htmlContent: message || `
            <h2>✅ Test Email from IriSync</h2>
            <p>This is a test email sent from the IriSync unified email service.</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          `,
          category: 'manual_test'
        });
        break;
        
      case 'enterprise':
        result = await unifiedEmailService.sendEnterpriseQuote({
          to,
          contactName: 'Test Contact',
          companyName: 'Test Company',
          quoteNumber: 'Q-MANUAL-' + Date.now(),
          totalPrice: 5000,
          currency: 'USD',
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          quoteId: 'manual-test',
          salesRepId: 'test-rep'
        });
        break;
        
      case 'billing':
        result = await unifiedEmailService.sendBillingReminder({
          to,
          companyName: 'Test Company',
          tier: 'Enterprise',
          stage: 'first',
          daysRemaining: 7
        });
        break;
        
      case 'tokens':
        result = await unifiedEmailService.sendTokenPurchaseConfirmation({
          to,
          tokenAmount: 1000,
          price: 99.99,
          currency: 'USD',
          purchaseDate: new Date()
        });
        break;
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid test type. Use: simple, enterprise, billing, or tokens'
        }, { status: 400 });
    }

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      testType,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Manual email test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 