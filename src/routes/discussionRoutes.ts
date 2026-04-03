import express from 'express';
import { addComment, getComments, likeComment } from '../controllers/discussionController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/').post(protect, addComment);
router.route('/:lessonId').get(protect, getComments);
router.route('/:commentId/like').put(protect, likeComment);

export default router;
