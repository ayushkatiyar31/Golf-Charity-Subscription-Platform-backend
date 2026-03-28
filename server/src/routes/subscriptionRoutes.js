import express from 'express';
import {
  addIndependentDonation,
  cancelSubscription,
  confirmCheckoutSession,
  createCheckoutSession,
  createSubscription,
  getSubscriptionStatus,
  stripeWebhook
} from '../controllers/subscriptionController.js';
import { protect } from '../middleware/authMiddleware.js';
import { attachPlans, refreshSubscription } from '../middleware/subscriptionMiddleware.js';

const router = express.Router();

router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);
router.use(protect, refreshSubscription, attachPlans);
router.get('/status', getSubscriptionStatus);
router.post('/', createSubscription);
router.post('/checkout-session', createCheckoutSession);
router.post('/confirm-session', confirmCheckoutSession);
router.post('/cancel', cancelSubscription);
router.post('/donations', addIndependentDonation);

export default router;
