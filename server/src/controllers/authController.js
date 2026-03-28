import { Charity } from '../models/Charity.js';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createError } from '../utils/createError.js';
import { sendWelcomeEmail } from '../utils/email.js';
import { generateToken } from '../utils/generateToken.js';

const sanitizeUser = async (userId) => User.findById(userId).populate('charity').select('-password');
const authCookieName = 'auth_token';

const getCookieOptions = (origin) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const useCrossSiteCookie = isProduction && Boolean(origin);

  return {
    httpOnly: true,
    sameSite: useCrossSiteCookie ? 'none' : 'lax',
    secure: useCrossSiteCookie || isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000
  };
};

export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, charityId, contributionPercentage = 10 } = req.body;
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!name || !normalizedEmail || !password) {
    throw createError(400, 'Name, email, and password are required');
  }

  if (Number(contributionPercentage) < 10) {
    throw createError(400, 'Contribution percentage must be at least 10');
  }

  let charity = null;
  if (charityId) {
    charity = await Charity.findById(charityId);
    if (!charity) {
      throw createError(404, 'Selected charity not found');
    }
  }

  const exists = await User.findOne({ email: normalizedEmail });
  if (exists) {
    throw createError(409, 'User already exists');
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    password,
    charity: charity?._id,
    contributionPercentage
  });

  sendWelcomeEmail({ name, email: normalizedEmail }).catch((error) => console.error('Welcome email failed', error.message));

  const safeUser = await sanitizeUser(user._id);
  const token = generateToken(user._id);
  res.cookie(authCookieName, token, getCookieOptions(req.headers.origin));
  res.status(201).json({
    token,
    name: safeUser.name,
    user: safeUser
  });
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalizedEmail || !password) {
    throw createError(400, 'Email and password are required');
  }

  const user = await User.findOne({ email: normalizedEmail }).select('+password').populate('charity');

  if (!user || !(await user.matchPassword(password))) {
    throw createError(401, 'Invalid credentials');
  }

  const safeUser = await sanitizeUser(user._id);
  const token = generateToken(user._id);
  res.cookie(authCookieName, token, getCookieOptions(req.headers.origin));
  res.json({
    token,
    name: safeUser.name,
    user: safeUser
  });
});

export const getMe = asyncHandler(async (req, res) => {
  res.json(await sanitizeUser(req.user._id));
});

export const logoutUser = asyncHandler(async (_req, res) => {
  res.clearCookie(authCookieName, {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production'
  });
  res.json({ message: 'Logged out successfully', token: null, user: null, name: null });
});
