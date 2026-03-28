import mongoose from 'mongoose';

const drawEntrySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    scoreValues: {
      type: [Number],
      default: []
    },
    matchCount: {
      type: Number,
      default: 0
    },
    prizeAmount: {
      type: Number,
      default: 0
    }
  },
  { _id: false }
);

const drawSchema = new mongoose.Schema(
  {
    monthKey: {
      type: String,
      required: true,
      unique: true
    },
    logic: {
      type: String,
      enum: ['random', 'algorithm'],
      default: 'random'
    },
    status: {
      type: String,
      enum: ['draft', 'simulated', 'published'],
      default: 'draft'
    },
    winningNumbers: {
      type: [Number],
      default: []
    },
    basePool: {
      type: Number,
      default: 0
    },
    totalPool: {
      type: Number,
      default: 0
    },
    rolloverFromPrevious: {
      type: Number,
      default: 0
    },
    rolloverToNext: {
      type: Number,
      default: 0
    },
    resultsPublishedAt: Date,
    entries: {
      type: [drawEntrySchema],
      default: []
    }
  },
  { timestamps: true }
);

export const Draw = mongoose.model('Draw', drawSchema);
