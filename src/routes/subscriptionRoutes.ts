import express from 'express';
import { protect, admin } from '../middlewares/authMiddleware';
import { activateSubscription, cancelSubscription, getMySubscription, getSubscriptions } from '../controllers/subscriptionController';

const router = express.Router();

router.get('/me', protect, getMySubscription);
router.get('/', protect, admin, getSubscriptions);
router.post('/activate', protect, admin, activateSubscription);
router.post('/cancel', protect, admin, cancelSubscription);

export default router;
