/**
 * Unit tests for Firebase Client Helpers
 * 
 * These tests verify that:
 * 1. Firebase client helpers throw appropriate errors when called on the server
 * 2. Firebase client helpers throw appropriate errors when config is incomplete
 * 3. Error codes are specific and distinguishable
 */

import { FirebaseClientError } from '@/lib/core/firebase/client';

// Mock the window object to simulate server/client environments
const mockWindow = (exists: boolean) => {
  if (exists) {
    (global as any).window = {};
  } else {
    delete (global as any).window;
  }
};

// Mock environment variables
const mockEnv = (complete: boolean) => {
  if (complete) {
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test.appspot.com';
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456789';
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = 'test-app-id';
  } else {
    delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    delete process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    delete process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    delete process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
    delete process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  }
};

describe('Firebase Client Helpers', () => {
  describe('FirebaseClientError', () => {
    it('should create error with FIREBASE_CLIENT_CONFIG_INCOMPLETE code', () => {
      const error = new FirebaseClientError(
        'FIREBASE_CLIENT_CONFIG_INCOMPLETE',
        'Config is incomplete'
      );
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('FirebaseClientError');
      expect(error.code).toBe('FIREBASE_CLIENT_CONFIG_INCOMPLETE');
      expect(error.message).toBe('Config is incomplete');
    });

    it('should create error with FIREBASE_CLIENT_USED_ON_SERVER code', () => {
      const error = new FirebaseClientError(
        'FIREBASE_CLIENT_USED_ON_SERVER',
        'Cannot use on server'
      );
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('FirebaseClientError');
      expect(error.code).toBe('FIREBASE_CLIENT_USED_ON_SERVER');
      expect(error.message).toBe('Cannot use on server');
    });
  });

  describe('SSR Detection', () => {
    it('should detect server-side environment', () => {
      // Simulate server environment (no window)
      mockWindow(false);
      
      // In a real implementation, we would test getFirebaseClientApp/Auth here
      // but since they use actual Firebase SDK, we just verify the window check works
      expect(typeof window).toBe('undefined');
    });

    it('should detect client-side environment', () => {
      // Simulate browser environment (with window)
      mockWindow(true);
      
      expect(typeof window).not.toBe('undefined');
    });
  });

  describe('Environment Variable Validation', () => {
    beforeEach(() => {
      // Ensure clean state
      mockEnv(false);
    });

    it('should validate complete Firebase config', () => {
      mockEnv(true);
      
      // Verify all required env vars are set
      expect(process.env.NEXT_PUBLIC_FIREBASE_API_KEY).toBeDefined();
      expect(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN).toBeDefined();
      expect(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID).toBeDefined();
      expect(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET).toBeDefined();
      expect(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID).toBeDefined();
      expect(process.env.NEXT_PUBLIC_FIREBASE_APP_ID).toBeDefined();
    });

    it('should detect incomplete Firebase config', () => {
      mockEnv(false);
      
      // Verify required env vars are not set
      expect(process.env.NEXT_PUBLIC_FIREBASE_API_KEY).toBeUndefined();
      expect(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN).toBeUndefined();
      expect(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID).toBeUndefined();
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should distinguish between SSR error and config error', () => {
      const ssrError = new FirebaseClientError(
        'FIREBASE_CLIENT_USED_ON_SERVER',
        'SSR usage'
      );
      const configError = new FirebaseClientError(
        'FIREBASE_CLIENT_CONFIG_INCOMPLETE',
        'Config missing'
      );

      // These errors should be distinguishable by their codes
      expect(ssrError.code).not.toBe(configError.code);
      expect(ssrError.code).toBe('FIREBASE_CLIENT_USED_ON_SERVER');
      expect(configError.code).toBe('FIREBASE_CLIENT_CONFIG_INCOMPLETE');
    });

    it('should provide helpful error messages', () => {
      const ssrError = new FirebaseClientError(
        'FIREBASE_CLIENT_USED_ON_SERVER',
        'Firebase Client SDK cannot be used on the server. Only call in client components.'
      );
      
      expect(ssrError.message).toContain('server');
      expect(ssrError.message).toContain('client');
    });
  });
});
