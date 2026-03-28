import { Plan } from '../models/Plan.js';
import { SubscriptionRecord } from '../models/SubscriptionRecord.js';
import { User } from '../models/User.js';
import { getPlanAmount } from './drawEngine.js';

const durationToDate = (startDate, durationDays) => {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + durationDays);
  return endDate;
};

export const syncUserSubscriptionSnapshot = async (userId) => {
  const [user, activeSubscription] = await Promise.all([
    User.findById(userId),
    SubscriptionRecord.findOne({ user: userId, status: { $in: ['active', 'cancelled', 'past_due'] } })
      .populate('plan')
      .sort({ currentPeriodEnd: -1, createdAt: -1 })
  ]);

  if (!user) {
    return null;
  }

  if (!activeSubscription) {
    user.subscription = {
      plan: 'monthly',
      status: 'expired',
      amount: 0,
      autoRenew: false,
      paymentProvider: 'mock-stripe',
      startDate: null,
      endDate: null,
      lastValidatedAt: new Date()
    };
    user.markModified('subscription');
    await user.save();
    return null;
  }

  const now = new Date();
  let status = activeSubscription.status;
  if (activeSubscription.currentPeriodEnd && new Date(activeSubscription.currentPeriodEnd) < now && status === 'active') {
    status = 'expired';
    activeSubscription.status = 'expired';
    activeSubscription.endedAt = now;
    await activeSubscription.save();
  }

  const plan = activeSubscription.plan || (await Plan.findById(activeSubscription.plan));
  user.subscription = {
    plan: plan?.interval || 'monthly',
    status,
    amount: plan?.price || getPlanAmount(plan?.interval || 'monthly'),
    autoRenew: activeSubscription.autoRenew,
    paymentProvider: activeSubscription.provider,
    startDate: activeSubscription.currentPeriodStart,
    endDate: activeSubscription.currentPeriodEnd,
    lastValidatedAt: now
  };
  user.markModified('subscription');
  await user.save();
  return activeSubscription;
};

export const buildManualSubscriptionWindow = (plan, startDate = new Date()) => ({
  currentPeriodStart: startDate,
  currentPeriodEnd: durationToDate(startDate, plan.durationDays)
});
