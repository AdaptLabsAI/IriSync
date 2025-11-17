'use client';

import { useEffect, useState } from 'react';
import { getFirebaseClientAuth, getFirebaseFirestore, isFirebaseConfigured } from '@/lib/core/firebase/client';
import { getFirebaseEnvStatus, getFirebaseConfigSummary } from '@/lib/core/firebase/health';

export default function FirebaseTestPage() {
  const [diagnostics, setDiagnostics] = useState<any>(null);

  useEffect(() => {
    const runDiagnostics = () => {
      const results: any = {
        timestamp: new Date().toISOString(),
        environment: {
          nodeEnv: process.env.NODE_ENV,
          isClient: typeof window !== 'undefined',
        },
        envVars: {},
        firebaseStatus: {},
        errors: []
      };

      // Check all env vars
      const requiredVars = [
        'NEXT_PUBLIC_FIREBASE_API_KEY',
        'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
        'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
        'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
        'NEXT_PUBLIC_FIREBASE_APP_ID',
      ];

      requiredVars.forEach(key => {
        const value = process.env[key];
        results.envVars[key] = {
          exists: !!value,
          type: typeof value,
          length: value ? value.length : 0,
          preview: value ? `${value.substring(0, 10)}...` : 'NOT SET'
        };
      });

      // Get health status
      try {
        const envStatus = getFirebaseEnvStatus();
        results.firebaseStatus.envStatus = envStatus;
      } catch (error) {
        results.errors.push(`getFirebaseEnvStatus error: ${error}`);
      }

      try {
        const summary = getFirebaseConfigSummary();
        results.firebaseStatus.summary = summary;
      } catch (error) {
        results.errors.push(`getFirebaseConfigSummary error: ${error}`);
      }

      try {
        results.firebaseStatus.isConfigured = isFirebaseConfigured();
      } catch (error) {
        results.errors.push(`isFirebaseConfigured error: ${error}`);
      }

      // Try to get instances
      try {
        const auth = getFirebaseClientAuth();
        results.firebaseStatus.authInstance = auth ? 'Available' : 'null';
      } catch (error: any) {
        results.firebaseStatus.authInstance = 'Error';
        results.errors.push(`getFirebaseClientAuth error: ${error.message || error}`);
      }

      try {
        const firestore = getFirebaseFirestore();
        results.firebaseStatus.firestoreInstance = firestore ? 'Available' : 'null';
      } catch (error: any) {
        results.firebaseStatus.firestoreInstance = 'Error';
        results.errors.push(`getFirebaseFirestore error: ${error.message || error}`);
      }

      setDiagnostics(results);

      // Also log to console for F12 debugging
      console.log('=== FIREBASE DIAGNOSTICS ===');
      console.log(results);
      console.log('=========================');
    };

    runDiagnostics();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6 text-gray-900">Firebase Configuration Diagnostics</h1>

          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              <strong>Instructions:</strong> Open browser console (F12) to see detailed logs.
              Screenshot this page and the console output to share with support.
            </p>
          </div>

          {diagnostics ? (
            <div className="space-y-6">
              {/* Environment */}
              <section>
                <h2 className="text-xl font-semibold mb-3 text-gray-800">Environment</h2>
                <div className="bg-gray-50 p-4 rounded border">
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(diagnostics.environment, null, 2)}
                  </pre>
                </div>
              </section>

              {/* Errors */}
              {diagnostics.errors.length > 0 && (
                <section>
                  <h2 className="text-xl font-semibold mb-3 text-red-600">Errors</h2>
                  <div className="bg-red-50 p-4 rounded border border-red-200">
                    {diagnostics.errors.map((error: string, i: number) => (
                      <div key={i} className="text-sm text-red-800 mb-2">
                        ❌ {error}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Environment Variables */}
              <section>
                <h2 className="text-xl font-semibold mb-3 text-gray-800">Environment Variables</h2>
                <div className="bg-gray-50 p-4 rounded border space-y-2">
                  {Object.entries(diagnostics.envVars).map(([key, value]: [string, any]) => (
                    <div key={key} className="flex items-center justify-between p-2 bg-white rounded">
                      <span className="font-mono text-sm">{key}</span>
                      <div className="flex items-center gap-2">
                        {value.exists ? (
                          <>
                            <span className="text-green-600 text-xs">✓ SET</span>
                            <span className="text-gray-500 text-xs">({value.length} chars)</span>
                            <span className="text-gray-400 text-xs font-mono">{value.preview}</span>
                          </>
                        ) : (
                          <span className="text-red-600 text-xs font-bold">✗ MISSING</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Firebase Status */}
              <section>
                <h2 className="text-xl font-semibold mb-3 text-gray-800">Firebase Status</h2>
                <div className="bg-gray-50 p-4 rounded border">
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(diagnostics.firebaseStatus, null, 2)}
                  </pre>
                </div>
              </section>

              {/* Full Diagnostics */}
              <section>
                <h2 className="text-xl font-semibold mb-3 text-gray-800">Full Diagnostics (JSON)</h2>
                <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-xs overflow-auto max-h-96">
                  <pre>{JSON.stringify(diagnostics, null, 2)}</pre>
                </div>
              </section>

              {/* Action Items */}
              <section className="bg-yellow-50 border border-yellow-200 p-6 rounded">
                <h2 className="text-xl font-semibold mb-3 text-gray-800">Next Steps</h2>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Take a screenshot of this entire page</li>
                  <li>Open browser console (F12) and screenshot the logs</li>
                  <li>Go to Vercel Dashboard → Project Settings → Environment Variables</li>
                  <li>Verify all NEXT_PUBLIC_FIREBASE_* variables are set</li>
                  <li>If missing, get values from Firebase Console → Project Settings</li>
                  <li>After adding variables, redeploy the application</li>
                </ol>
              </section>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Running diagnostics...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
