import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

// Define types for platform data
export interface PlatformAccount {
  id: string;
  platform: string;
  platformType: 'social' | 'crm' | 'design';
  name: string;
  username?: string;
  profileImage?: string;
  isConnected: boolean;
  status: 'active' | 'error' | 'revokedAccess' | 'expired';
  lastSync?: string;
}

interface PlatformData {
  accounts: PlatformAccount[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  connectPlatform: (platform: string, platformType: string) => Promise<string>;
  disconnectPlatform: (accountId: string) => Promise<void>;
}

const PlatformContext = createContext<PlatformData | undefined>(undefined);

export function usePlatform() {
  const context = useContext(PlatformContext);
  if (context === undefined) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return context;
}

interface PlatformProviderProps {
  children: ReactNode;
}

export function PlatformProvider({ children }: PlatformProviderProps) {
  const { data: session, status } = useSession();
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Fetch platform accounts
  const fetchAccounts = async () => {
    if (status === 'unauthenticated') {
      setIsLoading(false);
      setAccounts([]);
      return;
    }

    if (status === 'loading') {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch connected platforms
      const response = await axios.get('/api/platforms/accounts');
      setAccounts(response.data.accounts || []);
    } catch (err: any) {
      console.error('Error fetching platform accounts:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load platform accounts');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    if (status !== 'loading') {
      fetchAccounts();
    }
  }, [status]);

  // Connect to a platform
  const connectPlatform = async (platform: string, platformType: string): Promise<string> => {
    try {
      const response = await axios.post('/api/platforms/connect', {
        platform,
        platformType
      });

      // Return the authorization URL where the user should be redirected
      return response.data.authUrl;
    } catch (err: any) {
      console.error('Error initiating platform connection:', err);
      throw new Error(err.response?.data?.message || err.message || 'Failed to connect to platform');
    }
  };

  // Disconnect a platform
  const disconnectPlatform = async (accountId: string): Promise<void> => {
    try {
      await axios.delete(`/api/platforms/accounts/${accountId}`);
      // Update the accounts list after disconnection
      setAccounts(accounts.filter(account => account.id !== accountId));
    } catch (err: any) {
      console.error('Error disconnecting platform:', err);
      throw new Error(err.response?.data?.message || err.message || 'Failed to disconnect platform');
    }
  };

  // Context value
  const value = {
    accounts,
    isLoading,
    error,
    refetch: fetchAccounts,
    connectPlatform,
    disconnectPlatform
  };

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export default PlatformProvider; 