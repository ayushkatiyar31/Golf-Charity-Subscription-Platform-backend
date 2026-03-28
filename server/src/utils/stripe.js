import Stripe from 'stripe';
import { env } from '../config/env.js';

export const stripe = env.stripeSecretKey ? new Stripe(env.stripeSecretKey) : null;

export const isStripeEnabled = () => Boolean(stripe);

export const createStripeCheckoutSession = async ({ user, plan, autoRenew = true, charityId = '' }) => {
  if (!stripe) {
    return null;
  }

  if (!plan.stripePriceId) {
    throw new Error(`Missing Stripe price id for plan ${plan.slug}`);
  }

  return stripe.checkout.sessions.create({
    mode: 'subscription',
    success_url: `${env.appUrl}/subscribe?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.appUrl}/subscribe?checkout=cancelled`,
    customer_email: user.email,
    client_reference_id: user._id.toString(),
    metadata: {
      userId: user._id.toString(),
      planId: plan._id.toString(),
      charityId: charityId || '',
      autoRenew: String(autoRenew)
    },
    subscription_data: {
      metadata: {
        userId: user._id.toString(),
        planId: plan._id.toString(),
        charityId: charityId || ''
      }
    },
    line_items: [
      {
        price: plan.stripePriceId,
        quantity: 1
      }
    ]
  });
};

export const getStripeCheckoutSession = async (sessionId) => {
  if (!stripe) {
    return null;
  }
  return stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });
};

export const retrieveStripeSubscription = async (subscriptionId) => {
  if (!stripe) {
    return null;
  }
  return stripe.subscriptions.retrieve(subscriptionId);
};

export const cancelStripeSubscription = async (subscriptionId) => {
  if (!stripe || !subscriptionId) {
    return null;
  }
  return stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
};

export const constructWebhookEvent = (payload, signature) => {
  if (!stripe || !env.stripeWebhookSecret) {
    throw new Error('Stripe webhook is not configured');
  }
  return stripe.webhooks.constructEvent(payload, signature, env.stripeWebhookSecret);
};

