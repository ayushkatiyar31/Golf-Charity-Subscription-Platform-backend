import { Charity } from '../models/Charity.js';
import { Donation } from '../models/Donation.js';
import { PaymentTransaction } from '../models/PaymentTransaction.js';
import { Plan } from '../models/Plan.js';
import { SubscriptionRecord } from '../models/SubscriptionRecord.js';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createError } from '../utils/createError.js';
import {
  sendCancellationEmail,
  sendSubscriptionEmail
} from '../utils/email.js';
import { ensurePlansExist } from '../utils/ensurePlansExist.js';
import {
  cancelStripeSubscription,
  constructWebhookEvent,
  createStripeCheckoutSession,
  getStripeCheckoutSession,
  isStripeEnabled,
  retrieveStripeSubscription
} from '../utils/stripe.js';
import { buildManualSubscriptionWindow, syncUserSubscriptionSnapshot } from '../utils/subscriptionSync.js';

const normalizeProviderStatus = (status) => {
  if (status === 'active' || status === 'trialing') return 'active';
  if (status === 'past_due' || status === 'unpaid') return 'past_due';
  if (status === 'canceled') return 'cancelled';
  if (status === 'incomplete' || status === 'incomplete_expired') return 'incomplete';
  return 'expired';
};
const getStripeGatewayIssues = (plan = null) => {
  const issues = [];

  if (!env.stripeSecretKey) issues.push('STRIPE_SECRET_KEY');
  if (!env.stripeWebhookSecret) issues.push('STRIPE_WEBHOOK_SECRET');
  if (!env.appUrl) issues.push('APP_URL');
  if (!env.clientUrl) issues.push('CLIENT_URL');

  if (plan && !plan.stripePriceId) {
    issues.push(plan.interval === 'monthly' ? 'STRIPE_MONTHLY_PRICE_ID' : 'STRIPE_YEARLY_PRICE_ID');
  }

  return [...new Set(issues)];
};

const assertStripeGatewayReady = (plan) => {
  const issues = getStripeGatewayIssues(plan);
  if (issues.length) {
    throw createError(503, 'Stripe is not fully configured. Missing: ' + issues.join(', '));
  }
};

const getPlanByInput = async ({ planId, interval }) => {
  await ensurePlansExist();
  if (planId) return Plan.findOne({ _id: planId, isActive: true });
  if (interval) return Plan.findOne({ interval, isActive: true });
  return Plan.findOne({ isDefault: true, isActive: true }).sort({ price: 1 });
};

const ensureCharity = async (req, charityId) => {
  const targetCharityId = charityId || req.user.charity;
  if (!targetCharityId) return null;
  const charity = await Charity.findById(targetCharityId);
  if (!charity) throw createError(404, 'Selected charity not found');
  req.user.charity = charity._id;
  await req.user.save();
  return charity;
};

const createDonationFromSubscription = async ({ user, plan, referenceKey = '' }) => {
  if (!user.charity) return null;
  const amount = Number(((plan.price * user.contributionPercentage) / 100).toFixed(2));

  if (referenceKey) {
    return Donation.findOneAndUpdate(
      { referenceKey },
      {
        user: user._id,
        charity: user.charity,
        amount,
        type: 'subscription_share',
        note: `${plan.name} subscription contribution`,
        referenceKey
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  return Donation.create({
    user: user._id,
    charity: user.charity,
    amount,
    type: 'subscription_share',
    note: `${plan.name} subscription contribution`
  });
};

const createManualSubscription = async ({ user, plan, autoRenew = true, provider = 'mock' }) => {
  const { currentPeriodStart, currentPeriodEnd } = buildManualSubscriptionWindow(plan);
  const subscription = await SubscriptionRecord.create({
    user: user._id,
    plan: plan._id,
    status: 'active',
    provider,
    autoRenew,
    cancelAtPeriodEnd: !autoRenew,
    currentPeriodStart,
    currentPeriodEnd,
    metadata: { source: 'manual-checkout' }
  });

  await PaymentTransaction.create({
    user: user._id,
    subscription: subscription._id,
    plan: plan._id,
    provider,
    type: 'initial',
    status: 'paid',
    amount: plan.price,
    currency: plan.currency,
    paidAt: new Date(),
    metadata: { source: 'manual-checkout' }
  });

  await createDonationFromSubscription({ user, plan, referenceKey: 'manual-subscription:' + subscription._id });
  await syncUserSubscriptionSnapshot(user._id);
  const refreshedUser = await User.findById(user._id);
  await sendSubscriptionEmail({ user: refreshedUser, plan: plan.name, amount: plan.price, endDate: currentPeriodEnd });
  return SubscriptionRecord.findById(subscription._id).populate('plan');
};

const upsertStripeSubscriptionRecord = async ({ checkoutSession, stripeSubscription, statusOverride }) => {
  const userId = checkoutSession.client_reference_id || checkoutSession.metadata?.userId;
  const planId = checkoutSession.metadata?.planId;
  const plan = planId ? await Plan.findById(planId) : await Plan.findOne({ stripePriceId: stripeSubscription?.items?.data?.[0]?.price?.id });
  const currentPeriodStart = stripeSubscription?.current_period_start ? new Date(stripeSubscription.current_period_start * 1000) : new Date();
  const currentPeriodEnd = stripeSubscription?.current_period_end ? new Date(stripeSubscription.current_period_end * 1000) : null;

  const subscription = await SubscriptionRecord.findOneAndUpdate(
    { providerSubscriptionId: stripeSubscription?.id || '' },
    {
      user: userId,
      plan: plan?._id,
      status: statusOverride || normalizeProviderStatus(stripeSubscription?.status),
      provider: 'stripe',
      providerCustomerId: checkoutSession.customer || stripeSubscription?.customer || '',
      providerSubscriptionId: stripeSubscription?.id || '',
      providerCheckoutSessionId: checkoutSession.id,
      autoRenew: !stripeSubscription?.cancel_at_period_end,
      cancelAtPeriodEnd: Boolean(stripeSubscription?.cancel_at_period_end),
      currentPeriodStart,
      currentPeriodEnd,
      lastWebhookEvent: statusOverride ? 'manual-confirmation' : '',
      metadata: {
        ...checkoutSession.metadata,
        latestInvoiceId: stripeSubscription?.latest_invoice || ''
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { subscription, plan };
};

const createOrUpdateTransaction = async ({ userId, subscriptionId, planId, amount, currency, status, checkoutSessionId, paymentIntentId = '', invoiceId = '', metadata = {}, type = 'initial' }) =>
  PaymentTransaction.findOneAndUpdate(
    { providerCheckoutSessionId: checkoutSessionId || '', providerInvoiceId: invoiceId || '' },
    {
      user: userId,
      subscription: subscriptionId,
      plan: planId,
      provider: checkoutSessionId ? 'stripe' : 'mock',
      type,
      status,
      amount,
      currency: currency || 'usd',
      providerCheckoutSessionId: checkoutSessionId || '',
      providerPaymentIntentId: paymentIntentId,
      providerInvoiceId: invoiceId,
      paidAt: status === 'paid' ? new Date() : null,
      failedAt: status === 'failed' ? new Date() : null,
      metadata
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

export const getSubscriptionStatus = asyncHandler(async (req, res) => {
  const plans = await ensurePlansExist();
  const currentSubscription = req.subscriptionRecord || null;
  const transactions = await PaymentTransaction.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(10);
  const paymentGatewayIssues = [...new Set(getStripeGatewayIssues().concat(plans.flatMap((plan) => getStripeGatewayIssues(plan))))];
  res.json({
    currentSubscription,
    plans,
    transactions,
    snapshot: req.user.subscription || {},
    paymentGatewayReady: paymentGatewayIssues.length === 0 && isStripeEnabled(),
    paymentGatewayIssues
  });
});

export const createSubscription = asyncHandler(async (req, res) => {
  const { planId, interval = 'monthly', autoRenew = true, charityId } = req.body;
  const plan = await getPlanByInput({ planId, interval });
  if (!plan) throw createError(404, 'Plan not found');
  await ensureCharity(req, charityId);

  assertStripeGatewayReady(plan);

  const session = await createStripeCheckoutSession({
    user: req.user,
    plan,
    autoRenew,
    charityId: req.user.charity?._id?.toString?.() || req.user.charity?.toString?.() || ''
  });

  await PaymentTransaction.create({
    user: req.user._id,
    plan: plan._id,
    provider: 'stripe',
    type: 'initial',
    status: 'pending',
    amount: plan.price,
    currency: plan.currency,
    providerCheckoutSessionId: session.id,
    metadata: session.metadata || {}
  });

  res.json({ provider: 'stripe', mode: 'redirect', url: session.url, sessionId: session.id });
});

export const createCheckoutSession = asyncHandler(async (req, res) => {
  const { planId, interval = 'monthly', autoRenew = true, charityId } = req.body;
  const plan = await getPlanByInput({ planId, interval });
  if (!plan) throw createError(404, 'Plan not found');
  await ensureCharity(req, charityId);

  assertStripeGatewayReady(plan);

  const session = await createStripeCheckoutSession({
    user: req.user,
    plan,
    autoRenew,
    charityId: req.user.charity?._id?.toString?.() || req.user.charity?.toString?.() || ''
  });

  await PaymentTransaction.create({
    user: req.user._id,
    plan: plan._id,
    provider: 'stripe',
    type: 'initial',
    status: 'pending',
    amount: plan.price,
    currency: plan.currency,
    providerCheckoutSessionId: session.id,
    metadata: session.metadata || {}
  });

  res.json({ provider: 'stripe', mode: 'redirect', url: session.url, sessionId: session.id });
});

export const confirmCheckoutSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) throw createError(400, 'Session id is required');
  if (!isStripeEnabled()) {
    throw createError(503, 'Subscription confirmation requires successful payment through the configured gateway');
  }

  const session = await getStripeCheckoutSession(sessionId);
  if (!session || session.payment_status !== 'paid') throw createError(400, 'Checkout session is not paid');
  const stripeSubscription = typeof session.subscription === 'object' ? session.subscription : await retrieveStripeSubscription(session.subscription);
  const { subscription, plan } = await upsertStripeSubscriptionRecord({ checkoutSession: session, stripeSubscription, statusOverride: 'active' });

  await createOrUpdateTransaction({
    userId: req.user._id,
    subscriptionId: subscription._id,
    planId: plan?._id,
    amount: plan?.price || 0,
    currency: plan?.currency || 'usd',
    status: 'paid',
    checkoutSessionId: session.id,
    paymentIntentId: session.payment_intent || '',
    invoiceId: stripeSubscription?.latest_invoice || '',
    metadata: session.metadata || {},
    type: 'initial'
  });

  if (plan) await createDonationFromSubscription({ user: req.user, plan, referenceKey: 'stripe-checkout:' + session.id });
  await syncUserSubscriptionSnapshot(req.user._id);
  res.json({ message: 'Stripe subscription confirmed', subscription });
});

export const cancelSubscription = asyncHandler(async (req, res) => {
  const currentSubscription = await SubscriptionRecord.findOne({ user: req.user._id, status: { $in: ['active', 'past_due', 'cancelled'] } }).populate('plan').sort({ currentPeriodEnd: -1, createdAt: -1 });
  if (!currentSubscription) throw createError(404, 'No subscription found');

  if (currentSubscription.provider === 'stripe' && currentSubscription.providerSubscriptionId && isStripeEnabled()) {
    await cancelStripeSubscription(currentSubscription.providerSubscriptionId);
  }

  currentSubscription.status = 'cancelled';
  currentSubscription.autoRenew = false;
  currentSubscription.cancelAtPeriodEnd = true;
  currentSubscription.cancelledAt = new Date();
  await currentSubscription.save();
  await syncUserSubscriptionSnapshot(req.user._id);
  sendCancellationEmail({ user: req.user, endDate: currentSubscription.currentPeriodEnd }).catch((error) => console.error('Cancellation email failed', error.message));
  res.json({ message: 'Subscription cancelled', subscription: currentSubscription });
});

export const addIndependentDonation = asyncHandler(async (req, res) => {
  const { amount, charityId, note } = req.body;
  if (!amount || Number(amount) <= 0) throw createError(400, 'Donation amount must be greater than zero');
  const charity = charityId || req.user.charity;
  if (!charity) throw createError(400, 'A charity is required for donations');

  await Donation.create({ user: req.user._id, charity, amount: Number(amount), type: 'independent', note });
  req.user.totalIndependentDonations += Number(amount);
  await req.user.save();
  res.status(201).json({ message: 'Donation recorded' });
});

export const stripeWebhook = asyncHandler(async (req, res) => {
  if (!isStripeEnabled()) throw createError(400, 'Stripe is not configured');
  const signature = req.headers['stripe-signature'];
  const event = constructWebhookEvent(req.body, signature);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const stripeSubscription = await retrieveStripeSubscription(session.subscription);
    const { subscription, plan } = await upsertStripeSubscriptionRecord({ checkoutSession: session, stripeSubscription, statusOverride: 'active' });
    await createOrUpdateTransaction({
      userId: subscription.user,
      subscriptionId: subscription._id,
      planId: plan?._id,
      amount: plan?.price || 0,
      currency: plan?.currency || 'usd',
      status: 'paid',
      checkoutSessionId: session.id,
      paymentIntentId: session.payment_intent || '',
      invoiceId: stripeSubscription?.latest_invoice || '',
      metadata: session.metadata || {},
      type: 'initial'
    });
    const user = await User.findById(subscription.user);
    if (user && plan) {
      await createDonationFromSubscription({ user, plan, referenceKey: 'stripe-checkout:' + session.id });
      await syncUserSubscriptionSnapshot(user._id);
    }
  }

  if (event.type === 'invoice.paid') {
    const invoice = event.data.object;
    const subscription = await SubscriptionRecord.findOne({ providerSubscriptionId: invoice.subscription }).populate('plan');
    if (subscription) {
      subscription.status = 'active';
      subscription.currentPeriodStart = invoice.lines?.data?.[0]?.period?.start ? new Date(invoice.lines.data[0].period.start * 1000) : subscription.currentPeriodStart;
      subscription.currentPeriodEnd = invoice.lines?.data?.[0]?.period?.end ? new Date(invoice.lines.data[0].period.end * 1000) : subscription.currentPeriodEnd;
      subscription.lastWebhookEvent = event.type;
      await subscription.save();
      await createOrUpdateTransaction({
        userId: subscription.user,
        subscriptionId: subscription._id,
        planId: subscription.plan?._id,
        amount: invoice.amount_paid ? invoice.amount_paid / 100 : subscription.plan?.price || 0,
        currency: invoice.currency || subscription.plan?.currency || 'usd',
        status: 'paid',
        checkoutSessionId: subscription.providerCheckoutSessionId || '',
        paymentIntentId: invoice.payment_intent || '',
        invoiceId: invoice.id,
        metadata: { webhook: 'invoice.paid' },
        type: 'renewal'
      });
      await syncUserSubscriptionSnapshot(subscription.user);
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    const subscription = await SubscriptionRecord.findOne({ providerSubscriptionId: invoice.subscription }).populate('plan');
    if (subscription) {
      subscription.status = 'past_due';
      subscription.lastWebhookEvent = event.type;
      await subscription.save();
      await createOrUpdateTransaction({
        userId: subscription.user,
        subscriptionId: subscription._id,
        planId: subscription.plan?._id,
        amount: invoice.amount_due ? invoice.amount_due / 100 : subscription.plan?.price || 0,
        currency: invoice.currency || subscription.plan?.currency || 'usd',
        status: 'failed',
        checkoutSessionId: subscription.providerCheckoutSessionId || '',
        paymentIntentId: invoice.payment_intent || '',
        invoiceId: invoice.id,
        metadata: { webhook: 'invoice.payment_failed' },
        type: 'renewal'
      });
      await syncUserSubscriptionSnapshot(subscription.user);
    }
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const stripeSubscription = event.data.object;
    const subscription = await SubscriptionRecord.findOne({ providerSubscriptionId: stripeSubscription.id });
    if (subscription) {
      subscription.status = event.type === 'customer.subscription.deleted' ? 'expired' : normalizeProviderStatus(stripeSubscription.status);
      subscription.autoRenew = !stripeSubscription.cancel_at_period_end;
      subscription.cancelAtPeriodEnd = Boolean(stripeSubscription.cancel_at_period_end);
      subscription.currentPeriodStart = stripeSubscription.current_period_start ? new Date(stripeSubscription.current_period_start * 1000) : subscription.currentPeriodStart;
      subscription.currentPeriodEnd = stripeSubscription.current_period_end ? new Date(stripeSubscription.current_period_end * 1000) : subscription.currentPeriodEnd;
      if (stripeSubscription.canceled_at) subscription.cancelledAt = new Date(stripeSubscription.canceled_at * 1000);
      if (event.type === 'customer.subscription.deleted') subscription.endedAt = new Date();
      subscription.lastWebhookEvent = event.type;
      await subscription.save();
      await syncUserSubscriptionSnapshot(subscription.user);
    }
  }

  res.json({ received: true });
});







