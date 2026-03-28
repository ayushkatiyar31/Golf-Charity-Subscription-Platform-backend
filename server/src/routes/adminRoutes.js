import express from 'express';
import {
  getAdminAnalytics,
  getPendingProofs,
  listUsers,
  reviewPrize,
  updateUser
} from '../controllers/adminController.js';
import { adminOnly, protect } from '../middleware/authMiddleware.js';
import { refreshSubscription } from '../middleware/subscriptionMiddleware.js';

const router = express.Router();

router.use(protect, refreshSubscription, adminOnly);
router.get('/analytics', getAdminAnalytics);
router.get('/users', listUsers);
router.put('/users/:id', updateUser);
router.get('/proofs', getPendingProofs);
router.put('/proofs/:id', reviewPrize);

export default router;
