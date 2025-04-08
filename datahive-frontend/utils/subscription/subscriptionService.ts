import axios from 'axios';

export interface SubscriptionStatus {
  isActive: boolean;
  endTime: string | null;
  subscriptionType: string | null;
  autoRenew: boolean;
  lastUpdated?: string;
}

const STORAGE_KEY = 'hive_subscription_status';

export const subscriptionService = {
  async fetchSubscriptionStatus(address: string): Promise<SubscriptionStatus> {
    try {
      const response = await axios.get(
        `/api/subscription/getSubscriptionStatus?address=${address}`
      );
      const status = response.data.status;

      // Save to localStorage
      this.saveSubscriptionStatus(status);

      return status;
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      return {
        isActive: false,
        endTime: null,
        subscriptionType: null,
        autoRenew: false,
      };
    }
  },

  saveSubscriptionStatus(status: SubscriptionStatus): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...status,
          lastUpdated: new Date().toISOString(),
        })
      );
    }
  },

  getSubscriptionStatus(): SubscriptionStatus | null {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    }
    return null;
  },

  clearSubscriptionStatus(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  },

  isSubscriptionActive(): boolean {
    const status = this.getSubscriptionStatus();
    return !!status?.isActive;
  },

  // Check if the subscription data is stale (older than 1 hour)
  isSubscriptionStale(): boolean {
    const status = this.getSubscriptionStatus();
    if (!status || !status.lastUpdated) return true;

    const lastUpdated = new Date(status.lastUpdated);
    const now = new Date();
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds

    return now.getTime() - lastUpdated.getTime() > oneHour;
  },
};
