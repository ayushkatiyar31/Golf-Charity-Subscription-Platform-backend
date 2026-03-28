import { Plan } from '../models/Plan.js';
import { defaultPlans } from '../data/defaultPlans.js';
import { env } from '../config/env.js';

const resolveStripePriceId = (interval) => (interval === 'monthly' ? env.stripeMonthlyPriceId || '' : env.stripeYearlyPriceId || '');

export const ensurePlansExist = async () => {
  for (const plan of defaultPlans) {
    await Plan.findOneAndUpdate(
      { slug: plan.slug },
      {
        ...plan,
        stripePriceId: resolveStripePriceId(plan.interval)
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );
  }

  return Plan.find({ isActive: true }).sort({ price: 1 });
};
