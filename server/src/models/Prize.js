import mongoose from 'mongoose';

const prizeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    draw: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Draw',
      required: true
    },
    matchCount: {
      type: Number,
      enum: [3, 4, 5],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    proofImage: String,
    verificationStatus: {
      type: String,
      enum: ['not_submitted', 'pending', 'approved', 'rejected'],
      default: 'not_submitted'
    },
    payoutStatus: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending'
    },
    reviewedAt: Date,
    reviewNotes: String
  },
  { timestamps: true }
);

export const Prize = mongoose.model('Prize', prizeSchema);
