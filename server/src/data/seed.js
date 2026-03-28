import dotenv from 'dotenv';
import { connectDb } from '../config/db.js';
import { env } from '../config/env.js';
import { buildDefaultCharities } from './defaultCharities.js';
import { Charity } from '../models/Charity.js';
import { Donation } from '../models/Donation.js';
import { Plan } from '../models/Plan.js';
import { User } from '../models/User.js';
import { ensurePlansExist } from '../utils/ensurePlansExist.js';

dotenv.config({ path: 'server/.env' });

const run = async () => {
  await connectDb();
  await Promise.all([Charity.deleteMany({}), User.deleteMany({}), Donation.deleteMany({}), Plan.deleteMany({})]);

  const charities = await Charity.insertMany(buildDefaultCharities());
  await ensurePlansExist();

  const admin = await User.create({
    name: 'Platform Admin',
    email: env.adminEmail,
    password: env.adminPassword,
    role: 'admin',
    charity: charities[0]._id,
    contributionPercentage: 10,
    subscription: {
      plan: 'yearly',
      status: 'active',
      amount: 299,
      autoRenew: true,
      startDate: new Date(),
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      lastValidatedAt: new Date()
    }
  });

  const user = await User.create({
    name: 'Demo Subscriber',
    email: 'user@golfcharity.com',
    password: 'User@123',
    role: 'subscriber',
    charity: charities[1]._id,
    contributionPercentage: 15,
    scores: [
      { value: 7, date: new Date('2026-03-02') },
      { value: 14, date: new Date('2026-03-06') },
      { value: 22, date: new Date('2026-03-11') },
      { value: 31, date: new Date('2026-03-19') },
      { value: 42, date: new Date('2026-03-23') }
    ],
    subscription: {
      plan: 'monthly',
      status: 'active',
      amount: 29,
      autoRenew: true,
      startDate: new Date(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      lastValidatedAt: new Date()
    }
  });

  await Donation.insertMany([
    {
      user: admin._id,
      charity: charities[0]._id,
      amount: 29.9,
      type: 'subscription_share',
      note: 'Admin seed contribution'
    },
    {
      user: user._id,
      charity: charities[1]._id,
      amount: 4.35,
      type: 'subscription_share',
      note: 'Subscriber seed contribution'
    },
    {
      user: user._id,
      charity: charities[1]._id,
      amount: 25,
      type: 'independent',
      note: 'Community support'
    }
  ]);

  console.log('Seed complete');
  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
