import { Plan } from '../models/Plan.js';
import { SubscriptionRecord } from '../models/SubscriptionRecord.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createError } from '../utils/createError.js';
import { syncUserSubscriptionSnapshot } from '../utils/subscriptionSync.js';

export const refreshSubscription = asyncHandler(async (req, _res, next) => {
  await syncUserSubscriptionSnapshot(req.user._id);
  const latestUser = await req.user.constructor.findById(req.user._id).populate('charity');
  const activeSubscription = await SubscriptionRecord.findOne({
    user: req.user._id,
    status: { $in: ['active', 'cancelled', 'past_due'] }
  })
    .populate('plan')
    .sort({ currentPeriodEnd: -1, createdAt: -1 });

  req.user = latestUser;
  req.subscriptionRecord = activeSubscription;
  next();
});

export const requireActiveSubscription = asyncHandler(async (req, _res, next) => {
  if (req.user?.role === 'admin') {
    next();
    return;
  }

  const subscription = req.subscriptionRecord ||
    (await SubscriptionRecord.findOne({ user: req.user._id, status: 'active' }).populate('plan').sort({ currentPeriodEnd: -1 }));

  if (!subscription) {
    throw createError(403, 'Active subscription required');
  }

  if (subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) < new Date()) {
    subscription.status = 'expired';
    subscription.endedAt = new Date();
    await subscription.save();
    await syncUserSubscriptionSnapshot(req.user._id);
    throw createError(403, 'Subscription expired');
  }

  req.subscriptionRecord = subscription;
  next();
});

export const attachPlans = asyncHandler(async (req, _res, next) => {
  req.availablePlans = await Plan.find({ isActive: true }).sort({ price: 1 });
  next();
});
