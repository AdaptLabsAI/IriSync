'use client';

import { useState, useEffect } from 'react';
import { getFirebaseEnvStatus } from '@/lib/core/firebase/health';

/**
 * Firebase Configuration Warning Component
 * 
 * Displays a detailed warning when Firebase environment variables are missing
 * Only shows in development or when explicitly enabled
 * Helps developers quickly identify configuration issues
 * 
 * IMPORTANT: This component uses client-side mounting to prevent hydration errors.
 * It will not render anything until the component mounts on the client.
 */
export default function FirebaseConfigWarning() {
  const [configStatus, setConfigStatus] = useState<{
    isValid: boolean;
    missing: string[];
    environment: string;
  } | null>(null);
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [showInProduction, setShowInProduction] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Mark as mounted to prevent hydration mismatch
    setIsMounted(true);

    // Only run on client side
    if (typeof window === 'undefined') return;

    const status = getFirebaseEnvStatus();
    setConfigStatus(status);

    // Auto-expand if there are missing variables
    if (!status.isValid) {
      setIsExpanded(true);
    }
  }, []);

  // Don't render anything until mounted on client to prevent hydration mismatch
  if (!isMounted) {
    return null;
  }

  // Don't show in production unless explicitly enabled
  if (!configStatus || (configStatus.environment === 'production' && !showInProduction)) {
    return null;
  }

  // Don't show if config is valid
  if (configStatus.isValid) {
    return null;
  }

  return (
    <div className="mb-6 border-2 border-red-300 bg-red-50 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-red-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-semibold text-red-800">Firebase Configuration Required</p>
            <p className="text-sm text-red-700">
              {configStatus.missing.length} environment variable{configStatus.missing.length !== 1 ? 's' : ''} missing
            </p>
          </div>
        </div>
        <svg 
          className={`w-5 h-5 text-red-600 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          <div className="p-3 bg-white rounded border border-red-200">
            <p className="text-sm text-gray-700 mb-2">
              Authentication is not working because Firebase environment variables are not configured.
            </p>
            <p className="text-sm font-medium text-red-700">
              Missing variables:
            </p>
            <ul className="mt-2 space-y-1">
              {configStatus.missing.map((varName) => (
                <li key={varName} className="text-sm font-mono text-red-800 bg-red-50 px-2 py-1 rounded">
                  {varName}
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Fix Guide */}
          <div className="p-3 bg-blue-50 rounded border border-blue-200">
            <p className="text-sm font-semibold text-blue-900 mb-2">
              📝 Quick Fix Guide
            </p>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li>
                <strong>Get Firebase Config:</strong> Go to{' '}
                <a 
                  href="https://console.firebase.google.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-600"
                >
                  Firebase Console
                </a>
                {' '}→ Project Settings → Your Apps
              </li>
              <li>
                <strong>For Local Development:</strong> Add variables to <code className="bg-blue-100 px-1 rounded">.env.local</code> file
              </li>
              <li>
                <strong>For Production (Vercel):</strong> Add variables in Vercel Dashboard → Settings → Environment Variables
              </li>
              <li>
                <strong>Redeploy:</strong> After adding variables, redeploy your application
              </li>
            </ol>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-2">
            <a
              href="/FIREBASE_SETUP_GUIDE.md"
              target="_blank"
              className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900 underline"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View Full Setup Guide
            </a>
            <a
              href="https://console.firebase.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900 underline"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Firebase Console
            </a>
            {configStatus.environment === 'production' && (
              <a
                href="https://vercel.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900 underline"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Vercel Dashboard
              </a>
            )}
          </div>

          {/* Environment Badge */}
          <div className="flex items-center justify-between pt-2 border-t border-red-200">
            <span className="text-xs text-red-600">
              Environment: <span className="font-mono font-semibold">{configStatus.environment}</span>
            </span>
            <button
              onClick={() => window.location.reload()}
              className="text-xs text-blue-700 hover:text-blue-900 underline"
            >
              Refresh to check again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
