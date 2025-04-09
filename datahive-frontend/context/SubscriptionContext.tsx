import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useAccount } from 'wagmi';
import {
  subscriptionService,
  SubscriptionStatus,
} from '@/utils/subscription/subscriptionService';

interface SubscriptionContextType {
  subscriptionStatus: SubscriptionStatus | null;
  isLoading: boolean;
  error: string | null;
  refreshSubscription: () => Promise<void>;
  isSubscribed: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscriptionStatus: null,
  isLoading: false,
  error: null,
  refreshSubscription: async () => {},
  isSubscribed: false,
});

export const useSubscription = () => useContext(SubscriptionContext);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { address } = useAccount();
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [forceRefresh, setForceRefresh] = useState<number>(0);

  const fetchSubscriptionStatus = useCallback(async (address: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const status = await subscriptionService.fetchSubscriptionStatus(address);
      setSubscriptionStatus(status);
      return status;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch subscription status');
      console.error('Error fetching subscription:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshSubscription = useCallback(async (): Promise<void> => {
    if (address) {
      await fetchSubscriptionStatus(address);
      // Force a UI update by incrementing the forceRefresh counter
      setForceRefresh((prev) => prev + 1);
    }
  }, [address, fetchSubscriptionStatus]);

  // Load from localStorage on initial render
  useEffect(() => {
    const savedStatus = subscriptionService.getSubscriptionStatus();
    if (savedStatus) {
      setSubscriptionStatus(savedStatus);
    }
  }, []);

  // Fetch subscription status when wallet connects or when data is stale
  useEffect(() => {
    if (address) {
      // Check if we need to refresh the data
      if (!subscriptionStatus || subscriptionService.isSubscriptionStale()) {
        fetchSubscriptionStatus(address);
      }
    } else {
      // Clear subscription status when wallet disconnects
      setSubscriptionStatus(null);
      subscriptionService.clearSubscriptionStatus();
    }
  }, [
    address,
    subscriptionStatus,
    fetchSubscriptionStatus,
    forceRefresh,
  ]);

  return (
    <SubscriptionContext.Provider
      value={{
        subscriptionStatus,
        isLoading,
        error,
        refreshSubscription,
        isSubscribed: !!subscriptionStatus?.isActive,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};
