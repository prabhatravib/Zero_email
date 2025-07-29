// Simplified billing hook without Autumn dependencies
export const useBilling = () => {
  return {
    isLoading: false,
    customer: null,
    refetch: () => {},
    attach: () => {},
    track: () => {},
    openBillingPortal: () => {},
    isPro: false,
    chatMessages: {
      total: 0,
      remaining: 0,
      unlimited: true,
      enabled: true,
      usage: 0,
      nextResetAt: null,
      interval: '',
      included_usage: 0,
    },
    connections: {
      total: 0,
      remaining: 0,
      unlimited: true,
      enabled: true,
      usage: 0,
      nextResetAt: null,
      interval: '',
      included_usage: 0,
    },
    brainActivity: {
      total: 0,
      remaining: 0,
      unlimited: true,
      enabled: true,
      usage: 0,
      nextResetAt: null,
      interval: '',
      included_usage: 0,
    },
  };
};
