import mongoose from 'mongoose';

const subscriptionRecordSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired', 'incomplete', 'past_due'],
      default: 'incomplete',
      index: true
    },
    provider: { type: String, enum: ['stripe', 'mock'], default: 'mock' },
    providerCustomerId: { type: String, default: '' },
    providerSubscriptionId: { type: String, default: '', index: true },
    providerCheckoutSessionId: { type: String, default: '', index: true },
    autoRenew: { type: Boolean, default: true },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelledAt: Date,
    endedAt: Date,
    lastWebhookEvent: { type: String, default: '' },
    metadata: { type: Object, default: {} }
  },
  { timestamps: true }
);

subscriptionRecordSchema.index({ user: 1, status: 1, currentPeriodEnd: -1 });

export const SubscriptionRecord = mongoose.model('SubscriptionRecord', subscriptionRecordSchema);
