export interface MediaContent {
  id: string;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  title?: string;
  description?: string;
  type: string;
  size: number;
  width?: number;
  height?: number;
  tags?: string[];
  notes?: string;
  uploadedAt?: string;
  folderId?: string | null;
}

export interface MediaFolder {
  id: string;
  name: string;
  parentId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Inbox Message Types
export interface InboxMessage {
  id: string;
  platformId: string;
  content: string;
  status?: 'unread' | 'read' | 'archived' | 'flagged' | 'replied';
  receivedAt?: string;
  repliedAt?: string;
  assignedTo?: string;
  labels?: string[];
  notes?: string;
  sender: {
    id: string;
    name: string;
  };
  sentiment?: 'positive' | 'neutral' | 'negative';
  sentAt?: string;
}
