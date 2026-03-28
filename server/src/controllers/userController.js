import { Charity } from '../models/Charity.js';
import { Donation } from '../models/Donation.js';
import { Draw } from '../models/Draw.js';
import { Prize } from '../models/Prize.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { buildDrawOutcome } from '../utils/drawEngine.js';
import {
  sendDrawPublishedEmail,
  sendPrizeProofReceivedEmail
} from '../utils/email.js';
import { createError } from '../utils/createError.js';

const getMonthKey = (rawMonth) => rawMonth || new Date().toISOString().slice(0, 7);

export const getDashboard = asyncHandler(async (req, res) => {
  const draws = await Draw.find({ 'entries.user': req.user._id, status: 'published' }).sort({ createdAt: -1 }).limit(6);
  const prizes = await Prize.find({ user: req.user._id }).populate('draw').sort({ createdAt: -1 });
  const donations = await Donation.find({ user: req.user._id }).populate('charity').sort({ createdAt: -1 }).limit(10);

  const drawHistory = draws.map((draw) => {
    const entry = draw.entries.find((item) => item.user.toString() === req.user._id.toString());
    return {
      drawId: draw._id,
      monthKey: draw.monthKey,
      winningNumbers: draw.winningNumbers,
      scoreValues: entry?.scoreValues || [],
      matchCount: entry?.matchCount || 0,
      prizeAmount: entry?.prizeAmount || 0
    };
  });

  const winnings = prizes.reduce(
    (acc, prize) => {
      acc.total += prize.amount;
      if (prize.payoutStatus === 'paid') {
        acc.paid += prize.amount;
      } else {
        acc.pending += prize.amount;
      }
      return acc;
    },
    { total: 0, pending: 0, paid: 0 }
  );

  res.json({
    profile: req.user,
    drawHistory,
    prizes,
    donations,
    winnings
  });
});

export const updatePreferences = asyncHandler(async (req, res) => {
  const { charityId, contributionPercentage } = req.body;

  if (charityId) {
    const charity = await Charity.findById(charityId);
    if (!charity) {
      throw createError(404, 'Selected charity not found');
    }
    req.user.charity = charity._id;
  }

  if (contributionPercentage !== undefined) {
    const percentage = Number(contributionPercentage);
    if (Number.isNaN(percentage) || percentage < 10 || percentage > 100) {
      throw createError(400, 'Contribution percentage must be between 10 and 100');
    }
    req.user.contributionPercentage = percentage;
  }

  await req.user.save();
  const updatedUser = await User.findById(req.user._id).populate('charity');
  res.json(updatedUser);
});

export const addScore = asyncHandler(async (req, res) => {
  const { value, date } = req.body;
  if (!value || Number(value) < 1 || Number(value) > 45) {
    throw createError(400, 'Score must be between 1 and 45');
  }

  req.user.scores.push({ value: Number(value), date });
  req.user.scores = req.user.scores
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-5);

  await req.user.save();
  const scores = [...req.user.scores].sort((a, b) => new Date(b.date) - new Date(a.date));
  res.status(201).json(scores);
});

export const updateScore = asyncHandler(async (req, res) => {
  const score = req.user.scores.id(req.params.scoreId);
  if (!score) {
    throw createError(404, 'Score not found');
  }

  if (req.body.value) {
    const value = Number(req.body.value);
    if (value < 1 || value > 45) {
      throw createError(400, 'Score must be between 1 and 45');
    }
    score.value = value;
  }

  if (req.body.date) {
    score.date = req.body.date;
  }

  req.user.scores = req.user.scores
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-5);
  await req.user.save();

  res.json([...req.user.scores].sort((a, b) => new Date(b.date) - new Date(a.date)));
});

export const getScores = asyncHandler(async (req, res) => {
  const scores = [...req.user.scores].sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(scores);
});

export const listUserPrizes = asyncHandler(async (req, res) => {
  const prizes = await Prize.find({ user: req.user._id }).populate('draw').sort({ createdAt: -1 });
  res.json(prizes);
});

export const submitPrizeProof = asyncHandler(async (req, res) => {
  const prize = await Prize.findOne({ _id: req.params.prizeId, user: req.user._id });
  if (!prize) {
    throw createError(404, 'Prize not found');
  }

  if (!req.file) {
    throw createError(400, 'Proof image is required');
  }

  prize.proofImage = `/uploads/${req.file.filename}`;
  prize.verificationStatus = 'pending';
  await prize.save();
  sendPrizeProofReceivedEmail({ user: req.user, prize }).catch((error) =>
    console.error('Prize proof email failed', error.message)
  );
  res.json(prize);
});

export const listPublishedDraws = asyncHandler(async (_req, res) => {
  const draws = await Draw.find({ status: 'published' }).sort({ createdAt: -1 }).limit(12);
  res.json(draws);
});

export const previewDraw = asyncHandler(async (req, res) => {
  const users = await User.find().populate('charity');
  const latestPublished = await Draw.findOne({ status: 'published' }).sort({ createdAt: -1 });
  const result = buildDrawOutcome({ users, logic: req.body.logic || 'random', rollover: latestPublished?.rolloverToNext || 0 });

  res.json({
    monthKey: getMonthKey(req.body.monthKey),
    logic: req.body.logic || 'random',
    ...result
  });
});

export const publishDraw = asyncHandler(async (req, res) => {
  const monthKey = getMonthKey(req.body.monthKey);
  const existing = await Draw.findOne({ monthKey });
  if (existing?.status === 'published') {
    throw createError(409, 'Draw already published for this month');
  }

  const users = await User.find();
  const latestPublished = await Draw.findOne({ status: 'published' }).sort({ createdAt: -1 });
  const result = buildDrawOutcome({ users, logic: req.body.logic || 'random', rollover: latestPublished?.rolloverToNext || 0 });

  const draw = existing || new Draw({ monthKey });
  draw.logic = req.body.logic || 'random';
  draw.status = 'published';
  draw.winningNumbers = result.winningNumbers;
  draw.basePool = result.basePool;
  draw.totalPool = result.totalPool;
  draw.rolloverFromPrevious = result.rollover;
  draw.rolloverToNext = result.rolloverToNext;
  draw.resultsPublishedAt = new Date();
  draw.entries = result.entries.map((entry) => ({
    ...entry,
    prizeAmount: result.prizeMap[entry.user.toString()]?.amount || 0
  }));
  await draw.save();

  await Prize.deleteMany({ draw: draw._id });
  const prizeDocs = Object.entries(result.prizeMap).map(([user, prize]) => ({
    user,
    draw: draw._id,
    matchCount: prize.matchCount,
    amount: prize.amount,
    payoutStatus: 'pending',
    verificationStatus: 'not_submitted'
  }));
  if (prizeDocs.length) {
    await Prize.insertMany(prizeDocs);
  }

  const recipientEmails = users.filter((user) => user.subscription?.status === 'active').map((user) => user.email);
  await Promise.all(
    recipientEmails.map((email) =>
      sendDrawPublishedEmail({ to: email, monthKey: draw.monthKey, winningNumbers: draw.winningNumbers }).catch((error) =>
        console.error('Draw email failed', error.message)
      )
    )
  );

  res.status(201).json(draw);
});
