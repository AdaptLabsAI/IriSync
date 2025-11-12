'use client';

import React, { useState, useEffect } from 'react';
import { Layout, Container, Typography, Button, Card, Loading } from '@/components/ui/new';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { firebaseConfig, getFirebaseConfigDebugInfo, isFirebaseConfigValid } from '@/lib/firebase/config';
import { debugGoogleAuth } from '@/lib/auth/troubleshoot';

export default function FirebaseTestPage() {
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    message: string;
    details?: any;
  }>({
    status: 'idle',
    message: 'Click the button to test Firebase configuration',
  });

  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    // Display safe config information (no API keys)
    const safeConfig = {
      ...getFirebaseConfigDebugInfo(),
      apiKeyProvided: !!firebaseConfig.apiKey,
      hasApiKey: !!firebaseConfig.apiKey && typeof firebaseConfig.apiKey === 'string' && firebaseConfig.apiKey.startsWith('AIza'),
      hasAppId: !!firebaseConfig.appId && typeof firebaseConfig.appId === 'string' && !firebaseConfig.appId.includes('123456789012'),
      configValid: isFirebaseConfigValid(),
    };
    
    setConfig(safeConfig);
  }, []);

  const testAuth = async () => {
    setTestResult({
      status: 'loading',
      message: 'Testing Firebase configuration...',
    });

    try {
      const result = await debugGoogleAuth();
      
      if (result.success) {
        setTestResult({
          status: 'success',
          message: 'Firebase authentication is properly configured!',
          details: result
        });
      } else {
        setTestResult({
          status: 'error',
          message: result.message,
          details: result
        });
      }
    } catch (error: any) {
      setTestResult({
        status: 'error',
        message: error.message || 'An unknown error occurred',
        details: { error }
      });
    }
  };

  const getFirebaseConfigInstructions = () => {
    if (!config) return null;
    
    const issues = [];
    
    if (!config.apiKeyProvided || !config.hasApiKey) {
      issues.push('API Key is missing or using a dummy value');
    }
    
    if (!config.authDomain || config.authDomain.includes('irisync-app.firebaseapp.com')) {
      issues.push('Auth Domain appears to be using the default value');
    }
    
    if (!config.hasAppId) {
      issues.push('App ID is missing or using a dummy value');
    }
    
    return (
      <Card className="mt-6">
        <Typography variant="h5" className="mb-4">Setup Instructions</Typography>
        <div className="border-t border-gray-200 mb-4"></div>
        
        {issues.length > 0 ? (
          <div className="space-y-4">
            <Typography variant="body" className="mb-2">
              Please fix the following configuration issues:
            </Typography>
            <ul className="list-disc pl-6 space-y-1">
              {issues.map((issue, idx) => (
                <li key={idx}>
                  <Typography variant="body" className="text-red-600">{issue}</Typography>
                </li>
              ))}
            </ul>
            <Typography variant="body" className="mt-4">
              To fix these issues:
            </Typography>
            <ol className="list-decimal pl-6 space-y-2">
              <li>
                <Typography variant="body">
                  Create a <code className="px-1 py-0.5 bg-gray-100 rounded text-sm">.env.local</code> file in your project root if it doesn&apos;t exist
                </Typography>
              </li>
              <li>
                <Typography variant="body">
                  Add the following environment variables with actual values from your Firebase project:
                </Typography>
                <pre className="mt-2 p-4 bg-gray-100 rounded-lg text-sm overflow-x-auto">
{`NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDlBDjRu1H4jJrMs4SrX8_jf4Ct7c4NyXs
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=irisai-c83a1.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=irisai-c83a1
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=irisai-c83a1.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=232183317678
NEXT_PUBLIC_FIREBASE_APP_ID=1:232183317678:web:d74ca5697898ee1b7c193f
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-0VTK29PTKM`}
                </pre>
              </li>
              <li>
                <Typography variant="body">
                  Restart your Next.js development server
                </Typography>
              </li>
            </ol>
          </div>
        ) : (
          <div className="text-green-700 bg-green-50 p-4 rounded-lg">
            <Typography variant="body">
              Your Firebase configuration looks good! If you&apos;re still experiencing issues, check that:
            </Typography>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Google is enabled as an auth provider in the Firebase Console</li>
              <li>Your domain (localhost:3000 for development) is authorized in Firebase Authentication settings</li>
            </ul>
          </div>
        )}
      </Card>
    );
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-12">
        <Container>
          <div className="mb-8">
            <Typography variant="h2" className="mb-4">
              Firebase Authentication Test
            </Typography>
          </div>
          
          <Card className="mb-6">
            <Typography variant="h5" className="mb-4">Firebase Configuration</Typography>
            <pre className="p-4 bg-gray-100 rounded-lg text-sm overflow-x-auto mb-4">
              {JSON.stringify(config, null, 2)}
            </pre>
            
            <Button 
              onClick={testAuth} 
              isLoading={testResult.status === 'loading'}
              size="lg"
            >
              {testResult.status === 'loading' ? 'Testing...' : 'Test Firebase Auth'}
            </Button>
          </Card>
          
          {testResult.status !== 'idle' && (
            <Card>
              <Typography variant="h5" className="mb-4">Test Results</Typography>
              
              <div className={`p-4 rounded-lg mb-4 ${
                testResult.status === 'success' 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <Typography 
                  variant="body" 
                  className={testResult.status === 'success' ? 'text-green-700' : 'text-red-700'}
                >
                  {testResult.message}
                </Typography>
              </div>
              
              {testResult.details && (
                <div>
                  <Typography variant="h6" className="mb-2">Details:</Typography>
                  <pre className="p-4 bg-gray-100 rounded-lg text-sm overflow-x-auto">
                    {JSON.stringify(testResult.details, null, 2)}
                  </pre>
                </div>
              )}
            </Card>
          )}
          
          {getFirebaseConfigInstructions()}
        </Container>
      </div>
    </Layout>
  );
} 