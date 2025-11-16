// src/lib/validation/schemas.ts
import { z } from 'zod';

// User validation
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
});

// Post validation
export const CreatePostSchema = z.object({
  content: z.string().min(1, 'Content required').max(5000, 'Content too long'),
  scheduledAt: z.string().datetime().optional(),
  platforms: z.array(
    z.enum(['twitter', 'linkedin', 'facebook', 'instagram'])
  ).min(1, 'Select at least one platform'),
  mediaIds: z.array(z.string()).max(4, 'Maximum 4 media files'),
  campaignId: z.string().uuid().optional(),
});

export const UpdatePostSchema = CreatePostSchema.partial().extend({
  id: z.string(),
});

// Campaign validation
export const CreateCampaignSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  budget: z.number().positive().optional(),
  platforms: z.array(z.enum(['twitter', 'linkedin', 'facebook', 'instagram'])),
});

// Settings validation
export const UserSettingsSchema = z.object({
  displayName: z.string().min(2).max(50),
  email: z.string().email(),
  timezone: z.string(),
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
    sms: z.boolean().optional(),
  }),
});
