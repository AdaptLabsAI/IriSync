'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/core/firebase/config';
import Link from 'next/link';
import { FirebaseError } from 'firebase/app';

export default function AdminAccessPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDevAccess, setShowDevAccess] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Get the user's ID token to check custom claims
      const idTokenResult = await userCredential.user.getIdTokenResult();
      
      // Check if user has admin or super_admin role
      const isAdmin = idTokenResult.claims.admin === true || idTokenResult.claims.super_admin === true;
      
      if (isAdmin) {
        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        setError('Access denied. Admin privileges required.');
        await auth.signOut();
      }
    } catch (err) {
      const firebaseError = err as FirebaseError;
      console.error('Admin login error:', err);
      setError(
        firebaseError.code === 'auth/invalid-credential'
          ? 'Invalid email or password'
          : firebaseError.code === 'auth/user-not-found'
          ? 'No account found with this email'
          : 'Login failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDevBypass = () => {
    // In development, allow bypass to dashboard
    if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_DEV_BYPASS === 'true') {
      router.push('/dashboard');
    } else {
      setError('Dev bypass is only available in development mode');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Access</h1>
          <p className="text-gray-400">Restricted area - Admin credentials required</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleAdminLogin} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Admin Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-medium rounded-lg hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </span>
              ) : (
                'Login as Admin'
              )}
            </button>
          </form>

          {/* Dev Options */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => setShowDevAccess(!showDevAccess)}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center justify-between w-full"
            >
              <span>Developer Options</span>
              <svg 
                className={`w-4 h-4 transition-transform ${showDevAccess ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showDevAccess && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-3">
                  For developers and super admins only. This bypasses authentication in development mode.
                </p>
                <button
                  onClick={handleDevBypass}
                  className="w-full py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 transition-colors"
                >
                  Dev Bypass to Dashboard
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  Only works when NODE_ENV=development or NEXT_PUBLIC_ENABLE_DEV_BYPASS=true
                </p>
              </div>
            )}
          </div>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-green-600 hover:text-green-700">
              ← Back to regular login
            </Link>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-gray-800 border border-gray-700 rounded-lg">
          <h3 className="text-sm font-medium text-white mb-2">Need Admin Access?</h3>
          <p className="text-xs text-gray-400">
            Contact your system administrator to get admin or super admin privileges assigned to your account.
          </p>
        </div>
      </div>
    </div>
  );
}
