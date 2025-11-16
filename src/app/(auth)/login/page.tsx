'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Layout, Container, Typography, Button, Card } from '@/components/ui/new';
// Import our custom auth functions instead of direct Firebase functions
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
    <Layout>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <Container maxWidth="sm">
          <div className="text-center mb-8">
            <Typography variant="h2" className="mb-4">
              Welcome back
            </Typography>
            <Typography variant="body" color="secondary">
              Sign in to your account to continue
            </Typography>
          </div>

          <Card className="p-8">
            {/* Firebase Configuration Warning */}
            <FirebaseConfigWarning />

            {/* Error Messages */}
            {formErrors.general && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <Typography variant="body" className="text-red-700">
                  {formErrors.general}
                </Typography>
                {emailVerificationNeeded && (
                  <div className="mt-2">
                    <button
                      onClick={handleResendVerification}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Resend verification email
                    </button>
                  </div>
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
                    <Typography variant="caption" className="text-yellow-800 font-medium">
                      Configuration Issues:
                    </Typography>
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

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                    formErrors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your email"
                />
                {formErrors.email && (
                  <Typography variant="caption" className="text-red-600 mt-1">
                    {formErrors.email}
                  </Typography>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
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
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {formErrors.password && (
                  <Typography variant="caption" className="text-red-600 mt-1">
                    {formErrors.password}
                  </Typography>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Remember me</span>
                </label>
                
                <Link href="/reset-password" className="text-sm text-green-600 hover:text-green-800">
                  Forgot your password?
                </Link>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isLoading}
              >
                Sign in
              </Button>
            </form>

            {/* Divider */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>
            </div>

            {/* Google Sign In */}
            <div className="mt-6">
              <Button
                variant="outline"
                onClick={handleGoogleSignIn}
                className="w-full"
                size="lg"
                isLoading={isLoading}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>
            </div>

            {/* Sign Up Link */}
            <div className="mt-6 text-center">
              <Typography variant="body" color="secondary">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="text-green-600 hover:text-green-800 font-medium">
                  Sign up
                </Link>
              </Typography>
            </div>
          </Card>
        </Container>
      </div>
    </Layout>
  );
} 