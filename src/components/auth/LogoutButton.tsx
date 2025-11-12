import { signOut } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, signOut as firebaseSignOut } from 'firebase/auth';
import { Button, type ButtonProps } from '@/components/ui/button';

interface LogoutButtonProps {
  variant?: ButtonProps['variant'];
  className?: string;
}

export default function LogoutButton({ variant, className }: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      
      // First, sign out from Firebase Auth
      try {
        const auth = getAuth();
        await firebaseSignOut(auth);
        console.log('Firebase Auth sign out successful');
      } catch (firebaseError) {
        console.error('Firebase sign out error:', firebaseError);
        // Continue with NextAuth signout even if Firebase fails
      }
      
      // Next, handle NextAuth sign out
      await signOut({ redirect: false });
      
      // Also call our server-side logout endpoint to clear all cookies
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      // Clear any local storage items if needed
      localStorage.removeItem('user');
      sessionStorage.clear();
      
      // Redirect to login page
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      onClick={handleLogout}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? 'Signing out...' : 'Sign out'}
    </Button>
  );
} 