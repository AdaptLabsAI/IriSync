import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { AITaskType } from '../lib/ai/models';
import { TokenPackageSize } from '../lib/tokens/token-purchase';
import { SubscriptionTier } from '../lib/models/User';

interface TokenBalance {
  currentBalance: number;
  totalUsed: number;
  lastResetDate: Date;
  nextResetDate: Date;
}

interface TokenTransaction {
  id: string;
  amount: number;
  type: 'usage' | 'reset' | 'purchase' | 'adjustment' | 'subscription';
  taskType?: string;
  timestamp: Date;
  description?: string;
}

interface TokenNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export function useTokens() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<TokenBalance | null>(null);
  const [usageHistory, setUsageHistory] = useState<TokenTransaction[]>([]);
  const [notifications, setNotifications] = useState<TokenNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch token balance and history
  const fetchTokenData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tokens');
      
      if (!response.ok) {
        throw new Error('Failed to fetch token data');
      }
      
      const data = await response.json();
      
      setBalance(data.balance);
      setUsageHistory(data.usageHistory || []);
      setNotifications(data.notifications || []);
    } catch (err) {
      setError((err as Error).message);
      console.error('Error fetching token data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Check if a user can perform a specific AI task
  const canPerformTask = useCallback(async (taskType: AITaskType): Promise<{
    allowed: boolean;
    reason?: string;
    tokenCost?: number;
  }> => {
    if (!user) {
      return { allowed: false, reason: 'Not authenticated' };
    }

    try {
      const response = await fetch('/api/tokens/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskType })
      });
      
      const data = await response.json();
      
      return {
        allowed: data.allowed,
        reason: data.reason,
        tokenCost: data.tokenCost
      };
    } catch (err) {
      console.error('Error checking task permission:', err);
      return { allowed: false, reason: (err as Error).message };
    }
  }, [user]);

  // Track token usage for an AI task
  const trackTaskUsage = useCallback(async (
    taskType: AITaskType,
    tokensUsed: number,
    model: string,
    provider: string,
    latencyMs?: number
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const response = await fetch('/api/tokens/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskType,
          tokensUsed,
          model,
          provider,
          latencyMs
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to track token usage');
      }
      
      // Refresh token data
      await fetchTokenData();
      
      return true;
    } catch (err) {
      console.error('Error tracking token usage:', err);
      return false;
    }
  }, [user, fetchTokenData]);

  // Purchase additional tokens
  const purchaseTokens = useCallback(async (
    packageSize: number,
    paymentMethod: string,
    paymentToken: string
  ): Promise<{
    success: boolean;
    message?: string;
    newBalance?: number;
  }> => {
    if (!user) {
      return { success: false, message: 'Not authenticated' };
    }

    try {
      const response = await fetch('/api/tokens/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageSize,
          paymentMethod,
          paymentToken
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to purchase tokens');
      }
      
      // Refresh token data
      await fetchTokenData();
      
      return {
        success: true,
        message: data.message,
        newBalance: data.newBalance
      };
    } catch (err) {
      console.error('Error purchasing tokens:', err);
      return { success: false, message: (err as Error).message };
    }
  }, [user, fetchTokenData]);

  // Initialize token balance for a new user
  const initializeTokens = useCallback(async (tier: SubscriptionTier): Promise<boolean> => {
    if (!user) return false;

    try {
      const response = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'initialize',
          tier
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to initialize token balance');
      }
      
      // Refresh token data
      await fetchTokenData();
      
      return true;
    } catch (err) {
      console.error('Error initializing token balance:', err);
      return false;
    }
  }, [user, fetchTokenData]);

  // Mark a notification as read
  const markNotificationAsRead = useCallback(async (notificationId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Update locally first for immediate UI feedback
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true } 
            : notification
        )
      );
      
      // Then update on the server
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST'
      });
      
      return response.ok;
    } catch (err) {
      console.error('Error marking notification as read:', err);
      return false;
    }
  }, [user]);

  // Calculate percentage of tokens used
  const calculateUsagePercentage = useCallback((): number => {
    if (!balance) return 0;
    
    const { currentBalance, totalUsed } = balance;
    const totalAllocation = currentBalance + totalUsed;
    
    if (totalAllocation === 0) return 0;
    
    return Math.round((totalUsed / totalAllocation) * 100);
  }, [balance]);

  // Get days until token reset
  const getDaysUntilReset = useCallback((): number => {
    if (!balance) return 0;
    
    const today = new Date();
    const resetDate = new Date(balance.nextResetDate);
    
    const diffTime = resetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }, [balance]);

  // Load data on initial render
  useEffect(() => {
    if (user) {
      fetchTokenData();
    }
  }, [user, fetchTokenData]);

  return {
    balance,
    usageHistory,
    notifications,
    loading,
    error,
    fetchTokenData,
    canPerformTask,
    trackTaskUsage,
    purchaseTokens,
    initializeTokens,
    markNotificationAsRead,
    calculateUsagePercentage,
    getDaysUntilReset
  };
} 