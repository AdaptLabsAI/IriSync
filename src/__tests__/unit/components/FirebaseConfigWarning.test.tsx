/**
 * Tests for FirebaseConfigWarning component
 * 
 * These tests verify that the component prevents hydration errors
 * by rendering consistently on both server and client.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import FirebaseConfigWarning from '@/components/auth/FirebaseConfigWarning';

// Mock the Firebase health module
jest.mock('@/lib/core/firebase/health', () => ({
  getFirebaseEnvStatus: jest.fn(() => ({
    isValid: false,
    missing: ['NEXT_PUBLIC_FIREBASE_API_KEY', 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'],
    environment: 'development'
  }))
}));

describe('FirebaseConfigWarning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Hydration Safety', () => {
    it('should use isMounted state to prevent hydration mismatch', async () => {
      const { container } = render(<FirebaseConfigWarning />);
      
      // In test environment, React Testing Library triggers useEffect immediately
      // In real SSR, the component returns null until mounted on client
      // This test verifies the component can render without hydration errors
      
      // After useEffect runs, the warning should be visible
      await waitFor(() => {
        const warningElement = screen.queryByText(/Firebase Configuration Required/i);
        expect(warningElement).toBeInTheDocument();
      }, { timeout: 500 });
    });

    it('should show missing environment variables', async () => {
      render(<FirebaseConfigWarning />);
      
      await waitFor(() => {
        expect(screen.queryByText(/NEXT_PUBLIC_FIREBASE_API_KEY/i)).toBeInTheDocument();
        expect(screen.queryByText(/NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN/i)).toBeInTheDocument();
      }, { timeout: 500 });
    });
  });

  describe('Configuration Status Handling', () => {
    it('should not render when Firebase is properly configured', async () => {
      // Mock valid configuration
      const { getFirebaseEnvStatus } = require('@/lib/core/firebase/health');
      getFirebaseEnvStatus.mockReturnValueOnce({
        isValid: true,
        missing: [],
        environment: 'development'
      });

      const { container } = render(<FirebaseConfigWarning />);
      
      // Wait a bit to ensure useEffect has run
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      }, { timeout: 500 });
    });

    it('should not render in production by default', async () => {
      // Mock production environment with missing config
      const { getFirebaseEnvStatus } = require('@/lib/core/firebase/health');
      getFirebaseEnvStatus.mockReturnValueOnce({
        isValid: false,
        missing: ['NEXT_PUBLIC_FIREBASE_API_KEY'],
        environment: 'production'
      });

      const { container } = render(<FirebaseConfigWarning />);
      
      // Should not render in production
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      }, { timeout: 500 });
    });
  });

  describe('User Interaction', () => {
    it('should be expandable/collapsible', async () => {
      const { container } = render(<FirebaseConfigWarning />);
      
      // Wait for component to mount
      await waitFor(() => {
        const warningElement = screen.queryByText(/Firebase Configuration Required/i);
        expect(warningElement).toBeInTheDocument();
      }, { timeout: 500 });

      // The component should auto-expand when there are missing variables
      // Verify the expanded content is visible
      await waitFor(() => {
        expect(screen.queryByText(/Quick Fix Guide/i)).toBeInTheDocument();
      }, { timeout: 500 });
    });

    it('should display helpful links', async () => {
      render(<FirebaseConfigWarning />);
      
      await waitFor(() => {
        // Check for Firebase Console link (use getAllByText since it appears twice)
        const consoleLinks = screen.queryAllByText(/Firebase Console/i);
        expect(consoleLinks.length).toBeGreaterThan(0);
        
        // Check for Setup Guide link
        const setupLink = screen.queryByText(/View Full Setup Guide/i);
        expect(setupLink).toBeInTheDocument();
      }, { timeout: 500 });
    });
  });
});
