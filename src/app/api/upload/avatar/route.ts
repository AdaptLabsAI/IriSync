import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { firestore } from '@/lib/firebase/client';
import { doc, updateDoc } from 'firebase/firestore';
import { logger } from '@/lib/logging/logger';

// Environment variables
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'avatars';

// Maximum file size (2MB)
const MAX_FILE_SIZE = 2 * 1024 * 1024;

// Allowed image MIME types
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
];

// New route segment config format
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // Validate user session
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        message: 'Authentication required to upload avatar',
        endpoint: '/api/upload/avatar'
      }, { status: 401 });
    }
    
    const userId = (session.user as any).id || session.user.email;

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    // Validate file presence
    if (!file) {
      return NextResponse.json({ 
        error: 'Bad Request', 
        message: 'No file uploaded', 
        endpoint: '/api/upload/avatar'
      }, { status: 400 });
    }
    
    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Bad Request', 
        message: `Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`, 
        endpoint: '/api/upload/avatar'
      }, { status: 400 });
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'Bad Request', 
        message: `File size exceeds maximum allowed size of 2MB`, 
        endpoint: '/api/upload/avatar'
      }, { status: 400 });
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate Cloudinary configuration
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      logger.error('Missing Cloudinary configuration', { 
        cloudName: !!CLOUDINARY_CLOUD_NAME, 
        apiKey: !!CLOUDINARY_API_KEY, 
        apiSecret: !!CLOUDINARY_API_SECRET 
      });
      
      return NextResponse.json({ 
        error: 'Server Error', 
        message: 'Cloud storage not properly configured', 
        endpoint: '/api/upload/avatar'
      }, { status: 500 });
    }

    // Prepare Cloudinary upload
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const folder = `avatars/${userId.substring(0, 8)}`;
    
    // Generate signature
    const crypto = await import('crypto');
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}&upload_preset=${CLOUDINARY_UPLOAD_PRESET}${CLOUDINARY_API_SECRET}`;
    const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');
    
    // Create form for upload
    const uploadForm = new FormData();
    uploadForm.append('file', new Blob([buffer]), file.name);
    uploadForm.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    uploadForm.append('folder', folder);
    uploadForm.append('api_key', CLOUDINARY_API_KEY);
    uploadForm.append('timestamp', timestamp);
    uploadForm.append('signature', signature);
    
    // Add metadata
    uploadForm.append('public_id', `user_${userId}_${timestamp}`);
    uploadForm.append('context', `user_id=${userId}|upload_type=avatar`);

    // Upload to Cloudinary
    try {
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: uploadForm,
      });
      
      // Handle Cloudinary errors
      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        logger.error('Cloudinary upload failed', { error: errorData });
        
        return NextResponse.json({ 
          error: 'Upload Failed', 
          message: errorData.error?.message || 'Failed to upload image to cloud storage', 
          endpoint: '/api/upload/avatar'
        }, { status: 500 });
      }
      
      const uploadData = await uploadRes.json();
      
      // Update user profile with new avatar URL
      try {
        const userRef = doc(firestore, 'users', userId);
        await updateDoc(userRef, {
          avatar: uploadData.secure_url,
          updatedAt: new Date().toISOString()
        });
        
        logger.info('User avatar updated', { userId });
      } catch (dbError) {
        logger.error('Failed to update user profile with new avatar', { error: dbError, userId });
        // We'll still return success since the upload worked
      }

      return NextResponse.json({ 
        url: uploadData.secure_url,
        publicId: uploadData.public_id,
        version: uploadData.version,
        format: uploadData.format,
        resourceType: uploadData.resource_type
      });
    } catch (uploadError) {
      logger.error('Error during avatar upload', { error: uploadError });
      
      return NextResponse.json({ 
        error: 'Server Error', 
        message: 'Failed to process image upload', 
        endpoint: '/api/upload/avatar'
      }, { status: 500 });
    }
  } catch (error) {
    logger.error('Unhandled error in avatar upload', { error });
    
    return NextResponse.json({ 
      error: 'Server Error', 
      message: 'An unexpected error occurred', 
      endpoint: '/api/upload/avatar'
    }, { status: 500 });
  }
} 