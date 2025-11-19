import { NextRequest, NextResponse } from 'next/server';
import formidable from 'formidable';
import { Readable } from 'stream';
import { getServerSession } from 'next-auth/next';
import { getFirebaseFirestore } from '@/lib/core/firebase';
import { collection, doc, getDoc, getDocs, query, where, setDoc } from 'firebase/firestore';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


// Lazy initialize OpenAI client to avoid build-time errors
let openai: any = null;
function getOpenAI() {
  if (!openai) {
    const OpenAI = require('openai').default;
    if (process.env.OPENAI_API_KEY) {
      openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }
  return openai;
}

// Define interfaces for formidable types
interface FormidableFile {
  originalFilename: string | null;
  filepath: string;
  newFilename: string;
  mimetype: string | null;
  size: number;
  [key: string]: any;
}

interface FormidableFiles {
  [key: string]: FormidableFile | FormidableFile[];
}

interface FormidableFields {
  [key: string]: string | string[];
}

async function parseFormData(req: NextRequest): Promise<{ files: FormidableFile[] }> {
  const form = new formidable.IncomingForm();
  const buffers: Buffer[] = [];
  const reader = req.body?.getReader();
  if (!reader) throw new Error('No body');
  let done = false;
  while (!done) {
    const { value, done: d } = await reader.read();
    if (value) buffers.push(Buffer.from(value));
    done = d;
  }
  const buffer = Buffer.concat(buffers);
  return new Promise((resolve, reject) => {
    form.parse(Readable.from(buffer), (err: any, fields: FormidableFields, files: FormidableFiles) => {
      if (err) return reject(err);
      const fileArray = Array.isArray(files.files) ? files.files : files.files ? [files.files] : [];
      resolve({ files: fileArray });
    });
  });
}

async function autoTagAndModerate(files: FormidableFile[]): Promise<{ tags: string[]; moderation: any }> {
  const tags: string[] = [];
  let flagged = false;
  let reason = '';
  const openaiClient = getOpenAI();
  if (!openaiClient) {
    throw new Error('OpenAI client not available - API key not configured');
  }
  for (const file of files) {
    const prompt = `Suggest 5 relevant tags for a media file named: ${file.originalFilename}. Also, flag if the file name suggests inappropriate content.`;
    try {
      const response = await openaiClient.completions.create({
        model: 'text-davinci-003',
        prompt,
        max_tokens: 60,
        temperature: 0.5,
      });
      const text = response.choices[0].text || '';
      const tagMatch = text.match(/tags?:?\s*([\w,\s]+)/i);
      if (tagMatch) {
        tags.push(...tagMatch[1].split(',').map((t: string) => t.trim()).filter(Boolean));
      } else {
        tags.push(...text.split(',').map((t: string) => t.trim()).filter(Boolean));
      }
      if (/flagged|inappropriate|nsfw|unsafe/i.test(text)) {
        flagged = true;
        reason = text;
      }
    } catch (e) {
      tags.push(...(file.originalFilename || '').split(/[-_. ]/).map((t: string) => t.trim()).filter(Boolean));
    }
  }
  return {
    tags: Array.from(new Set(tags)).slice(0, 10),
    moderation: flagged ? { flagged, reason } : { flagged: false },
  };
}

export async function POST(req: NextRequest) {
  try {
    // Get the user session
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // The user ID is the email in our system
    const userId = session.user.email;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 400 }
      );
    }
    
    // Check user's subscription and AI usage limits
    const subscriptionsRef = collection(firestore, 'subscriptions');
    const subscriptionsQuery = query(subscriptionsRef, where('userId', '==', userId), where('status', '==', 'active'));
    const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
    
    let tier: string;
    
    if (!subscriptionsSnapshot.empty) {
      const subscription = subscriptionsSnapshot.docs[0].data();
      tier = subscription.tier;
      
      if (!tier) {
        return NextResponse.json(
          { error: 'A paid subscription is required to access AI features. Please upgrade to Creator, Influencer, or Enterprise tier.' },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'A paid subscription is required to access AI features. Please upgrade to Creator, Influencer, or Enterprise tier.' },
        { status: 403 }
      );
    }
    
    // Get current AI usage
    const usageRef = doc(firestore, 'aiUsage', userId);
    const usageSnapshot = await getDoc(usageRef);
    
    const usageData = usageSnapshot.exists() ? usageSnapshot.data() : { tools: {} };
    const toolsUsage = usageData.tools || {};
    
    // Calculate total usage
    const totalUsed = Object.values(toolsUsage).reduce((sum: number, count) => sum + (count as number), 0);
    
    // Set usage limits based on subscription tier
    let usageLimit = 100; // Default for creator tier
    
    switch (tier) {
      case 'enterprise':
        usageLimit = 5000; // 5000 base tokens for Enterprise
        break;
      case 'influencer':
        usageLimit = 500; // 500 tokens/month for Influencer tier
        break;
      case 'creator':
        usageLimit = 100; // 100 tokens/month for Creator tier
        break;
    }
    
    // Each AI task counts as 1 token usage
    const tokenCost = 1;
    
    // Check if this would exceed the user's limit
    if (totalUsed + tokenCost > usageLimit) {
      return NextResponse.json(
        { 
          error: 'AI usage limit exceeded', 
          message: 'You have reached your AI token limit for this subscription tier.',
          upgradeUrl: '/dashboard/settings/billing',
          purchaseUrl: '/dashboard/settings/billing?action=purchase-tokens',
          tokenLimit: usageLimit,
          currentUsage: totalUsed,
          requiredTokens: tokenCost
        },
        { status: 403 }
      );
    }
    
    const { files } = await parseFormData(req);
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }
    
    const result = await autoTagAndModerate(files);
    
    // Update usage statistics
    const mediaAnalyzerId = 'media-auto-tag';
    toolsUsage[mediaAnalyzerId] = (toolsUsage[mediaAnalyzerId] || 0) + tokenCost;
    
    await setDoc(usageRef, {
      userId,
      tools: toolsUsage,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
    
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to auto-tag media' }, { status: 500 });
  }
} 