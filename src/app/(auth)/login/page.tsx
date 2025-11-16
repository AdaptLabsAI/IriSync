'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { loginWithEmail, loginWithGoogle, getFirebaseErrorMessage } from '@/lib/features/auth/customAuth';
import { getFirebaseAuthDiagnostics } from '@/lib/features/auth/troubleshoot';
import FirebaseConfigWarning from '@/components/auth/FirebaseConfigWarning';

// Add a client-side check function to verify dashboard redirection is safe
const safeDashboardRedirect = (router: any, url: string) => {
  console.log('Safely redirecting to:', url);
  
  // Using window.location.href for more reliable redirection
  // especially after Google sign-in popup which can cause issues with Next.js router
  setTimeout(() => {
    try {
      // Try Next.js router first
      router.push(url);
      
      // Add a fallback in case router push fails silently
      setTimeout(() => {
        if (window.location.pathname !== url) {
          console.log('Router push may have failed, using direct location change');
          window.location.href = url;
        }
      }, 300);
    } catch (err) {
      console.error('Router redirect failed, falling back to location:', err);
      window.location.href = url;
    }
  }, 100);
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard';
  const error = searchParams?.get('error');
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [authIssues, setAuthIssues] = useState<string[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [emailVerificationNeeded, setEmailVerificationNeeded] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  
  const [formErrors, setFormErrors] = useState({
    email: '',
    password: '',
    general: error ? 'An error occurred during sign in' : ''
  });

  // Check for Firebase auth configuration issues
  useEffect(() => {
    const diagResults = getFirebaseAuthDiagnostics();
    setAuthIssues(diagResults.issues);
    setShowDiagnostics(diagResults.issues.length > 0);
    
    // Log config issues for debugging
    if (diagResults.issues.length > 0) {
      console.warn('Firebase Auth Config Issues:', diagResults.issues);
    } else {
      console.log('Firebase Auth Config appears valid');
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'rememberMe' ? checked : value
    });
    
    // Clear error when typing
    if (name in formErrors && formErrors[name as keyof typeof formErrors]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };

  const validateForm = () => {
    const newErrors = {
      email: '',
      password: '',
      general: ''
    };
    
    // Simple validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    setFormErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setEmailVerificationNeeded(false);
    
    try {
      // Use our custom auth function instead of direct Firebase auth
      const result = await loginWithEmail(formData.email, formData.password);
      
      if (result.success) {
        // Check if email is verified
        if (result.user && !result.user.emailVerified) {
          // Email not verified, show warning but allow login
          setEmailVerificationNeeded(true);
          setFormErrors({
            ...formErrors,
            general: 'Your email address is not verified. Please check your inbox for a verification email or request a new one.'
          });
          
          // Still redirect after showing the warning
          setTimeout(() => {
            safeDashboardRedirect(router, callbackUrl);
          }, 3000);
        } else {
          // Email verified or not required, redirect immediately
          safeDashboardRedirect(router, callbackUrl);
        }
      } else {
        // Login failed
        setFormErrors({
          ...formErrors,
          general: result.error || 'Failed to log in. Please check your credentials.'
        });
      }
    } catch (error: any) {
      setFormErrors({
        ...formErrors,
        general: getFirebaseErrorMessage(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setEmailVerificationNeeded(false);
    
    try {
      // Add proper error logging for debugging
      console.log('Attempting Google sign-in...');
      
      // Use our custom Google sign-in function
      const result = await loginWithGoogle();
      
      console.log('Google sign-in result:', result.success ? 'Success' : 'Failed', result.error || '');
      
      if (result.success) {
        safeDashboardRedirect(router, callbackUrl);
      } else {
        setFormErrors({
          ...formErrors,
          general: result.error || 'Failed to sign in with Google'
        });
        
        // If we received a specific error, show diagnostics
        if (result.error?.includes('configuration') || result.error?.includes('config')) {
          setShowDiagnostics(true);
        }
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      setFormErrors({
        ...formErrors,
        general: getFirebaseErrorMessage(error)
      });
      setShowDiagnostics(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    // This would need to be implemented with your auth system
    console.log('Resend verification email for:', formData.email);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 via-green-900 to-gray-900 items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-green-500 rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-green-400 rounded-full opacity-10 blur-3xl"></div>
        
        <div className="relative z-10 max-w-md">
          {/* Logo */}
          <div className="mb-12">
            <Link href="/" className="flex items-center space-x-3">
              <svg className="w-10 h-10 text-green-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-2xl font-bold text-white">IriSync</span>
            </Link>
          </div>

          {/* Decorative card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <h3 className="text-white text-lg font-semibold mb-4">Top Integrations</h3>
            <div className="grid grid-cols-2 gap-4">
              {['Facebook', 'Instagram', 'Twitter', 'LinkedIn'].map((platform) => (
                <div key={platform} className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="w-8 h-8 mx-auto mb-2 bg-green-500/20 rounded-full"></div>
                  <span className="text-white/70 text-sm">{platform}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <Link href="/" className="flex items-center space-x-3">
              <svg className="w-8 h-8 text-green-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-2xl font-bold text-gray-900">IriSync</span>
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome to <span className="text-green-600">IriSync</span>
            </h1>
            <p className="mt-2 text-gray-600">Access your journey by logging in</p>
          </div>

          {/* Firebase Configuration Warning */}
          <FirebaseConfigWarning />

          {/* Error Messages */}
          {formErrors.general && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{formErrors.general}</p>
              {emailVerificationNeeded && (
                <button
                  onClick={handleResendVerification}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Resend verification email
                </button>
              )}
            </div>
          )}

          {/* Diagnostics */}
          {showDiagnostics && authIssues.length > 0 && (
            <div className="mb-6">
              <button
                onClick={() => setDiagnosticsOpen(!diagnosticsOpen)}
                className="flex items-center text-sm text-gray-600 hover:text-gray-800"
              >
                <span>Show diagnostics</span>
                <svg 
                  className={`ml-1 w-4 h-4 transform transition-transform ${diagnosticsOpen ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {diagnosticsOpen && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800">Configuration Issues:</p>
                  <ul className="mt-1 text-sm text-yellow-700">
                    {authIssues.map((issue, index) => (
                      <li key={index} className="list-disc list-inside">
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, email: 'admin@irisync.com' })}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Admin login
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                    formErrors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your email"
                />
              </div>
              {formErrors.email && (
                <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Enter Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`block w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                    formErrors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {formErrors.password && (
                <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>
              )}
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link href="/reset-password" className="text-sm font-medium text-gray-900 hover:text-green-600 uppercase">
                Forgot Password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Login'
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-medium text-gray-900 hover:text-green-600 uppercase">
                Create New
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 