import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const scoreSchema = new mongoose.Schema(
  {
    value: {
      type: Number,
      min: 1,
      max: 45,
      required: true
    },
    date: {
      type: Date,
      required: true
    }
  },
  { _id: true }
);

const subscriptionSchema = new mongoose.Schema(
  {
    plan: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly'
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      default: 'expired'
    },
    amount: {
      type: Number,
      default: 0
    },
    autoRenew: {
      type: Boolean,
      default: true
    },
    paymentProvider: {
      type: String,
      default: 'mock-stripe'
    },
    startDate: Date,
    endDate: Date,
    lastValidatedAt: Date
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false
    },
    role: {
      type: String,
      enum: ['subscriber', 'admin'],
      default: 'subscriber'
    },
    charity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Charity'
    },
    contributionPercentage: {
      type: Number,
      min: 10,
      max: 100,
      default: 10
    },
    totalIndependentDonations: {
      type: Number,
      default: 0
    },
    scores: {
      type: [scoreSchema],
      default: []
    },
    subscription: {
      type: subscriptionSchema,
      default: () => ({})
    }
  },
  { timestamps: true }
);

userSchema.pre('save', async function preSave(next) {
  if (!this.isModified('password')) {
    next();
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = function matchPassword(password) {
  return bcrypt.compare(password, this.password);
};

export const User = mongoose.model('User', userSchema);
