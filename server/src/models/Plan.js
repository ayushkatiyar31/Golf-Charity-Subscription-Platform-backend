import mongoose from 'mongoose';

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    interval: { type: String, enum: ['monthly', 'yearly'], required: true },
    price: { type: Number, required: true },
    currency: { type: String, default: 'usd' },
    durationDays: { type: Number, required: true },
    benefits: { type: [String], default: [] },
    stripePriceId: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    discountLabel: { type: String, default: '' }
  },
  { timestamps: true }
);

export const Plan = mongoose.model('Plan', planSchema);
