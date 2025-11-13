import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import sharp from 'sharp';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { firestore } from '../core/firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import axios from 'axios';
import { createReadStream, createWriteStream } from 'fs';
import { unlink } from 'fs/promises';
import os from 'os';

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document'
}

export enum MediaSize {
  THUMBNAIL = 'thumbnail',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  ORIGINAL = 'original'
}

export interface MediaMetadata {
  id: string;
  userId: string;
  organizationId?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  mediaType: MediaType;
  width?: number;
  height?: number;
  duration?: number;
  url: string;
  cdnUrl?: string;
  thumbnailUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  variants?: Record<string, string>; // Size variants (e.g., thumbnail, small, medium, large)
  metadata?: Record<string, any>; // Platform-specific or additional metadata
  references: string[]; // IDs of posts or content referencing this media
}

export interface MediaUploadOptions {
  userId: string;
  organizationId?: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  metadata?: Record<string, any>;
}

export interface TransformOptions {
  width?: number;
  height?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  quality?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: string | number;
  background?: string;
}

/**
 * MediaService handles all media operations including uploads,
 * transformations, and storage management.
 */
export class MediaService {
  private readonly ffmpegPath = ffmpegInstaller.path;
  private readonly ffprobePath = ffprobeInstaller.path;
  private readonly execFileAsync = promisify(execFile);
  private storage: Storage;
  private bucketName: string;
  private cdnUrl?: string;
  
  constructor() {
    this.storage = new Storage({
      projectId: process.env.GOOGLE_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });
    
    this.bucketName = process.env.STORAGE_BUCKET_NAME || 'irisai-media';
    this.cdnUrl = process.env.CDN_URL;
  }
  
  /**
   * Upload media to cloud storage and store metadata in Firestore
   */
  async uploadMedia(options: MediaUploadOptions): Promise<MediaMetadata> {
    const { userId, organizationId, fileName, mimeType, buffer, metadata } = options;
    
    // Generate unique ID for media
    const mediaId = uuidv4();
    
    // Determine media type from MIME type
    const mediaType = this.getMediaTypeFromMimeType(mimeType);
    
    // Create destination path
    const folder = organizationId ? `org/${organizationId}` : `user/${userId}`;
    const extension = path.extname(fileName) || this.getDefaultExtension(mimeType);
    const destFileName = `${mediaId}${extension}`;
    const destPath = `${folder}/${mediaType}/${destFileName}`;
    
    // Upload to cloud storage
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(destPath);
    
    await file.save(buffer, {
      metadata: {
        contentType: mimeType
      }
    });
    
    // Make the file publicly accessible
    await file.makePublic();
    
    // Get file URL
    const url = `https://storage.googleapis.com/${this.bucketName}/${destPath}`;
    const cdnUrl = this.cdnUrl ? `${this.cdnUrl}/${destPath}` : undefined;
    
    // Process media-specific properties (dimensions, duration, etc.)
    let dimensions: { width?: number; height?: number } = {};
    let duration: number | undefined;
    let thumbnailUrl: string | undefined;
    let variants: Record<string, string> = {};
    
    if (mediaType === MediaType.IMAGE) {
      // Get image dimensions
      try {
        const imageInfo = await sharp(buffer).metadata();
        dimensions = {
          width: imageInfo.width,
          height: imageInfo.height
        };
        
        // Generate thumbnails and variants
        variants = await this.createImageVariants(buffer, folder, mediaId, extension);
        thumbnailUrl = variants[MediaSize.THUMBNAIL];
      } catch (error) {
        console.error('Error processing image:', error);
      }
    } else if (mediaType === MediaType.VIDEO) {
      // For video, we'd use ffmpeg to get metadata and create thumbnails
      // This is a simplified version
      const tempFilePath = path.join(os.tmpdir(), `${mediaId}${extension}`);
      const tempThumbPath = path.join(os.tmpdir(), `${mediaId}_thumb.jpg`);
      
      try {
        // Write buffer to temp file
        await new Promise<void>((resolve, reject) => {
          const writeStream = createWriteStream(tempFilePath);
          writeStream.write(buffer);
          writeStream.end();
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
        });
        
        // Get video metadata
        const videoInfo = await this.getVideoMetadata(tempFilePath);
        dimensions = {
          width: videoInfo.width,
          height: videoInfo.height
        };
        duration = videoInfo.duration;
        
        // Generate thumbnail
        await this.generateVideoThumbnail(tempFilePath, tempThumbPath);
        
        // Upload thumbnail
        const thumbDestPath = `${folder}/${mediaType}/${mediaId}_thumb.jpg`;
        const thumbFile = bucket.file(thumbDestPath);
        await thumbFile.save(createReadStream(tempThumbPath), {
          metadata: {
            contentType: 'image/jpeg'
          }
        });
        await thumbFile.makePublic();
        
        thumbnailUrl = `https://storage.googleapis.com/${this.bucketName}/${thumbDestPath}`;
        variants[MediaSize.THUMBNAIL] = thumbnailUrl;
        
        // Clean up temp files
        await unlink(tempFilePath);
        await unlink(tempThumbPath);
      } catch (error) {
        console.error('Error processing video:', error);
        // Clean up temp files if they exist
        try {
          await unlink(tempFilePath);
          await unlink(tempThumbPath);
        } catch {
          // Ignore cleanup errors
        }
      }
    }
    
    // Create metadata object
    const mediaMetadata: MediaMetadata = {
      id: mediaId,
      userId,
      organizationId,
      fileName,
      fileSize: buffer.length,
      mimeType,
      mediaType,
      width: dimensions.width,
      height: dimensions.height,
      duration,
      url,
      cdnUrl,
      thumbnailUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
      variants,
      metadata: metadata || {},
      references: []
    };
    
    // Store metadata in Firestore
    await setDoc(doc(firestore, 'media', mediaId), mediaMetadata);
    
    return mediaMetadata;
  }
  
  /**
   * Upload media from URL
   */
  async uploadMediaFromUrl(url: string, options: Omit<MediaUploadOptions, 'buffer'>): Promise<MediaMetadata> {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);
      
      return this.uploadMedia({
        ...options,
        buffer
      });
    } catch (error) {
      console.error('Error downloading media from URL:', error);
      throw new Error('Failed to download media from URL');
    }
  }
  
  /**
   * Get media metadata by ID
   */
  async getMediaById(mediaId: string): Promise<MediaMetadata | null> {
    try {
      const docSnapshot = await getDoc(doc(firestore, 'media', mediaId));
      
      if (!docSnapshot.exists()) {
        return null;
      }
      
      return docSnapshot.data() as MediaMetadata;
    } catch (error) {
      console.error('Error getting media:', error);
      throw error;
    }
  }
  
  /**
   * Delete media and all its variants
   */
  async deleteMedia(mediaId: string): Promise<boolean> {
    try {
      // Get media metadata first
      const media = await this.getMediaById(mediaId);
      
      if (!media) {
        return false;
      }
      
      // Delete from cloud storage
      const bucket = this.storage.bucket(this.bucketName);
      
      // Delete main file
      const mainFilePath = this.extractPathFromUrl(media.url);
      if (mainFilePath) {
        try {
          await bucket.file(mainFilePath).delete();
        } catch (error) {
          console.error('Error deleting main file:', error);
        }
      }
      
      // Delete variants
      if (media.variants) {
        for (const variantUrl of Object.values(media.variants)) {
          const variantPath = this.extractPathFromUrl(variantUrl);
          if (variantPath) {
            try {
              await bucket.file(variantPath).delete();
            } catch (error) {
              console.error('Error deleting variant:', error);
            }
          }
        }
      }
      
      // Delete thumbnail if exists
      if (media.thumbnailUrl) {
        const thumbPath = this.extractPathFromUrl(media.thumbnailUrl);
        if (thumbPath) {
          try {
            await bucket.file(thumbPath).delete();
          } catch (error) {
            console.error('Error deleting thumbnail:', error);
          }
        }
      }
      
      // Delete metadata from Firestore
      await deleteDoc(doc(firestore, 'media', mediaId));
      
      return true;
    } catch (error) {
      console.error('Error deleting media:', error);
      throw error;
    }
  }
  
  /**
   * Add a reference to media (e.g., when used in a post)
   */
  async addReference(mediaId: string, referenceId: string): Promise<void> {
    try {
      await updateDoc(doc(firestore, 'media', mediaId), {
        references: arrayUnion(referenceId)
      });
    } catch (error) {
      console.error('Error adding reference:', error);
      throw error;
    }
  }
  
  /**
   * Remove a reference from media
   */
  async removeReference(mediaId: string, referenceId: string): Promise<void> {
    try {
      await updateDoc(doc(firestore, 'media', mediaId), {
        references: arrayRemove(referenceId)
      });
    } catch (error) {
      console.error('Error removing reference:', error);
      throw error;
    }
  }
  
  /**
   * Transform image with custom options
   */
  async transformImage(mediaId: string, options: TransformOptions): Promise<string> {
    try {
      const media = await this.getMediaById(mediaId);
      
      if (!media || media.mediaType !== MediaType.IMAGE) {
        throw new Error('Media not found or not an image');
      }
      
      // Generate a unique ID for the transformed image
      const transformId = uuidv4().slice(0, 8);
      
      // Download the original image
      const response = await axios.get(media.url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);
      
      // Apply transformations
      let transform = sharp(buffer);
      
      // Apply resize if dimensions provided
      if (options.width || options.height) {
        transform = transform.resize({
          width: options.width,
          height: options.height,
          fit: options.fit || 'cover',
          position: options.position || 'centre',
          background: options.background ? { r: 255, g: 255, b: 255, alpha: 1 } : undefined
        });
      }
      
      // Apply format conversion if specified
      if (options.format) {
        transform = transform.toFormat(options.format, {
          quality: options.quality || 80
        });
      }
      
      // Get the transformed buffer
      const transformedBuffer = await transform.toBuffer();
      
      // Determine file extension based on format
      const extension = options.format ? `.${options.format}` : path.extname(media.fileName);
      
      // Create destination path for transformed image
      const folder = media.organizationId ? `org/${media.organizationId}` : `user/${media.userId}`;
      const destFileName = `${media.id}_${transformId}${extension}`;
      const destPath = `${folder}/${MediaType.IMAGE}/transforms/${destFileName}`;
      
      // Upload transformed image
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(destPath);
      
      await file.save(transformedBuffer, {
        metadata: {
          contentType: options.format ? `image/${options.format}` : media.mimeType
        }
      });
      
      // Make the file publicly accessible
      await file.makePublic();
      
      // Get file URL
      const url = `https://storage.googleapis.com/${this.bucketName}/${destPath}`;
      
      // Update metadata to include this transform
      await updateDoc(doc(firestore, 'media', mediaId), {
        [`transforms.${transformId}`]: {
          url,
          options,
          createdAt: new Date()
        }
      });
      
      return url;
    } catch (error) {
      console.error('Error transforming image:', error);
      throw new Error('Failed to transform image');
    }
  }
  
  /**
   * Get media type from MIME type
   */
  private getMediaTypeFromMimeType(mimeType: string): MediaType {
    if (mimeType.startsWith('image/')) {
      return MediaType.IMAGE;
    } else if (mimeType.startsWith('video/')) {
      return MediaType.VIDEO;
    } else if (mimeType.startsWith('audio/')) {
      return MediaType.AUDIO;
    } else {
      return MediaType.DOCUMENT;
    }
  }
  
  /**
   * Get default file extension from MIME type
   */
  private getDefaultExtension(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'video/mp4': '.mp4',
      'video/quicktime': '.mov',
      'video/x-msvideo': '.avi',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'application/pdf': '.pdf'
    };
    
    return mimeToExt[mimeType] || '';
  }
  
  /**
   * Create image variants (thumbnail, small, medium, large)
   */
  private async createImageVariants(
    buffer: Buffer,
    folder: string,
    mediaId: string,
    extension: string
  ): Promise<Record<string, string>> {
    const variants: Record<string, string> = {};
    const bucket = this.storage.bucket(this.bucketName);
    
    // Define variant sizes
    const sizes = {
      [MediaSize.THUMBNAIL]: { width: 150, height: 150 },
      [MediaSize.SMALL]: { width: 400, height: 400 },
      [MediaSize.MEDIUM]: { width: 800, height: 800 },
      [MediaSize.LARGE]: { width: 1200, height: 1200 }
    };
    
    // Create each variant
    for (const [size, dimensions] of Object.entries(sizes)) {
      try {
        // Resize image
        const resizedBuffer = await sharp(buffer)
          .resize({
            width: dimensions.width,
            height: dimensions.height,
            fit: 'inside'
          })
          .toBuffer();
        
        // Create destination path
        const destFileName = `${mediaId}_${size}${extension}`;
        const destPath = `${folder}/${MediaType.IMAGE}/${destFileName}`;
        
        // Upload resized image
        const file = bucket.file(destPath);
        
        // Get the image format for content type
        const imageInfo = await sharp(buffer).metadata();
        const contentType = imageInfo.format ? `image/${imageInfo.format}` : 'image/jpeg';
        
        await file.save(resizedBuffer, {
          metadata: {
            contentType: contentType
          }
        });
        
        // Make the file publicly accessible
        await file.makePublic();
        
        // Store URL
        variants[size] = `https://storage.googleapis.com/${this.bucketName}/${destPath}`;
      } catch (error) {
        console.error(`Error creating ${size} variant:`, error);
      }
    }
    
    return variants;
  }
  
  /**
   * Get video metadata using ffmpeg
   */
  private async getVideoMetadata(filePath: string): Promise<{ width: number; height: number; duration: number }> {
    try {
      const { stdout } = await this.execFileAsync(this.ffprobePath, [
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-show_entries',
        'stream=width,height:format=duration',
        '-of',
        'json',
        filePath
      ]);

      const parsed = JSON.parse(stdout || '{}');
      const stream = Array.isArray(parsed.streams) ? parsed.streams.find((entry: any) => entry.codec_type === 'video') : undefined;
      const width = stream?.width ? Number(stream.width) : 0;
      const height = stream?.height ? Number(stream.height) : 0;
      const duration = parsed.format?.duration ? Number(parsed.format.duration) : 0;

      if (!stream) {
        throw new Error('No video stream found');
      }

      return { width, height, duration };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Generate video thumbnail using ffmpeg
   */
  private async generateVideoThumbnail(videoPath: string, outputPath: string): Promise<void> {
    await this.execFileAsync(this.ffmpegPath, [
      '-y',
      '-i',
      videoPath,
      '-ss',
      '00:00:01.000',
      '-vframes',
      '1',
      outputPath
    ]);
  }
  
  /**
   * Extract path from URL
   */
  private extractPathFromUrl(url: string): string | null {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.replace(`/${this.bucketName}/`, '');
    return pathname.length > 0 ? pathname : null;
  }
}

// Create and export singleton instance
const mediaService = new MediaService();
export default mediaService; 