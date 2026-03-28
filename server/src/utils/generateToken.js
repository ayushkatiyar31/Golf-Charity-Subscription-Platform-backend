import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const generateToken = (userId) => jwt.sign({ userId }, env.jwtSecret, { expiresIn: '7d' });
