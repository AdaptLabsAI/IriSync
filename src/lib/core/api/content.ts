import type { MediaContent } from '../content/models/media';
import type { InboxMessage } from '../content/SocialInboxService';

export async function getMediaContent(folderId?: string): Promise<MediaContent[]> {
  const params = new URLSearchParams();
  if (folderId) params.append('folderId', folderId);
  const res = await fetch(`/api/content/media?${params.toString()}`);
  if (!res.ok) {
    throw new Error('Failed to fetch media content');
  }
  const data = await res.json();
  // Convert uploadedAt to Date
  return (data.media as any[]).map(item => ({
    ...item,
    uploadedAt: item.uploadedAt ? new Date(item.uploadedAt) : undefined,
  }));
}

export interface InboxFilters {
  platform?: string;
  messageType?: string;
  status?: string;
  isRead?: boolean;
  fromDate?: string;
  toDate?: string;
  search?: string;
  limit?: number;
  sentiment?: string;
  label?: string;
  assignedTo?: string;
}

export async function getInboxMessages(filters: InboxFilters = {}): Promise<InboxMessage[]> {
  const params = new URLSearchParams();
  if (filters.platform) params.append('platform', filters.platform);
  if (filters.messageType) params.append('messageType', filters.messageType);
  if (filters.status) params.append('status', filters.status);
  if (filters.isRead !== undefined) params.append('isRead', String(filters.isRead));
  if (filters.fromDate) params.append('fromDate', filters.fromDate);
  if (filters.toDate) params.append('toDate', filters.toDate);
  if (filters.search) params.append('search', filters.search);
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.sentiment) params.append('sentiment', filters.sentiment);
  if (filters.label) params.append('label', filters.label);
  if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);
  const res = await fetch(`/api/content/inbox?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch inbox messages');
  const data = await res.json();
  return (data.messages as any[]).map(item => ({
    ...item,
    receivedAt: item.receivedAt ? new Date(item.receivedAt) : undefined,
  }));
}

export async function fetchTeamMembers(): Promise<{ userId: string; name: string; email: string; role: string }[]> {
  const res = await fetch('/api/settings/team');
  if (!res.ok) throw new Error('Failed to fetch team members');
  const data = await res.json();
  return data.team?.members || [];
}

export async function fetchInboxLabels(): Promise<string[]> {
  // For now, fetch all messages and aggregate unique labels
  const messages = await getInboxMessages();
  const labelSet = new Set<string>();
  messages.forEach(msg => {
    if (msg.labels) msg.labels.forEach((label: any) => labelSet.add(label));
  });
  return Array.from(labelSet);
}

export async function bulkUpdateStatus(messageIds: string[], status: string): Promise<void> {
  await fetch('/api/content/inbox', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageIds, updates: { status } })
  });
}

export async function bulkAssign(messageIds: string[], assignedTo: string): Promise<void> {
  await fetch('/api/content/inbox', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageIds, updates: { assignedTo } })
  });
}

export async function bulkLabel(messageIds: string[], labels: string[]): Promise<void> {
  await fetch('/api/content/inbox', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageIds, updates: { labels } })
  });
}

export async function bulkDelete(messageIds: string[]): Promise<void> {
  await fetch('/api/content/inbox/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageIds })
  });
}

export async function getConversation(messageId: string): Promise<InboxMessage[]> {
  const res = await fetch(`/api/content/inbox/thread?parentId=${messageId}`);
  if (!res.ok) throw new Error('Failed to fetch conversation thread');
  return await res.json();
}

export async function replyToMessage(messageId: string, content: string): Promise<InboxMessage> {
  const res = await fetch(`/api/content/inbox/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageId, content })
  });
  if (!res.ok) throw new Error('Failed to send reply');
  return await res.json();
}

export async function assignMessage(messageId: string, assigneeId: string): Promise<InboxMessage> {
  const res = await fetch(`/api/content/inbox/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageId, assigneeId })
  });
  if (!res.ok) throw new Error('Failed to assign message');
  return await res.json();
}

export async function addNotes(messageId: string, notes: string): Promise<InboxMessage> {
  const res = await fetch(`/api/content/inbox/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageId, notes })
  });
  if (!res.ok) throw new Error('Failed to update notes');
  return await res.json();
}

export async function deleteMedia(mediaId: string): Promise<void> {
  await fetch(`/api/content/media/${mediaId}`, {
    method: 'DELETE',
  });
}

export async function getMediaDetails(mediaId: string): Promise<MediaContent> {
  const res = await fetch(`/api/content/media/${mediaId}`);
  if (!res.ok) throw new Error('Failed to fetch media details');
  return await res.json();
}

export async function updateMedia(mediaId: string, updates: Partial<MediaContent>): Promise<MediaContent> {
  const res = await fetch(`/api/content/media/${mediaId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update media');
  return await res.json();
}

export async function assignMedia(mediaId: string, assigneeId: string): Promise<MediaContent> {
  return updateMedia(mediaId, { assignedTo: assigneeId } as any);
}

export async function addMediaNotes(mediaId: string, notes: string): Promise<MediaContent> {
  return updateMedia(mediaId, { notes } as any);
}

export interface UploadMediaParams {
  fileData: string; // base64 data URL
  originalFilename: string;
  type: string;
  size: number;
  width?: number;
  height?: number;
  tags?: string[];
  title?: string;
  description?: string;
  folderId?: string | null;
}

export async function uploadMedia(params: UploadMediaParams): Promise<MediaContent> {
  const res = await fetch('/api/content/media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to upload media');
  }
  const data = await res.json();
  return {
    ...data,
    uploadedAt: data.uploadedAt ? new Date(data.uploadedAt) : undefined,
  };
}

// Folder API
import type { MediaFolder } from '../content/models/media';

export async function listMediaFolders(parentId?: string | null): Promise<MediaFolder[]> {
  const params = new URLSearchParams();
  if (parentId) params.append('parentId', parentId);
  const res = await fetch(`/api/content/media/folders?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch folders');
  const data = await res.json();
  return (data.folders as any[]).map(folder => ({
    ...folder,
    createdAt: folder.createdAt ? new Date(folder.createdAt) : undefined,
    updatedAt: folder.updatedAt ? new Date(folder.updatedAt) : undefined,
  }));
}

export async function createMediaFolder(name: string, parentId?: string | null): Promise<MediaFolder> {
  const res = await fetch('/api/content/media/folders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parentId }),
  });
  if (!res.ok) throw new Error('Failed to create folder');
  return await res.json();
}

export async function updateMediaFolder(id: string, updates: { name?: string; parentId?: string | null }): Promise<MediaFolder> {
  const res = await fetch('/api/content/media/folders', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updates }),
  });
  if (!res.ok) throw new Error('Failed to update folder');
  return await res.json();
}

export async function deleteMediaFolder(id: string): Promise<void> {
  const res = await fetch('/api/content/media/folders', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error('Failed to delete folder');
} 