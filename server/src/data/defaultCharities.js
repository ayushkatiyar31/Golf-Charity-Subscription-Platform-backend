import { slugify } from '../utils/slugify.js';

export const defaultCharities = [
  {
    name: 'Bright Futures Youth Trust',
    category: 'Education',
    cause: 'Youth Education',
    location: 'Austin, TX',
    website: 'https://brightfutures.example.org',
    featured: true,
    image: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'Funding after-school mentorship and confidence-building programs.',
    description: 'Bright Futures Youth Trust creates safe, vibrant spaces where young people can learn, play, and build long-term resilience.',
    impactMetric: { label: 'Students supported', value: '4,200+' },
    tags: ['education', 'youth', 'mentorship']
  },
  {
    name: 'Waterline Community Relief',
    category: 'Health',
    cause: 'Clean Water & Family Health',
    location: 'San Diego, CA',
    website: 'https://waterline.example.org',
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'Delivering clean water and emergency family support.',
    description: 'Waterline Community Relief funds local infrastructure, supplies, and emergency response for families dealing with hardship.',
    impactMetric: { label: 'Families reached', value: '18,000+' },
    tags: ['water', 'health', 'families']
  },
  {
    name: 'Open Horizon Recovery Fund',
    category: 'Community',
    cause: 'Community Recovery',
    location: 'Denver, CO',
    website: 'https://openhorizon.example.org',
    image: 'https://images.unsplash.com/photo-1469571486292-b53601020f00?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'Supporting community-led recovery and wellbeing projects.',
    description: 'Open Horizon Recovery Fund backs practical, neighborhood-scale projects that make recovery visible and sustainable.',
    impactMetric: { label: 'Projects launched', value: '127' },
    tags: ['community', 'recovery', 'wellbeing']
  },
  {
    name: 'Green Roots Climate Initiative',
    category: 'Environment',
    cause: 'Climate Action',
    location: 'Portland, OR',
    website: 'https://greenroots.example.org',
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'Restoring ecosystems through urban planting and local conservation.',
    description: 'Green Roots Climate Initiative supports reforestation, school garden programs, and local climate resilience projects.',
    impactMetric: { label: 'Trees planted', value: '95,000+' },
    tags: ['environment', 'climate', 'conservation']
  },
  {
    name: 'Safe Harbor Shelter Network',
    category: 'Housing',
    cause: 'Emergency Shelter',
    location: 'Chicago, IL',
    website: 'https://safeharbor.example.org',
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'Providing rapid shelter placement and housing stabilization support.',
    description: 'Safe Harbor Shelter Network connects vulnerable individuals and families with emergency housing and pathways toward long-term stability.',
    impactMetric: { label: 'Nights of shelter funded', value: '62,000+' },
    tags: ['housing', 'shelter', 'stability']
  },
  {
    name: 'CareBridge Medical Outreach',
    category: 'Health',
    cause: 'Access to Care',
    location: 'Atlanta, GA',
    website: 'https://carebridge.example.org',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'Mobile clinics and preventive screenings for underserved communities.',
    description: 'CareBridge Medical Outreach brings preventive care, screenings, and health education directly into neighborhoods with limited access to treatment.',
    impactMetric: { label: 'Patients screened', value: '31,500+' },
    tags: ['healthcare', 'outreach', 'prevention']
  },
  {
    name: 'Harvest Hope Food Collective',
    category: 'Hunger Relief',
    cause: 'Food Security',
    location: 'Nashville, TN',
    website: 'https://harvesthope.example.org',
    image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'Expanding neighborhood food access with dignity-first community markets.',
    description: 'Harvest Hope Food Collective funds mobile pantries, community fridges, and healthy-meal partnerships for families facing food insecurity.',
    impactMetric: { label: 'Meals funded', value: '540,000+' },
    tags: ['food', 'families', 'community']
  },
  {
    name: 'Next Step Veterans Alliance',
    category: 'Veteran Support',
    cause: 'Veteran Wellbeing',
    location: 'Phoenix, AZ',
    website: 'https://nextstepveterans.example.org',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'Helping veterans transition into stable housing, employment, and care.',
    description: 'Next Step Veterans Alliance connects former service members with career coaching, mental health support, and housing navigation.',
    impactMetric: { label: 'Veterans assisted', value: '8,900+' },
    tags: ['veterans', 'housing', 'employment']
  },
  {
    name: 'OceanKind Rescue Project',
    category: 'Environment',
    cause: 'Marine Conservation',
    location: 'Miami, FL',
    website: 'https://oceankind.example.org',
    image: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'Protecting coastlines, marine habitats, and rescue operations for sea life.',
    description: 'OceanKind Rescue Project supports shoreline cleanups, coral restoration, and marine animal rescue teams across vulnerable coastal areas.',
    impactMetric: { label: 'Coastal miles restored', value: '210+' },
    tags: ['ocean', 'conservation', 'wildlife']
  },
  {
    name: 'Rise Together Women Network',
    category: 'Empowerment',
    cause: 'Women and Girls',
    location: 'New York, NY',
    website: 'https://risetogether.example.org',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'Investing in mentorship, safety, and entrepreneurship for women and girls.',
    description: 'Rise Together Women Network provides education grants, leadership development, and emergency support for women building safer futures.',
    impactMetric: { label: 'Women funded', value: '12,400+' },
    tags: ['women', 'mentorship', 'leadership']
  }
];

export const buildDefaultCharities = () =>
  defaultCharities.map((charity) => ({
    ...charity,
    slug: slugify(charity.name)
  }));
