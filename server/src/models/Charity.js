import mongoose from 'mongoose';

const charitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true
    },
    category: {
      type: String,
      default: 'Community'
    },
    cause: {
      type: String,
      default: 'Community Support'
    },
    location: String,
    website: String,
    image: String,
    featured: {
      type: Boolean,
      default: false
    },
    shortDescription: String,
    description: String,
    impactMetric: {
      label: String,
      value: String
    },
    tags: {
      type: [String],
      default: []
    }
  },
  { timestamps: true }
);

export const Charity = mongoose.model('Charity', charitySchema);
