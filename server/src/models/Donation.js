import mongoose from 'mongoose';

const donationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    charity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Charity',
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: ['subscription_share', 'independent'],
      required: true
    },
    note: String,
    referenceKey: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

donationSchema.index({ referenceKey: 1 }, { unique: true, partialFilterExpression: { referenceKey: { $type: 'string', $ne: '' } } });

export const Donation = mongoose.model('Donation', donationSchema);

