import express from 'express';
import { getConfig, updateConfig, resetConfig, getPlatformStats } from '../controllers/platformConfigController';
import { protect, admin } from '../middlewares/authMiddleware';

const router = express.Router();

// Public — live platform stats (student count, teacher count, etc.)
router.get('/stats', getPlatformStats);

// Public — fetch full config (auto-creates default on first call)
router.get('/', getConfig);

// Admin only — replace full config
router.put('/', protect, admin, updateConfig);

// Admin only — reset to factory defaults
router.post('/reset', protect, admin, resetConfig);

export default router;
