import { Router } from 'express';
import {
  createSubscriptionRequest,
  getMySubscriptionRequests,
  getTeacherSubscriptionRequests,
  approveSubscriptionRequest,
  rejectSubscriptionRequest,
  getMySubscriptions,
} from '../controllers/subscriptionController';
import { protect, teacher } from '../middlewares/authMiddleware';

const router = Router();

// Student: create request + view own requests
router.post('/requests', protect, createSubscriptionRequest);
router.get('/requests/mine', protect, getMySubscriptionRequests);

// Teacher: review requests
router.get('/requests/teacher', protect, teacher, getTeacherSubscriptionRequests);
router.post('/requests/:id/approve', protect, teacher, approveSubscriptionRequest);
router.post('/requests/:id/reject', protect, teacher, rejectSubscriptionRequest);

// Student: approved subscriptions
router.get('/mine', protect, getMySubscriptions);

export default router;
