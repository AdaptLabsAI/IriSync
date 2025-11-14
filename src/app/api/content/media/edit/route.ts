import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '../../../../../lib/core/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyAuthentication, handleApiError } from '../../../../../lib/auth/utils';
import { logger } from '../../../../../lib/core/logging/logger';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


const firestore = getFirestore();

export async function POST(req: NextRequest) {
  const startTime = process.hrtime();
  
  try {
    const userId = await verifyAuthentication(req);
    if (!userId) {
      logger.warn({ type: 'request', method: 'POST', url: req.url, statusCode: 401 }, 'Unauthorized');
      return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { mediaId, editedImageData, edits } = body;
    
    if (!mediaId || !editedImageData) {
      return NextResponse.json({ 
        error: 'Bad Request', 
        message: 'mediaId and editedImageData are required' 
      }, { status: 400 });
    }

    // Get the original media record
    const mediaRef = firestore.collection('users').doc(userId).collection('media').doc(mediaId);
    const mediaDoc = await mediaRef.get();
    
    if (!mediaDoc.exists) {
      return NextResponse.json({ 
        error: 'Not Found', 
        message: 'Media not found' 
      }, { status: 404 });
    }

    const mediaData = mediaDoc.data();
    if (!mediaData) {
      return NextResponse.json({ 
        error: 'Not Found', 
        message: 'Media data not found' 
      }, { status: 404 });
    }

    // Process the edited image
    let processedImageBuffer: Buffer;
    let mimeType = 'image/jpeg';
    
    if (editedImageData.startsWith('data:')) {
      // Handle base64 data
      const matches = editedImageData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new Error('Invalid base64 format');
      }
      
      mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Use Sharp to ensure the image is properly processed
      processedImageBuffer = await sharp(buffer)
        .jpeg({ quality: 90 })
        .toBuffer();
    } else {
      throw new Error('Unsupported image data format');
    }

    // Upload the edited image to storage
    const { Storage } = require('@google-cloud/storage');
    const storage = new Storage();
    const bucketName = process.env.GCS_BUCKET_NAME || 'irisync-media';
    const bucket = storage.bucket(bucketName);
    
    // Generate a new filename for the edited version
    const fileExtension = mediaData.originalFilename.split('.').pop();
    const editedFilename = `${uuidv4()}_edited.${fileExtension}`;
    const fileUploadPath = `users/${userId}/media/${editedFilename}`;
    
    const file = bucket.file(fileUploadPath);
    await file.save(processedImageBuffer, {
      metadata: {
        contentType: mimeType,
        metadata: {
          originalFilename: `edited_${mediaData.originalFilename}`,
          userId,
          uploadedAt: new Date().toISOString(),
          editedFrom: mediaId,
          edits: JSON.stringify(edits || {})
        }
      }
    });
    
    await file.makePublic();
    const editedImageUrl = `https://storage.googleapis.com/${bucketName}/${fileUploadPath}`;
    
    // Create thumbnail for the edited image
    let thumbnailUrl = editedImageUrl;
    try {
      const thumbnailPath = `users/${userId}/media/thumbnails/${editedFilename}`;
      const thumbnailFile = bucket.file(thumbnailPath);
      const thumbnailBuffer = await sharp(processedImageBuffer)
        .resize({ width: 300, height: 300, fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer();
      
      await thumbnailFile.save(thumbnailBuffer, {
        metadata: {
          contentType: 'image/jpeg',
          metadata: {
            originalFilename: `thumb_edited_${mediaData.originalFilename}`,
            userId,
            isThumbnail: true
          }
        }
      });
      
      await thumbnailFile.makePublic();
      thumbnailUrl = `https://storage.googleapis.com/${bucketName}/${thumbnailPath}`;
    } catch (thumbnailError) {
      logger.warn({ error: thumbnailError }, 'Failed to create thumbnail for edited image');
    }

    // Save the edited image as a new media record
    const newMediaData = {
      filename: editedFilename,
      originalFilename: `edited_${mediaData.originalFilename}`,
      url: editedImageUrl,
      thumbnailUrl,
      type: mimeType,
      size: processedImageBuffer.length,
      width: mediaData.width, // TODO: Could extract actual dimensions from Sharp
      height: mediaData.height,
      tags: [...(mediaData.tags || []), 'edited'],
      title: `${mediaData.title || mediaData.originalFilename} (Edited)`,
      description: `Edited version of ${mediaData.originalFilename}`,
      uploadedAt: new Date(),
      editedFrom: mediaId,
      usageCount: 0,
      folderId: mediaData.folderId || null,
      edits: edits || {}
    };

    const newMediaRef = firestore.collection('users').doc(userId).collection('media').doc();
    await newMediaRef.set(newMediaData);

    // Update the user's storage usage
    const userRef = firestore.collection('users').doc(userId);
    await userRef.update({
      storageUsed: FieldValue.increment(processedImageBuffer.length)
    });

    // Log the successful edit
    logger.info({ 
      type: 'media', 
      action: 'edit', 
      userId, 
      originalMediaId: mediaId, 
      newMediaId: newMediaRef.id 
    }, 'Image edited successfully');

    logRequestDuration(req, 200, startTime);
    
    return NextResponse.json({
      success: true,
      message: 'Image edited successfully',
      editedImage: {
        id: newMediaRef.id,
        ...newMediaData
      }
    }, { status: 200 });

  } catch (error: any) {
    logger.error({ type: 'request', method: 'POST', url: req.url, error }, 'Image edit error');
    logRequestDuration(req, 500, startTime);
    return NextResponse.json(
      handleApiError(error, '/api/content/media/edit', 'editing image'),
      { status: 500 }
    );
  }
}

function logRequestDuration(req: NextRequest, statusCode: number, startTime: [number, number]) {
  const [seconds, nanoseconds] = process.hrtime(startTime);
  const duration = seconds * 1000 + nanoseconds / 1000000;
  logger.info({
    type: 'performance',
    method: req.method,
    url: req.url,
    statusCode,
    duration: `${duration.toFixed(2)}ms`
  }, 'Request completed');
} 