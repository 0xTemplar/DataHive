import { InputTransactionData } from '@aptos-labs/wallet-adapter-react';
import { moveToOctas } from '@/utils/aptos/octasToMove';

export interface CreateSubscriptionArguments {
  subscriptionType: string;
  autoRenew: boolean;
}

export interface CreateSubscriptionWithDelegationArguments {
  subscriptionType: string;
  autoRenew: boolean;
  delegationAmount: number;
}

/**
 * Creates a subscription using the wallet adapter format
 */
export const createSubscription = (
  args: CreateSubscriptionArguments
): InputTransactionData => {
  const { subscriptionType, autoRenew } = args;

  return {
    data: {
      function: `${process.env.NEXT_PUBLIC_CAMPAIGN_MANAGER_ADDRESS}::subscription::create_subscription`,
      typeArguments: ['0x1::aptos_coin::AptosCoin'],
      functionArguments: [subscriptionType, autoRenew],
    },
  };
};

/**
 * Creates a subscription with payment delegation using the wallet adapter format
 */
export const createSubscriptionWithDelegation = (
  args: CreateSubscriptionWithDelegationArguments
): InputTransactionData => {
  const { subscriptionType, autoRenew, delegationAmount } = args;

  return {
    data: {
      function: `${process.env.NEXT_PUBLIC_CAMPAIGN_MANAGER_ADDRESS}::subscription::create_subscription_with_delegation`,
      typeArguments: ['0x1::aptos_coin::AptosCoin'],
      functionArguments: [
        subscriptionType,
        autoRenew,
        moveToOctas(delegationAmount),
      ],
    },
  };
};

/**
 * Renews a subscription using the wallet adapter format
 */
export const renewSubscription = (): InputTransactionData => {
  return {
    data: {
      function: `${process.env.NEXT_PUBLIC_CAMPAIGN_MANAGER_ADDRESS}::subscription::renew_subscription`,
      typeArguments: ['0x1::aptos_coin::AptosCoin'],
      functionArguments: [],
    },
  };
};

/**
 * Cancels a subscription using the wallet adapter format
 */
export const cancelSubscription = (): InputTransactionData => {
  return {
    data: {
      function: `${process.env.NEXT_PUBLIC_CAMPAIGN_MANAGER_ADDRESS}::subscription::cancel_subscription`,
      typeArguments: [],
      functionArguments: [],
    },
  };
};

/**
 * Sets up payment delegation for subscription renewals
 */
export const setupPaymentDelegation = (
  amount: number
): InputTransactionData => {
  return {
    data: {
      function: `${process.env.NEXT_PUBLIC_CAMPAIGN_MANAGER_ADDRESS}::subscription::setup_payment_delegation`,
      typeArguments: ['0x1::aptos_coin::AptosCoin'],
      functionArguments: [moveToOctas(amount)],
    },
  };
};
