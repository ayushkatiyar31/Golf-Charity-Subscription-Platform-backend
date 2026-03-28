export const defaultPlans = [
  {
    name: 'Monthly Plan',
    slug: 'monthly-plan',
    interval: 'monthly',
    price: 29,
    currency: 'usd',
    durationDays: 30,
    benefits: ['Full subscriber access', 'Monthly draw eligibility', 'Automated charity contribution tracking'],
    isDefault: true,
    discountLabel: ''
  },
  {
    name: 'Yearly Plan',
    slug: 'yearly-plan',
    interval: 'yearly',
    price: 299,
    currency: 'usd',
    durationDays: 365,
    benefits: ['Full subscriber access', 'Year-round draw eligibility', 'Discounted annual pricing', 'Automated charity contribution tracking'],
    isDefault: true,
    discountLabel: 'Save over monthly billing'
  }
];
