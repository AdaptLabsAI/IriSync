import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { firestore } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { logger } from '@/lib/logging/logger';
import { TaskType, ModelType, SubscriptionTier } from '@/lib/ai/models/tiered-model-router';

interface ModelConfiguration {
  id?: string;
  tier: SubscriptionTier;
  taskType: TaskType;
  model: ModelType;
  parameters?: {
    temperature: number;
    maxTokens: number;
    qualityPreference: 'standard' | 'high' | 'highest';
  };
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Check if user has admin privileges
 */
async function checkAdminAccess(userId: string): Promise<boolean> {
  const userDoc = await getDoc(doc(firestore, 'users', userId));
  if (!userDoc.exists()) return false;
  
  const userData = userDoc.data();
  return userData.role === 'admin' || userData.role === 'super_admin';
}

/**
 * GET - Retrieve all AI model configurations
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access
    const hasAdminAccess = await checkAdminAccess(session.user.id);
    if (!hasAdminAccess) {
      return NextResponse.json({ 
        error: 'Forbidden', 
        message: 'Admin access required' 
      }, { status: 403 });
    }

    // Get all model configurations
    const modelsQuery = query(
      collection(firestore, 'aiModelConfigurations'),
      orderBy('tier'),
      orderBy('taskType')
    );
    
    const modelsSnapshot = await getDocs(modelsQuery);
    const modelConfigurations: ModelConfiguration[] = [];
    
    modelsSnapshot.forEach((doc) => {
      const data = doc.data();
      modelConfigurations.push({
        id: doc.id,
        tier: data.tier,
        taskType: data.taskType,
        model: data.model,
        parameters: data.parameters,
        isActive: data.isActive,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        createdBy: data.createdBy,
        updatedBy: data.updatedBy
      });
    });

    // Get available options for dropdowns
    const availableOptions = {
      tiers: Object.values(SubscriptionTier),
      taskTypes: Object.values(TaskType),
      models: Object.values(ModelType)
    };

    return NextResponse.json({
      success: true,
      modelConfigurations,
      availableOptions
    });

  } catch (error) {
    logger.error('Error retrieving AI model configurations', { error });
    return NextResponse.json({ 
      error: 'Failed to retrieve model configurations' 
    }, { status: 500 });
  }
}

/**
 * POST - Create new AI model configuration
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access
    const hasAdminAccess = await checkAdminAccess(session.user.id);
    if (!hasAdminAccess) {
      return NextResponse.json({ 
        error: 'Forbidden', 
        message: 'Admin access required' 
      }, { status: 403 });
    }

    const body = await req.json();
    const { tier, taskType, model, parameters, isActive = true } = body;

    // Validate required fields
    if (!tier || !taskType || !model) {
      return NextResponse.json({
        error: 'Missing required fields',
        message: 'tier, taskType, and model are required'
      }, { status: 400 });
    }

    // Validate enum values
    if (!Object.values(SubscriptionTier).includes(tier)) {
      return NextResponse.json({
        error: 'Invalid tier',
        message: `tier must be one of: ${Object.values(SubscriptionTier).join(', ')}`
      }, { status: 400 });
    }

    if (!Object.values(TaskType).includes(taskType)) {
      return NextResponse.json({
        error: 'Invalid taskType',
        message: `taskType must be one of: ${Object.values(TaskType).join(', ')}`
      }, { status: 400 });
    }

    if (!Object.values(ModelType).includes(model)) {
      return NextResponse.json({
        error: 'Invalid model',
        message: `model must be one of: ${Object.values(ModelType).join(', ')}`
      }, { status: 400 });
    }

    // Create unique document ID based on tier and task type
    const docId = `${tier}_${taskType}`;

    // Check if configuration already exists
    const existingDoc = await getDoc(doc(firestore, 'aiModelConfigurations', docId));
    if (existingDoc.exists()) {
      return NextResponse.json({
        error: 'Configuration already exists',
        message: `A configuration for ${tier} tier and ${taskType} task already exists. Use PUT to update.`
      }, { status: 409 });
    }

    // Create new configuration
    const newConfig: ModelConfiguration = {
      tier,
      taskType,
      model,
      parameters: parameters || {
        temperature: 0.7,
        maxTokens: 1000,
        qualityPreference: 'standard'
      },
      isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: session.user.id,
      updatedBy: session.user.id
    };

    await setDoc(doc(firestore, 'aiModelConfigurations', docId), {
      ...newConfig,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    logger.info('AI model configuration created', {
      configId: docId,
      tier,
      taskType,
      model,
      createdBy: session.user.id
    });

    return NextResponse.json({
      success: true,
      configuration: { ...newConfig, id: docId },
      message: 'Model configuration created successfully'
    });

  } catch (error) {
    logger.error('Error creating AI model configuration', { error });
    return NextResponse.json({ 
      error: 'Failed to create model configuration' 
    }, { status: 500 });
  }
}

/**
 * PUT - Update existing AI model configuration
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access
    const hasAdminAccess = await checkAdminAccess(session.user.id);
    if (!hasAdminAccess) {
      return NextResponse.json({ 
        error: 'Forbidden', 
        message: 'Admin access required' 
      }, { status: 403 });
    }

    const body = await req.json();
    const { id, tier, taskType, model, parameters, isActive } = body;

    if (!id) {
      return NextResponse.json({
        error: 'Missing configuration ID'
      }, { status: 400 });
    }

    // Check if configuration exists
    const configDoc = await getDoc(doc(firestore, 'aiModelConfigurations', id));
    if (!configDoc.exists()) {
      return NextResponse.json({
        error: 'Configuration not found'
      }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: serverTimestamp(),
      updatedBy: session.user.id
    };

    if (tier !== undefined) updateData.tier = tier;
    if (taskType !== undefined) updateData.taskType = taskType;
    if (model !== undefined) updateData.model = model;
    if (parameters !== undefined) updateData.parameters = parameters;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update configuration
    await updateDoc(doc(firestore, 'aiModelConfigurations', id), updateData);

    logger.info('AI model configuration updated', {
      configId: id,
      updatedBy: session.user.id,
      changes: Object.keys(updateData).filter(key => key !== 'updatedAt' && key !== 'updatedBy')
    });

    return NextResponse.json({
      success: true,
      message: 'Model configuration updated successfully'
    });

  } catch (error) {
    logger.error('Error updating AI model configuration', { error });
    return NextResponse.json({ 
      error: 'Failed to update model configuration' 
    }, { status: 500 });
  }
}

/**
 * DELETE - Remove AI model configuration
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access
    const hasAdminAccess = await checkAdminAccess(session.user.id);
    if (!hasAdminAccess) {
      return NextResponse.json({ 
        error: 'Forbidden', 
        message: 'Admin access required' 
      }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        error: 'Missing configuration ID'
      }, { status: 400 });
    }

    // Check if configuration exists
    const configDoc = await getDoc(doc(firestore, 'aiModelConfigurations', id));
    if (!configDoc.exists()) {
      return NextResponse.json({
        error: 'Configuration not found'
      }, { status: 404 });
    }

    // Delete configuration
    await deleteDoc(doc(firestore, 'aiModelConfigurations', id));

    logger.info('AI model configuration deleted', {
      configId: id,
      deletedBy: session.user.id
    });

    return NextResponse.json({
      success: true,
      message: 'Model configuration deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting AI model configuration', { error });
    return NextResponse.json({ 
      error: 'Failed to delete model configuration' 
    }, { status: 500 });
  }
} 