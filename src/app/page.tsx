'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the marketing home page which has the proper layout
    router.push('/home');
  }, [router]);

  // Simple loading indicator 
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div>Redirecting...</div>
    </div>
  );
} 