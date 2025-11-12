import { Timestamp } from 'firebase/firestore';

/**
 * Enum for media types
 */
export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  GIF = 'gif'
}

/**
 * Interface for image metadata
 */
export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  hasAlpha?: boolean;
  colorSpace?: string;
  hasFaces?: boolean;
  faceCount?: number;
  dominant_colors?: string[];
  tags?: string[];
  alt_text?: string;
  is_ai_generated?: boolean;
}

/**
 * Interface for video metadata
 */
export interface VideoMetadata {
  width: number;
  height: number;
  format: string;
  duration: number;
  fps: number;
  hasAudio: boolean;
  audioCodec?: string;
  videoCodec?: string;
  bitrate?: number;
  hasCaptions?: boolean;
  thumbnailUrl?: string;
  preview_gif_url?: string;
  is_ai_generated?: boolean;
}

/**
 * Interface for audio metadata
 */
export interface AudioMetadata {
  duration: number;
  format: string;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  codec?: string;
  waveform_url?: string;
  transcript?: string;
  is_ai_generated?: boolean;
}

/**
 * Union type for all media metadata
 */
export type MediaMetadata = ImageMetadata | VideoMetadata | AudioMetadata | Record<string, any>;

/**
 * Interface for media object
 */
export interface Media {
  id: string;
  userId: string;
  organizationId?: string;
  type: MediaType;
  title?: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  filesize: number;
  contentType: string;
  tags: string[];
  metadata: MediaMetadata;
  aiGenerated: boolean;
  aiPrompt?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for media in Firestore
 */
export interface FirestoreMedia {
  userId: string;
  organizationId?: string;
  type: MediaType;
  title?: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  filesize: number;
  contentType: string;
  tags: string[];
  metadata: MediaMetadata;
  aiGenerated: boolean;
  aiPrompt?: string;
  isPublic: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Convert Firestore media data to media
 * @param id Media ID
 * @param data Firestore media data
 * @returns Media
 */
export function firestoreToMedia(id: string, data: FirestoreMedia): Media {
  return {
    id,
    userId: data.userId,
    organizationId: data.organizationId,
    type: data.type,
    title: data.title,
    description: data.description,
    url: data.url,
    thumbnailUrl: data.thumbnailUrl,
    filename: data.filename,
    filesize: data.filesize,
    contentType: data.contentType,
    tags: data.tags,
    metadata: data.metadata,
    aiGenerated: data.aiGenerated,
    aiPrompt: data.aiPrompt,
    isPublic: data.isPublic,
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate()
  };
}

/**
 * Convert media to Firestore data
 * @param media Media
 * @returns Firestore media data
 */
export function mediaToFirestore(media: Media): FirestoreMedia {
  return {
    userId: media.userId,
    organizationId: media.organizationId,
    type: media.type,
    title: media.title,
    description: media.description,
    url: media.url,
    thumbnailUrl: media.thumbnailUrl,
    filename: media.filename,
    filesize: media.filesize,
    contentType: media.contentType,
    tags: media.tags,
    metadata: media.metadata,
    aiGenerated: media.aiGenerated,
    aiPrompt: media.aiPrompt,
    isPublic: media.isPublic,
    createdAt: Timestamp.fromDate(media.createdAt),
    updatedAt: Timestamp.fromDate(media.updatedAt)
  };
} 