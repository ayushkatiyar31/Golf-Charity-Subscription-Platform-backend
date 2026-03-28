import mongoose from 'mongoose';

const paymentTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionRecord', default: null },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', default: null },
    provider: { type: String, enum: ['stripe', 'mock'], default: 'mock' },
    type: { type: String, enum: ['initial', 'renewal', 'manual'], default: 'initial' },
    status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending', index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'usd' },
    providerCheckoutSessionId: { type: String, default: '', index: true },
    providerPaymentIntentId: { type: String, default: '', index: true },
    providerInvoiceId: { type: String, default: '', index: true },
    paidAt: Date,
    failedAt: Date,
    metadata: { type: Object, default: {} }
  },
  { timestamps: true }
);

export const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);
