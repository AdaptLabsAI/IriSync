import { NextRequest, NextResponse } from 'next/server';
import { generateOrganizationId, validateUserOrganizationConnections } from '@/lib/core/utils';
import { getFirestore } from '@/lib/core/firebase/admin';

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const firestore = getFirestore();
    const testResults = [];

    // Test 1: Email-based generation
    const testEmails = [
      'user@example.com',
      'very.long.email.address.with.many.dots@subdomain.example.com',
      'special+chars_123@test-domain.co.uk',
      'short@x.co'
    ];

    for (const email of testEmails) {
      const orgId = await generateOrganizationId(email, firestore);
      testResults.push({
        type: 'email-based',
        input: email,
        output: orgId,
        length: orgId.length,
        isValid: orgId.length >= 16 && orgId.length <= 18
      });
    }

    // Test 2: UUID-based generation (no email)
    for (let i = 0; i < 5; i++) {
      const orgId = await generateOrganizationId(undefined, firestore);
      testResults.push({
        type: 'uuid-based',
        input: 'no-email',
        output: orgId,
        length: orgId.length,
        isValid: orgId.length >= 16 && orgId.length <= 18
      });
    }

    // Test 3: Collision detection simulation
    const collisionTestEmail = 'collision@test.com';
    const firstId = await generateOrganizationId(collisionTestEmail, firestore);
    
    // Create a mock organization with the first ID to test collision detection
    await firestore.collection('organizations').doc(firstId).set({
      name: 'Test Organization',
      isTest: true,
      createdAt: new Date()
    });

    const secondId = await generateOrganizationId(collisionTestEmail, firestore);
    
    // Clean up test organization
    await firestore.collection('organizations').doc(firstId).delete();

    testResults.push({
      type: 'collision-test',
      input: collisionTestEmail,
      firstId,
      secondId,
      output: `First: ${firstId}, Second: ${secondId}`,
      length: secondId.length,
      isValid: firstId !== secondId && secondId.length >= 16 && secondId.length <= 18,
      collisionHandled: firstId !== secondId
    });

    // Test 4: Organization validation
    const mockUserData = {
      email: 'validation@test.com',
      firstName: 'Test',
      personalOrganizationId: null,
      currentOrganizationId: null
    };

    const validation = await validateUserOrganizationConnections('test-user-123', mockUserData, firestore);

    testResults.push({
      type: 'validation-test',
      input: mockUserData,
      output: validation,
      isValid: validation.personalOrganizationId && validation.currentOrganizationId,
      hasErrors: validation.errors.length > 0
    });

    // Summary
    const validResults = testResults.filter(r => r.isValid);
    const summary = {
      totalTests: testResults.length,
      validResults: validResults.length,
      successRate: `${Math.round((validResults.length / testResults.length) * 100)}%`,
      lengthRange: {
        min: Math.min(...testResults.map(r => r.length || 0)),
        max: Math.max(...testResults.map(r => r.length || 0))
      }
    };

    return NextResponse.json({
      success: true,
      summary,
      results: testResults
    });

  } catch (error) {
    console.error('Organization ID test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 