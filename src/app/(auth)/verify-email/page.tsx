'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Layout, Container, Typography, Button, Card, Loading } from '@/components/ui/new';
import { verifyEmail } from '@/lib/features/auth/customAuth';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const oobCode = searchParams?.get('oobCode');
    
    // If no code is provided, there's nothing to verify
    if (!oobCode) {
      setError('Invalid verification link. Please request a new one.');
      return;
    }
    
    const verifyUserEmail = async () => {
      setVerifying(true);
      
      try {
        const result = await verifyEmail(oobCode);
        
        if (result.success) {
          setVerified(true);
        } else {
          setError(result.error || 'Failed to verify email. Please try again.');
        }
      } catch (err) {
        console.error('Error verifying email:', err);
        setError('An unexpected error occurred. Please try again later.');
      } finally {
        setVerifying(false);
      }
    };
    
    verifyUserEmail();
  }, [searchParams, router]);
  
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <Container maxWidth="md">
          <Card className="p-8">
            <div className="text-center space-y-6">
              {verifying ? (
                <>
                  <Loading size="lg" />
                  <Typography variant="h5">Verifying your email...</Typography>
                  <Typography variant="body" color="secondary">
                    Please wait while we confirm your email address.
                  </Typography>
                </>
              ) : verified ? (
                <>
                  <div className="w-16 h-16 mx-auto bg-[#00FF6A]/10 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-[#00CC44]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <Typography variant="h5">Email Verified!</Typography>
                  <Typography variant="body" color="secondary">
                    Thank you for verifying your email address. Your account has been fully activated.
                  </Typography>
                  <Button 
                    asChild
                    size="lg"
                    className="mt-4"
                  >
                    <Link href="/dashboard">
                      Go to Dashboard
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <Typography variant="h5">Verification Failed</Typography>
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <Typography variant="body" className="text-red-700">
                        {error}
                      </Typography>
                    </div>
                  )}
                  <Typography variant="body" color="secondary">
                    The verification link may have expired or already been used.
                  </Typography>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                    <Button 
                      asChild
                      variant="outline"
                    >
                      <Link href="/login">
                        Go to Login
                      </Link>
                    </Button>
                    <Button 
                      asChild
                    >
                      <Link href="/resend-verification">
                        Resend Verification
                      </Link>
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>
        </Container>
      </div>
    </Layout>
  );
} 