/**
 * Integration Tests: Scheduling API
 *
 * Tests for scheduled post management endpoints:
 * - POST /api/scheduling/posts
 * - GET /api/scheduling/posts
 * - GET /api/scheduling/posts/[id]
 * - PATCH /api/scheduling/posts/[id]
 * - DELETE /api/scheduling/posts/[id]
 */

import { POST as createPost, GET as listPosts } from '@/app/api/scheduling/posts/route';
import { GET as getPost, PATCH as updatePost, DELETE as deletePost } from '@/app/api/scheduling/posts/[id]/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { scheduledPostService } from '@/lib/features/scheduling/ScheduledPostService';
import { firestore } from '@/lib/core/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { PlatformType } from '@/lib/features/platforms/PlatformProvider';

// Mock dependencies
jest.mock('next-auth/next');
jest.mock('@/lib/features/scheduling/ScheduledPostService');
jest.mock('@/lib/core/firebase', () => ({
  firestore: {}
}));
jest.mock('firebase/firestore');
jest.mock('@/lib/core/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('Scheduling API Integration Tests', () => {
  const mockUserId = 'user_123';
  const mockOrgId = 'org_456';
  const mockPostId = 'post_789';

  const mockSession = {
    user: {
      id: mockUserId,
      email: 'test@example.com',
      name: 'Test User'
    }
  };

  const mockPostData = {
    post: {
      content: 'Test post content #testing',
      platformType: PlatformType.INSTAGRAM,
      hashtags: ['testing'],
      mentions: [],
      attachments: []
    },
    schedule: {
      publishAt: '2025-12-01T10:00:00Z',
      timezone: 'America/New_York',
      recurrence: null
    },
    tags: ['campaign1'],
    notes: 'Test notes'
  };

  const mockScheduledPost = {
    id: mockPostId,
    userId: mockUserId,
    organizationId: mockOrgId,
    post: mockPostData.post,
    schedule: {
      ...mockPostData.schedule,
      publishAt: new Date(mockPostData.schedule.publishAt)
    },
    status: 'scheduled',
    createdAt: new Date(),
    updatedAt: new Date(),
    scheduledFor: new Date(mockPostData.schedule.publishAt),
    attempts: 0,
    maxAttempts: 3,
    tags: mockPostData.tags,
    notes: mockPostData.notes
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/scheduling/posts', () => {
    it('should require authentication', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/scheduling/posts', {
        method: 'POST',
        body: JSON.stringify(mockPostData)
      });

      const response = await createPost(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should create scheduled post successfully', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({
          currentOrganizationId: mockOrgId
        })
      });
      (scheduledPostService.createScheduledPost as jest.Mock).mockResolvedValue(mockPostId);

      const request = new NextRequest('http://localhost:3000/api/scheduling/posts', {
        method: 'POST',
        body: JSON.stringify(mockPostData)
      });

      const response = await createPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.postId).toBe(mockPostId);
      expect(scheduledPostService.createScheduledPost).toHaveBeenCalledWith(
        mockUserId,
        mockOrgId,
        expect.objectContaining({
          content: mockPostData.post.content,
          platformType: mockPostData.post.platformType
        }),
        expect.objectContaining({
          publishAt: expect.any(Date),
          timezone: mockPostData.schedule.timezone
        }),
        expect.objectContaining({
          tags: mockPostData.tags,
          notes: mockPostData.notes
        })
      );
    });

    it('should validate required fields', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({ currentOrganizationId: mockOrgId })
      });

      const invalidData = {
        post: {
          content: 'Test'
          // Missing platformType
        },
        schedule: mockPostData.schedule
      };

      const request = new NextRequest('http://localhost:3000/api/scheduling/posts', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      });

      const response = await createPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid Request');
    });

    it('should validate schedule time is in future', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({ currentOrganizationId: mockOrgId })
      });

      const pastDate = new Date('2020-01-01T10:00:00Z');
      const invalidData = {
        ...mockPostData,
        schedule: {
          ...mockPostData.schedule,
          publishAt: pastDate.toISOString()
        }
      };

      const request = new NextRequest('http://localhost:3000/api/scheduling/posts', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      });

      const response = await createPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain('must be in the future');
    });

    it('should require organization', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({}) // No organization IDs
      });

      const request = new NextRequest('http://localhost:3000/api/scheduling/posts', {
        method: 'POST',
        body: JSON.stringify(mockPostData)
      });

      const response = await createPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain('Organization not found');
    });

    it('should handle service errors', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({ currentOrganizationId: mockOrgId })
      });
      (scheduledPostService.createScheduledPost as jest.Mock).mockRejectedValue(
        new Error('Service error')
      );

      const request = new NextRequest('http://localhost:3000/api/scheduling/posts', {
        method: 'POST',
        body: JSON.stringify(mockPostData)
      });

      const response = await createPost(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Server Error');
    });
  });

  describe('GET /api/scheduling/posts', () => {
    it('should require authentication', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/scheduling/posts');

      const response = await listPosts(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should list user scheduled posts', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (scheduledPostService.getUserScheduledPosts as jest.Mock).mockResolvedValue([
        mockScheduledPost
      ]);

      const request = new NextRequest('http://localhost:3000/api/scheduling/posts');

      const response = await listPosts(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.posts).toHaveLength(1);
      expect(data.posts[0].id).toBe(mockPostId);
    });

    it('should filter by status', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (scheduledPostService.getUserScheduledPosts as jest.Mock).mockResolvedValue([
        { ...mockScheduledPost, status: 'published' }
      ]);

      const request = new NextRequest('http://localhost:3000/api/scheduling/posts?status=published');

      const response = await listPosts(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(scheduledPostService.getUserScheduledPosts).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          status: 'published'
        })
      );
    });

    it('should respect limit parameter', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (scheduledPostService.getUserScheduledPosts as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/scheduling/posts?limit=10');

      const response = await listPosts(request);

      expect(scheduledPostService.getUserScheduledPosts).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          limit: 10
        })
      );
    });

    it('should handle includePublished parameter', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (scheduledPostService.getUserScheduledPosts as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/scheduling/posts?includePublished=true');

      const response = await listPosts(request);

      expect(scheduledPostService.getUserScheduledPosts).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          includePublished: true
        })
      );
    });
  });

  describe('GET /api/scheduling/posts/[id]', () => {
    it('should require authentication', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/scheduling/posts/${mockPostId}`);

      const response = await getPost(request, { params: { id: mockPostId } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should get scheduled post by id', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (scheduledPostService.getScheduledPost as jest.Mock).mockResolvedValue(mockScheduledPost);

      const request = new NextRequest(`http://localhost:3000/api/scheduling/posts/${mockPostId}`);

      const response = await getPost(request, { params: { id: mockPostId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.post.id).toBe(mockPostId);
    });

    it('should return 404 for non-existent post', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (scheduledPostService.getScheduledPost as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/scheduling/posts/nonexistent');

      const response = await getPost(request, { params: { id: 'nonexistent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Not Found');
    });

    it('should verify post ownership', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (scheduledPostService.getScheduledPost as jest.Mock).mockResolvedValue({
        ...mockScheduledPost,
        userId: 'different_user'
      });

      const request = new NextRequest(`http://localhost:3000/api/scheduling/posts/${mockPostId}`);

      const response = await getPost(request, { params: { id: mockPostId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });
  });

  describe('PATCH /api/scheduling/posts/[id]', () => {
    it('should require authentication', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/scheduling/posts/${mockPostId}`, {
        method: 'PATCH',
        body: JSON.stringify({ notes: 'Updated' })
      });

      const response = await updatePost(request, { params: { id: mockPostId } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should update scheduled post', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (scheduledPostService.getScheduledPost as jest.Mock).mockResolvedValue(mockScheduledPost);
      (scheduledPostService.updateScheduledPost as jest.Mock).mockResolvedValue(undefined);

      const updateData = {
        notes: 'Updated notes',
        tags: ['campaign2']
      };

      const request = new NextRequest(`http://localhost:3000/api/scheduling/posts/${mockPostId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });

      const response = await updatePost(request, { params: { id: mockPostId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(scheduledPostService.updateScheduledPost).toHaveBeenCalledWith(
        mockPostId,
        expect.objectContaining({
          notes: 'Updated notes',
          tags: ['campaign2']
        })
      );
    });

    it('should verify post ownership before update', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (scheduledPostService.getScheduledPost as jest.Mock).mockResolvedValue({
        ...mockScheduledPost,
        userId: 'different_user'
      });

      const request = new NextRequest(`http://localhost:3000/api/scheduling/posts/${mockPostId}`, {
        method: 'PATCH',
        body: JSON.stringify({ notes: 'Updated' })
      });

      const response = await updatePost(request, { params: { id: mockPostId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should prevent updating published posts', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (scheduledPostService.getScheduledPost as jest.Mock).mockResolvedValue({
        ...mockScheduledPost,
        status: 'published'
      });

      const request = new NextRequest(`http://localhost:3000/api/scheduling/posts/${mockPostId}`, {
        method: 'PATCH',
        body: JSON.stringify({ notes: 'Updated' })
      });

      const response = await updatePost(request, { params: { id: mockPostId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain('Cannot update published posts');
    });

    it('should validate schedule time when updating', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (scheduledPostService.getScheduledPost as jest.Mock).mockResolvedValue(mockScheduledPost);

      const pastDate = new Date('2020-01-01T10:00:00Z');
      const updateData = {
        schedule: {
          publishAt: pastDate.toISOString(),
          timezone: 'America/New_York'
        }
      };

      const request = new NextRequest(`http://localhost:3000/api/scheduling/posts/${mockPostId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });

      const response = await updatePost(request, { params: { id: mockPostId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain('must be in the future');
    });
  });

  describe('DELETE /api/scheduling/posts/[id]', () => {
    it('should require authentication', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/scheduling/posts/${mockPostId}`, {
        method: 'DELETE'
      });

      const response = await deletePost(request, { params: { id: mockPostId } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should delete scheduled post', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (scheduledPostService.getScheduledPost as jest.Mock).mockResolvedValue(mockScheduledPost);
      (scheduledPostService.deleteScheduledPost as jest.Mock).mockResolvedValue(undefined);

      const request = new NextRequest(`http://localhost:3000/api/scheduling/posts/${mockPostId}`, {
        method: 'DELETE'
      });

      const response = await deletePost(request, { params: { id: mockPostId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(scheduledPostService.deleteScheduledPost).toHaveBeenCalledWith(mockPostId);
    });

    it('should verify post ownership before deletion', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (scheduledPostService.getScheduledPost as jest.Mock).mockResolvedValue({
        ...mockScheduledPost,
        userId: 'different_user'
      });

      const request = new NextRequest(`http://localhost:3000/api/scheduling/posts/${mockPostId}`, {
        method: 'DELETE'
      });

      const response = await deletePost(request, { params: { id: mockPostId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should prevent deleting published posts', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (scheduledPostService.getScheduledPost as jest.Mock).mockResolvedValue({
        ...mockScheduledPost,
        status: 'published'
      });

      const request = new NextRequest(`http://localhost:3000/api/scheduling/posts/${mockPostId}`, {
        method: 'DELETE'
      });

      const response = await deletePost(request, { params: { id: mockPostId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain('Cannot delete published posts');
    });

    it('should return 404 for non-existent post', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (scheduledPostService.getScheduledPost as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/scheduling/posts/nonexistent', {
        method: 'DELETE'
      });

      const response = await deletePost(request, { params: { id: 'nonexistent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Not Found');
    });
  });
});
