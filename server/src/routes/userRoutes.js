import express from 'express';
import {
  addScore,
  getDashboard,
  getScores,
  listPublishedDraws,
  listUserPrizes,
  previewDraw,
  publishDraw,
  submitPrizeProof,
  updatePreferences,
  updateScore
} from '../controllers/userController.js';
import { adminOnly, protect } from '../middleware/authMiddleware.js';
import { refreshSubscription } from '../middleware/subscriptionMiddleware.js';
import { upload } from '../utils/upload.js';

const router = express.Router();

router.get('/draws', listPublishedDraws);
router.use(protect, refreshSubscription);
router.get('/dashboard', getDashboard);
router.patch('/profile/preferences', updatePreferences);
router.get('/scores', getScores);
router.post('/scores', addScore);
router.put('/scores/:scoreId', updateScore);
router.get('/prizes', listUserPrizes);
router.post('/prizes/:prizeId/proof', upload.single('proof'), submitPrizeProof);
router.post('/draws/preview', adminOnly, previewDraw);
router.post('/draws/publish', adminOnly, publishDraw);

export default router;
