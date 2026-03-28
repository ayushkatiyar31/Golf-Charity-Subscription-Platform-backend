import { Charity } from '../models/Charity.js';
import { Donation } from '../models/Donation.js';
import { Draw } from '../models/Draw.js';
import { Prize } from '../models/Prize.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createError } from '../utils/createError.js';
import { sendPrizeReviewEmail } from '../utils/email.js';

export const getAdminAnalytics = asyncHandler(async (_req, res) => {
  const [totalUsers, totalPrizePool, charityContributions, totalDraws] = await Promise.all([
    User.countDocuments({ role: 'subscriber' }),
    Draw.aggregate([{ $group: { _id: null, total: { $sum: '$totalPool' } } }]),
    Donation.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
    Draw.countDocuments()
  ]);

  const payoutStats = await Prize.aggregate([
    {
      $group: {
        _id: '$payoutStatus',
        count: { $sum: 1 },
        total: { $sum: '$amount' }
      }
    }
  ]);

  res.json({
    totalUsers,
    totalPrizePool: totalPrizePool[0]?.total || 0,
    charityContributions: charityContributions[0]?.total || 0,
    totalDraws,
    payoutStats
  });
});

export const listUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().populate('charity').sort({ createdAt: -1 });
  res.json(users);
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw createError(404, 'User not found');
  }

  const allowedFields = ['name', 'role', 'contributionPercentage'];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  });

  if (req.body.charity) {
    const charity = await Charity.findById(req.body.charity);
    if (!charity) {
      throw createError(404, 'Charity not found');
    }
    user.charity = charity._id;
  }

  if (req.body.subscription) {
    user.subscription = {
      ...user.subscription,
      ...req.body.subscription
    };
  }

  if (req.body.scores) {
    user.scores = req.body.scores.slice(-5);
  }

  await user.save();
  res.json(await User.findById(user._id).populate('charity'));
});

export const getPendingProofs = asyncHandler(async (_req, res) => {
  const prizes = await Prize.find({ verificationStatus: { $in: ['pending', 'rejected', 'approved', 'not_submitted'] } })
    .populate('user', 'name email')
    .populate('draw', 'monthKey winningNumbers')
    .sort({ updatedAt: -1 });
  res.json(prizes);
});

export const reviewPrize = asyncHandler(async (req, res) => {
  const prize = await Prize.findById(req.params.id).populate('user', 'name email');
  if (!prize) {
    throw createError(404, 'Prize not found');
  }

  const { verificationStatus, payoutStatus, reviewNotes } = req.body;
  if (verificationStatus) {
    prize.verificationStatus = verificationStatus;
  }
  if (payoutStatus) {
    prize.payoutStatus = payoutStatus;
  }
  prize.reviewNotes = reviewNotes || prize.reviewNotes;
  prize.reviewedAt = new Date();
  await prize.save();
  sendPrizeReviewEmail({ user: prize.user, prize }).catch((error) => console.error('Prize review email failed', error.message));
  res.json(prize);
});
