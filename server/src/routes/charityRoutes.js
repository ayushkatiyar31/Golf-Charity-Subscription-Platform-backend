import express from 'express';
import {
  createCharity,
  deleteCharity,
  getCharityBySlug,
  getFeaturedCharity,
  listCharities,
  updateCharity
} from '../controllers/charityController.js';
import { adminOnly, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', listCharities);
router.get('/featured', getFeaturedCharity);
router.get('/:slug', getCharityBySlug);
router.post('/', protect, adminOnly, createCharity);
router.put('/:id', protect, adminOnly, updateCharity);
router.delete('/:id', protect, adminOnly, deleteCharity);

export default router;
