import express from 'express';
import { getMe, loginUser, logoutUser, registerUser } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { refreshSubscription } from '../middleware/subscriptionMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/signup', registerUser);
router.post('/login', loginUser);
router.post('/signin', loginUser);
router.post('/logout', logoutUser);
router.get('/me', protect, refreshSubscription, getMe);

export default router;
