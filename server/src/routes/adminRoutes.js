import express from 'express';
import {
  createSimulation,
  getAdminAnalytics,
  getPendingProofs,
  listDrawHistory,
  listSimulations,
  listUsers,
  listWinners,
  reviewPrize,
  updateUser
} from '../controllers/adminController.js';
import { adminOnly, protect } from '../middleware/authMiddleware.js';
import { refreshSubscription } from '../middleware/subscriptionMiddleware.js';


const router = express.Router();

router.use(protect, refreshSubscription, adminOnly);
router.get('/analytics', getAdminAnalytics);
router.get('/users', listUsers);
router.get('/user-list', listUsers);
router.put('/users/:id', updateUser);
router.get('/draws', listDrawHistory);
router.get('/draw-history', listDrawHistory);
router.get('/simulations', listSimulations);
router.post('/simulations', createSimulation);
router.get('/winners', listWinners);
router.get('/proofs', getPendingProofs);
router.put('/proofs/:id', reviewPrize);

export default router;
