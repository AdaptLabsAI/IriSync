'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Layout, Container, Typography, Button, Card } from '@/components/ui/new';
import { completePasswordReset, getFirebaseErrorMessage } from '@/lib/auth/customAuth';

export default function ResetPasswordConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [oobCode, setOobCode] = useState<string | null>(null);
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Get the action code from the URL
    const code = searchParams?.get('oobCode');
    
    if (!code) {
      setError('Invalid password reset link. Please request a new one.');
      return;
    }
    
    setOobCode(code);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!password) {
      setError('Please enter a new password');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (!oobCode) {
      setError('Invalid password reset link. Please request a new one.');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const result = await completePasswordReset(oobCode, password);
      
      if (result.success) {
        setIsComplete(true);
      } else {
        setError(result.error || 'Failed to reset password. Please try again.');
      }
    } catch (error: any) {
      setError(getFirebaseErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <Container maxWidth="md">
          <div className="text-center mb-8">
            <Typography variant="h2" className="mb-4">
              Reset Your Password
            </Typography>
            <Typography variant="body" color="secondary">
              Enter a new password for your IriSync account
            </Typography>
          </div>

          <Card className="p-8">
            {isComplete ? (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                
                <div>
                  <Typography variant="h5" className="mb-2">
                    Password Reset Successfully!
                  </Typography>
                  <Typography variant="body" color="secondary">
                    Your password has been reset. You can now log in with your new password.
                  </Typography>
                </div>
                
                <Link href="/login">
                  <Button className="w-full" size="lg">
                    Log in with your new password
                  </Button>
                </Link>
              </div>
            ) : !oobCode ? (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                
                <div>
                  <Typography variant="h5" className="mb-2">
                    Invalid Reset Link
                  </Typography>
                  <Typography variant="body" color="secondary">
                    {error || 'This password reset link is invalid or has expired.'}
                  </Typography>
                </div>
                
                <Link href="/reset-password">
                  <Button className="w-full" size="lg">
                    Request a new reset link
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <Typography variant="body" className="text-red-700">
                      {error}
                    </Typography>
                  </div>
                )}
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                        error && password ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="At least 8 characters"
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
                </div>
                
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                        error && confirmPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Confirm your new password"
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
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full"
                  size="lg"
                  isLoading={isLoading}
                >
                  {isLoading ? 'Resetting Password...' : 'Reset Password'}
                </Button>
                
                <div className="text-center">
                  <Typography variant="body" color="secondary">
                    Remember your password?{' '}
                    <Link href="/login" className="text-green-600 hover:text-green-800 font-medium">
                      Log in
                    </Link>
                  </Typography>
                </div>
              </form>
            )}
          </Card>
        </Container>
      </div>
    </Layout>
  );
} 