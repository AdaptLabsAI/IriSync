import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '../../../../lib/firebase/admin';
import { verifyAuthentication, handleApiError } from '../../../../lib/auth/utils';
import { logger } from '../../../../lib/logging/logger';
import { v4 as uuidv4 } from 'uuid';

const firestore = getFirestore();

export async function GET(req: NextRequest) {
  const startTime = process.hrtime();
  try {
    const userId = await verifyAuthentication(req);
    if (!userId) {
      logger.warn({ type: 'request', method: 'GET', url: req.url, statusCode: 401 }, 'Unauthorized');
      return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const tag = searchParams.get('tag');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const limit = searchParams.get('limit') || '20';
    const lastVisible = searchParams.get('lastVisible');
    const searchTerm = searchParams.get('searchTerm');
    const folderId = searchParams.get('folderId');
    let mediaQuery: any = firestore.collection('users').doc(userId).collection('media');
    if (type) mediaQuery = mediaQuery.where('type', '==', type);
    if (tag) mediaQuery = mediaQuery.where('tags', 'array-contains', tag);
    if (folderId) mediaQuery = mediaQuery.where('folderId', '==', folderId);
    if (fromDate) mediaQuery = mediaQuery.where('uploadedAt', '>=', new Date(fromDate));
    if (toDate) mediaQuery = mediaQuery.where('uploadedAt', '<=', new Date(toDate));
    mediaQuery = mediaQuery.orderBy('uploadedAt', 'desc');
    if (lastVisible) {
      try {
        const lastDoc = await firestore.collection('users').doc(userId).collection('media').doc(lastVisible).get();
        if (lastDoc.exists) mediaQuery = mediaQuery.startAfter(lastDoc);
      } catch (error) {
        logger.error({ type: 'pagination', error }, 'Pagination error');
      }
    }
    mediaQuery = mediaQuery.limit(parseInt(limit, 10));
    const snapshot = await mediaQuery.get();
    let mediaFiles = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        filename: data.filename,
        originalFilename: data.originalFilename,
        url: data.url,
        thumbnailUrl: data.thumbnailUrl,
        type: data.type,
        size: data.size,
        width: data.width,
        height: data.height,
        tags: data.tags || [],
        title: data.title,
        description: data.description,
        uploadedAt: data.uploadedAt?.toDate(),
        usageCount: data.usageCount || 0,
        folderId: data.folderId || null,
      };
    });
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      mediaFiles = mediaFiles.filter((file: any) =>
        file.filename.toLowerCase().includes(term) ||
        file.originalFilename.toLowerCase().includes(term) ||
        (file.title && file.title.toLowerCase().includes(term)) ||
        (file.description && file.description.toLowerCase().includes(term)) ||
        file.tags.some((tag: string) => tag.toLowerCase().includes(term))
      );
    }
    const mediaStats = await getMediaStats(userId);
    const tagsSnapshot = await firestore.collection('users').doc(userId).collection('mediaTags').orderBy('usageCount', 'desc').limit(20).get();
    const tags = tagsSnapshot.docs.map((doc: any) => {
      const data = doc.data();
      return { name: doc.id, count: data.usageCount || 0 };
    });
    const result = {
      media: mediaFiles,
      stats: mediaStats,
      filters: {
        tags,
        types: ['image', 'video', 'audio', 'document']
      },
      lastVisible: mediaFiles.length > 0 ? mediaFiles[mediaFiles.length - 1].id : null,
      hasMore: mediaFiles.length === parseInt(limit, 10),
    };
    logger.info({ type: 'request', method: 'GET', url: req.url, statusCode: 200 }, 'Media GET success');
    logRequestDuration(req, 200, startTime);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    logger.error({ type: 'request', method: 'GET', url: req.url, error }, 'Media GET error');
    logRequestDuration(req, 500, startTime);
    return NextResponse.json(
      handleApiError(error, '/api/content/media', 'fetching media files'),
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const startTime = process.hrtime();
  try {
    const userId = await verifyAuthentication(req);
    if (!userId) {
      logger.warn({ type: 'request', method: 'POST', url: req.url, statusCode: 401 }, 'Unauthorized');
      return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
    }
    const body = await req.json();
    const { fileData, originalFilename, type, size, width, height, tags, title, description, folderId } = body;
    if (!fileData || !originalFilename || !type || !size) {
      return NextResponse.json({ error: 'Bad Request', message: 'fileData, originalFilename, type, and size are required' }, { status: 400 });
    }
    const userDoc = await firestore.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const storageQuota = userData?.storageQuota || 1024 * 1024 * 100;
    const storageUsed = userData?.storageUsed || 0;
    if (storageUsed + size > storageQuota) {
      return NextResponse.json({ error: 'Storage Limit', message: 'You have reached your storage limit. Please upgrade your plan or delete some files.' }, { status: 400 });
    }
    const allowedTypes = {
      'image': ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      'video': ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
      'audio': ['audio/mpeg', 'audio/mp3', 'audio/wav'],
      'document': ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    };
    const fileType = Object.keys(allowedTypes).find(key => (allowedTypes as any)[key].includes(type)) || 'other';
    const fileExtension = originalFilename.split('.').pop();
    const uniqueFilename = `${uuidv4()}.${fileExtension}`;
    let uploadedFileUrl;
    let thumbnailUrl;
    try {
      const { Storage } = require('@google-cloud/storage');
      const storage = new Storage();
      const bucketName = process.env.GCS_BUCKET_NAME || 'irisync-media';
      const bucket = storage.bucket(bucketName);
      if (fileData.startsWith('data:')) {
        const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) throw new Error('Invalid base64 format');
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        const fileUploadPath = `users/${userId}/media/${uniqueFilename}`;
        const file = bucket.file(fileUploadPath);
        await file.save(buffer, {
          metadata: {
            contentType: type,
            metadata: { originalFilename, userId, uploadedAt: new Date().toISOString() }
          }
        });
        await file.makePublic();
        uploadedFileUrl = `https://storage.googleapis.com/${bucketName}/${fileUploadPath}`;
        if (fileType === 'image') {
          const thumbnailPath = `users/${userId}/media/thumbnails/${uniqueFilename}`;
          const thumbnailFile = bucket.file(thumbnailPath);
          const sharp = require('sharp');
          const thumbnailBuffer = await sharp(buffer).resize({ width: 300, height: 300, fit: 'inside' }).toBuffer();
          await thumbnailFile.save(thumbnailBuffer, {
            metadata: { contentType: type, metadata: { originalFilename, userId, isThumbnail: true } }
          });
          await thumbnailFile.makePublic();
          thumbnailUrl = `https://storage.googleapis.com/${bucketName}/${thumbnailPath}`;
        } else if (fileType === 'video') {
          thumbnailUrl = `https://storage.googleapis.com/${bucketName}/defaults/video-thumbnail.png`;
        } else if (fileType === 'audio') {
          thumbnailUrl = `https://storage.googleapis.com/${bucketName}/defaults/audio-thumbnail.png`;
        } else {
          thumbnailUrl = `https://storage.googleapis.com/${bucketName}/defaults/document-thumbnail.png`;
        }
      } else if (fileData.startsWith('http')) {
        uploadedFileUrl = fileData;
        const gcsRegex = new RegExp(`https://storage.googleapis.com/${bucketName}/(.+)`);
        const match = uploadedFileUrl.match(gcsRegex);
        if (match && match[1]) {
          const filePath = match[1];
          const fileNameWithoutPath = filePath.split('/').pop();
          if (fileType === 'image') {
            thumbnailUrl = `https://storage.googleapis.com/${bucketName}/users/${userId}/media/thumbnails/${fileNameWithoutPath}`;
          } else if (fileType === 'video') {
            thumbnailUrl = `https://storage.googleapis.com/${bucketName}/defaults/video-thumbnail.png`;
          } else if (fileType === 'audio') {
            thumbnailUrl = `https://storage.googleapis.com/${bucketName}/defaults/audio-thumbnail.png`;
          } else {
            thumbnailUrl = `https://storage.googleapis.com/${bucketName}/defaults/document-thumbnail.png`;
          }
        } else {
          thumbnailUrl = uploadedFileUrl;
        }
      } else {
        throw new Error('Invalid file data format');
      }
    } catch (error) {
      logger.error({ type: 'storage', error }, 'Error uploading to Google Cloud Storage');
      return NextResponse.json(
        handleApiError(error, '/api/content/media', 'uploading to storage'),
        { status: 500 }
      );
    }
    const mediaData = {
      filename: uniqueFilename,
      originalFilename,
      url: uploadedFileUrl,
      thumbnailUrl: thumbnailUrl || uploadedFileUrl,
      type: fileType,
      mimeType: type,
      size,
      width: width || null,
      height: height || null,
      tags: tags || [],
      title: title || originalFilename,
      description: description || '',
      uploadedAt: new Date(),
      usageCount: 0,
      folderId: folderId || null,
    };
    const mediaRef = await firestore.collection('users').doc(userId).collection('media').add(mediaData);
    await firestore.collection('users').doc(userId).update({ storageUsed: storageUsed + size });
    if (tags && tags.length > 0) {
      const tagUpdates = tags.map(async (tag: string) => {
        const tagRef = firestore.collection('users').doc(userId).collection('mediaTags').doc(tag);
        return firestore.runTransaction(async (transaction: any) => {
          const tagDoc = await transaction.get(tagRef);
          if (!tagDoc.exists) {
            transaction.set(tagRef, { usageCount: 1, lastUsed: new Date() });
          } else {
            const currentCount = tagDoc.data().usageCount || 0;
            transaction.update(tagRef, { usageCount: currentCount + 1, lastUsed: new Date() });
          }
        });
      });
      await Promise.all(tagUpdates);
    }
    logger.info({ type: 'request', method: 'POST', url: req.url, statusCode: 201 }, 'Media POST success');
    logRequestDuration(req, 201, startTime);
    return NextResponse.json({ id: mediaRef.id, message: 'Media uploaded successfully', ...mediaData }, { status: 201 });
  } catch (error: any) {
    logger.error({ type: 'request', method: 'POST', url: req.url, error }, 'Media POST error');
    logRequestDuration(req, 500, startTime);
    return NextResponse.json(
      handleApiError(error, '/api/content/media', 'uploading media file'),
      { status: 500 }
    );
  }
}

async function getMediaStats(userId: string) {
  const totalSnapshot = await firestore.collection('users').doc(userId).collection('media').count().get();
  const total = totalSnapshot.data().count;
  const typeStats: Record<string, number> = {};
  const types = ['image', 'video', 'audio', 'document'];
  await Promise.all(types.map(async (type) => {
    const typeSnapshot = await firestore.collection('users').doc(userId).collection('media').where('type', '==', type).count().get();
    typeStats[type] = typeSnapshot.data().count;
  }));
  const userDoc = await firestore.collection('users').doc(userId).get();
  const userData = userDoc.data();
  const storageUsed = userData?.storageUsed || 0;
  const storageQuota = userData?.storageQuota || 1024 * 1024 * 100;
  return { total, typeStats, storageUsed, storageQuota };
}

function logRequestDuration(req: NextRequest, statusCode: number, startTime: [number, number]) {
  const duration = process.hrtime(startTime);
  const durationMs = Math.round((duration[0] * 1e9 + duration[1]) / 1e6);
  logger.info({ method: req.method, url: req.url, statusCode, durationMs }, `Request duration: ${durationMs}ms`);
} 