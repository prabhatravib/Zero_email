import { signOut } from '@/lib/auth-client';
import { useEffect, useMemo } from 'react';

type FeatureState = {
  total: number;
  remaining: number;
  unlimited: boolean;
  enabled: boolean;
  usage: number;
  nextResetAt: number | null;
  interval: string;
  included_usage: number;
};

type Features = {
  chatMessages: FeatureState;
  connections: FeatureState;
  brainActivity: FeatureState;
};

const DEFAULT_FEATURES: Features = {
  chatMessages: {
    total: 100,
    remaining: 100,
    unlimited: true,
    enabled: true,
    usage: 0,
    nextResetAt: null,
    interval: '',
    included_usage: 100,
  },
  connections: {
    total: 5,
    remaining: 5,
    unlimited: true,
    enabled: true,
    usage: 0,
    nextResetAt: null,
    interval: '',
    included_usage: 5,
  },
  brainActivity: {
    total: 50,
    remaining: 50,
    unlimited: true,
    enabled: true,
    usage: 0,
    nextResetAt: null,
    interval: '',
    included_usage: 50,
  },
};

const FEATURE_IDS = {
  CHAT: 'chat-messages',
  CONNECTIONS: 'connections',
  BRAIN: 'brain-activity',
} as const;

const PRO_PLANS = ['pro-example', 'pro_annual', 'team', 'enterprise'] as const;

export const useBilling = () => {
  // Mock customer data - all features enabled for development
  const customer = {
    id: 'mock-customer',
    email: 'user@example.com',
    features: {
      [FEATURE_IDS.CHAT]: {
        included_usage: 100,
        balance: 100,
        unlimited: true,
        usage: 0,
        next_reset_at: null,
        interval: 'monthly',
      },
      [FEATURE_IDS.CONNECTIONS]: {
        included_usage: 5,
        balance: 5,
        unlimited: true,
        usage: 0,
        next_reset_at: null,
        interval: 'monthly',
      },
      [FEATURE_IDS.BRAIN]: {
        included_usage: 50,
        balance: 50,
        unlimited: true,
        usage: 0,
        next_reset_at: null,
        interval: 'monthly',
      },
    },
    products: [{ id: 'pro-example', name: 'Pro Plan' }],
  };

  const isLoading = false;
  const error = null;

  useEffect(() => {
    if (error) signOut();
  }, [error]);

  const { isPro, ...customerFeatures } = useMemo(() => {
    const isPro = true; // Mock as pro user for development

    if (!customer?.features) return { isPro, ...DEFAULT_FEATURES };

    const features = { ...DEFAULT_FEATURES };

    if (customer.features[FEATURE_IDS.CHAT]) {
      const feature = customer.features[FEATURE_IDS.CHAT];
      features.chatMessages = {
        total: feature.included_usage || 0,
        remaining: feature.balance || 0,
        unlimited: feature.unlimited ?? false,
        enabled: (feature.unlimited ?? false) || Number(feature.balance) > 0,
        usage: feature.usage || 0,
        nextResetAt: feature.next_reset_at ?? null,
        interval: feature.interval || '',
        included_usage: feature.included_usage || 0,
      };
    }

    if (customer.features[FEATURE_IDS.CONNECTIONS]) {
      const feature = customer.features[FEATURE_IDS.CONNECTIONS];
      features.connections = {
        total: feature.included_usage || 0,
        remaining: feature.balance || 0,
        unlimited: feature.unlimited ?? false,
        enabled: (feature.unlimited ?? false) || Number(feature.balance) > 0,
        usage: feature.usage || 0,
        nextResetAt: feature.next_reset_at ?? null,
        interval: feature.interval || '',
        included_usage: feature.included_usage || 0,
      };
    }

    if (customer.features[FEATURE_IDS.BRAIN]) {
      const feature = customer.features[FEATURE_IDS.BRAIN];
      features.brainActivity = {
        total: feature.included_usage || 0,
        remaining: feature.balance || 0,
        unlimited: feature.unlimited ?? false,
        enabled: (feature.unlimited ?? false) || Number(feature.balance) > 0,
        usage: feature.usage || 0,
        nextResetAt: feature.next_reset_at ?? null,
        interval: feature.interval || '',
        included_usage: feature.included_usage || 0,
      };
    }

    return { isPro, ...features };
  }, [customer]);

  // Mock functions that do nothing
  const refetch = () => Promise.resolve();
  const attach = () => Promise.resolve();
  const track = () => Promise.resolve();
  const openBillingPortal = () => Promise.resolve();

  return {
    isLoading,
    customer,
    refetch,
    attach,
    track,
    openBillingPortal,
    isPro,
    ...customerFeatures,
  };
};
