import unifiedEmailService from './unified-email-service';

/**
 * Test script to validate SendGrid setup
 * Run this after configuring your SendGrid API key
 */
export async function testEmailSetup() {
  console.log('🧪 Testing SendGrid Email Setup...\n');
  
  try {
    // Test 1: Simple email
    console.log('📧 Test 1: Simple email delivery...');
    const simpleTest = await unifiedEmailService.sendEmail({
      to: process.env.EMAIL_DEV_RECIPIENT || 'admin@irisync.ai',
      subject: 'IriSync Email Test - Simple',
      htmlContent: `
        <h2>✅ SendGrid Test Successful!</h2>
        <p>This email confirms that your SendGrid integration is working correctly.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>Provider:</strong> SendGrid (Independent)</p>
      `,
      category: 'test'
    });
    
    if (simpleTest.success) {
      console.log('✅ Simple email sent successfully!');
      console.log(`   Message ID: ${simpleTest.messageId}`);
    } else {
      console.log('❌ Simple email failed:', simpleTest.error);
    }
    
    // Test 2: Enterprise quote email
    console.log('\n📧 Test 2: Enterprise quote email...');
    const quoteTest = await unifiedEmailService.sendEnterpriseQuote({
      to: process.env.EMAIL_DEV_RECIPIENT || 'admin@irisync.ai',
      contactName: 'Test Contact',
      companyName: 'Test Company Ltd',
      quoteNumber: 'Q-TEST-' + Date.now(),
      totalPrice: 9999,
      currency: 'USD',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      quoteId: 'test-quote-id',
      salesRepId: 'test-sales-rep'
    });
    
    if (quoteTest.success) {
      console.log('✅ Enterprise quote email sent successfully!');
      console.log(`   Message ID: ${quoteTest.messageId}`);
    } else {
      console.log('❌ Enterprise quote email failed:', quoteTest.error);
    }
    
    // Test 3: Billing reminder
    console.log('\n📧 Test 3: Billing reminder email...');
    const billingTest = await unifiedEmailService.sendBillingReminder({
      to: process.env.EMAIL_DEV_RECIPIENT || 'admin@irisync.ai',
      companyName: 'Test Company Ltd',
      tier: 'Enterprise',
      stage: 'first',
      daysRemaining: 7
    });
    
    if (billingTest.success) {
      console.log('✅ Billing reminder email sent successfully!');
      console.log(`   Message ID: ${billingTest.messageId}`);
    } else {
      console.log('❌ Billing reminder email failed:', billingTest.error);
    }
    
    // Test 4: Check service status
    console.log('\n🔍 Email service status:');
    console.log(`   Provider: SendGrid (${process.env.EMAIL_PROVIDER || 'sendgrid'})`);
    console.log(`   Dev Mode: ${process.env.EMAIL_DEV_MODE === 'true'}`);
    console.log(`   Rate Limit: ${process.env.EMAIL_RATE_LIMIT_PER_MINUTE || 100}/min`);
    
    console.log('\n🎉 Email testing completed!');
    console.log('Check your inbox for test emails.');
    
  } catch (error) {
    console.error('❌ Email testing failed:', error);
    console.log('\n🔧 Troubleshooting checklist:');
    console.log('   1. Check SENDGRID_API_KEY in environment');
    console.log('   2. Verify domain authentication in SendGrid');
    console.log('   3. Ensure EMAIL_FROM is verified');
    console.log('   4. Check SendGrid account limits');
  }
}

/**
 * Quick API key validation
 */
export async function validateSendGridKey() {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/user/profile', {
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const profile = await response.json();
      console.log('✅ SendGrid API Key Valid');
      console.log(`   Account: ${profile.username}`);
      console.log(`   Email: ${profile.email}`);
      return true;
    } else {
      console.log('❌ SendGrid API Key Invalid');
      console.log(`   Status: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.log('❌ SendGrid API Key Test Failed:', error);
    return false;
  }
}

// Export for easy testing
export default {
  testEmailSetup,
  validateSendGridKey
}; 