'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the reset-password page
    router.push('/reset-password');
  }, [router]);

  // Simple loading indicator
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div>Redirecting to password reset...</div>
    </div>
  );
}
