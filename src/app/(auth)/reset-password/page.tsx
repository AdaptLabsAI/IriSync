'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Layout, Container, Typography, Button, Card } from '@/components/ui/new';
import { sendPasswordResetRequest, getFirebaseErrorMessage } from '@/lib/features/auth/customAuth';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      // Use our custom password reset function
      const result = await sendPasswordResetRequest(email);
      
      if (result.success) {
        setEmailSent(true);
      } else {
        setError(result.error || 'Failed to send password reset email');
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
              Reset Password
            </Typography>
            <Typography variant="body" color="secondary">
              Enter your email address to receive a password reset link
            </Typography>
          </div>

          <Card className="p-8">
            {emailSent ? (
              <div className="space-y-6">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <Typography variant="body" className="text-green-700">
                    Password reset email sent! Check your inbox for further instructions.
                  </Typography>
                </div>
                
                <Button
                  asChild
                  className="w-full"
                  size="lg"
                >
                  <Link href="/login">
                    Return to Login
                  </Link>
                </Button>
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
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                      error ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="your@email.com"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full"
                  size="lg"
                  isLoading={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
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