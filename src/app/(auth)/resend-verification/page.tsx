'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Layout, Container, Typography, Button, Card } from '@/components/ui/new';
import { resendVerificationEmail } from '@/lib/features/auth/customAuth';

export default function ResendVerificationPage() {
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
      // Try to resend verification email using our API
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'An error occurred' }));
        throw new Error(data.error || 'Failed to send verification email');
      }
      
      setEmailSent(true);
    } catch (error: any) {
      console.error('Email verification error:', error);
      setError(error.message || 'Failed to send verification email');
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
              Email Verification
            </Typography>
          </div>

          <Card className="p-8">
            {emailSent ? (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                
                <div>
                  <Typography variant="h5" className="mb-2">
                    Verification email sent!
                  </Typography>
                  <Typography variant="body" color="secondary">
                    Please check your inbox. If you don&apos;t see the email, check your spam folder. The email should arrive within a few minutes.
                  </Typography>
                </div>
                
                <Link href="/login">
                  <Button className="w-full" size="lg">
                    Return to Login
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <Typography variant="body" color="secondary" className="text-center">
                  Enter your email address below to get a new verification link.
                </Typography>
                
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
                  {isLoading ? 'Sending...' : 'Send Verification Email'}
                </Button>
                
                <div className="text-center">
                  <Typography variant="body" color="secondary">
                    Remember your password?{' '}
                    <Link href="/login" className="text-green-600 hover:text-green-800 font-medium">
                      Sign in
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