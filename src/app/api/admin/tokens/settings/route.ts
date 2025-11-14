import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/features/auth/route-handlers';
import { firestore } from '@/lib/core/firebase/admin';
import { AITaskType } from '@/lib/features/ai/models/AITask';
import { logger } from '@/lib/core/logging/logger';
import { TOKEN_COST_PER_OPERATION } from '@/lib/features/tokens/models/token-limits';
import { MONTHLY_TOKEN_LIMITS } from '@/lib/features/tokens/models/token-limits';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


// Settings document ID in Firestore
const SETTINGS_DOC_ID = 'token_settings';

/**
 * GET handler for token settings
 * Restricted to Admin role
 */
export const GET = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Try to get settings from Firestore
    const settingsRef = firestore.collection('settings').doc(SETTINGS_DOC_ID);
    const settingsDoc = await settingsRef.get();
    
    if (settingsDoc.exists) {
      // Return existing settings
      return NextResponse.json(settingsDoc.data());
    } else {
      // If no settings exist, create and return default settings
      const defaultSettings = {
        tiers: MONTHLY_TOKEN_LIMITS,
        tokensPerOperation: TOKEN_COST_PER_OPERATION,
        freeTasks: [AITaskType.CUSTOMER_SUPPORT, AITaskType.CHATBOT],
        lastUpdated: new Date().toISOString(),
        updatedBy: adminUser.id
      };
      
      // Store default settings
      await settingsRef.set(defaultSettings);
      
      return NextResponse.json(defaultSettings);
    }
  } catch (error) {
    logger.error('Error fetching token settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token settings' },
      { status: 500 }
    );
  }
});

/**
 * POST handler for updating token settings
 * Restricted to Admin role
 */
export const POST = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Get settings from request body
    const settings = await request.json();
    
    // Validate settings
    if (!settings || !settings.tiers || !settings.tokensPerOperation) {
      return NextResponse.json(
        { error: 'Invalid settings data' },
        { status: 400 }
      );
    }
    
    // Add metadata
    const updatedSettings = {
      ...settings,
      lastUpdated: new Date().toISOString(),
      updatedBy: adminUser.id
    };
    
    // Update settings in Firestore
    const settingsRef = firestore.collection('settings').doc(SETTINGS_DOC_ID);
    await settingsRef.set(updatedSettings, { merge: true });
    
    // Log the update
    await firestore.collection('audit_logs').add({
      action: 'update_token_settings',
      userId: adminUser.id,
      timestamp: new Date(),
      details: {
        beforeUpdate: (await settingsRef.get()).data(),
        afterUpdate: updatedSettings
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Token settings updated successfully'
    });
  } catch (error) {
    logger.error('Error updating token settings:', error);
    return NextResponse.json(
      { error: 'Failed to update token settings' },
      { status: 500 }
    );
  }
}); 