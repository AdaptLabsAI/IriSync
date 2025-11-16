'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { loginWithEmail, loginWithGoogle, getFirebaseErrorMessage } from '@/lib/features/auth/customAuth';
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
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      setFormErrors({
        ...formErrors,
        general: getFirebaseErrorMessage(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    // This would need to be implemented with your auth system
    console.log('Resend verification email for:', formData.email);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', background: '#131A13' }}>
      {/* Left Side - Green Hero/Graphics */}
      <div style={{ flex: 1, position: 'relative', background: '#1B5320', overflow: 'hidden' }} className="hidden lg:block">
        {/* Decorative blurred shapes */}
        <div style={{ 
          position: 'absolute', 
          top: '80px', 
          left: '60px', 
          width: '280px', 
          height: '280px', 
          background: '#00C853', 
          borderRadius: '50%', 
          opacity: 0.15, 
          filter: 'blur(80px)' 
        }}></div>
        <div style={{ 
          position: 'absolute', 
          bottom: '100px', 
          right: '80px', 
          width: '350px', 
          height: '350px', 
          background: '#00C853', 
          borderRadius: '50%', 
          opacity: 0.12, 
          filter: 'blur(100px)' 
        }}></div>
        
        {/* Decorative rings */}
        <div style={{
          position: 'absolute',
          top: '120px',
          right: '100px',
          width: '200px',
          height: '200px',
          border: '2px solid rgba(0, 200, 83, 0.2)',
          borderRadius: '50%'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '150px',
          left: '80px',
          width: '150px',
          height: '150px',
          border: '2px solid rgba(0, 200, 83, 0.15)',
          borderRadius: '50%'
        }}></div>
        
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '48px' }}>
          <div style={{ maxWidth: '500px' }}>
            {/* Logo */}
            <div style={{ marginBottom: '80px' }}>
              <Link href="/" className="flex items-center space-x-3">
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: '#00C853' }}>
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontSize: '28px', fontWeight: 600, color: 'white' }}>IriSync</span>
              </Link>
            </div>

            {/* Top Integrations Card */}
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              backdropFilter: 'blur(20px)',
              borderRadius: '20px', 
              padding: '32px', 
              border: '1px solid rgba(255, 255, 255, 0.2)' 
            }}>
              <h3 style={{ color: 'white', fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>Top Integrations</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {['Facebook', 'Instagram', 'Twitter', 'LinkedIn'].map((platform) => (
                  <div key={platform} style={{ 
                    background: 'rgba(255, 255, 255, 0.05)', 
                    borderRadius: '12px', 
                    padding: '16px', 
                    textAlign: 'center' 
                  }}>
                    <div style={{ 
                      width: '36px', 
                      height: '36px', 
                      margin: '0 auto 8px', 
                      background: 'rgba(0, 200, 83, 0.2)', 
                      borderRadius: '50%' 
                    }}></div>
                    <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>{platform}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - White Login Panel */}
      <div style={{ flex: 1, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '520px', padding: '32px' }}>
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <Link href="/" className="flex items-center space-x-3">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: '#00C853' }}>
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize: '24px', fontWeight: 600, color: '#131A13' }}>IriSync</span>
            </Link>
          </div>

          {/* Header */}
          <div style={{ marginBottom: '48px' }}>
            <h1 style={{ fontSize: '56px', lineHeight: '1.1', fontFamily: 'Inter, sans-serif', marginBottom: '8px' }}>
              <span style={{ color: '#131A13', fontWeight: 400 }}>Welcome to</span>{' '}
              <span style={{ color: '#00C853', fontWeight: 500 }}>IriSync</span>
            </h1>
            <p style={{ fontSize: '24px', color: 'rgba(19, 26, 19, 0.55)', marginTop: '16px' }}>Access your journey by logging in</p>
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

          {/* Login Form */}
          <form onSubmit={handleSubmit} style={{ marginTop: '32px' }}>
            {/* Email Field */}
            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="email" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#131A13', marginBottom: '8px' }}>
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  height: '64px',
                  background: '#F5F5F7',
                  border: formErrors.email ? '1px solid #ef4444' : 'none',
                  borderRadius: '16px',
                  padding: '0 20px',
                  fontSize: '18px',
                  outline: 'none',
                  transition: 'border 0.2s'
                }}
                placeholder="Enter your email"
                onFocus={(e) => e.target.style.border = '2px solid #00C853'}
                onBlur={(e) => e.target.style.border = formErrors.email ? '1px solid #ef4444' : 'none'}
              />
              {formErrors.email && (
                <p style={{ marginTop: '8px', fontSize: '14px', color: '#ef4444' }}>{formErrors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="password" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#131A13', marginBottom: '8px' }}>
                Enter Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    height: '64px',
                    background: '#F5F5F7',
                    border: formErrors.password ? '1px solid #ef4444' : 'none',
                    borderRadius: '16px',
                    padding: '0 56px 0 20px',
                    fontSize: '18px',
                    outline: 'none',
                    transition: 'border 0.2s'
                  }}
                  placeholder="Enter your password"
                  onFocus={(e) => e.target.style.border = '2px solid #00C853'}
                  onBlur={(e) => e.target.style.border = formErrors.password ? '1px solid #ef4444' : 'none'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px'
                  }}
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
                <p style={{ marginTop: '8px', fontSize: '14px', color: '#ef4444' }}>{formErrors.password}</p>
              )}
            </div>

            {/* Forgot Password Link */}
            <div style={{ textAlign: 'right', marginBottom: '24px' }}>
              <Link 
                href="/reset-password" 
                style={{ 
                  fontSize: '14px', 
                  fontWeight: 600, 
                  color: '#131A13', 
                  textDecoration: 'underline', 
                  textTransform: 'uppercase' 
                }}
              >
                Forgot Password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                height: '64px',
                borderRadius: '16px',
                background: isLoading ? '#cccccc' : 'linear-gradient(135deg, #00C853 0%, #003305 100%)',
                border: 'none',
                color: 'white',
                fontSize: '20px',
                fontWeight: 700,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s',
                opacity: isLoading ? 0.5 : 1
              }}
              onMouseEnter={(e) => !isLoading && (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => !isLoading && (e.currentTarget.style.opacity = '1')}
            >
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          <div style={{ marginTop: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: '16px', color: 'rgba(19, 26, 19, 0.55)' }}>
              Don&apos;t have an account?{' '}
              <Link 
                href="/register" 
                style={{ 
                  fontWeight: 600, 
                  color: '#131A13', 
                  textDecoration: 'underline', 
                  textTransform: 'uppercase' 
                }}
              >
                Create New
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 